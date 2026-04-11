"use strict";

const MODE_LABELS = {
  random: "Случайный тип",
  mask: "Маска числа + делимость",
  div_sum: "Сумма делителей (кроме 1 и n)",
  prime_sum: "Сумма простых делителей",
  three_primes: "Произведение трёх простых множителей",
  odd_divisors: "Нечётное количество делителей",
  fast_pow: "Последние цифры степени",
};

const MODE_ORDER = ["mask", "div_sum", "prime_sum", "three_primes", "odd_divisors", "fast_pow"];

const BASE_THEORY = [
  {
    title: "Маска числа",
    text:
      "В маске символ «?» означает ровно одну цифру, а «*» — произвольную последовательность цифр (в том числе пустую, если это разрешено условием).",
  },
  {
    title: "Делители и оптимизация",
    text:
      "Для поиска делителей числа достаточно проверять делимость до √n: каждый найденный делитель d сразу даёт парный делитель n/d.",
  },
  {
    title: "Простые множители",
    text:
      "Факторизация по простым множителям позволяет быстро проверять условия про количество/тип делителей и использовать основную теорему арифметики.",
  },
  {
    title: "Большие степени",
    text:
      "Когда нужны последние k цифр числа x^p, используют вычисление по модулю 10^k и алгоритм быстрого возведения в степень.",
  },
];

const TYPE_THEORY = {
  mask: "Сначала генерируем кандидатов, соответствующих маске, затем фильтруем по делимости и берём требуемые элементы из отсортированного списка.",
  div_sum:
    "Для каждого числа собираем множество делителей без 1 и самого числа, считаем сумму и проверяем условие кратности.",
  prime_sum:
    "Находим различные простые делители числа через факторизацию. Если число простое, сумма по условию равна 0.",
  three_primes:
    "Ищем числа как произведение трёх простых множителей (возможны повторы), дополнительно фильтруем множители по записи числа.",
  odd_divisors:
    "Нечётное число делителей бывает только у полных квадратов. Для чётных чисел это квадраты чётных чисел.",
  fast_pow:
    "Для конца числа используем выражение pow_mod(x, p, 10^k). Так избегаем работы с гигантскими значениями x^p.",
};

const elements = {
  modeSelect: document.getElementById("modeSelect"),
  generateBtn: document.getElementById("generateBtn"),
  theoryWrap: document.getElementById("theoryWrap"),
  taskMeta: document.getElementById("taskMeta"),
  taskText: document.getElementById("taskText"),
  solutionWrap: document.getElementById("solutionWrap"),
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(values) {
  return values[randInt(0, values.length - 1)];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatNumber(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function digitSum(value) {
  return String(Math.abs(value))
    .split("")
    .reduce((acc, x) => acc + Number(x), 0);
}

function countChar(value, char) {
  return String(value).split(char).length - 1;
}

function isPrime(n) {
  if (n < 2) {
    return false;
  }
  if (n % 2 === 0) {
    return n === 2;
  }
  for (let d = 3; d * d <= n; d += 2) {
    if (n % d === 0) {
      return false;
    }
  }
  return true;
}

function properDivisorsExcludingOneAndSelf(n) {
  const set = new Set();
  for (let d = 2; d * d <= n; d += 1) {
    if (n % d !== 0) {
      continue;
    }
    set.add(d);
    const pair = n / d;
    if (pair !== d && pair !== n) {
      set.add(pair);
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

function uniquePrimeDivisors(n) {
  const factors = new Set();
  let x = n;
  for (let d = 2; d * d <= x; d += 1) {
    while (x % d === 0) {
      factors.add(d);
      x = Math.floor(x / d);
    }
  }
  if (x > 1) {
    factors.add(x);
  }
  if (factors.has(n)) {
    factors.delete(n);
  }
  return Array.from(factors).sort((a, b) => a - b);
}

function primeFactorsWithMultiplicity(n) {
  const result = [];
  let x = n;
  for (let d = 2; d * d <= x; d += 1) {
    while (x % d === 0) {
      result.push(d);
      x = Math.floor(x / d);
    }
  }
  if (x > 1) {
    result.push(x);
  }
  return result;
}

function powMod(base, exp, mod) {
  let a = base % mod;
  let p = exp;
  let res = 1;
  while (p > 0) {
    if (p % 2 === 1) {
      res = (res * a) % mod;
    }
    a = (a * a) % mod;
    p = Math.floor(p / 2);
  }
  return res;
}

function buildChips(type, extra) {
  const chips = [`<span class="chip">${escapeHtml(MODE_LABELS[type])}</span>`];
  if (extra) {
    chips.push(`<span class="chip alt">${escapeHtml(extra)}</span>`);
  }
  chips.push(`<span class="chip warn">Задание 25</span>`);
  return chips.join("");
}

function buildTheoryHtml(type) {
  return `
    <div class="chips">
      <span class="chip">Теория: состав числа и делители</span>
      <span class="chip alt">${escapeHtml(MODE_LABELS[type])}</span>
    </div>
    <p>${escapeHtml(TYPE_THEORY[type])}</p>
    <div class="theory-grid">
      ${BASE_THEORY.map(
        (card) => `
          <article class="theory-card">
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.text)}</p>
          </article>
        `
      ).join("")}
    </div>
  `;
}

function buildAnswerTable(columns, rows) {
  const head = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td>${escapeHtml(cell)}</td>`)
          .join("")}</tr>`
    )
    .join("");
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderTask(task) {
  elements.theoryWrap.innerHTML = buildTheoryHtml(task.type);
  elements.taskMeta.innerHTML = buildChips(task.type, task.metaBadge);
  elements.taskText.innerHTML = task.taskHtml;
  elements.solutionWrap.innerHTML = `
    <details>
      <summary>Показать пошаговый разбор, ответ и Python-код</summary>
      <ol>
        ${task.steps.map((step) => `<li>${step}</li>`).join("")}
      </ol>
      ${buildAnswerTable(task.answerColumns, task.answerRows)}
      <div class="final-answer">${task.finalAnswer}</div>
      <div class="python-wrap"><pre><code>${escapeHtml(task.pythonCode)}</code></pre></div>
    </details>
  `;
}

function expandMaskNumbers(mask, starMin, starMax, limit) {
  const result = [];

  function appendDigits(length, prefix, cb) {
    if (length === 0) {
      cb(prefix);
      return;
    }
    for (let d = 0; d <= 9; d += 1) {
      appendDigits(length - 1, prefix + String(d), cb);
    }
  }

  function dfs(index, current) {
    if (index >= mask.length) {
      if (current.length === 0) {
        return;
      }
      const n = Number(current);
      if (Number.isFinite(n) && n <= limit) {
        result.push(n);
      }
      return;
    }

    const ch = mask[index];
    if (ch >= "0" && ch <= "9") {
      dfs(index + 1, current + ch);
      return;
    }

    if (ch === "?") {
      for (let d = 0; d <= 9; d += 1) {
        if (current.length === 0 && d === 0) {
          continue;
        }
        dfs(index + 1, current + String(d));
      }
      return;
    }

    if (ch === "*") {
      for (let len = starMin; len <= starMax; len += 1) {
        appendDigits(len, "", (digits) => {
          if (current.length === 0 && digits.length > 0 && digits[0] === "0") {
            return;
          }
          dfs(index + 1, current + digits);
        });
      }
      return;
    }
  }

  dfs(0, "");
  return Array.from(new Set(result)).sort((a, b) => a - b);
}

function generateMaskTask() {
  const templates = [
    { mask: "2?34?56*7", starMin: 1, starMax: 2, limit: 10 ** 10 },
    { mask: "1?7*3?9", starMin: 1, starMax: 3, limit: 10 ** 9 },
    { mask: "3?12*45?6", starMin: 0, starMax: 2, limit: 10 ** 9 },
    { mask: "4?5?8*2", starMin: 0, starMax: 2, limit: 10 ** 9 },
  ];
  const divisors = [13, 17, 19, 23, 29, 31, 37];

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const tpl = pick(templates);
    const divisor = pick(divisors);
    const numbers = expandMaskNumbers(tpl.mask, tpl.starMin, tpl.starMax, tpl.limit);
    const matched = numbers.filter((x) => x % divisor === 0);
    if (matched.length < 8) {
      continue;
    }

    const firstTwo = matched.slice(0, 2);
    const lastTwo = matched.slice(-2);
    const selected = [...firstTwo, ...lastTwo];

    return {
      type: "mask",
      metaBadge: `маска ${tpl.mask}, делитель ${divisor}`,
      taskHtml: `
        <p>Среди натуральных чисел, не превышающих <code>${formatNumber(tpl.limit)}</code>, найдите все числа, соответствующие маске <code>${tpl.mask}</code>, которые делятся на <code>${divisor}</code> без остатка.</p>
        <p>Символ <code>?</code> означает ровно одну цифру. Символ <code>*</code> означает последовательность из <code>${tpl.starMin}</code>…<code>${tpl.starMax}</code> цифр.</p>
        <p>В ответе запишите в порядке возрастания два первых и два последних найденных числа. Для каждого числа укажите пару: само число и частное от деления на <code>${divisor}</code>.</p>
      `,
      steps: [
        `Разворачиваем маску <code>${tpl.mask}</code>: перебираем все подстановки для «?» и «*» (длина «*» от ${tpl.starMin} до ${tpl.starMax}).`,
        `Из полученных чисел оставляем только значения ≤ <code>${formatNumber(tpl.limit)}</code>.`,
        `Фильтруем по делимости на <code>${divisor}</code> и сортируем по возрастанию.`,
        "Берём два первых и два последних результата и для каждого вычисляем частное.",
      ],
      answerColumns: ["Число", `Число / ${divisor}`],
      answerRows: selected.map((n) => [formatNumber(n), formatNumber(Math.floor(n / divisor))]),
      finalAnswer:
        "Формат ответа: 4 строки (или 4 пары), где для каждого найденного числа указаны число и частное.",
      pythonCode: `def generate(mask, star_min, star_max, limit):
    res = []

    def rec(i, cur):
        if i == len(mask):
            if cur:
                x = int(cur)
                if x <= limit:
                    res.append(x)
            return

        ch = mask[i]
        if ch.isdigit():
            rec(i + 1, cur + ch)
        elif ch == '?':
            for d in '0123456789':
                if not cur and d == '0':
                    continue
                rec(i + 1, cur + d)
        else:  # '*'
            def add_digits(length, pref=''):
                if length == 0:
                    rec(i + 1, cur + pref)
                    return
                for d in '0123456789':
                    add_digits(length - 1, pref + d)

            for ln in range(star_min, star_max + 1):
                add_digits(ln)

    rec(0, '')
    return sorted(set(res))

mask = '${tpl.mask}'
divisor = ${divisor}
nums = generate(mask, ${tpl.starMin}, ${tpl.starMax}, ${tpl.limit})
ans = [x for x in nums if x % divisor == 0]
out = ans[:2] + ans[-2:]
for x in out:
    print(x, x // divisor)
`,
    };
  }

  return null;
}

function generateDivSumTask() {
  const starts = [120000, 160000, 180000, 220000, 260000, 300000];
  const mods = [13, 17, 19, 23];

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const start = pick(starts);
    const mod = pick(mods);
    const need = 5;
    const found = [];

    for (let n = start + 1; n <= start + 250000 && found.length < need; n += 1) {
      const ds = properDivisorsExcludingOneAndSelf(n);
      if (ds.length === 0) {
        continue;
      }
      const sum = ds.reduce((acc, x) => acc + x, 0);
      if (sum % mod === 0) {
        found.push({ n, sum, q: Math.floor(sum / mod) });
      }
    }

    if (found.length < need) {
      continue;
    }

    return {
      type: "div_sum",
      metaBadge: `старт > ${formatNumber(start)}, делимость суммы на ${mod}`,
      taskHtml: `
        <p>Напишите программу, которая ищет среди целых чисел, превышающих <code>${formatNumber(start)}</code>, первые 5 чисел, удовлетворяющих условию:</p>
        <p>сумма всех различных делителей числа, отличных от <code>1</code> и самого числа, не равна нулю и кратна <code>${mod}</code>.</p>
        <p>Для каждого найденного числа выведите пару: само число и частное от деления найденной суммы на <code>${mod}</code>.</p>
      `,
      steps: [
        `Перебираем числа начиная с <code>${formatNumber(start + 1)}</code> по возрастанию.`,
        "Для каждого числа ищем делители до √n и собираем множество делителей без 1 и n.",
        `Считаем сумму делителей S и проверяем условия <code>S ≠ 0</code> и <code>S % ${mod} = 0</code>.`,
        "Как только найдено 5 чисел, останавливаем перебор и формируем ответ.",
      ],
      answerColumns: ["Число", `S / ${mod}`],
      answerRows: found.map((x) => [formatNumber(x.n), formatNumber(x.q)]),
      finalAnswer: "Ответ — 5 строк в порядке возрастания чисел.",
      pythonCode: `def divisors_wo_1_n(n):
    ds = set()
    d = 2
    while d * d <= n:
        if n % d == 0:
            ds.add(d)
            pair = n // d
            if pair != d and pair != n:
                ds.add(pair)
        d += 1
    return sorted(ds)

start = ${start}
mod = ${mod}
count = 0
n = start + 1
while count < 5:
    ds = divisors_wo_1_n(n)
    if ds:
        s = sum(ds)
        if s % mod == 0:
            print(n, s // mod)
            count += 1
    n += 1
`,
    };
  }

  return null;
}

function generatePrimeSumTask() {
  const starts = [180000, 220000, 260000, 300000, 350000, 400000];
  const mods = [29, 31, 37, 41];

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const start = pick(starts);
    const mod = pick(mods);
    const found = [];

    for (let n = start + 1; n <= start + 350000 && found.length < 5; n += 1) {
      const primes = uniquePrimeDivisors(n);
      const s = primes.reduce((acc, x) => acc + x, 0);
      if (s !== 0 && s % mod === 0) {
        found.push({ n, s });
      }
    }

    if (found.length < 5) {
      continue;
    }

    return {
      type: "prime_sum",
      metaBadge: `старт > ${formatNumber(start)}, сумма простых делителей кратна ${mod}`,
      taskHtml: `
        <p>Обозначим через <code>S</code> сумму различных простых делителей целого числа, не считая самого числа. Если таких делителей нет, считаем <code>S = 0</code>.</p>
        <p>Напишите программу, которая перебирает целые числа, большие <code>${formatNumber(start)}</code>, и ищет первые 5 чисел, для которых <code>S ≠ 0</code> и <code>S</code> кратно <code>${mod}</code>.</p>
        <p>Для каждого найденного числа выведите само число и значение <code>S</code>.</p>
      `,
      steps: [
        "Для каждого числа выполняем факторизацию и собираем множество различных простых делителей.",
        "Если число простое, его единственный простой делитель равен самому числу, поэтому по условию S = 0.",
        `Проверяем условия <code>S ≠ 0</code> и <code>S % ${mod} = 0</code>.`,
        "Берём первые 5 чисел в порядке возрастания.",
      ],
      answerColumns: ["Число", "S"],
      answerRows: found.map((x) => [formatNumber(x.n), formatNumber(x.s)]),
      finalAnswer: "Ответ — 5 пар: число и сумма его различных простых делителей.",
      pythonCode: `def prime_div_sum(n):
    x = n
    primes = set()
    d = 2
    while d * d <= x:
        while x % d == 0:
            primes.add(d)
            x //= d
        d += 1
    if x > 1:
        primes.add(x)

    # если n простое, по условию самого n учитывать нельзя
    if n in primes:
        primes.remove(n)
    return sum(primes)

start = ${start}
mod = ${mod}
count = 0
n = start + 1
while count < 5:
    s = prime_div_sum(n)
    if s != 0 and s % mod == 0:
        print(n, s)
        count += 1
    n += 1
`,
    };
  }

  return null;
}

function primesWithSingleThree(limit) {
  const result = [];
  for (let x = 2; x <= limit; x += 1) {
    if (isPrime(x) && countChar(x, "3") === 1) {
      result.push(x);
    }
  }
  return result;
}

function generateThreePrimesTask() {
  const startOptions = [200000, 300000, 400000, 500000, 700000, 1000000];
  const start = pick(startOptions);
  const primes = primesWithSingleThree(400);
  const candidates = [];

  for (let i = 0; i < primes.length; i += 1) {
    for (let j = i; j < primes.length; j += 1) {
      for (let k = j; k < primes.length; k += 1) {
        const p1 = primes[i];
        const p2 = primes[j];
        const p3 = primes[k];
        const n = p1 * p2 * p3;
        if (n <= start || n > start + 25000000) {
          continue;
        }
        candidates.push({ n, maxP: p3, facs: [p1, p2, p3] });
      }
    }
  }

  candidates.sort((a, b) => a.n - b.n);
  const unique = [];
  const seen = new Set();
  for (const item of candidates) {
    if (seen.has(item.n)) {
      continue;
    }
    seen.add(item.n);
    unique.push(item);
    if (unique.length === 5) {
      break;
    }
  }

  if (unique.length < 5) {
    return null;
  }

  return {
    type: "three_primes",
    metaBadge: `поиск > ${formatNumber(start)}`,
    taskHtml: `
      <p>Найдите 5 наименьших натуральных чисел, больших <code>${formatNumber(start)}</code>, которые представимы в виде произведения ровно трёх простых множителей (множители могут повторяться).</p>
      <p>Дополнительное условие: каждый из трёх простых множителей содержит в своей десятичной записи ровно одну цифру <code>3</code>.</p>
      <p>Для каждого найденного числа выведите число и наибольший из трёх множителей.</p>
    `,
    steps: [
      "Строим список простых чисел, содержащих ровно одну цифру 3.",
      "Перебираем неубывающие тройки таких простых чисел (p1 ≤ p2 ≤ p3).",
      `Вычисляем произведение n = p1·p2·p3 и оставляем только n > <code>${formatNumber(start)}</code>.`,
      "Сортируем результаты по n, убираем повторы и берём первые 5 значений.",
    ],
    answerColumns: ["Число", "Наибольший множитель"],
    answerRows: unique.map((x) => [formatNumber(x.n), formatNumber(x.maxP)]),
    finalAnswer: "Ответ — 5 строк: число и максимальный простой множитель в тройке.",
    pythonCode: `def is_prime(n):
    if n < 2:
        return False
    d = 2
    while d * d <= n:
        if n % d == 0:
            return False
        d += 1
    return True

start = ${start}
primes = [p for p in range(2, 401)
          if is_prime(p) and str(p).count('3') == 1]

cands = []
for i, p1 in enumerate(primes):
    for j in range(i, len(primes)):
        p2 = primes[j]
        for k in range(j, len(primes)):
            p3 = primes[k]
            n = p1 * p2 * p3
            if n > start:
                cands.append((n, p3))

# сортировка и удаление повторов
cands.sort()
ans = []
seen = set()
for n, mx in cands:
    if n not in seen:
        seen.add(n)
        ans.append((n, mx))
    if len(ans) == 5:
        break

for row in ans:
    print(*row)
`,
  };
}

function generateOddDivisorsTask() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const left = randInt(70000, 110000);
    const right = left + randInt(16000, 28000);
    const evenSquares = [];

    const from = Math.ceil(Math.sqrt(left));
    const to = Math.floor(Math.sqrt(right));
    for (let r = from; r <= to; r += 1) {
      const x = r * r;
      if (x % 2 === 0) {
        evenSquares.push({ x, root: r });
      }
    }

    if (evenSquares.length < 2) {
      continue;
    }

    const minItem = evenSquares[0];
    const maxItem = evenSquares[evenSquares.length - 1];

    return {
      type: "odd_divisors",
      metaBadge: `отрезок [${formatNumber(left)}; ${formatNumber(right)}]`,
      taskHtml: `
        <p>Среди чётных целых чисел отрезка <code>[${formatNumber(left)}; ${formatNumber(right)}]</code> найдите числа, у которых количество натуральных делителей нечётно.</p>
        <p>Для каждого такого числа можно указать делитель <code>d</code>, для которого <code>d · d = n</code>.</p>
        <p>В ответе выведите самое маленькое и самое большое найденные числа, справа укажите соответствующий корень.</p>
      `,
      steps: [
        "Число имеет нечётное количество делителей тогда и только тогда, когда оно является полным квадратом.",
        "Так как рассматриваются только чётные числа, подойдут квадраты чётных корней.",
        `Перебираем целые корни от <code>⌈√${formatNumber(left)}⌉</code> до <code>⌊√${formatNumber(right)}⌋</code> и проверяем чётность квадрата.`,
        "Берём минимальный и максимальный подходящие квадраты.",
      ],
      answerColumns: ["Число", "Корень"],
      answerRows: [
        [formatNumber(minItem.x), formatNumber(minItem.root)],
        [formatNumber(maxItem.x), formatNumber(maxItem.root)],
      ],
      finalAnswer: "Ответ — две строки: минимальное и максимальное подходящее число с корнем.",
      pythonCode: `left = ${left}
right = ${right}
items = []

r = int(left ** 0.5)
if r * r < left:
    r += 1

while r * r <= right:
    x = r * r
    if x % 2 == 0:
        items.append((x, r))
    r += 1

print(items[0])      # минимальное
print(items[-1])     # максимальное
`,
    };
  }

  return null;
}

function generateFastPowTask() {
  const starts = [500000, 700000, 900000, 1100000, 1300000];
  const exponents = [1001, 5003, 7777, 10011];

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const start = pick(starts);
    const power = pick(exponents);
    const sumNeed = randInt(3, 24);
    const found = [];

    for (let x = start + 1; x <= start + 250000 && found.length < 5; x += 1) {
      const tail = powMod(x, power, 10000);
      if (digitSum(String(tail).padStart(4, "0")) === sumNeed) {
        found.push({ x, tail: String(tail).padStart(4, "0") });
      }
    }

    if (found.length < 5) {
      continue;
    }

    return {
      type: "fast_pow",
      metaBadge: `x > ${formatNumber(start)}, степень ${power}`,
      taskHtml: `
        <p>Перебирая целые числа, большие <code>${formatNumber(start)}</code>, найдите первые 5 чисел, для которых число <code>x<sup>${power}</sup></code> оканчивается на 4 цифры, сумма которых равна <code>${sumNeed}</code>.</p>
        <p>Для каждого найденного числа выведите само число и последние 4 цифры значения <code>x<sup>${power}</sup></code>.</p>
      `,
      steps: [
        "Используем модуль 10000, чтобы работать только с последними четырьмя цифрами.",
        "Вычисляем tail = x^p mod 10000 алгоритмом быстрого возведения в степень.",
        `Проверяем условие суммы цифр: <code>sum(digits(tail)) = ${sumNeed}</code>.`,
        "Собираем первые 5 подходящих чисел и завершаем перебор.",
      ],
      answerColumns: ["x", `Последние 4 цифры x^${power}`],
      answerRows: found.map((item) => [formatNumber(item.x), item.tail]),
      finalAnswer: "Ответ — 5 строк: число x и последние 4 цифры x^p.",
      pythonCode: `def fast_pow_mod(x, p, mod):
    res = 1
    a = x % mod
    while p > 0:
        if p % 2 == 1:
            res = (res * a) % mod
        a = (a * a) % mod
        p //= 2
    return res

start = ${start}
power = ${power}
need = ${sumNeed}
count = 0
x = start + 1
while count < 5:
    tail = fast_pow_mod(x, power, 10_000)
    s = sum(map(int, str(tail).zfill(4)))
    if s == need:
        print(x, str(tail).zfill(4))
        count += 1
    x += 1
`,
    };
  }

  return null;
}

function generateTaskByType(type) {
  switch (type) {
    case "mask":
      return generateMaskTask();
    case "div_sum":
      return generateDivSumTask();
    case "prime_sum":
      return generatePrimeSumTask();
    case "three_primes":
      return generateThreePrimesTask();
    case "odd_divisors":
      return generateOddDivisorsTask();
    case "fast_pow":
      return generateFastPowTask();
    default:
      return null;
  }
}

function generateTask() {
  const selected = elements.modeSelect.value;
  const queue = selected === "random" ? MODE_ORDER.slice() : [selected];

  while (queue.length > 0) {
    const idx = randInt(0, queue.length - 1);
    const type = queue.splice(idx, 1)[0];
    const task = generateTaskByType(type);
    if (task) {
      renderTask(task);
      return;
    }
  }

  elements.theoryWrap.innerHTML = "<p>Не удалось сгенерировать вариант. Нажмите кнопку ещё раз.</p>";
  elements.taskMeta.innerHTML = "";
  elements.taskText.innerHTML = "<p>Для текущего набора параметров не найдено устойчивого варианта.</p>";
  elements.solutionWrap.innerHTML = "";
}

elements.generateBtn.addEventListener("click", generateTask);

generateTask();
