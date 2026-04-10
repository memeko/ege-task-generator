"use strict";

const MODE_LABELS = {
  random: "Случайный режим",
  one_pile: "Одна куча: прибавить / умножить",
  one_pile_three: "Одна куча: три возможных хода",
  two_piles: "Две кучи: ход в одну из куч",
};

const THEORY = {
  chips: [
    { text: "Одно задание, три вопроса", kind: "alt" },
    { text: "Подход через В1, П1, В2, П2" },
    { text: "Рекурсивная проверка на Python", kind: "warn" },
  ],
  intro:
    "В заданиях 19–21 одна и та же игра рассматривается три раза. Отличается не сама игра, а глубина стратегии, которую нужно распознать по начальному значению параметра S.",
  cards: [
    {
      title: "Что такое позиция",
      text:
        "Позиция — это текущее состояние игры перед ходом игрока. Для одной кучи позиция задаётся числом камней S, для двух куч — парой чисел (a, b).",
    },
    {
      title: "Выигрышные и проигрышные позиции",
      text:
        "Позиция В1 позволяет текущему игроку выиграть одним ходом. Позиция П1 — это такая позиция, из которой любой ход передаёт сопернику позицию В1.",
    },
    {
      title: "Как связаны 19, 20 и 21",
      text:
        "Вопрос 19 обычно ищет позицию П1. Вопрос 20 — позиции В2: игрок не выигрывает сразу, но может обеспечить победу своим вторым ходом. Вопрос 21 — позиции П2: соперник выигрывает первым или вторым ходом, но не обязан выигрывать немедленно.",
    },
    {
      title: "Практический алгоритм",
      text:
        "Удобно последовательно отметить множества В1, П1, В2, П2. Для генератора ниже это делается и аналитически, и программно одной рекурсивной функцией с мемоизацией.",
    },
  ],
};

const ONE_PILE_PRESETS = [
  { adds: [1], muls: [2], targets: [63, 71, 79, 87, 97, 111, 127, 143, 175] },
  { adds: [2], muls: [2], targets: [58, 66, 74, 82, 94, 106, 118] },
  { adds: [3], muls: [2], targets: [61, 73, 85, 97, 109, 121] },
  { adds: [2], muls: [3], targets: [41, 47, 53, 59, 65, 71] },
];

const ONE_PILE_THREE_PRESETS = [
  { adds: [1, 3], muls: [2], targets: [47, 53, 61, 69, 77, 89] },
  { adds: [2, 5], muls: [2], targets: [52, 58, 64, 76, 88, 100] },
  { adds: [1, 4], muls: [3], targets: [38, 44, 50, 56, 62] },
];

const TWO_PILE_PRESETS = [
  { fixedOptions: [5, 7, 9, 11], addValue: 1, mulValue: 2, sMaxOptions: [15, 19, 23], targetOptions: [41, 49, 57, 65] },
  { fixedOptions: [4, 6, 8, 10], addValue: 2, mulValue: 2, sMaxOptions: [12, 16, 20], targetOptions: [37, 45, 53, 61] },
  { fixedOptions: [6, 8, 10], addValue: 1, mulValue: 3, sMaxOptions: [10, 12, 14], targetOptions: [43, 52, 61] },
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(items) {
  return items[randInt(0, items.length - 1)];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatRange(min, max) {
  return `${min} ≤ S ≤ ${max}`;
}

function uniqueStates(states, keyFn) {
  const seen = new Set();
  const result = [];
  for (const state of states) {
    const key = keyFn(state);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(state);
    }
  }
  return result;
}

function formatIntervals(values) {
  if (!values.length) {
    return "нет значений";
  }
  const sorted = [...values].sort((a, b) => a - b);
  const parts = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i += 1) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}–${prev}`);
    start = current;
    prev = current;
  }

  return parts.join(", ");
}

function renderChips(chips) {
  return `<div class="chips">${chips
    .map(
      (chip) =>
        `<span class="chip${chip.kind ? ` ${chip.kind}` : ""}">${escapeHtml(chip.text)}</span>`
    )
    .join("")}</div>`;
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
              <p>${card.text}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderQuestions(questions) {
  return `
    <ol class="question-list">
      ${questions.map((question) => `<li>${question}</li>`).join("")}
    </ol>
  `;
}

function renderStatusSummary(summary) {
  return `
    <div class="status-grid">
      ${summary
        .map(
          (item) => `
            <article class="status-card">
              <h3>${item.title}</h3>
              <p>${item.text}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSolution(solution) {
  return `
    <details>
      <summary>Показать теоретический разбор, ответы и Python</summary>
      <ol class="solution-list">
        ${solution.steps.map((step) => `<li>${step}</li>`).join("")}
      </ol>
      <div class="note-box">${solution.note}</div>
      <div class="answer-box">
        19: ${escapeHtml(solution.answers.q19)}<br />
        20: ${escapeHtml(solution.answers.q20)}<br />
        21: ${escapeHtml(solution.answers.q21)}
      </div>
      <div class="python-box">
        <h3>Проверка на Python</h3>
        <pre><code>${escapeHtml(solution.pythonCode)}</code></pre>
      </div>
    </details>
  `;
}

function buildMoveLabel(move, pileMode) {
  if (move.type === "add") {
    if (pileMode === "two") {
      return `добавить ${move.value} ${pluralStones(move.value)} в одну из куч`;
    }
    return `увеличить количество камней в куче на ${move.value}`;
  }
  if (pileMode === "two") {
    return `увеличить количество камней в выбранной куче в ${move.value} раза`;
  }
  return `увеличить количество камней в куче в ${move.value} раза`;
}

function pluralStones(value) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return "камень";
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "камня";
  }
  return "камней";
}

function makeOnePileMoves(adds, muls) {
  return [
    ...adds.map((value) => ({ type: "add", value })),
    ...muls.map((value) => ({ type: "mul", value })),
  ];
}

function analyzeGame(config) {
  const memo = new Map();

  function keyOf(state) {
    return config.keyOf(state);
  }

  function classify(state) {
    const key = keyOf(state);
    if (memo.has(key)) {
      return memo.get(key);
    }

    const nextStates = config.nextStates(state);
    const hasImmediateWin = nextStates.some((nextState) => config.isTerminal(nextState));
    if (hasImmediateWin) {
      memo.set(key, 1);
      return 1;
    }

    const childStatuses = nextStates.map((nextState) => classify(nextState));
    if (childStatuses.every((status) => status === 1)) {
      memo.set(key, -1);
      return -1;
    }
    if (childStatuses.some((status) => status === -1)) {
      memo.set(key, 2);
      return 2;
    }
    if (childStatuses.every((status) => status === 1 || status === 2)) {
      memo.set(key, -2);
      return -2;
    }

    memo.set(key, 0);
    return 0;
  }

  const initialRows = config.startValues.map((startValue) => {
    const state = config.initialState(startValue);
    return { startValue, status: classify(state) };
  });

  const v1 = initialRows.filter((row) => row.status === 1).map((row) => row.startValue);
  const p1 = initialRows.filter((row) => row.status === -1).map((row) => row.startValue);
  const v2 = initialRows.filter((row) => row.status === 2).map((row) => row.startValue);
  const p2 = initialRows.filter((row) => row.status === -2).map((row) => row.startValue);

  return {
    initialRows,
    v1,
    p1,
    v2,
    p2,
    answers: {
      q19: p1.length ? p1[0] : null,
      q20: v2.length >= 2 ? [v2[0], v2[1]] : null,
      q21: p2.length ? p2[0] : null,
    },
  };
}

function makeOnePileConfig(template, target) {
  const moves = makeOnePileMoves(template.adds, template.muls);
  const startValues = Array.from({ length: target - 1 }, (_, index) => index + 1);

  return {
    kind: template.adds.length + template.muls.length > 2 ? "one_pile_three" : "one_pile",
    modeLabel:
      template.adds.length + template.muls.length > 2
        ? MODE_LABELS.one_pile_three
        : MODE_LABELS.one_pile,
    target,
    moves,
    pileDescription: "одна куча",
    startRangeText: formatRange(1, target - 1),
    startValues,
    initialState: (s) => s,
    keyOf: (s) => String(s),
    isTerminal: (s) => s >= target,
    nextStates: (s) =>
      uniqueStates(
        moves.map((move) => (move.type === "add" ? s + move.value : s * move.value)),
        (value) => String(value)
      ),
    stateLabel: (s) => `${s}`,
    metaChips: [
      { text: template.adds.length + template.muls.length > 2 ? "Одна куча / три хода" : "Одна куча / два хода" },
      { text: `Финиш при ${target} и более`, kind: "alt" },
      { text: `Диапазон: ${formatRange(1, target - 1)}`, kind: "warn" },
    ],
  };
}

function makeTwoPileConfig(preset, fixed, sMax, target) {
  const moves = [
    { type: "add", value: preset.addValue },
    { type: "mul", value: preset.mulValue },
  ];
  const startValues = Array.from({ length: sMax }, (_, index) => index + 1);

  return {
    kind: "two_piles",
    modeLabel: MODE_LABELS.two_piles,
    target,
    fixed,
    sMax,
    moves,
    pileDescription: "две кучи",
    startRangeText: formatRange(1, sMax),
    startValues,
    initialState: (s) => [fixed, s],
    keyOf: (state) => `${state[0]},${state[1]}`,
    isTerminal: (state) => state[0] + state[1] >= target,
    nextStates: (state) => {
      const [a, b] = state;
      return uniqueStates(
        [
          [a + preset.addValue, b],
          [a, b + preset.addValue],
          [a * preset.mulValue, b],
          [a, b * preset.mulValue],
        ],
        (value) => `${value[0]},${value[1]}`
      );
    },
    stateLabel: (s) => `(${fixed}, ${s})`,
    metaChips: [
      { text: "Две кучи / симметричный ход" },
      { text: `Первая куча: ${fixed}`, kind: "alt" },
      { text: `Победа при сумме не менее ${target}`, kind: "warn" },
    ],
  };
}

function pickOnePileConfig(withThreeMoves) {
  const presets = withThreeMoves ? ONE_PILE_THREE_PRESETS : ONE_PILE_PRESETS;
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const preset = pick(presets);
    const target = pick(preset.targets);
    const config = makeOnePileConfig(preset, target);
    const analysis = analyzeGame(config);
    if (analysis.answers.q19 !== null && analysis.answers.q20 && analysis.answers.q21 !== null) {
      return { config, analysis };
    }
  }
  throw new Error("Не удалось подобрать корректный вариант для одной кучи");
}

function pickTwoPileConfig() {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const preset = pick(TWO_PILE_PRESETS);
    const fixed = pick(preset.fixedOptions);
    const sMax = pick(preset.sMaxOptions);
    const target = pick(preset.targetOptions);
    const config = makeTwoPileConfig(preset, fixed, sMax, target);
    const analysis = analyzeGame(config);
    if (analysis.answers.q19 !== null && analysis.answers.q20 && analysis.answers.q21 !== null) {
      return { config, analysis };
    }
  }
  throw new Error("Не удалось подобрать корректный вариант для двух куч");
}

function generateVariant(mode) {
  if (mode === "one_pile") {
    return pickOnePileConfig(false);
  }
  if (mode === "one_pile_three") {
    return pickOnePileConfig(true);
  }
  if (mode === "two_piles") {
    return pickTwoPileConfig();
  }
  return generateVariant(pick(["one_pile", "one_pile_three", "two_piles"]));
}

function renderTaskText(config) {
  const moveItems = config.moves
    .map((move) => buildMoveLabel(move, config.kind === "two_piles" ? "two" : "one"))
    .map((item) => `<li>${item}</li>`)
    .join("");

  if (config.kind === "two_piles") {
    return `
      <p>
        Два игрока, Петя и Ваня, играют в следующую игру. Перед игроками две
        кучи камней. Игроки ходят по очереди, первый ход делает Петя.
      </p>
      <p>
        За один ход игрок может:
      </p>
      <ul class="inline-list">${moveItems}</ul>
      <p>
        Игра завершается в тот момент, когда суммарное количество камней в двух
        кучах становится не меньше ${config.target}. Победителем считается игрок,
        сделавший ход, после которого это произошло.
      </p>
      <p>
        В начальный момент в первой куче было ${config.fixed} камней, во второй —
        S камней; ${config.startRangeText}.
      </p>
    `;
  }

  return `
    <p>
      Два игрока, Петя и Ваня, играют в следующую игру. Перед игроками лежит
      куча камней. Игроки ходят по очереди, первый ход делает Петя.
    </p>
    <p>
      За один ход игрок может:
    </p>
    <ul class="inline-list">${moveItems}</ul>
    <p>
      Игра завершается в тот момент, когда количество камней в куче становится
      не меньше ${config.target}. Победителем считается игрок, сделавший ход,
      после которого это произошло.
    </p>
    <p>
      В начальный момент в куче было S камней; ${config.startRangeText}.
    </p>
  `;
}

function buildQuestions(config) {
  const subject =
    config.kind === "two_piles"
      ? "начальной позиции вида " + escapeHtml(`(${config.fixed}, S)`)
      : "начальной позиции";

  return [
    `Укажите минимальное значение S, при котором Петя не может выиграть за один ход, но после любого хода Пети Ваня может выиграть своим первым ходом. Ответ дайте для ${subject}.`,
    `Найдите два наименьших значения S, при которых у Пети есть выигрышная стратегия, позволяющая ему выиграть своим вторым ходом при любой игре Вани, но нет возможности выиграть первым ходом.`,
    `Укажите минимальное значение S, при котором у Вани есть стратегия выиграть первым или вторым ходом при любой игре Пети, но нет стратегии гарантированно выиграть первым ходом.`,
  ];
}

function buildStatusSummary() {
  return [
    {
      title: "Шаг 1: отметить В<sub>1</sub>",
      text: "Сначала найдите все стартовые значения S, из которых игрок, делающий ход, может завершить игру сразу.",
    },
    {
      title: "Шаг 2: построить П<sub>1</sub>",
      text: "Затем выделите позиции, из которых любой ход переводит игру в В₁. Именно среди таких позиций обычно ищется ответ к вопросу 19.",
    },
    {
      title: "Шаг 3: найти В<sub>2</sub>",
      text: "После этого ищите позиции, из которых существует ход в П₁. Обычно именно из этого множества берутся ответы к вопросу 20.",
    },
    {
      title: "Шаг 4: выделить П<sub>2</sub>",
      text: "Последним шагом отметьте позиции, из которых любой ход ведёт только в В₁ или В₂, причём хотя бы один ход ведёт в В₂. Это основной ориентир для вопроса 21.",
    },
  ];
}

function buildPythonCode(config) {
  const onePileMoves = config.moves
    .map((move) => (move.type === "add" ? `s + ${move.value}` : `s * ${move.value}`))
    .join(", ");

  if (config.kind === "two_piles") {
    const addValue = config.moves.find((move) => move.type === "add").value;
    const mulValue = config.moves.find((move) => move.type === "mul").value;
    return `from functools import lru_cache

TARGET = ${config.target}
FIXED = ${config.fixed}
SMAX = ${config.sMax}
ADD = ${addValue}
MUL = ${mulValue}


def moves(a, b):
    return [
        (a + ADD, b),
        (a, b + ADD),
        (a * MUL, b),
        (a, b * MUL),
    ]


@lru_cache(None)
def state(a, b):
    nxt = moves(a, b)
    if any(x + y >= TARGET for x, y in nxt):
        return 1
    child = [state(x, y) for x, y in nxt if x + y < TARGET]
    if all(v == 1 for v in child):
        return -1
    if any(v == -1 for v in child):
        return 2
    if all(v in (1, 2) for v in child):
        return -2
    return 0


starts = range(1, SMAX + 1)
ans19 = min(s for s in starts if state(FIXED, s) == -1)
ans20 = sorted(s for s in starts if state(FIXED, s) == 2)[:2]
ans21 = min(s for s in starts if state(FIXED, s) == -2)

print(ans19)
print(*ans20)
print(ans21)`;
  }

  return `from functools import lru_cache

TARGET = ${config.target}


def moves(s):
    return [${onePileMoves}]


@lru_cache(None)
def state(s):
    nxt = moves(s)
    if any(x >= TARGET for x in nxt):
        return 1
    child = [state(x) for x in nxt if x < TARGET]
    if all(v == 1 for v in child):
        return -1
    if any(v == -1 for v in child):
        return 2
    if all(v in (1, 2) for v in child):
        return -2
    return 0


starts = range(1, TARGET)
ans19 = min(s for s in starts if state(s) == -1)
ans20 = sorted(s for s in starts if state(s) == 2)[:2]
ans21 = min(s for s in starts if state(s) == -2)

print(ans19)
print(*ans20)
print(ans21)`;
}

function buildSolution(config, analysis) {
  const answers = {
    q19: String(analysis.answers.q19),
    q20: analysis.answers.q20.join(" "),
    q21: String(analysis.answers.q21),
  };

  const steps = [
    `Сначала отмечаем все стартовые значения S, из которых текущий игрок выигрывает одним ходом. Это позиции <strong>В<sub>1</sub></strong>: ${formatIntervals(analysis.v1)}.`,
    `Далее отмечаем позиции <strong>П<sub>1</sub></strong>: из них нельзя выиграть сразу, и любой ход переводит игру в <strong>В<sub>1</sub></strong>. Получаем: ${formatIntervals(analysis.p1)}. Поэтому в вопросе 19 берём минимальное значение ${analysis.answers.q19}.`,
    `После этого отмечаем позиции <strong>В<sub>2</sub></strong>: из них есть хотя бы один ход в <strong>П<sub>1</sub></strong>. Получаем: ${formatIntervals(analysis.v2)}. Для вопроса 20 нужны два наименьших значения: ${analysis.answers.q20.join(" и ")}.`,
    `Затем выделяем позиции <strong>П<sub>2</sub></strong>: все ходы ведут только в <strong>В<sub>1</sub></strong> или <strong>В<sub>2</sub></strong>, причём хотя бы один ход ведёт именно в <strong>В<sub>2</sub></strong>. Получаем: ${formatIntervals(analysis.p2)}. Для вопроса 21 берём минимальное значение ${analysis.answers.q21}.`,
    `Так как вопросы 19–21 относятся к одной и той же игре, наборы <strong>В<sub>1</sub></strong>, <strong>П<sub>1</sub></strong>, <strong>В<sub>2</sub></strong>, <strong>П<sub>2</sub></strong> строятся один раз и затем используются сразу для всех трёх ответов.`,
  ];

  const note =
    config.kind === "two_piles"
      ? `Здесь мы классифицируем только начальные позиции вида <code>(${config.fixed}, S)</code>, где ${config.startRangeText}. Внутри рекурсивной проверки, конечно, рассматриваются уже все достижимые пары куч.`
      : `Здесь классификация ведётся по всем допустимым стартовым значениям <code>S</code>, где ${config.startRangeText}. Именно из этих значений затем выбираются ответы для 19, 20 и 21.`;

  return {
    steps,
    note,
    answers,
    pythonCode: buildPythonCode(config),
  };
}

function buildMeta(config) {
  const moveText = config.moves.map((move) => buildMoveLabel(move, config.kind === "two_piles" ? "two" : "one")).join("; ");
  const rows = [
    ["Тип", config.modeLabel],
    ["Ходы", moveText],
    ["Старт", config.kind === "two_piles" ? `(${config.fixed}, S), ${config.startRangeText}` : `S, ${config.startRangeText}`],
    ["Финиш", config.kind === "two_piles" ? `сумма камней ≥ ${config.target}` : `в куче не менее ${config.target} камней`],
  ];

  return `
    ${renderChips(config.metaChips)}
    ${rows
      .map(
        ([label, value]) => `
          <div class="summary-row">
            <strong>${escapeHtml(label)}</strong>
            <span>${escapeHtml(value)}</span>
          </div>
        `
      )
      .join("")}
  `;
}

function renderVariant(variant) {
  const { config, analysis } = variant;
  const questions = buildQuestions(config);
  const statusSummary = buildStatusSummary();
  const solution = buildSolution(config, analysis);

  document.getElementById("theoryWrap").innerHTML = renderTheory(THEORY);
  document.getElementById("taskMeta").innerHTML = buildMeta(config);
  document.getElementById("taskText").innerHTML = renderTaskText(config);
  document.getElementById("questionWrap").innerHTML = renderQuestions(questions);
  document.getElementById("statusWrap").innerHTML = renderStatusSummary(statusSummary);
  document.getElementById("solutionWrap").innerHTML = renderSolution(solution);
}

function regenerate() {
  const mode = document.getElementById("modeSelect").value;
  const variant = generateVariant(mode);
  renderVariant(variant);
}

document.getElementById("generateBtn").addEventListener("click", regenerate);
regenerate();
