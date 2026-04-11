"use strict";

const TEMPLATE_LABELS = {
  random: "Случайный",
  shift_tasks: "Рабочая смена: максимум задач",
  discount_checks: "Опт: скидка на каждый 6-й товар",
  hotel_pair: "Гостиница: 2 свободные между занятыми",
  hostel_sequence: "Хостел: максимальная цепочка номеров",
  admission: "Вуз: проходной и полупроходной балл",
};

const MODE_ORDER = [
  "shift_tasks",
  "discount_checks",
  "hotel_pair",
  "hostel_sequence",
  "admission",
];

let currentDownloads = [];

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

function sum(items) {
  return items.reduce((acc, value) => acc + value, 0);
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

function createTextBlob(lines) {
  return new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
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
      <p><strong>Сформирован файл:</strong> ${escapeHtml(files[0].name)}</p>
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

function renderPreview(lines) {
  const data = lines.slice(0, 22);
  return `
    <div class="preview-meta">Показаны первые ${data.length} строк файла.</div>
    <div class="table-wrap">
      <table class="compact-table">
        <thead>
          <tr>
            <th>№ строки</th>
            <th>Содержимое</th>
          </tr>
        </thead>
        <tbody>
          ${data
            .map(
              (line, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><code>${escapeHtml(line)}</code></td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSolution(solution) {
  return `
    <details>
      <summary>Показать пошаговый разбор и ответ (спойлер)</summary>
      <ol>
        ${solution.steps.map((step) => `<li>${step}</li>`).join("")}
      </ol>
      <div class="answer-box">Ответ: ${escapeHtml(solution.answer)}</div>
      <div class="python-wrap">
        <pre><code>${escapeHtml(solution.python)}</code></pre>
      </div>
    </details>
  `;
}

function ensureHotelLimits(entries, maxFloor, maxRoom) {
  if (maxFloor > 300) {
    throw new Error("Этажи в генерации превышают 300");
  }
  if (maxRoom > 100) {
    throw new Error("Комнаты на этаже в генерации превышают 100");
  }
  for (const [floor, room] of entries) {
    if (floor < 1 || floor > maxFloor || floor > 300) {
      throw new Error("Некорректный номер этажа в данных");
    }
    if (room < 1 || room > maxRoom || room > 100) {
      throw new Error("Некорректный номер комнаты в данных");
    }
  }
}

function solveShiftTasks(S, durations) {
  const sorted = [...durations].sort((a, b) => a - b);
  let total = 0;
  let k = 0;
  while (k < sorted.length && total + sorted[k] <= S) {
    total += sorted[k];
    k += 1;
  }
  if (k === 0) {
    return { count: 0, longest: 0 };
  }
  const base = total - sorted[k - 1];
  let longest = sorted[k - 1];
  for (let i = k - 1; i < sorted.length; i += 1) {
    if (base + sorted[i] <= S) {
      longest = Math.max(longest, sorted[i]);
    }
  }
  return { count: k, longest };
}

function solveDiscountChecks(prices) {
  const sortedDesc = [...prices].sort((a, b) => b - a);
  const sortedAsc = [...prices].sort((a, b) => a - b);
  const allSum = sum(prices);
  const m = Math.floor(prices.length / 6);

  const oneCheckDiscount = sum(sortedAsc.slice(0, m)) / 2;
  let splitDiscount = 0;
  for (let i = 5; i < sortedDesc.length; i += 6) {
    splitDiscount += sortedDesc[i] / 2;
  }

  return {
    splitTotal: Math.round(allSum - splitDiscount),
    oneCheckTotal: Math.round(allSum - oneCheckDiscount),
  };
}

function solveHotelPair(entries) {
  const sorted = [...entries].sort((a, b) => {
    if (a[0] !== b[0]) {
      return b[0] - a[0];
    }
    return a[1] - b[1];
  });

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const [f1, r1] = sorted[i];
    const [f2, r2] = sorted[i + 1];
    if (f1 === f2 && r2 - r1 === 3) {
      return { floor: f1, room: r1 + 1 };
    }
  }
  return null;
}

function solveHostelSequence(entries) {
  const byFloor = new Map();
  for (const [room, floor] of entries) {
    if (!byFloor.has(floor)) {
      byFloor.set(floor, new Set());
    }
    byFloor.get(floor).add(room);
  }

  let bestLen = 0;
  let bestFloor = Number.POSITIVE_INFINITY;

  for (const [floor, roomSet] of byFloor.entries()) {
    const rooms = [...roomSet].sort((a, b) => a - b);
    let run = 0;
    let prev = -1;
    let floorBest = 0;
    for (const room of rooms) {
      if (room === prev + 1) {
        run += 1;
      } else {
        run = 1;
      }
      prev = room;
      floorBest = Math.max(floorBest, run);
    }

    if (floorBest > bestLen || (floorBest === bestLen && floor < bestFloor)) {
      bestLen = floorBest;
      bestFloor = floor;
    }
  }

  return { bestLen, bestFloor };
}

function solveAdmission(data, K) {
  const scored = data.map((row) => ({
    id: row[0],
    exam1: row[1],
    exam2: row[2],
    exam3: row[3],
    interview: row[4],
    total: row[1] + row[2] + row[3] + row[4],
  }));

  scored.sort((a, b) => {
    if (a.total !== b.total) {
      return b.total - a.total;
    }
    if (a.interview !== b.interview) {
      return b.interview - a.interview;
    }
    return a.id - b.id;
  });

  const threshold = scored[K - 1].total;
  const countAbove = scored.filter((x) => x.total > threshold).length;

  if (countAbove === K) {
    return {
      lastPassingId: scored[K - 1].id,
      semiCount: 0,
      threshold,
      semiScore: null,
    };
  }

  if (countAbove === 0) {
    return null;
  }

  const passings = scored.filter((x) => x.total > threshold);
  return {
    lastPassingId: passings[passings.length - 1].id,
    semiCount: scored.filter((x) => x.total === threshold).length,
    threshold: passings[passings.length - 1].total,
    semiScore: threshold,
  };
}

function buildCommonTheory(modeKey) {
  return {
    chips: [
      { text: "Задание 26" },
      { text: TEMPLATE_LABELS[modeKey], kind: "alt" },
      { text: "Сортировка + оптимальный выбор", kind: "warn" },
    ],
    intro:
      "Для 26-й линии сначала нужно формализовать условие, затем выбрать ключ сортировки и только после этого выполнять отбор/подсчёт. Итог почти всегда — пара чисел.",
    cards: [
      {
        title: "Базовый шаблон решения",
        items: [
          "Считать входные данные и привести их к удобной структуре.",
          "Отсортировать по ключу(ам), заданным условием.",
          "Сделать один проход с нужной логикой отбора.",
          "Вывести ответ в формате двух чисел.",
        ],
      },
      {
        title: "Проверка ограничений",
        items: [
          "Диапазоны параметров в сгенерированных файлах соблюдаются.",
          "Для гостиничных задач: этажи не выше 300, комнаты не выше 100.",
          "Для остальных сюжетов также используются реалистичные границы из условия.",
        ],
      },
    ],
  };
}

function generateShiftTasksVariant() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const N = randInt(420, 980);
    const S = randInt(1600, 9000);
    const durations = Array.from({ length: N }, () => randInt(1, 100));
    const ans = solveShiftTasks(S, durations);
    if (ans.count < 3 || ans.count >= N) {
      continue;
    }

    const lines = [`${S} ${N}`, ...durations.map(String)];
    const fileName = `task26_shift_${Date.now()}.txt`;

    return {
      mode: "shift_tasks",
      chips: [
        { text: TEMPLATE_LABELS.shift_tasks },
        { text: "Файл: .txt", kind: "alt" },
      ],
      theory: buildCommonTheory("shift_tasks"),
      conditionHtml: `
        <p>Программист за смену длиной <code>${S}</code> минут хочет выполнить как можно больше задач.</p>
        <p>Во входном файле: первая строка — <code>S N</code>, далее <code>N</code> строк с длительностями задач (в минутах).</p>
        <p>Найдите два числа: максимальное количество задач и максимальную длительность задачи, которую можно включить при этом максимальном количестве.</p>
      `,
      params: [
        { label: "S", value: formatNumber(S) },
        { label: "N", value: formatNumber(N) },
        { label: "Ограничения", value: "N ≤ 1000, длительность ≤ 100" },
      ],
      inputLines: lines,
      fileName,
      solution: {
        steps: [
          "Сортируем длительности по возрастанию.",
          "Набираем минимальные длительности, пока суммарное время не превышает S — получаем максимум задач K.",
          "Фиксируем сумму первых K-1 задач и ищем самую большую задачу, которая вмещается в остаток времени.",
          "Пара (K, найденная длительность) и есть ответ.",
        ],
        answer: `${ans.count} ${ans.longest}`,
        python: `with open('input.txt') as f:\n    S, N = map(int, f.readline().split())\n    a = [int(f.readline()) for _ in range(N)]\n\na.sort()\nt = 0\nk = 0\nwhile k < N and t + a[k] <= S:\n    t += a[k]\n    k += 1\n\nbase = t - a[k - 1]\nmx = a[k - 1]\nfor x in a[k - 1:]:\n    if base + x <= S:\n        mx = max(mx, x)\n\nprint(k, mx)`,
      },
    };
  }
  return null;
}

function generateDiscountChecksVariant() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const N = randInt(900, 4200);
    const prices = Array.from({ length: N }, () => randInt(10, 5000) * 2);
    const ans = solveDiscountChecks(prices);

    const lines = [String(N), ...prices.map(String)];
    const fileName = `task26_discount_${Date.now()}.txt`;

    return {
      mode: "discount_checks",
      chips: [
        { text: TEMPLATE_LABELS.discount_checks },
        { text: "Файл: .txt", kind: "alt" },
      ],
      theory: buildCommonTheory("discount_checks"),
      conditionHtml: `
        <p>На каждый 6-й товар в чеке действует скидка 50%. Система подбирает товары в чек так, чтобы сумма чека была максимально возможной при выполнении акции.</p>
        <p>Входной файл: первая строка — число товаров <code>N</code>, далее <code>N</code> строк с ценами.</p>
        <p>Найдите: (1) минимальную сумму оплаты, если закупщик делит покупку на несколько чеков оптимально, (2) сумму оплаты, если всё купить одним чеком.</p>
      `,
      params: [
        { label: "N", value: formatNumber(N) },
        { label: "Скидка", value: "каждый 6-й товар за 50%" },
        { label: "Ограничения", value: "цены целые, чётные (чтобы ответ был целым)" },
      ],
      inputLines: lines,
      fileName,
      solution: {
        steps: [
          "Сортируем цены по убыванию.",
          "Для «нескольких чеков» скидка применяется к каждому 6-му элементу в этом списке (индексы 6, 12, 18, ...).",
          "Для «одного чека» скидка применяется к floor(N/6) самым дешёвым товарам.",
          "Вычитаем половину соответствующих сумм из полной стоимости.",
        ],
        answer: `${ans.splitTotal} ${ans.oneCheckTotal}`,
        python: `with open('input.txt') as f:\n    N = int(f.readline())\n    prices = [int(f.readline()) for _ in range(N)]\n\nall_sum = sum(prices)\n\ndesc = sorted(prices, reverse=True)\nasc = sorted(prices)\n\n# оптимальное разбиение на чеки\ndisc_split = sum(desc[i] for i in range(5, N, 6)) / 2\nsplit_total = int(all_sum - disc_split)\n\n# один чек\nm = N // 6\ndisc_one = sum(asc[:m]) / 2\none_total = int(all_sum - disc_one)\n\nprint(split_total, one_total)`,
      },
    };
  }
  return null;
}

function generateHotelPairVariant() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const M = randInt(80, 300);
    const K = randInt(20, 100);
    const targetFloor = M;
    const targetStart = randInt(2, K - 2);

    const occupied = new Set();
    const onTopFloor = new Set([targetStart - 1, targetStart + 2]);

    function key(f, r) {
      return `${f}#${r}`;
    }

    function hasTopPairSmallerThanTarget(roomSet) {
      for (let x = 1; x <= targetStart - 2; x += 1) {
        if (roomSet.has(x) && roomSet.has(x + 3)) {
          return true;
        }
      }
      return false;
    }

    const maxN = Math.min(9000, M * K - 4);
    const N = randInt(1800, Math.max(1800, maxN));

    occupied.add(key(targetFloor, targetStart - 1));
    occupied.add(key(targetFloor, targetStart + 2));

    let guard = 0;
    while (occupied.size < N && guard < N * 25) {
      guard += 1;
      const floor = randInt(1, M);
      const room = randInt(1, K);

      if (floor === targetFloor) {
        if (room === targetStart || room === targetStart + 1) {
          continue;
        }
        const test = new Set(onTopFloor);
        test.add(room);
        if (hasTopPairSmallerThanTarget(test)) {
          continue;
        }
        onTopFloor.add(room);
      }

      occupied.add(key(floor, room));
    }

    const entries = [...occupied].map((x) => x.split("#").map(Number));
    ensureHotelLimits(entries, M, K);

    const answer = solveHotelPair(entries);
    if (!answer || answer.floor !== targetFloor || answer.room !== targetStart) {
      continue;
    }

    const shuffled = shuffle(entries);
    const lines = [
      `${shuffled.length} ${M} ${K}`,
      ...shuffled.map(([f, r]) => `${f} ${r}`),
    ];

    const fileName = `task26_hotel_pair_${Date.now()}.txt`;

    return {
      mode: "hotel_pair",
      chips: [
        { text: TEMPLATE_LABELS.hotel_pair },
        { text: "Файл: .txt", kind: "alt" },
      ],
      theory: buildCommonTheory("hotel_pair"),
      conditionHtml: `
        <p>В гостинице известны занятые комнаты. Нужно найти две соседние свободные комнаты на одном этаже так, чтобы комнаты по краям были заняты.</p>
        <p>Из всех вариантов выбирается наиболее высокий этаж; при нескольких вариантах на этом этаже — пара с наименьшим номером комнаты.</p>
        <p>Формат входа: первая строка <code>N M K</code>, далее <code>N</code> строк <code>этаж комната</code>.</p>
      `,
      params: [
        { label: "N", value: formatNumber(shuffled.length) },
        { label: "Этажей M", value: formatNumber(M) },
        { label: "Комнат на этаже K", value: formatNumber(K) },
        { label: "Логика генерации", value: "Этажи ≤ 300, комнаты ≤ 100" },
      ],
      inputLines: lines,
      fileName,
      solution: {
        steps: [
          "Сортируем пары (этаж, комната): сначала этаж по убыванию, затем комнату по возрастанию.",
          "Пробегаем соседние строки: если этаж совпадает и разница номеров комнат равна 3, значит между ними две свободные соседние комнаты.",
          "Первая найденная такая пара уже отвечает критериям «самый высокий этаж» и «минимальный номер комнаты».",
          "Искомый номер комнаты равен левому занятому + 1.",
        ],
        answer: `${answer.floor} ${answer.room}`,
        python: `with open('input.txt') as f:\n    N, M, K = map(int, f.readline().split())\n    a = [tuple(map(int, f.readline().split())) for _ in range(N)]\n\na.sort(key=lambda x: (-x[0], x[1]))\n\nfor i in range(len(a) - 1):\n    f1, r1 = a[i]\n    f2, r2 = a[i + 1]\n    if f1 == f2 and r2 - r1 == 3:\n        print(f1, r1 + 1)\n        break`,
      },
    };
  }
  return null;
}

function generateHostelSequenceVariant() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const M = randInt(80, 300);
    const K = randInt(25, 100);
    const targetFloor = 1;
    const targetLen = randInt(4, Math.min(10, K - 2));
    const targetStart = randInt(1, K - targetLen + 1);

    const unique = new Set();
    function key(room, floor) {
      return `${room}#${floor}`;
    }

    for (let room = targetStart; room < targetStart + targetLen; room += 1) {
      unique.add(key(room, targetFloor));
    }

    const baseUnique = randInt(1400, Math.min(4200, M * K - 10));
    let guard = 0;
    while (unique.size < baseUnique && guard < baseUnique * 20) {
      guard += 1;
      const floor = randInt(1, M);
      const room = randInt(1, K);

      if (floor === targetFloor && room >= targetStart && room < targetStart + targetLen) {
        continue;
      }
      if (Math.random() < 0.86) {
        unique.add(key(room, floor));
      }
    }

    const baseEntries = [...unique].map((x) => x.split("#").map(Number));
    const duplicated = [...baseEntries];
    const duplicateCount = randInt(120, 900);
    for (let i = 0; i < duplicateCount; i += 1) {
      duplicated.push(pick(baseEntries));
    }

    const entries = shuffle(duplicated);
    const asFloorRoom = entries.map(([room, floor]) => [floor, room]);
    ensureHotelLimits(asFloorRoom, M, K);

    const answer = solveHostelSequence(entries);
    if (answer.bestLen !== targetLen || answer.bestFloor !== targetFloor) {
      continue;
    }

    const lines = [String(entries.length), ...entries.map(([room, floor]) => `${room} ${floor}`)];
    const fileName = `task26_hostel_run_${Date.now()}.txt`;

    return {
      mode: "hostel_sequence",
      chips: [
        { text: TEMPLATE_LABELS.hostel_sequence },
        { text: "Файл: .txt", kind: "alt" },
      ],
      theory: buildCommonTheory("hostel_sequence"),
      conditionHtml: `
        <p>Даны записи о номерах комнат, которые бронировались после уборки в хостеле. Нужно найти максимальную длину последовательности подряд идущих номеров на одном этаже.</p>
        <p>Если таких этажей несколько, выбрать этаж с меньшим номером.</p>
        <p>Вход: первая строка <code>N</code>, далее <code>N</code> строк <code>номер_комнаты этаж</code>. В данных возможны дубликаты.</p>
      `,
      params: [
        { label: "N", value: formatNumber(entries.length) },
        { label: "Этажей (генератор)", value: formatNumber(M) },
        { label: "Комнат на этаже (генератор)", value: formatNumber(K) },
        { label: "Логика генерации", value: "Этажи ≤ 300, комнаты ≤ 100" },
      ],
      inputLines: lines,
      fileName,
      solution: {
        steps: [
          "Сгруппировать записи по этажам и удалить дубликаты номеров комнат внутри каждого этажа.",
          "Для каждого этажа отсортировать номера комнат и вычислить максимальную длину непрерывного фрагмента.",
          "Сравнить этажи: сначала по длине фрагмента (по убыванию), при равенстве — по номеру этажа (по возрастанию).",
          "Вывести длину и номер выбранного этажа.",
        ],
        answer: `${answer.bestLen} ${answer.bestFloor}`,
        python: `from collections import defaultdict\n\nwith open('input.txt') as f:\n    N = int(f.readline())\n    by_floor = defaultdict(set)\n    for _ in range(N):\n        room, floor = map(int, f.readline().split())\n        by_floor[floor].add(room)\n\nbest_len = 0\nbest_floor = 10**9\n\nfor floor, rooms in by_floor.items():\n    arr = sorted(rooms)\n    run = 0\n    prev = -10**9\n    floor_best = 0\n    for room in arr:\n        if room == prev + 1:\n            run += 1\n        else:\n            run = 1\n        prev = room\n        floor_best = max(floor_best, run)\n\n    if floor_best > best_len or (floor_best == best_len and floor < best_floor):\n        best_len = floor_best\n        best_floor = floor\n\nprint(best_len, best_floor)`,
      },
    };
  }
  return null;
}

function generateAdmissionVariant() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const N = randInt(1400, 5200);
    const K = randInt(Math.floor(N * 0.35), Math.floor(N * 0.72));

    const ids = new Set();
    while (ids.size < N) {
      ids.add(randInt(1, 100000));
    }

    const idList = [...ids];
    const rows = idList.map((id) => [
      id,
      randInt(30, 100),
      randInt(30, 100),
      randInt(30, 100),
      randInt(0, 10),
    ]);

    const ans = solveAdmission(rows, K);
    if (!ans) {
      continue;
    }

    const lines = [
      `${N} ${K}`,
      ...rows.map((r) => `${r[0]} ${r[1]} ${r[2]} ${r[3]} ${r[4]}`),
    ];
    const fileName = `task26_admission_${Date.now()}.txt`;

    return {
      mode: "admission",
      chips: [
        { text: TEMPLATE_LABELS.admission },
        { text: "Файл: .txt", kind: "alt" },
      ],
      theory: buildCommonTheory("admission"),
      conditionHtml: `
        <p>Вуз формирует рейтинг по убыванию суммы баллов (3 экзамена + собеседование). При равенстве суммы выше тот, у кого больше балл за собеседование; затем — меньший ID.</p>
        <p>Нужно определить ID абитуриента, который последним из списка набрал проходной балл, и количество абитуриентов с полупроходным баллом.</p>
        <p>Вход: первая строка <code>N K</code>, далее <code>N</code> строк <code>ID e1 e2 e3 interview</code>.</p>
      `,
      params: [
        { label: "N", value: formatNumber(N) },
        { label: "K (мест)", value: formatNumber(K) },
        {
          label: "Ограничения",
          value: "ID ≤ 100000, экзамены 0..100, собеседование 0..10",
        },
      ],
      inputLines: lines,
      fileName,
      solution: {
        steps: [
          "Для каждого абитуриента считаем total = e1 + e2 + e3 + interview.",
          "Сортируем по правилам рейтинга: total ↓, interview ↓, ID ↑.",
          "Берём сумму баллов у K-го в рейтинге: это кандидат на полупроходной балл.",
          "Если выше этого балла ровно K человек — полупроходного балла нет; иначе считаем количество абитуриентов с баллом K-го и ID последнего гарантированно поступившего.",
        ],
        answer: `${ans.lastPassingId} ${ans.semiCount}`,
        python: `with open('input.txt') as f:\n    N, K = map(int, f.readline().split())\n    a = []\n    for _ in range(N):\n        ID, e1, e2, e3, iv = map(int, f.readline().split())\n        total = e1 + e2 + e3 + iv\n        a.append((ID, total, iv))\n\na.sort(key=lambda x: (-x[1], -x[2], x[0]))\nsemi = a[K - 1][1]\nabove = [x for x in a if x[1] > semi]\n\nif len(above) == K:\n    print(a[K - 1][0], 0)\nelse:\n    print(above[-1][0], sum(1 for x in a if x[1] == semi))`,
      },
    };
  }
  return null;
}

function generateVariantByMode(mode) {
  switch (mode) {
    case "shift_tasks":
      return generateShiftTasksVariant();
    case "discount_checks":
      return generateDiscountChecksVariant();
    case "hotel_pair":
      return generateHotelPairVariant();
    case "hostel_sequence":
      return generateHostelSequenceVariant();
    case "admission":
      return generateAdmissionVariant();
    default:
      return null;
  }
}

function renderVariant(variant) {
  const taskText = document.getElementById("taskText");
  const theoryWrap = document.getElementById("theoryWrap");
  const filesWrap = document.getElementById("filesWrap");
  const paramsWrap = document.getElementById("paramsWrap");
  const previewWrap = document.getElementById("previewWrap");
  const solutionWrap = document.getElementById("solutionWrap");

  revokeDownloads();

  const fileBlob = createTextBlob(variant.inputLines);
  const fileUrl = createBlobUrl(fileBlob);

  const files = [
    {
      name: variant.fileName,
      label: "Скачать входной файл (.txt)",
      url: fileUrl,
      kind: "alt",
    },
  ];

  taskText.innerHTML = `${renderChips(variant.chips)}${variant.conditionHtml}`;
  theoryWrap.innerHTML = renderTheory(variant.theory);
  filesWrap.innerHTML = renderFiles(files);
  paramsWrap.innerHTML = renderParams(variant.params);
  previewWrap.innerHTML = renderPreview(variant.inputLines);
  solutionWrap.innerHTML = renderSolution(variant.solution);
}

function generateAndRender() {
  const mode = document.getElementById("taskMode").value;
  let queue = [];
  if (mode === "random") {
    queue = shuffle(MODE_ORDER);
  } else {
    queue = [mode];
  }

  for (const key of queue) {
    const variant = generateVariantByMode(key);
    if (variant) {
      renderVariant(variant);
      return;
    }
  }

  document.getElementById("taskText").innerHTML =
    "<p>Не удалось сгенерировать корректный вариант. Нажмите кнопку ещё раз.</p>";
}

document.getElementById("generateBtn").addEventListener("click", generateAndRender);
generateAndRender();
