"use strict";

const TEMPLATE_LABELS = {
  random: "Случайный",
  spreadsheet_distinct_extremes:
    "Таблица: все числа различны, сравнение экстремумов",
  spreadsheet_one_pair: "Таблица: одна пара повторов",
  spreadsheet_three_pairs:
    "Таблица: три пары повторов и одно уникальное число",
  spreadsheet_two_pairs:
    "Таблица: две пары повторов и три уникальных числа",
  text_three_numbers: "Текстовый файл: три числа в строке",
};

const COLUMN_NAMES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

let currentDownloads = [];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(items) {
  return items[randInt(0, items.length - 1)];
}

function sum(items) {
  return items.reduce((acc, value) => acc + value, 0);
}

function average(items) {
  return sum(items) / items.length;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sortedNumbers(items) {
  return [...items].sort((a, b) => a - b);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function countMap(items) {
  const map = new Map();
  for (const item of items) {
    map.set(item, (map.get(item) || 0) + 1);
  }
  return map;
}

function frequencySignature(items) {
  return [...countMap(items).values()].sort((a, b) => a - b);
}

function sampleDistinct(count, min, max) {
  const values = new Set();
  while (values.size < count) {
    values.add(randInt(min, max));
  }
  return [...values];
}

function buildRows(totalRows, makeMatch, makeFail, ratio) {
  const rows = [];
  for (let i = 0; i < totalRows; i += 1) {
    rows.push(Math.random() < ratio ? makeMatch() : makeFail());
  }
  return rows;
}

function renderChips(chips) {
  return `<div class="chips">${chips
    .map(
      (chip) =>
        `<span class="chip${chip.kind ? ` ${chip.kind}` : ""}">${escapeHtml(
          chip.text
        )}</span>`
    )
    .join("")}</div>`;
}

function renderBulletList(items) {
  return `<ul class="bullet-list">${items
    .map((item) => `<li>${item}</li>`)
    .join("")}</ul>`;
}

function renderTheory(theory) {
  return `
    ${renderChips(theory.chips)}
    <p>${theory.intro}</p>
    <div class="theory-grid">
      ${theory.cards
        .map(
          (card) => `
            <article class="theory-card">
              <h3>${escapeHtml(card.title)}</h3>
              ${card.text ? `<p>${card.text}</p>` : ""}
              ${card.items ? renderBulletList(card.items) : ""}
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderParams(params) {
  return `
    <div class="params-box">
      ${params
        .map(
          (item) =>
            `<p><strong>${escapeHtml(item.label)}:</strong> ${item.value}</p>`
        )
        .join("")}
    </div>
  `;
}

function renderFiles(files) {
  return `
    <div class="files-box">
      <p><strong>Сформированы файлы:</strong> ${files
        .map((file) => escapeHtml(file.name))
        .join(", ")}</p>
      <div class="file-buttons">
        ${files
          .map(
            (file) => `
              <a class="download-link ${file.kind || ""}" href="${file.url}" download="${escapeHtml(
              file.name
            )}">
                ${escapeHtml(file.label)}
              </a>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderPreview(rows, meta) {
  const columns = rows[0].length;
  return `
    <div class="preview-meta">${meta}</div>
    <div class="table-wrap">
      <table class="compact-table">
        <thead>
          <tr>
            ${COLUMN_NAMES.slice(0, columns)
              .map((column) => `<th>${column}</th>`)
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  ${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function revokeDownloads() {
  for (const url of currentDownloads) {
    URL.revokeObjectURL(url);
  }
  currentDownloads = [];
}

function createBlobUrl(blob) {
  const url = URL.createObjectURL(blob);
  currentDownloads.push(url);
  return url;
}

function createWorkbookBlob(rows) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Лист1");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[]]), "Лист2");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[]]), "Лист3");
  const array = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([array], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function createDelimitedBlob(rows, delimiter) {
  const content = rows.map((row) => row.join(delimiter)).join("\n");
  return new Blob([content], { type: "text/plain;charset=utf-8" });
}

function formulaBox(lines) {
  return `<div class="formula-box"><pre><code>${escapeHtml(
    lines.join("\n")
  )}</code></pre></div>`;
}

function renderSolution(solution) {
  return `
    <details>
      <summary>Показать пошаговый разбор и ответ (спойлер)</summary>
      <ol>
        ${solution.steps.map((step) => `<li>${step}</li>`).join("")}
      </ol>
      ${solution.formulas ? formulaBox(solution.formulas) : ""}
      <div class="answer-box">Ответ: ${escapeHtml(solution.answer)}</div>
      <div class="python-wrap">
        <pre><code>${escapeHtml(solution.python)}</code></pre>
      </div>
    </details>
  `;
}

function makeDistinctExtremesRowMatch() {
  while (true) {
    const nums = sortedNumbers(sampleDistinct(5, 2, 220));
    if (2 * (nums[0] + nums[4]) >= nums[1] + nums[2] + nums[3]) {
      return shuffle(nums);
    }
  }
}

function makeDistinctExtremesRowFail() {
  if (Math.random() < 0.55) {
    const nums = sampleDistinct(4, 2, 220);
    nums.push(nums[randInt(0, nums.length - 1)]);
    return shuffle(nums);
  }
  while (true) {
    const nums = sortedNumbers(sampleDistinct(5, 2, 220));
    if (2 * (nums[0] + nums[4]) < nums[1] + nums[2] + nums[3]) {
      return shuffle(nums);
    }
  }
}

function matchesDistinctExtremes(row) {
  const nums = sortedNumbers(row);
  return (
    new Set(nums).size === 5 &&
    2 * (nums[0] + nums[4]) >= nums[1] + nums[2] + nums[3]
  );
}

function generateDistinctExtremesVariant() {
  const rowsCount = 3200;
  const rows = buildRows(
    rowsCount,
    makeDistinctExtremesRowMatch,
    makeDistinctExtremesRowFail,
    0.2
  );
  const answer = rows.filter(matchesDistinctExtremes).length;
  const fileBase = `ege_task9_distinct_${Date.now()}`;

  return {
    mode: "spreadsheet_distinct_extremes",
    chips: [
      { text: TEMPLATE_LABELS.spreadsheet_distinct_extremes },
      { text: "Файл: .xlsx", kind: "alt" },
      { text: "Ответ: количество строк", kind: "warn" },
    ],
    theory: {
      chips: [
        { text: "Задание 9" },
        { text: "СЧЁТЕСЛИ", kind: "alt" },
        { text: "МАКС / МИН / СУММ", kind: "warn" },
      ],
      intro:
        "В этом шаблоне задача распадается на две независимые проверки: сначала нужно убедиться, что все числа в строке различны, затем сравнить выражение через минимальное, максимальное и остальные значения. Такой тип удобно решать через вспомогательные столбцы.",
      cards: [
        {
          title: "Какие идеи используются",
          items: [
            "СЧЁТЕСЛИ по строке показывает, сколько раз встречается каждое значение.",
            "МАКС и МИН дают крайние элементы строки без ручной сортировки.",
            "СУММ по строке позволяет быстро получить сумму остальных чисел как разность.",
          ],
        },
        {
          title: "На что обращать внимание",
          items: [
            "Нужно считать именно количество строк, а не номер первой подходящей строки.",
            "При копировании формул диапазон строки удобно зафиксировать смешанными ссылками.",
            "Логические проверки можно записывать через ЕСЛИ или арифметически через умножение условий.",
          ],
        },
      ],
    },
    conditionHtml: `
      <p>
        Откройте файл электронной таблицы, содержащей в каждой строке пять
        натуральных чисел. Определите количество строк таблицы, содержащих
        числа, для которых выполнены оба условия:
      </p>
      ${renderBulletList([
        "все числа в строке различны;",
        "удвоенная сумма максимального и минимального чисел строки не меньше суммы трёх остальных чисел.",
      ])}
      <p>В ответе запишите только число.</p>
    `,
    rows,
    fileBase,
    fileType: "xlsx",
    params: [
      { label: "Строк", value: rowsCount },
      { label: "Чисел в строке", value: 5 },
      { label: "Шаблон", value: "Все числа различны + экстремумы" },
    ],
    solution: {
      steps: [
        "Добавляем пять вспомогательных столбцов и в каждом считаем, сколько раз встречается соответствующее число в пределах строки. Если все числа различны, сумма этих пяти счётчиков равна 5.",
        "Отдельно считаем сумму минимального и максимального элементов строки, затем сумму трёх остальных чисел.",
        "Проверяем второе условие: нужно, чтобы удвоенная сумма экстремумов была не меньше суммы остальных трёх чисел.",
        "В итоговом столбце отмечаем строки, где одновременно выполнены обе проверки, и суммируем единицы.",
      ],
      formulas: [
        "F1: =СЧЁТЕСЛИ($A1:$E1;A1)",
        "G1: =СЧЁТЕСЛИ($A1:$E1;B1)",
        "H1: =СЧЁТЕСЛИ($A1:$E1;C1)",
        "I1: =СЧЁТЕСЛИ($A1:$E1;D1)",
        "J1: =СЧЁТЕСЛИ($A1:$E1;E1)",
        "K1: =СУММ(F1:J1)",
        "L1: =МАКС(A1:E1)+МИН(A1:E1)",
        "M1: =СУММ(A1:E1)-L1",
        "N1: =(K1=5)*(2*L1>=M1)",
        `Ответ: =СУММ(N1:N${rowsCount})`,
      ],
      answer: String(answer),
      python: `def ok(row):\n    nums = sorted(row)\n    return len(set(nums)) == 5 and 2 * (nums[0] + nums[-1]) >= sum(nums[1:-1])\n\ncount = 0\nwith open('${fileBase}.txt', encoding='utf-8') as f:\n    for line in f:\n        row = [int(x) for x in line.split()]\n        count += ok(row)\nprint(count)`,
    },
  };
}

function makeOnePairRowMatch() {
  while (true) {
    const dup = randInt(20, 120);
    const uniques = sampleDistinct(3, 5, 180).filter((x) => x !== dup);
    if (uniques.length < 3) {
      continue;
    }
    const row = [dup, dup, uniques[0], uniques[1], uniques[2]];
    const uniqueAvg = average(uniques);
    if (uniqueAvg <= dup * 2) {
      return shuffle(row);
    }
  }
}

function makeOnePairRowFail() {
  if (Math.random() < 0.5) {
    return shuffle(sampleDistinct(5, 5, 180));
  }
  while (true) {
    const dup = randInt(5, 55);
    const uniques = sampleDistinct(3, 120, 250).filter((x) => x !== dup);
    if (uniques.length < 3) {
      continue;
    }
    const row = [dup, dup, uniques[0], uniques[1], uniques[2]];
    if (average(uniques) > dup * 2) {
      return shuffle(row);
    }
  }
}

function matchesOnePair(row) {
  const counts = countMap(row);
  const signature = [...counts.values()].sort((a, b) => a - b);
  if (signature.join(",") !== "1,1,1,2") {
    return false;
  }
  const uniques = [];
  let repeatedSum = 0;
  for (const value of row) {
    if (counts.get(value) === 1) {
      uniques.push(value);
    } else {
      repeatedSum += value;
    }
  }
  return average(uniques) <= repeatedSum;
}

function generateOnePairVariant() {
  const rowsCount = 3200;
  const rows = buildRows(rowsCount, makeOnePairRowMatch, makeOnePairRowFail, 0.18);
  const answer = rows.filter(matchesOnePair).length;
  const fileBase = `ege_task9_one_pair_${Date.now()}`;

  return {
    mode: "spreadsheet_one_pair",
    chips: [
      { text: TEMPLATE_LABELS.spreadsheet_one_pair },
      { text: "Файл: .xlsx", kind: "alt" },
      { text: "Ответ: количество строк", kind: "warn" },
    ],
    theory: {
      chips: [
        { text: "Задание 9" },
        { text: "Повторы в строке", kind: "alt" },
        { text: "СУММЕСЛИ / СРЗНАЧЕСЛИ", kind: "warn" },
      ],
      intro:
        "Если в условии есть фраза про одну повторяющуюся пару и отдельные неповторяющиеся числа, удобно сначала построить столбцы частот, а потом уже отдельными формулами вычислить сумму повторяющихся и среднее неповторяющихся значений.",
      cards: [
        {
          title: "Что нужно проверить",
          items: [
            "Ровно одно число встречается дважды, а три остальных — по одному разу.",
            "Среднее арифметическое неповторяющихся чисел не больше суммы повторяющихся чисел.",
            "Значит, задача сводится к двум промежуточным вычислениям и одной финальной проверке.",
          ],
        },
        {
          title: "Какие функции удобны",
          items: [
            "СЧЁТЕСЛИ — посчитать кратности.",
            "СУММЕСЛИ — сложить значения, у которых кратность больше 1.",
            "СРЗНАЧЕСЛИ — найти среднее только по уникальным числам.",
          ],
        },
      ],
    },
    conditionHtml: `
      <p>
        Откройте файл электронной таблицы, содержащей в каждой строке пять
        натуральных чисел. Определите количество строк, для которых выполнены
        оба условия:
      </p>
      ${renderBulletList([
        "в строке ровно одно число повторяется два раза, остальные три числа различны;",
        "среднее арифметическое неповторяющихся чисел строки не больше суммы повторяющихся чисел.",
      ])}
      <p>В ответе запишите только число.</p>
    `,
    rows,
    fileBase,
    fileType: "xlsx",
    params: [
      { label: "Строк", value: rowsCount },
      { label: "Чисел в строке", value: 5 },
      { label: "Шаблон", value: "Одна пара повторов" },
    ],
    solution: {
      steps: [
        "В пяти вспомогательных столбцах считаем кратность каждого числа в строке.",
        "Если в строке одна пара повторов, то сумма кратностей по строке равна 7: два раза число с кратностью 2 и три раза числа с кратностью 1.",
        "Далее через СУММЕСЛИ находим сумму повторяющихся чисел, а через СРЗНАЧЕСЛИ — среднее арифметическое уникальных чисел.",
        "В итоговом столбце оставляем только строки, где выполнены обе проверки, после чего суммируем единицы.",
      ],
      formulas: [
        "F1: =СЧЁТЕСЛИ($A1:$E1;A1)",
        "G1: =СЧЁТЕСЛИ($A1:$E1;B1)",
        "H1: =СЧЁТЕСЛИ($A1:$E1;C1)",
        "I1: =СЧЁТЕСЛИ($A1:$E1;D1)",
        "J1: =СЧЁТЕСЛИ($A1:$E1;E1)",
        "K1: =СУММЕСЛИ(F1:J1;\">1\";A1:E1)",
        "L1: =СРЗНАЧЕСЛИ(F1:J1;\"=1\";A1:E1)",
        "M1: =(СУММ(F1:J1)=7)*(L1<=K1)",
        `Ответ: =СУММ(M1:M${rowsCount})`,
      ],
      answer: String(answer),
      python: `from collections import Counter\n\ndef ok(row):\n    cnt = Counter(row)\n    if sorted(cnt.values()) != [1, 1, 1, 2]:\n        return False\n    unique_values = [x for x in cnt if cnt[x] == 1]\n    repeated_sum = sum(x for x in row if cnt[x] == 2)\n    return sum(unique_values) / 3 <= repeated_sum\n\ncount = 0\nwith open('${fileBase}.txt', encoding='utf-8') as f:\n    for line in f:\n        row = [int(x) for x in line.split()]\n        count += ok(row)\nprint(count)`,
    },
  };
}

function makeThreePairsRowMatch() {
  while (true) {
    const pairs = sortedNumbers(sampleDistinct(3, 10, 140));
    const unique = randInt(pairs[2] + 5, 220);
    const row = [pairs[0], pairs[0], pairs[1], pairs[1], pairs[2], pairs[2], unique];
    if ((pairs[0] + pairs[2]) / 2 < unique) {
      return shuffle(row);
    }
  }
}

function makeThreePairsRowFail() {
  if (Math.random() < 0.45) {
    return shuffle(sampleDistinct(7, 10, 220));
  }
  while (true) {
    const pairs = sortedNumbers(sampleDistinct(3, 40, 180));
    const unique = randInt(5, pairs[2]);
    const row = [pairs[0], pairs[0], pairs[1], pairs[1], pairs[2], pairs[2], unique];
    if ((pairs[0] + pairs[2]) / 2 >= unique) {
      return shuffle(row);
    }
  }
}

function matchesThreePairs(row) {
  const counts = countMap(row);
  const signature = [...counts.values()].sort((a, b) => a - b);
  if (signature.join(",") !== "1,2,2,2") {
    return false;
  }
  const repeated = [...counts.entries()]
    .filter(([, count]) => count === 2)
    .map(([value]) => value)
    .sort((a, b) => a - b);
  const unique = [...counts.entries()].find(([, count]) => count === 1)[0];
  return average([repeated[0], repeated[2]]) < unique;
}

function generateThreePairsVariant() {
  const rowsCount = 12000;
  const rows = buildRows(
    rowsCount,
    makeThreePairsRowMatch,
    makeThreePairsRowFail,
    0.16
  );
  const answer = rows.filter(matchesThreePairs).length;
  const fileBase = `ege_task9_three_pairs_${Date.now()}`;

  return {
    mode: "spreadsheet_three_pairs",
    chips: [
      { text: TEMPLATE_LABELS.spreadsheet_three_pairs },
      { text: "Файл: .xlsx", kind: "alt" },
      { text: "Ответ: количество строк", kind: "warn" },
    ],
    theory: {
      chips: [
        { text: "Задание 9" },
        { text: "Сложный шаблон повторов", kind: "alt" },
        { text: "МИНЕСЛИ / МАКСЕСЛИ", kind: "warn" },
      ],
      intro:
        "Когда в строке много чисел и важен рисунок повторов, сначала удобно определить именно структуру кратностей, а уже потом считать выражение из чисел нужной группы. Для этого отлично подходят СЧЁТЕСЛИ, МИНЕСЛИ и МАКСЕСЛИ.",
      cards: [
        {
          title: "Что здесь означает первый пункт",
          items: [
            "Три разных значения встречаются по два раза.",
            "Ещё одно значение встречается ровно один раз.",
            "Сумма кратностей по строке в таком случае равна 13.",
          ],
        },
        {
          title: "Как получить вторую проверку",
          items: [
            "Среди повторяющихся значений находим минимальное и максимальное.",
            "Их среднее сравниваем с единственным неповторяющимся числом.",
            "После этого остаётся только сложить единицы в итоговом столбце.",
          ],
        },
      ],
    },
    conditionHtml: `
      <p>
        Откройте файл электронной таблицы, содержащей в каждой строке семь
        натуральных чисел. Определите количество строк, для которых выполнены
        оба условия:
      </p>
      ${renderBulletList([
        "в строке есть ровно три числа, каждое из которых повторяется дважды, и одно число без повторений;",
        "среднее арифметическое минимального и максимального среди повторяющихся чисел строки меньше неповторяющегося числа.",
      ])}
      <p>В ответе запишите только число.</p>
    `,
    rows,
    fileBase,
    fileType: "xlsx",
    params: [
      { label: "Строк", value: rowsCount },
      { label: "Чисел в строке", value: 7 },
      { label: "Шаблон", value: "Три пары и одно уникальное число" },
    ],
    solution: {
      steps: [
        "Сначала в семи вспомогательных столбцах считаем, сколько раз встречается каждое число строки.",
        "Если есть три пары и одно уникальное число, сумма кратностей по строке равна 13.",
        "Далее среди чисел, у которых кратность больше 1, находим минимальное и максимальное значения, а среди чисел с кратностью 1 — уникальное значение.",
        "Проверяем сравнение и суммируем итоговый столбец.",
      ],
      formulas: [
        "H1: =СЧЁТЕСЛИ($A1:$G1;A1)",
        "I1: =СЧЁТЕСЛИ($A1:$G1;B1)",
        "J1: =СЧЁТЕСЛИ($A1:$G1;C1)",
        "K1: =СЧЁТЕСЛИ($A1:$G1;D1)",
        "L1: =СЧЁТЕСЛИ($A1:$G1;E1)",
        "M1: =СЧЁТЕСЛИ($A1:$G1;F1)",
        "N1: =СЧЁТЕСЛИ($A1:$G1;G1)",
        "O1: =(СУММ(H1:N1)=13)",
        "P1: =СРЗНАЧ(МИНЕСЛИ(A1:G1;H1:N1;\">1\");МАКСЕСЛИ(A1:G1;H1:N1;\">1\"))",
        "Q1: =СУММЕСЛИ(H1:N1;\"=1\";A1:G1)",
        "R1: =O1*(P1<Q1)",
        `Ответ: =СУММ(R1:R${rowsCount})`,
      ],
      answer: String(answer),
      python: `from collections import Counter\n\ndef ok(row):\n    cnt = Counter(row)\n    if sorted(cnt.values()) != [1, 2, 2, 2]:\n        return False\n    repeated = sorted(x for x in cnt if cnt[x] == 2)\n    unique = next(x for x in cnt if cnt[x] == 1)\n    return (repeated[0] + repeated[-1]) / 2 < unique\n\ncount = 0\nwith open('${fileBase}.txt', encoding='utf-8') as f:\n    for line in f:\n        row = [int(x) for x in line.split()]\n        count += ok(row)\nprint(count)`,
    },
  };
}

function makeTwoPairsRowMatch() {
  while (true) {
    const repeated = sortedNumbers(sampleDistinct(2, 10, 150));
    const unique = sampleDistinct(3, 80, 240).filter(
      (x) => !repeated.includes(x)
    );
    if (unique.length < 3) {
      continue;
    }
    const row = [
      repeated[0],
      repeated[0],
      repeated[1],
      repeated[1],
      unique[0],
      unique[1],
      unique[2],
    ];
    if (average(repeated) < average(row)) {
      return shuffle(row);
    }
  }
}

function makeTwoPairsRowFail() {
  if (Math.random() < 0.45) {
    return shuffle(sampleDistinct(7, 10, 240));
  }
  while (true) {
    const repeated = sortedNumbers(sampleDistinct(2, 120, 240));
    const unique = sampleDistinct(3, 10, 90).filter((x) => !repeated.includes(x));
    if (unique.length < 3) {
      continue;
    }
    const row = [
      repeated[0],
      repeated[0],
      repeated[1],
      repeated[1],
      unique[0],
      unique[1],
      unique[2],
    ];
    if (average(repeated) >= average(row)) {
      return shuffle(row);
    }
  }
}

function matchesTwoPairs(row) {
  const counts = countMap(row);
  const signature = [...counts.values()].sort((a, b) => a - b);
  if (signature.join(",") !== "1,1,1,2,2") {
    return false;
  }
  const repeated = [...counts.entries()]
    .filter(([, count]) => count === 2)
    .map(([value]) => value);
  return average(repeated) < average(row);
}

function generateTwoPairsVariant() {
  const rowsCount = 16000;
  const rows = buildRows(
    rowsCount,
    makeTwoPairsRowMatch,
    makeTwoPairsRowFail,
    0.17
  );
  const answer = rows.filter(matchesTwoPairs).length;
  const fileBase = `ege_task9_two_pairs_${Date.now()}`;

  return {
    mode: "spreadsheet_two_pairs",
    chips: [
      { text: TEMPLATE_LABELS.spreadsheet_two_pairs },
      { text: "Файл: .xlsx", kind: "alt" },
      { text: "Ответ: количество строк", kind: "warn" },
    ],
    theory: {
      chips: [
        { text: "Задание 9" },
        { text: "Комбинация повторов", kind: "alt" },
        { text: "СЧЁТЕСЛИ + средние", kind: "warn" },
      ],
      intro:
        "В этом типе задачи мало просто посчитать повторы: важно отделить повторяющиеся значения от всех остальных и затем сравнить два средних арифметических. Такой шаблон удобно решать и через таблицу, и через Python.",
      cards: [
        {
          title: "Структура строки",
          items: [
            "Два разных числа встречаются по два раза.",
            "Ещё три числа встречаются по одному разу.",
            "Значит, частоты образуют подпись [1, 1, 1, 2, 2].",
          ],
        },
        {
          title: "Второе условие",
          items: [
            "Находим среднее арифметическое повторяющихся значений.",
            "Находим среднее арифметическое всех семи чисел строки.",
            "Сравниваем их и суммируем строки, где неравенство выполняется.",
          ],
        },
      ],
    },
    conditionHtml: `
      <p>
        Откройте файл электронной таблицы, содержащей в каждой строке семь
        натуральных чисел. Определите количество строк, для которых выполнены
        оба условия:
      </p>
      ${renderBulletList([
        "в строке есть два числа, каждое из которых повторяется дважды, а остальные три числа различны;",
        "среднее арифметическое повторяющихся значений строки меньше среднего арифметического всех чисел строки.",
      ])}
      <p>В ответе запишите только число.</p>
    `,
    rows,
    fileBase,
    fileType: "xlsx",
    params: [
      { label: "Строк", value: rowsCount },
      { label: "Чисел в строке", value: 7 },
      { label: "Шаблон", value: "Две пары и три уникальных числа" },
    ],
    solution: {
      steps: [
        "В семи дополнительных столбцах считаем кратность каждого числа в строке.",
        "Первое условие удобно проверить по рисунку повторов: должно быть ровно четыре ячейки с кратностью 2 и три ячейки с кратностью 1.",
        "Отдельно считаем среднее арифметическое повторяющихся значений и среднее арифметическое всей строки.",
        "Остаётся сравнить их и просуммировать итоговый столбец.",
      ],
      formulas: [
        "H1: =СЧЁТЕСЛИ($A1:$G1;A1)",
        "I1: =СЧЁТЕСЛИ($A1:$G1;B1)",
        "J1: =СЧЁТЕСЛИ($A1:$G1;C1)",
        "K1: =СЧЁТЕСЛИ($A1:$G1;D1)",
        "L1: =СЧЁТЕСЛИ($A1:$G1;E1)",
        "M1: =СЧЁТЕСЛИ($A1:$G1;F1)",
        "N1: =СЧЁТЕСЛИ($A1:$G1;G1)",
        "O1: =(СЧЁТЕСЛИ(H1:N1;2)=4)*(СЧЁТЕСЛИ(H1:N1;1)=3)",
        "P1: =СУММЕСЛИ(H1:N1;\">1\";A1:G1)/4",
        "Q1: =СУММ(A1:G1)/7",
        "R1: =O1*(P1<Q1)",
        `Ответ: =СУММ(R1:R${rowsCount})`,
      ],
      answer: String(answer),
      python: `from collections import Counter\n\ndef ok(row):\n    cnt = Counter(row)\n    if sorted(cnt.values()) != [1, 1, 1, 2, 2]:\n        return False\n    repeated = [x for x in cnt if cnt[x] == 2]\n    return sum(repeated) / 2 < sum(row) / 7\n\ncount = 0\nwith open('${fileBase}.txt', encoding='utf-8') as f:\n    for line in f:\n        row = [int(x) for x in line.split()]\n        count += ok(row)\nprint(count)`,
    },
  };
}

function makeTextRowMatch(ruleId) {
  while (true) {
    const nums = sortedNumbers(sampleDistinct(3, 2, 120));
    if (
      (ruleId === "acute" &&
        nums[2] ** 2 < nums[0] ** 2 + nums[1] ** 2) ||
      (ruleId === "dominant" && nums[2] ** 2 > 2 * nums[0] * nums[1])
    ) {
      return shuffle(nums);
    }
  }
}

function makeTextRowFail(ruleId) {
  if (Math.random() < 0.35) {
    const a = randInt(2, 120);
    const b = randInt(2, 120);
    return [a, b, a];
  }
  while (true) {
    const nums = sortedNumbers(sampleDistinct(3, 2, 120));
    if (
      (ruleId === "acute" &&
        !(nums[2] ** 2 < nums[0] ** 2 + nums[1] ** 2)) ||
      (ruleId === "dominant" && !(nums[2] ** 2 > 2 * nums[0] * nums[1]))
    ) {
      return shuffle(nums);
    }
  }
}

function matchesTextRule(row, ruleId) {
  const nums = sortedNumbers(row);
  if (new Set(nums).size !== 3) {
    return false;
  }
  if (ruleId === "acute") {
    return nums[2] ** 2 < nums[0] ** 2 + nums[1] ** 2;
  }
  return nums[2] ** 2 > 2 * nums[0] * nums[1];
}

function generateTextVariant() {
  const rowsCount = 5000;
  const ruleId = pick(["acute", "dominant"]);
  const rows = buildRows(
    rowsCount,
    () => makeTextRowMatch(ruleId),
    () => makeTextRowFail(ruleId),
    0.22
  );
  const answer = rows.filter((row) => matchesTextRule(row, ruleId)).length;
  const fileBase = `ege_task9_text_${ruleId}_${Date.now()}`;

  const conditionSecond =
    ruleId === "acute"
      ? "квадрат максимального из трёх чисел меньше суммы квадратов двух остальных;"
      : "квадрат максимального из трёх чисел больше удвоенного произведения двух остальных.";
  const pythonCondition =
    ruleId === "acute"
      ? "nums[-1] ** 2 < nums[0] ** 2 + nums[1] ** 2"
      : "nums[-1] ** 2 > 2 * nums[0] * nums[1]";

  return {
    mode: "text_three_numbers",
    chips: [
      { text: TEMPLATE_LABELS.text_three_numbers },
      { text: "Файл: .txt", kind: "alt" },
      { text: "Ответ: количество строк", kind: "warn" },
    ],
    theory: {
      chips: [
        { text: "Задание 9" },
        { text: "Текстовый файл", kind: "alt" },
        { text: "Сортировка строки", kind: "warn" },
      ],
      intro:
        "Для текстового файла удобнее всего читать данные построчно и сразу сортировать тройку чисел. После сортировки минимальные числа оказываются слева, а максимальное — справа, и условие можно проверять одной короткой формулой.",
      cards: [
        {
          title: "Почему полезна сортировка",
          items: [
            "После sorted не нужно отдельно искать максимум и минимум.",
            "Максимальный элемент всегда находится в конце списка.",
            "Это позволяет записать проверку условия очень компактно.",
          ],
        },
        {
          title: "Что ещё проверить",
          items: [
            "В строке должны быть три различных числа.",
            "После проверки уникальности применяем основное неравенство.",
            "Если условие истинно, увеличиваем счётчик подходящих строк.",
          ],
        },
      ],
    },
    conditionHtml: `
      <p>
        Откройте текстовый файл, содержащий в каждой строке три натуральных
        числа. Определите количество строк, для которых выполнены оба условия:
      </p>
      ${renderBulletList([
        "все три числа различны;",
        conditionSecond,
      ])}
      <p>В ответе запишите только число.</p>
    `,
    rows,
    fileBase,
    fileType: "txt",
    params: [
      { label: "Строк", value: rowsCount },
      { label: "Чисел в строке", value: 3 },
      { label: "Шаблон", value: ruleId === "acute" ? "Квадраты сторон" : "Квадрат и произведение" },
    ],
    solution: {
      steps: [
        "Считываем файл построчно, чтобы не хранить лишние данные в памяти.",
        "Каждую тройку сортируем. После сортировки максимальное число стоит в конце массива.",
        "Сначала проверяем, что все три числа различны, то есть размер множества равен 3.",
        `После этого проверяем основное условие: <code>${escapeHtml(
          ruleId === "acute"
            ? "max² < a² + b²"
            : "max² > 2ab"
        )}</code>.`,
        "Подходящие строки считаем счётчиком.",
      ],
      formulas: [
        "Для этого типа удобнее использовать программирование или загрузку файла в Calc с отдельным разбиением по столбцам.",
        "Ключевая идея — отсортировать тройку и проверить условие уже по упорядоченным значениям.",
      ],
      answer: String(answer),
      python: `count = 0\nwith open('${fileBase}.txt', encoding='utf-8') as f:\n    for line in f:\n        nums = sorted(int(x) for x in line.split())\n        count += len(set(nums)) == 3 and (${pythonCondition})\nprint(count)`,
    },
  };
}

function buildFiles(variant) {
  revokeDownloads();
  const files = [];

  if (variant.fileType === "xlsx") {
    const xlsxBlob = createWorkbookBlob(variant.rows);
    files.push({
      label: "Microsoft Excel (.xlsx)",
      name: `${variant.fileBase}.xlsx`,
      url: createBlobUrl(xlsxBlob),
      kind: "",
    });
  }

  const txtBlob = createDelimitedBlob(variant.rows, "\t");
  files.push({
    label: variant.fileType === "txt" ? "TXT (.txt)" : "TXT (табличный экспорт)",
    name: `${variant.fileBase}.txt`,
    url: createBlobUrl(txtBlob),
    kind: variant.fileType === "txt" ? "alt" : "neutral",
  });

  return files;
}

function buildVariant(mode) {
  const actualMode =
    mode === "random"
      ? pick([
          "spreadsheet_distinct_extremes",
          "spreadsheet_one_pair",
          "spreadsheet_three_pairs",
          "spreadsheet_two_pairs",
          "text_three_numbers",
        ])
      : mode;

  if (actualMode === "spreadsheet_distinct_extremes") {
    return generateDistinctExtremesVariant();
  }
  if (actualMode === "spreadsheet_one_pair") {
    return generateOnePairVariant();
  }
  if (actualMode === "spreadsheet_three_pairs") {
    return generateThreePairsVariant();
  }
  if (actualMode === "spreadsheet_two_pairs") {
    return generateTwoPairsVariant();
  }
  return generateTextVariant();
}

function mountVariant(variant) {
  const theoryWrap = document.getElementById("theoryWrap");
  const taskText = document.getElementById("taskText");
  const filesWrap = document.getElementById("filesWrap");
  const paramsWrap = document.getElementById("paramsWrap");
  const previewWrap = document.getElementById("previewWrap");
  const solutionWrap = document.getElementById("solutionWrap");

  const files = buildFiles(variant);
  theoryWrap.innerHTML = renderTheory(variant.theory);
  taskText.innerHTML = `${renderChips(variant.chips)}${variant.conditionHtml}`;
  filesWrap.innerHTML = renderFiles(files);
  paramsWrap.innerHTML = renderParams(variant.params);
  previewWrap.innerHTML = renderPreview(
    variant.rows.slice(0, 8),
    `Показаны первые 8 строк из ${variant.rows.length}.`
  );
  solutionWrap.innerHTML = renderSolution(variant.solution);
}

function initTask9() {
  const select = document.getElementById("taskMode");
  const button = document.getElementById("generateBtn");

  const render = () => {
    const variant = buildVariant(select.value);
    mountVariant(variant);
  };

  button.addEventListener("click", render);
  render();
}

if (typeof document !== "undefined") {
  initTask9();
}

if (typeof globalThis !== "undefined") {
  globalThis.__task9Generators = {
    buildVariant,
    generateDistinctExtremesVariant,
    generateOnePairVariant,
    generateThreePairsVariant,
    generateTwoPairsVariant,
    generateTextVariant,
    matchesDistinctExtremes,
    matchesOnePair,
    matchesThreePairs,
    matchesTwoPairs,
    matchesTextRule,
  };
}
