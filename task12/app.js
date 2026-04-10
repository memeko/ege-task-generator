"use strict";

const MODE_LABELS = {
  random: "Случайный режим",
  nam_order: "НАМ: упорядочивание символов",
  nam_reduce: "НАМ: сокращение строки",
  turing_cycle: "МТ: циклическая замена символов",
  post_marks: "МП: работа с метками",
};

const POST_PROGRAM = [
  "R, 2",
  "? 3, 1",
  "L, 4",
  "λ, 5",
  "L, 6",
  "? 17, 7",
  "λ, 8",
  "L, 9",
  "? 10, 8",
  "L, 11",
  "? 12, 10",
  "1, 13",
  "R, 14",
  "? 15, 13",
  "R, 16",
  "? 17, 1",
  "!",
];

const TURING_PROGRAM = {
  symbols: ["λ", "0", "1", "2"],
  states: ["q0", "q1"],
  cells: {
    q0: {
      λ: "λ, R, q1",
      0: "",
      1: "",
      2: "",
    },
    q1: {
      λ: "λ, S, q1",
      0: "1, R, q1",
      1: "2, R, q1",
      2: "0, R, q1",
    },
  },
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(items) {
  return items[randInt(0, items.length - 1)];
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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

function renderRulesTable(rules, caption) {
  return `
    <p class="program-caption">${caption}</p>
    <div class="program-table-wrap">
      <table class="compact-table">
        <thead>
          <tr>
            <th>Приоритет</th>
            <th>Подстановка</th>
          </tr>
        </thead>
        <tbody>
          ${rules
            .map(
              (rule, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><code>${escapeHtml(rule.left)} ⟶ ${escapeHtml(
                rule.right
              )}</code></td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTransitionTable(program, caption) {
  return `
    <p class="program-caption">${caption}</p>
    <div class="program-table-wrap">
      <table class="transition-table">
        <thead>
          <tr>
            <th>Состояние \\ символ</th>
            ${program.symbols
              .map((symbol) => `<th>${escapeHtml(symbol)}</th>`)
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${program.states
            .map(
              (state) => `
                <tr>
                  <th>${escapeHtml(state)}</th>
                  ${program.symbols
                    .map((symbol) => {
                      const value = program.cells[state][symbol];
                      return `<td>${value ? `<code>${escapeHtml(value)}</code>` : "—"}</td>`;
                    })
                    .join("")}
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderCommandTable(commands, caption) {
  return `
    <p class="program-caption">${caption}</p>
    <div class="program-table-wrap">
      <table class="command-table">
        <thead>
          <tr>
            <th>№ строки</th>
            <th>Команда</th>
          </tr>
        </thead>
        <tbody>
          ${commands
            .map(
              (command, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><code>${escapeHtml(command)}</code></td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderProgram(program) {
  if (program.type === "rules") {
    return renderRulesTable(program.rules, program.caption);
  }
  if (program.type === "transition") {
    return renderTransitionTable(program.data, program.caption);
  }
  return renderCommandTable(program.commands, program.caption);
}

function renderSolution(solution) {
  return `
    <details>
      <summary>Показать пошаговый разбор и ответ (спойлер)</summary>
      <ol>
        ${solution.steps.map((step) => `<li>${step}</li>`).join("")}
      </ol>
      ${
        solution.extra
          ? `<div class="note-box">${solution.extra}</div>`
          : ""
      }
      <div class="answer-box">Ответ: ${escapeHtml(solution.answer)}</div>
      <div class="python-wrap">
        <pre><code>${escapeHtml(solution.pythonCode)}</code></pre>
      </div>
    </details>
  `;
}

function getPositions(total, count) {
  const values = new Set();
  while (values.size < count) {
    values.add(randInt(1, total));
  }
  return [...values].sort((a, b) => a - b);
}

function locateBlock(blocks, position) {
  return blocks.find((block) => position >= block.from && position <= block.to);
}

function makeNamRules(order) {
  const rank = Object.fromEntries(order.map((symbol, index) => [symbol, index]));
  const symbols = [...order];
  const rules = [];
  for (const left of symbols) {
    for (const right of symbols) {
      if (left !== right && rank[left] > rank[right]) {
        rules.push({ left: left + right, right: right + left });
      }
    }
  }
  return rules;
}

function generateNamOrder() {
  const order = pick([
    ["0", "1", "2"],
    ["0", "2", "1"],
    ["1", "0", "2"],
    ["1", "2", "0"],
    ["2", "0", "1"],
    ["2", "1", "0"],
  ]);
  const counts = {
    0: randInt(140, 360),
    1: randInt(140, 360),
    2: randInt(90, 220),
  };
  const total = counts[0] + counts[1] + counts[2];
  const positions = getPositions(total, 3);
  const rules = makeNamRules(order);
  const comparisons = rules.map((rule) => {
    const left = rule.left[0];
    const right = rule.left[1];
    return `из подстановки <code>${rule.left} ⟶ ${rule.right}</code> следует, что символ <code>${right}</code> должен оказаться левее символа <code>${left}</code>`;
  });

  let current = 1;
  const blocks = order.map((symbol) => {
    const from = current;
    const to = current + counts[symbol] - 1;
    current = to + 1;
    return { symbol, from, to };
  });

  const answer = positions
    .map((position) => locateBlock(blocks, position).symbol)
    .join("");

  const rangesTable = `
    <div class="solution-table-wrap">
      <table class="compact-table">
        <thead>
          <tr>
            <th>Блок</th>
            <th>Диапазон позиций</th>
          </tr>
        </thead>
        <tbody>
          ${blocks
            .map(
              (block) => `
                <tr>
                  <td><code>${block.symbol}</code></td>
                  <td>${block.from}…${block.to}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  return {
    theory: {
      chips: [
        { text: "Новые исполнители" },
        { text: "НАМ", kind: "alt" },
        { text: "Упорядочивание символов", kind: "warn" },
      ],
      intro:
        "Нормальный алгоритм Маркова работает со строкой и ранжированным списком подстановок. На каждом шаге применяется ровно одна подстановка: сначала выбирается правило с наивысшим приоритетом, затем в строке заменяется первое слева подходящее вхождение.",
      cards: [
        {
          title: "Что важно помнить",
          items: [
            "Подстановки рассматриваются сверху вниз: более раннее правило важнее более позднего.",
            "Если в строке несколько подходящих фрагментов, заменяется только первое слева вхождение.",
            "Программа останавливается, когда ни одно правило уже нельзя применить.",
          ],
        },
        {
          title: "Идея именно этого шаблона",
          items: [
            "Каждая подстановка меняет местами две соседние цифры, стоящие в «неправильном» порядке.",
            "По набору правил можно восстановить, какая цифра должна быть левее другой.",
            "После завершения алгоритма строка распадается на сплошные блоки одинаковых символов в одном фиксированном порядке.",
          ],
        },
      ],
    },
    chips: [
      { text: MODE_LABELS.nam_order },
      { text: "Ответ: 3 символа", kind: "alt" },
    ],
    conditionHtml: `
      <p>
        Исполнитель для нормальных алгоритмов Маркова (НАМ) преобразует строку по
        правилам замены, перечисленным по убыванию приоритета. На каждом шаге
        применяется ровно одна подстановка с наивысшим приоритетом, причём
        заменяется первое слева подходящее вхождение.
      </p>
      <p>
        Для исполнителя НАМ задан следующий алгоритм. На вход подана строка,
        содержащая только символы <code>0</code>, <code>1</code> и
        <code>2</code>: <code>0</code> встречается ${counts[0]} раз,
        <code>1</code> — ${counts[1]} раз, <code>2</code> — ${counts[2]} раз.
        Какие символы будут стоять на позициях ${positions.join(", ")} в итоговой
        строке? В ответе укажите найденные символы подряд без разделителей.
      </p>
    `,
    program: {
      type: "rules",
      caption: "Подстановки образуют шаблон соседних обменов и в итоге сортируют строку по скрытому порядку символов.",
      rules,
    },
    solution: {
      steps: [
        `Сначала восстанавливаем относительный порядок символов: ${comparisons.join(
          "; "
        )}.`,
        `Значит, после завершения алгоритма вся строка будет иметь вид <code>${escapeHtml(
          order[0]
        )}</code>…<code>${escapeHtml(order[0])}</code>, затем блок из <code>${escapeHtml(
          order[1]
        )}</code>, затем блок из <code>${escapeHtml(order[2])}</code>.`,
        `Длины блоков известны из условия: символ <code>${escapeHtml(
          order[0]
        )}</code> занимает ${counts[order[0]]} позиций, затем идёт ${counts[order[1]]} символов <code>${escapeHtml(
          order[1]
        )}</code>, затем ${counts[order[2]]} символов <code>${escapeHtml(
          order[2]
        )}</code>. ${rangesTable}`,
        `Проверяем нужные позиции: ${positions
          .map((position) => {
            const block = locateBlock(blocks, position);
            return `${position}-я позиция попадает в блок <code>${block.symbol}</code>`;
          })
          .join("; ")}.`,
        `Записываем символы в требуемом порядке позиций и получаем ответ <code>${answer}</code>.`,
      ],
      answer,
      pythonCode: `# порядок символов после завершения НАМ
order = ${JSON.stringify(order)}

# сколько раз встречается каждый символ
counts = {"0": ${counts[0]}, "1": ${counts[1]}, "2": ${counts[2]}}

# позиции из условия
positions = ${JSON.stringify(positions)}

# строим итоговую строку сразу по блокам
final_string = "".join(symbol * counts[symbol] for symbol in order)

# собираем символы на нужных позициях
answer = "".join(final_string[position - 1] for position in positions)
print(answer)`,
    },
  };
}

function generateNamReduce() {
  const ones = randInt(650, 2600);
  const groups = Math.floor(ones / 5);
  const remainder = ones % 5;
  const questionType = pick(["length", "string"]);
  const bestString = `${"1".repeat(remainder)}0`;
  const answer = questionType === "length" ? String(remainder + 1) : bestString;

  return {
    theory: {
      chips: [
        { text: "Новые исполнители" },
        { text: "НАМ", kind: "alt" },
        { text: "Сокращение строки", kind: "warn" },
      ],
      intro:
        "В задачах на НАМ важно выделить роль каждого правила отдельно. Часто одно правило только переставляет символы, а другое уже сокращает строку. Тогда основная идея решения — понять, как специально расположить символы до начала работы исполнителя.",
      cards: [
        {
          title: "Как читать правила",
          items: [
            "Подстановка <code>01 ⟶ 10</code> сдвигает ноль вправо через единицу.",
            "Подстановка <code>110111 ⟶ 0</code> схлопывает фрагмент вокруг нуля и удаляет сразу пять единиц.",
            "Приоритет важен: сначала пытаемся применить длинную подстановку, и только если её нет — правило перестановки.",
          ],
        },
        {
          title: "Как искать оптимум",
          items: [
            "Нужно собрать вокруг нуля как можно больше фрагментов вида <code>11 0 111</code>.",
            "Каждый такой фрагмент уменьшает число единиц на 5.",
            "После всех сокращений оставшиеся единицы соберутся слева от нуля, потому что правило <code>01 ⟶ 10</code> гонит ноль вправо.",
          ],
        },
      ],
    },
    chips: [
      { text: MODE_LABELS.nam_reduce },
      {
        text:
          questionType === "length"
            ? "Ответ: целое число"
            : "Ответ: итоговая строка",
        kind: "alt",
      },
    ],
    conditionHtml: `
      <p>
        Для исполнителя НАМ задан следующий алгоритм. На вход подаётся строка,
        содержащая ${ones} символов <code>1</code> и ровно один символ
        <code>0</code>, расположенные в произвольном порядке.
      </p>
      <p>
        ${
          questionType === "length"
            ? `Найдите минимальную длину строки, которая может получиться в результате работы этого алгоритма.`
            : `Найдите строку минимальной длины, которая может получиться в результате работы этого алгоритма. Если таких строк несколько, укажите ту, чьё двоичное значение максимально.`
        }
      </p>
    `,
    program: {
      type: "rules",
      caption:
        "Сначала пытаемся схлопнуть длинный фрагмент, и только если он не найден, сдвигаем ноль вправо.",
      rules: [
        { left: "110111", right: "0" },
        { left: "01", right: "10" },
      ],
    },
    solution: {
      steps: [
        `Правило <code>110111 ⟶ 0</code> уничтожает сразу пять единиц: две стоят слева от нуля, три — справа.`,
        `Правило <code>01 ⟶ 10</code> просто сдвигает ноль вправо. Значит, чтобы правило сокращения сработало как можно больше раз, удобно изначально расположить ноль так, чтобы слева от него было <code>2k</code> единиц, а справа — <code>3k</code> единиц.`,
        `При ${ones} единицах можно выделить <code>k = ⌊${ones} / 5⌋ = ${groups}</code> полных групп по 5 единиц. Тогда правило сокращения можно запустить ${groups} раз подряд.`,
        `После этих сокращений останется <code>${ones} mod 5 = ${remainder}</code> единиц. Все они в конце окажутся слева от нуля, потому что правило <code>01 ⟶ 10</code> проталкивает ноль вправо через оставшиеся единицы.`,
        `${
          questionType === "length"
            ? `Значит, минимально возможная длина итоговой строки равна <code>${remainder} + 1 = ${
                remainder + 1
              }</code>.`
            : `Значит, строка минимальной длины имеет вид <code>${bestString}</code>. Именно она ещё и максимальна как двоичное число, потому что все оставшиеся единицы стоят левее нуля.`
        }`,
      ],
      extra:
        questionType === "length"
          ? `Проверочная итоговая строка при оптимальном расположении единиц и нуля: <code>${bestString}</code>.`
          : `Минимальная длина при этом равна <code>${remainder + 1}</code>.`,
      answer,
      pythonCode: `# количество единиц в исходной строке
n = ${ones}

# сколько полных пятёрок единиц можно уничтожить
k = n // 5
remainder = n % 5

# выгодная начальная строка: 2k единиц слева от 0 и 3k + remainder справа
s = "1" * (2 * k) + "0" + "1" * (3 * k + remainder)

# моделируем НАМ
while "110111" in s or "01" in s:
    if "110111" in s:
        s = s.replace("110111", "0", 1)
    else:
        s = s.replace("01", "10", 1)

print("Итоговая строка:", s)
print("Минимальная длина:", len(s))`,
    },
  };
}

function generateTuringCycle() {
  const total = randInt(900, 1500);
  const pairType = pick(["12", "01"]);
  const equalCount = randInt(140, Math.floor((total - 60) / 2));

  let resultCounts;
  let sumValue;
  let relationText;
  let solveText;

  if (pairType === "12") {
    resultCounts = {
      0: total - 2 * equalCount,
      1: equalCount,
      2: equalCount,
    };
    sumValue = 3 * equalCount;
    relationText =
      "получилась строка, в которой одинаковое количество символов 1 и 2";
    solveText = `Пусть после выполнения программы символов <code>1</code> и <code>2</code> стало по <code>x</code>. Тогда сумма значений всех символов равна <code>x + 2x = 3x</code>, значит <code>x = ${sumValue} / 3 = ${equalCount}</code>.`;
  } else {
    resultCounts = {
      0: equalCount,
      1: equalCount,
      2: total - 2 * equalCount,
    };
    sumValue = resultCounts[1] + 2 * resultCounts[2];
    relationText =
      "получилась строка, в которой одинаковое количество символов 0 и 1";
    solveText = `Пусть после выполнения программы символов <code>0</code> и <code>1</code> стало по <code>x</code>. Тогда символов <code>2</code> стало <code>${total} - 2x</code>, а сумма значений равна <code>x + 2(${total} - 2x)</code>. Из уравнения <code>x + 2(${total} - 2x) = ${sumValue}</code> получаем <code>x = ${equalCount}</code>.`;
  }

  const initialCounts = {
    0: resultCounts[2],
    1: resultCounts[0],
    2: resultCounts[1],
  };
  const askDigit = pick(["0", "1", "2"]);
  const answer = String(initialCounts[askDigit]);

  const countsTable = `
    <div class="solution-table-wrap">
      <table class="compact-table">
        <thead>
          <tr>
            <th>Символ</th>
            <th>Количество после работы МТ</th>
          </tr>
        </thead>
        <tbody>
          ${["0", "1", "2"]
            .map(
              (digit) => `
                <tr>
                  <td><code>${digit}</code></td>
                  <td>${resultCounts[digit]}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  return {
    theory: {
      chips: [
        { text: "Новые исполнители" },
        { text: "Машина Тьюринга", kind: "alt" },
        { text: "Анализ переходов", kind: "warn" },
      ],
      intro:
        "В задачах на машину Тьюринга выгодно сначала понять, что происходит с одним символом и как двигается головка. Если программа лишь однократно проходит по всей строке, то обычно можно перейти от таблицы переходов к обычному правилу замены символов и дальше решать задачу через подсчёт количеств.",
      cards: [
        {
          title: "Как читать таблицу переходов",
          items: [
            "Столбец задаёт символ в текущей ячейке, строка — состояние головки.",
            "В ячейке таблицы записано: что записать, куда сдвинуться, в какое состояние перейти.",
            "Символ <code>λ</code> обозначает пустую ячейку ленты.",
          ],
        },
        {
          title: "Как решать этот шаблон",
          items: [
            "Сначала выясняем, что делает стартовое состояние: оно обычно только подводит головку к данным.",
            "Потом смотрим основное рабочее состояние и выписываем замену для каждого символа.",
            "Если программа не зависит от контекста соседей, дальше задачу можно свести к системе уравнений по количеству символов.",
          ],
        },
      ],
    },
    chips: [
      { text: MODE_LABELS.turing_cycle },
      { text: "Ответ: целое число", kind: "alt" },
    ],
    conditionHtml: `
      <p>
        На ленте исполнителя МТ в соседних ячейках записана последовательность из
        ${total} символов, включающая только <code>0</code>, <code>1</code> и
        <code>2</code>. Ячейки справа и слева от последовательности заполнены
        пустыми символами <code>λ</code>. В начальный момент времени головка
        расположена в ближайшей пустой ячейке слева от последовательности.
      </p>
      <p>
        После выполнения программы ${relationText}, а сумма значений всех
        символов этой строки равна ${sumValue}. Сколько символов
        <code>${askDigit}</code> было в исходной последовательности?
      </p>
    `,
    program: {
      type: "transition",
      caption:
        "Это классический шаблон прохода по всей строке слева направо с заменой каждого символа по одному и тому же правилу.",
      data: TURING_PROGRAM,
    },
    solution: {
      steps: [
        `Из состояния <code>q0</code> на пустой ячейке головка просто сдвигается вправо и переходит в состояние <code>q1</code>. Значит, всё содержательное преобразование выполняется состоянием <code>q1</code>.`,
        `По строке <code>q1</code> видно правило замены: <code>0 ⟶ 1</code>, <code>1 ⟶ 2</code>, <code>2 ⟶ 0</code>. Головка идёт вправо до первой пустой ячейки и останавливается. Следовательно, МТ заменяет каждый символ по циклу, не меняя длину строки.`,
        solveText,
        `Получаем количества символов в результирующей строке. ${countsTable}`,
        `Теперь обращаем замену назад: исходные <code>0</code> превратились в <code>1</code>, исходные <code>1</code> — в <code>2</code>, исходные <code>2</code> — в <code>0</code>. Значит, исходное количество символов <code>${askDigit}</code> равно <code>${answer}</code>.`,
      ],
      answer,
      pythonCode: `# длина строки
n = ${total}

# условие после работы машины Тьюринга
sum_value = ${sumValue}
pair_type = ${JSON.stringify(pairType)}
ask_digit = ${JSON.stringify(askDigit)}

if pair_type == "12":
    # после работы символов 1 и 2 стало поровну
    x = sum_value // 3
    result_counts = {"0": n - 2 * x, "1": x, "2": x}
else:
    # после работы символов 0 и 1 стало поровну
    x = (2 * n - sum_value) // 3
    result_counts = {"0": x, "1": x, "2": n - 2 * x}

# обратное преобразование для цикла 0 -> 1 -> 2 -> 0
initial_counts = {
    "0": result_counts["2"],
    "1": result_counts["0"],
    "2": result_counts["1"],
}

print(initial_counts[ask_digit])`,
    },
  };
}

function generatePostMarks() {
  const finalMarks = randInt(140, 420);
  const questionType = pick(["max", "min"]);
  const answer =
    questionType === "max"
      ? String(2 * finalMarks + 1)
      : String(2 * finalMarks);

  return {
    theory: {
      chips: [
        { text: "Новые исполнители" },
        { text: "Машина Поста", kind: "alt" },
        { text: "Работа с метками", kind: "warn" },
      ],
      intro:
        "В задачах на машину Поста удобно анализировать не каждую команду отдельно до конца, а один полный цикл работы. Если понять, как меняется количество меток за один цикл, дальше задача обычно сводится к простой арифметике.",
      cards: [
        {
          title: "Что делает исполнитель",
          items: [
            "Команда <code>1, X</code> ставит метку и переходит к строке <code>X</code>.",
            "Команда <code>λ, X</code> стирает метку и переходит к строке <code>X</code>.",
            "Команда <code>? X, Y</code> проверяет текущую ячейку: если метки нет, идём в строку <code>X</code>, иначе — в строку <code>Y</code>.",
          ],
        },
        {
          title: "Как решать этот шаблон",
          items: [
            "Сначала выясняем, что происходит с правым краем последовательности меток.",
            "Потом смотрим, создаётся ли новая метка слева и возвращается ли головка к началу цикла.",
            "Если цикл повторяет одну и ту же операцию над количеством меток, задачу можно решить без полной трассировки.",
          ],
        },
      ],
    },
    chips: [
      { text: MODE_LABELS.post_marks },
      { text: "Ответ: целое число", kind: "alt" },
    ],
    conditionHtml: `
      <p>
        На ленте исполнителя МП записана непрерывная последовательность меток.
        Ячейки справа и слева от крайних меток пусты. В начальный момент времени
        головка находится над самой левой меткой.
      </p>
      <p>
        После выполнения программы на ленте осталось ${finalMarks} меток.
        Определите ${
          questionType === "max"
            ? "максимально возможное"
            : "минимально возможное"
        } количество меток, которое могло быть на ленте до начала выполнения
        алгоритма.
      </p>
    `,
    program: {
      type: "commands",
      caption:
        "Программа совпадает с типовым шаблоном из задач на МП: из конца последовательности снимаются метки, после чего одна метка достраивается слева.",
      commands: POST_PROGRAM,
    },
    solution: {
      steps: [
        `По первым командам головка идёт к правому краю последовательности меток. Затем команды <code>4</code> и <code>7</code> стирают одну или две правые метки: если метка была единственной, алгоритм завершится сразу; если меток больше, с правого края снимаются две метки.`,
        `Команды <code>8</code>–<code>12</code> переносят головку левее рабочей последовательности, а команда <code>12</code> создаёт новую метку слева.`,
        `Команды <code>13</code>–<code>16</code> возвращают головку в начало следующего цикла. Значит, одна полная итерация алгоритма заменяет каждые две метки исходной последовательности одной новой меткой.`,
        `Следовательно, после завершения алгоритма число меток равно <code>⌊n / 2⌋</code>, где <code>n</code> — исходное количество меток.`,
        `Из условия <code>⌊n / 2⌋ = ${finalMarks}</code>. Поэтому возможны только два значения: <code>${2 * finalMarks}</code> и <code>${
          2 * finalMarks + 1
        }</code>. ${
          questionType === "max"
            ? `Берём большее из них: <code>${2 * finalMarks + 1}</code>.`
            : `Берём меньшее из них: <code>${2 * finalMarks}</code>.`
        }`,
      ],
      answer,
      pythonCode: `# после завершения алгоритма осталось столько меток
result_marks = ${finalMarks}

# из соотношения floor(n / 2) = result_marks
candidates = [2 * result_marks, 2 * result_marks + 1]

answer = ${questionType === "max" ? "max(candidates)" : "min(candidates)"}
print(answer)`,
    },
  };
}

function generateVariant(mode) {
  const actualMode =
    mode === "random"
      ? pick(["nam_order", "nam_reduce", "turing_cycle", "post_marks"])
      : mode;

  if (actualMode === "nam_order") {
    return generateNamOrder();
  }
  if (actualMode === "nam_reduce") {
    return generateNamReduce();
  }
  if (actualMode === "turing_cycle") {
    return generateTuringCycle();
  }
  return generatePostMarks();
}

function mountVariant(variant) {
  const theoryWrap = document.getElementById("theoryWrap");
  const taskText = document.getElementById("taskText");
  const programWrap = document.getElementById("programWrap");
  const solutionWrap = document.getElementById("solutionWrap");

  theoryWrap.innerHTML = renderTheory(variant.theory);
  taskText.innerHTML = `${renderChips(variant.chips)}${variant.conditionHtml}`;
  programWrap.innerHTML = renderProgram(variant.program);
  solutionWrap.innerHTML = renderSolution(variant.solution);
}

function initTask12() {
  const select = document.getElementById("taskMode");
  const button = document.getElementById("generateBtn");

  const render = () => {
    const variant = generateVariant(select.value);
    mountVariant(variant);
  };

  button.addEventListener("click", render);
  render();
}

if (typeof document !== "undefined") {
  initTask12();
}

if (typeof globalThis !== "undefined") {
  globalThis.__task12Generators = {
    generateVariant,
    generateNamOrder,
    generateNamReduce,
    generateTuringCycle,
    generatePostMarks,
  };
}
