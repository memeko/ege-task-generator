"use strict";

const QUESTION_LABELS = {
  shortest: "Кратчайший путь",
  longest: "Самый длинный путь",
  difference: "Разность длин путей",
};

const MIN_VERTEX_COUNT = 7;
const MAX_VERTEX_COUNT = 200;
const MANUAL_VERTEX_COUNT = 10;

const elements = {
  questionType: document.getElementById("questionType"),
  startMode: document.getElementById("startMode"),
  vertexMode: document.getElementById("vertexMode"),
  density: document.getElementById("density"),
  densityValue: document.getElementById("densityValue"),
  generateBtn: document.getElementById("generateBtn"),
  printBtn: document.getElementById("printBtn"),
  printDialog: document.getElementById("printDialog"),
  printForm: document.getElementById("printForm"),
  printCount: document.getElementById("printCount"),
  printCloseBtn: document.getElementById("printCloseBtn"),
  printCancelBtn: document.getElementById("printCancelBtn"),
  printCreateBtn: document.getElementById("printCreateBtn"),
  printStatus: document.getElementById("printStatus"),
  printDownload: document.getElementById("printDownload"),
  theoryWrap: document.getElementById("theoryWrap"),
  taskText: document.getElementById("taskText"),
  filesWrap: document.getElementById("filesWrap"),
  paramsWrap: document.getElementById("paramsWrap"),
  graphWrap: document.getElementById("graphWrap"),
  previewWrap: document.getElementById("previewWrap"),
  solutionWrap: document.getElementById("solutionWrap"),
};

let currentDownloadUrl = null;
let printPackageUrl = null;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pick(items) {
  return items[randInt(0, items.length - 1)];
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function highlightPython(code) {
  const tokenPattern = /(#.*$)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|\b(def|return|for|in|if|elif|else|while|with|as|break|continue|not|and|or|is|None|True|False)\b|\b(float|int|set|sorted|len|open|round|print|range|list|dict|min|max)\b|\b(\d+(?:\.\d+)?)\b/gm;
  let result = "";
  let lastIndex = 0;

  for (const match of code.matchAll(tokenPattern)) {
    result += escapeHtml(code.slice(lastIndex, match.index));
    let className = "py-number";
    if (match[1]) {
      className = "py-comment";
    } else if (match[2]) {
      className = "py-string";
    } else if (match[3]) {
      className = "py-keyword";
    } else if (match[4]) {
      className = "py-builtin";
    }
    result += `<span class="${className}">${escapeHtml(match[0])}</span>`;
    lastIndex = match.index + match[0].length;
  }

  return result + escapeHtml(code.slice(lastIndex));
}

function formatWeight(weight10) {
  return (weight10 / 10).toFixed(1);
}

function getConfig() {
  const density = clamp(Number(elements.density.value) || 36, 25, 65);
  const maxVertexCount =
    elements.vertexMode.value === "manual"
      ? MANUAL_VERTEX_COUNT
      : MAX_VERTEX_COUNT;
  elements.density.value = String(density);
  elements.densityValue.textContent = String(density);

  return {
    vertexCount: randInt(MIN_VERTEX_COUNT, maxVertexCount),
    vertexMode: elements.vertexMode.value,
    density,
    questionType:
      elements.questionType.value === "random"
        ? pick(Object.keys(QUESTION_LABELS))
        : elements.questionType.value,
    startMode: elements.startMode.value,
  };
}

function generateVertexIds(count, startMode) {
  const ids = shuffle(Array.from({ length: count }, (_, index) => index + 1));
  const oneIndex = ids.indexOf(1);

  if (startMode === "one") {
    [ids[0], ids[oneIndex]] = [ids[oneIndex], ids[0]];
  }
  if (startMode === "not_one" && ids[0] === 1) {
    [ids[0], ids[1]] = [ids[1], ids[0]];
  }
  return ids;
}

function buildLevels(count) {
  const levelCount = clamp(Math.round(Math.sqrt(count)), 4, 12);
  const levels = Array.from({ length: levelCount }, () => []);
  levels[0].push(0);
  levels[levelCount - 1].push(count - 1);

  const assignments = [];
  for (let level = 1; level < levelCount - 1; level += 1) {
    assignments.push(level);
  }
  while (assignments.length < count - 2) {
    assignments.push(randInt(1, levelCount - 2));
  }

  const shuffledAssignments = shuffle(assignments);
  for (let vertex = 1; vertex < count - 1; vertex += 1) {
    levels[shuffledAssignments[vertex - 1]].push(vertex);
  }
  for (const level of levels) {
    level.sort((a, b) => a - b);
  }
  return levels;
}

function edgeKey(from, to) {
  return `${from}:${to}`;
}

function makeGraph(config) {
  const ids = generateVertexIds(config.vertexCount, config.startMode);
  const levels = buildLevels(config.vertexCount);
  const levelByVertex = new Array(config.vertexCount).fill(0);
  levels.forEach((vertices, level) => {
    for (const vertex of vertices) {
      levelByVertex[vertex] = level;
    }
  });

  const edges = [];
  const edgeMap = new Map();

  function addEdge(from, to) {
    if (from === to || levelByVertex[from] >= levelByVertex[to]) {
      return false;
    }
    const key = edgeKey(from, to);
    if (edgeMap.has(key)) {
      return false;
    }
    const edge = {
      from,
      to,
      weight10: randInt(5, 500),
    };
    edges.push(edge);
    edgeMap.set(key, edge);
    return true;
  }

  // Каждая внутренняя вершина получает вход с предыдущего уровня.
  for (let level = 1; level < levels.length; level += 1) {
    for (const vertex of levels[level]) {
      addEdge(pick(levels[level - 1]), vertex);
    }
  }

  // Каждая внутренняя вершина получает выход на следующий уровень.
  for (let level = 0; level < levels.length - 1; level += 1) {
    for (const vertex of levels[level]) {
      addEdge(vertex, pick(levels[level + 1]));
    }
  }

  const possible = [];
  for (let fromLevel = 0; fromLevel < levels.length - 1; fromLevel += 1) {
    for (let toLevel = fromLevel + 1; toLevel < levels.length; toLevel += 1) {
      for (const from of levels[fromLevel]) {
        for (const to of levels[toLevel]) {
          possible.push([from, to]);
        }
      }
    }
  }

  // Для больших графов процент от всех пар дал бы тысячи нечитаемых рёбер.
  // Поэтому плотность управляет числом связей относительно числа вершин.
  const requestedEdges = Math.round(
    config.vertexCount * (1.4 + config.density / 100)
  );
  const targetEdges = Math.min(
    possible.length,
    Math.max(edges.length, requestedEdges, ids[config.vertexCount - 1])
  );
  for (const [from, to] of shuffle(possible)) {
    if (edges.length >= targetEdges) {
      break;
    }
    addEdge(from, to);
  }

  return {
    ids,
    levels,
    levelByVertex,
    edges,
    source: 0,
    target: config.vertexCount - 1,
    possibleEdgeCount: possible.length,
  };
}

function solveDag(graph, useMaximum) {
  const count = graph.ids.length;
  const adjacency = Array.from({ length: count }, () => []);
  for (const edge of graph.edges) {
    adjacency[edge.from].push(edge);
  }

  const order = graph.levels.flat();
  const unreachable = useMaximum ? -Infinity : Infinity;
  const distance = new Array(count).fill(unreachable);
  const previous = new Array(count).fill(-1);
  distance[graph.source] = 0;

  for (const vertex of order) {
    if (!Number.isFinite(distance[vertex])) {
      continue;
    }
    for (const edge of adjacency[vertex]) {
      const candidate = distance[vertex] + edge.weight10;
      const better = useMaximum
        ? candidate > distance[edge.to]
        : candidate < distance[edge.to];
      if (better) {
        distance[edge.to] = candidate;
        previous[edge.to] = vertex;
      }
    }
  }

  const path = [];
  let current = graph.target;
  while (current !== -1) {
    path.push(current);
    if (current === graph.source) {
      break;
    }
    current = previous[current];
  }
  path.reverse();

  return {
    distance10: distance[graph.target],
    path,
  };
}

function countPaths(graph) {
  const ways = new Array(graph.ids.length).fill(0);
  ways[graph.source] = 1;
  const adjacency = Array.from({ length: graph.ids.length }, () => []);
  for (const edge of graph.edges) {
    adjacency[edge.from].push(edge.to);
  }
  for (const vertex of graph.levels.flat()) {
    for (const to of adjacency[vertex]) {
      ways[to] += ways[vertex];
    }
  }
  return ways[graph.target];
}

function generateModel(config) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const graph = makeGraph(config);
    const shortest = solveDag(graph, false);
    const longest = solveDag(graph, true);
    if (
      countPaths(graph) >= 2 &&
      Number.isFinite(shortest.distance10) &&
      Number.isFinite(longest.distance10) &&
      longest.distance10 - shortest.distance10 >= 20
    ) {
      return {
        config,
        graph,
        shortest,
        longest,
      };
    }
  }
  throw new Error("Не удалось построить граф с несколькими различными путями.");
}

function getAnswer(model) {
  if (model.config.questionType === "shortest") {
    return Math.floor(model.shortest.distance10 / 10);
  }
  if (model.config.questionType === "longest") {
    return Math.floor(model.longest.distance10 / 10);
  }
  return Math.floor((model.longest.distance10 - model.shortest.distance10) / 10);
}

function makeFileLines(model) {
  const separators = [" ", "  ", "\t", " \t "];
  return shuffle(model.graph.edges).map((edge) => {
    const left = model.graph.ids[edge.from];
    const right = model.graph.ids[edge.to];
    return `${left}${pick(separators)}${right}${pick(separators)}${formatWeight(
      edge.weight10
    )}`;
  });
}

function questionSentence(model) {
  const start = model.graph.ids[model.graph.source];
  const finish = model.graph.ids[model.graph.target];
  if (model.config.questionType === "shortest") {
    return `Найдите и запишите в ответе целую часть длины кратчайшего пути из вершины с номером ${start} в вершину с номером ${finish}.`;
  }
  if (model.config.questionType === "longest") {
    return `Найдите и запишите в ответе целую часть длины самого длинного пути из вершины с номером ${start} в вершину с номером ${finish}.`;
  }
  return `Найдите и запишите в ответе целую часть разности между длиной самого длинного и длиной кратчайшего пути из вершины с номером ${start} в вершину с номером ${finish}.`;
}

function renderTheory(model) {
  const longestNote =
    model.config.questionType === "shortest"
      ? "Классический алгоритм Дейкстры последовательно выбирает непосещённую вершину с наименьшим известным расстоянием и уточняет расстояния до её соседей."
      : "Классический алгоритм Дейкстры ищет минимум. Для максимального пути его нельзя просто заменить на выбор максимума. Так как граф ациклический, вершины сначала располагают в топологическом порядке, а затем выполняют те же операции релаксации рёбер.";

  elements.theoryWrap.innerHTML = `
    <div class="theory-alert"><strong>ВНИМАНИЕ!</strong> В прототипе, представленном на Всероссийском съезде учителей информатики 2026, была показана задача только на поиск кратчайшего пути от 1 вершины.</div>
    <div class="chips">
      <span class="chip">${escapeHtml(QUESTION_LABELS[model.config.questionType])}</span>
      <span class="chip ok">Ориентированный DAG</span>
      <span class="chip warn">Веса положительные</span>
    </div>
    <div class="theory-grid">
      <article class="theory-card">
        <h3>Ориентированный ациклический граф (DAG)</h3>
        <p>У каждого ребра есть направление. Ациклический граф не содержит пути, который по стрелкам возвращается в уже пройденную вершину. Поэтому самый длинный путь имеет конечную длину.</p>
      </article>
      <article class="theory-card">
        <h3>Длина пути</h3>
        <p>Длина пути равна сумме весов всех его рёбер. В графе с <em>N</em> вершинами используются все номера от 1 до <em>N</em>, но строки рёбер в файле перемешаны, а направление ребра не обязано совпадать с возрастанием номеров.</p>
      </article>
      <article class="theory-card">
        <h3>Способ 1. Алгоритм Флойда</h3>
        <ol>
          <li>Создаём матрицу расстояний: на главной диагонали записываем 0, для существующих рёбер — их веса, в остальных ячейках — бесконечность.</li>
          <li>По очереди выбираем каждую вершину <code>k</code> как возможную промежуточную.</li>
          <li>Для каждой пары <code>i</code> и <code>j</code> вычисляем длину пути <code>i → k → j</code>.</li>
          <li>Если новый путь короче уже известного, заменяем значение. Для самого длинного пути в DAG вместо минимума сохраняем максимум, а недостижимые пары обозначаем как <code>−∞</code>.</li>
          <li>После полного перебора берём значение для заданных начальной и конечной вершин.</li>
        </ol>
      </article>
      <article class="theory-card">
        <h3>Способ 2. Алгоритм Дейстры</h3>
        <p>${longestNote}</p>
        <ol>
          <li>Для Дейкстры расстояние до старта принимаем равным 0, до остальных вершин — бесконечности.</li>
          <li>Выбираем ещё не обработанную вершину с наименьшим известным расстоянием.</li>
          <li>Перебираем все исходящие из неё рёбра. Если найден более короткий путь до соседа, запоминаем его.</li>
          <li>Отмечаем вершину обработанной и повторяем действия, пока достижимые вершины не закончатся.</li>
        </ol>
      </article>
      <article class="theory-card">
        <h3>Как строится топологический порядок</h3>
        <ol>
          <li>Для каждой вершины считаем количество входящих рёбер.</li>
          <li>В очередь помещаем вершины, у которых нет входящих рёбер.</li>
          <li>Берём вершину из очереди и добавляем её в порядок. Её исходящие рёбра считаем удалёнными, поэтому уменьшаем число входящих рёбер у соседей.</li>
          <li>Если у соседа число входящих рёбер стало равно нулю, добавляем его в очередь.</li>
          <li>В DAG процесс включает все вершины. Теперь при поиске максимума каждая вершина обрабатывается только после всех возможных предшественников.</li>
        </ol>
      </article>
    </div>
  `;
}

function buildTaskContent(model, dataFileName = "23.txt") {
  return `
    <p>Задание выполняется с использованием прилагаемого файла <strong>${escapeHtml(dataFileName)}</strong>.</p>
    <p>В текстовом файле содержится описание ациклического ориентированного взвешенного графа. В каждой строке файла записаны два натуральных числа (<em>L</em>, <em>M</em>) и одно положительное вещественное число (<em>W</em>). <em>L</em> и <em>M</em> — номера вершин графа, <em>W</em> — вес ребра, ведущего из вершины <em>L</em> в вершину <em>M</em>. Таким образом, количество строк в файле равно количеству рёбер в графе. Две вершины графа не могут быть соединены более чем одним ребром.</p>
    <p>${escapeHtml(questionSentence(model))} Существование хотя бы одного такого пути гарантируется. Под длиной пути понимается сумма весов всех рёбер, составляющих путь.</p>
    <p>Для выполнения этого задания следует написать программу.</p>
    <p>Если граф содержит <em>N</em> вершин, они имеют номера от 1 до <em>N</em> без пропусков. Рёбра в файле могут быть записаны в любом порядке, а направление ребра не обязано идти от меньшего номера к большему. Значения <em>L</em> и <em>M</em> не превышают 200, значение <em>W</em> не превышает 10&nbsp;000. В этом файле записано ${model.graph.edges.length} строк, то есть ровно по одной строке для каждого из ${model.graph.edges.length} рёбер графа. Числа в строках разделены произвольным ненулевым количеством пробелов и/или символов табуляции.</p>
  `;
}

function renderTask(model) {
  elements.taskText.innerHTML = buildTaskContent(model);
}

function renderFile(model, lines) {
  if (currentDownloadUrl) {
    URL.revokeObjectURL(currentDownloadUrl);
  }
  const blob = new Blob([`${lines.join("\n")}\n`], {
    type: "text/plain;charset=utf-8",
  });
  currentDownloadUrl = URL.createObjectURL(blob);
  elements.filesWrap.innerHTML = `
    <div class="files-box">
      <p><strong>Сформирован файл:</strong> 23.txt</p>
      <p>Каждая строка имеет формат <code>L M W</code>. Заголовка и количества строк в начале файла нет.</p>
      <a class="download-link" href="${currentDownloadUrl}" download="23.txt">Скачать 23.txt</a>
    </div>
  `;
}

function renderParams(model) {
  const actualDensity = Math.round(
    (model.graph.edges.length / model.graph.possibleEdgeCount) * 100
  );
  elements.paramsWrap.innerHTML = `
    <div class="params-box">
      <p><strong>Тип вопроса:</strong> ${escapeHtml(QUESTION_LABELS[model.config.questionType])}</p>
      <p><strong>Начальная вершина:</strong> ${model.graph.ids[model.graph.source]}</p>
      <p><strong>Конечная вершина:</strong> ${model.graph.ids[model.graph.target]}</p>
      <p><strong>Вершин:</strong> ${model.graph.ids.length}</p>
      <p><strong>Режим размера:</strong> ${model.config.vertexMode === "manual" ? "До 10 вершин" : "Любое количество вершин"}</p>
      <p><strong>Рёбер:</strong> ${model.graph.edges.length}</p>
      <p><strong>Строк в файле:</strong> ${model.graph.edges.length} (по одной строке на ребро)</p>
      <p><strong>Фактическая плотность:</strong> ${actualDensity}% от возможных направленных рёбер между уровнями</p>
    </div>
  `;
}

function renderPreview(lines) {
  const shown = lines.slice(0, 10);
  elements.previewWrap.innerHTML = `
    <p class="preview-meta">Показаны первые ${shown.length} строк; порядок рёбер в файле перемешан.</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>№ строки</th><th>L</th><th>M</th><th>W</th></tr></thead>
        <tbody>
          ${shown
            .map((line, index) => {
              const parts = line.trim().split(/\s+/);
              return `<tr><td>${index + 1}</td><td>${escapeHtml(parts[0])}</td><td>${escapeHtml(parts[1])}</td><td>${escapeHtml(parts[2])}</td></tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function createSvgElement(name, attributes = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function boxesOverlap(first, second, gap = 3) {
  return !(
    first.x + first.width + gap <= second.x ||
    second.x + second.width + gap <= first.x ||
    first.y + first.height + gap <= second.y ||
    second.y + second.height + gap <= first.y
  );
}

function findWeightLabelPosition(segment, text, occupied, vertexBoxes, width, height) {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const boxWidth = Math.max(34, text.length * 8 + 12);
  const boxHeight = 20;
  const tValues = [0.5, 0.38, 0.62, 0.26, 0.74, 0.18, 0.82];
  const offsets = [0, -16, 16, -32, 32, -48, 48, -64, 64, -80, 80];

  function tryPosition(centerX, centerY, leader) {
    const box = {
      x: centerX - boxWidth / 2,
      y: centerY - boxHeight / 2,
      width: boxWidth,
      height: boxHeight,
    };
    const inside =
      box.x >= 4 &&
      box.y >= 4 &&
      box.x + box.width <= width - 4 &&
      box.y + box.height <= height - 4;
    if (!inside) {
      return null;
    }
    if (occupied.some((other) => boxesOverlap(box, other))) {
      return null;
    }
    if (vertexBoxes.some((other) => boxesOverlap(box, other, 5))) {
      return null;
    }
    return { x: centerX, y: centerY, box, leader };
  }

  for (const t of tValues) {
    const baseX = segment.x1 + dx * t;
    const baseY = segment.y1 + dy * t;
    for (const offset of offsets) {
      const position = tryPosition(
        baseX + normalX * offset,
        baseY + normalY * offset,
        null
      );
      if (position) {
        return position;
      }
    }
  }

  // Если ребро проходит через очень плотную область, используем свободную
  // выноску и соединяем её с серединой ребра тонкой пунктирной линией.
  for (let y = 18; y <= height - 18; y += 24) {
    for (let x = 22; x <= width - 22; x += 42) {
      const position = tryPosition(x, y, {
        x: (segment.x1 + segment.x2) / 2,
        y: (segment.y1 + segment.y2) / 2,
      });
      if (position) {
        return position;
      }
    }
  }

  throw new Error("Не удалось разместить подписи весов без пересечений.");
}

function buildGraphSvg(model) {
  const graph = model.graph;
  const largestLevel = Math.max(...graph.levels.map((vertices) => vertices.length));
  const radius = graph.ids.length > 120 ? 16 : graph.ids.length > 60 ? 18 : 22;
  const paddingX = 75;
  const paddingY = radius + 34;
  const width = Math.max(1120, (graph.levels.length - 1) * 165 + paddingX * 2);
  const height = Math.max(560, largestLevel * (radius * 2 + 34) + paddingY * 2);
  const positions = new Array(graph.ids.length);

  graph.levels.forEach((vertices, level) => {
    const x =
      paddingX +
      (level * (width - paddingX * 2)) / Math.max(1, graph.levels.length - 1);
    vertices.forEach((vertex, index) => {
      const y =
        paddingY +
        ((index + 1) * (height - paddingY * 2)) / (vertices.length + 1);
      positions[vertex] = { x, y };
    });
  });

  const svg = createSvgElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: `0 0 ${width} ${height}`,
    style: `min-width: ${width}px`,
    role: "img",
    "aria-label": "Ориентированный взвешенный граф задания",
  });
  const defs = createSvgElement("defs");
  const marker = createSvgElement("marker", {
    id: "arrow23",
    viewBox: "0 0 10 10",
    refX: 9,
    refY: 5,
    markerWidth: 7,
    markerHeight: 7,
    orient: "auto-start-reverse",
  });
  marker.appendChild(
    createSvgElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#526b8d" })
  );
  defs.appendChild(marker);
  svg.appendChild(defs);

  const segments = graph.edges.map((edge) => {
    const from = positions[edge.from];
    const to = positions[edge.to];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const x1 = from.x + ux * radius;
    const y1 = from.y + uy * radius;
    const x2 = to.x - ux * (radius + 7);
    const y2 = to.y - uy * (radius + 7);

    svg.appendChild(
      createSvgElement("line", {
        x1,
        y1,
        x2,
        y2,
        stroke: "#526b8d",
        "stroke-width": 1.8,
        "marker-end": "url(#arrow23)",
      })
    );
    return { edge, x1, y1, x2, y2 };
  });

  const vertexBoxes = positions.map((position) => ({
    x: position.x - radius,
    y: position.y - radius,
    width: radius * 2,
    height: radius * 2,
  }));
  const occupiedLabels = [];

  for (const segment of segments) {
    const text = formatWeight(segment.edge.weight10);
    const position = findWeightLabelPosition(
      segment,
      text,
      occupiedLabels,
      vertexBoxes,
      width,
      height
    );
    occupiedLabels.push(position.box);

    if (position.leader) {
      svg.appendChild(
        createSvgElement("line", {
          x1: position.x,
          y1: position.y,
          x2: position.leader.x,
          y2: position.leader.y,
          stroke: "#9aabc2",
          "stroke-width": 1,
          "stroke-dasharray": "3 3",
        })
      );
    }

    svg.appendChild(
      createSvgElement("rect", {
        x: position.box.x,
        y: position.box.y,
        width: position.box.width,
        height: position.box.height,
        rx: 5,
        fill: "#fbfcff",
        stroke: "#d7deea",
        "stroke-width": 0.8,
      })
    );
    const label = createSvgElement("text", {
      x: position.x,
      y: position.y + 4,
      "text-anchor": "middle",
      "font-size": 12,
      "font-weight": 650,
      fill: "#233d61",
    });
    label.textContent = text;
    svg.appendChild(label);
  }

  graph.ids.forEach((id, vertex) => {
    const position = positions[vertex];
    let fill = "#ffffff";
    let stroke = "#285b9d";
    if (vertex === graph.source) {
      fill = "#e7f8ee";
      stroke = "#16804c";
    }
    if (vertex === graph.target) {
      fill = "#fff0ec";
      stroke = "#c64a31";
    }
    svg.appendChild(
      createSvgElement("circle", {
        cx: position.x,
        cy: position.y,
        r: radius,
        fill,
        stroke,
        "stroke-width": 2.5,
      })
    );
    const text = createSvgElement("text", {
      x: position.x,
      y: position.y + 5,
      "text-anchor": "middle",
      "font-size": id > 99 ? 12 : 14,
      "font-weight": 750,
      fill: "#10223a",
    });
    text.textContent = id;
    svg.appendChild(text);
  });

  return svg;
}

function renderGraph(model) {
  elements.graphWrap.replaceChildren(buildGraphSvg(model));
}

function serializeGraph(model) {
  const svg = buildGraphSvg(model);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svg)}\n`;
}

async function graphSvgToJpeg(svgText) {
  const viewBoxMatch = svgText.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!viewBoxMatch) {
    throw new Error("Не удалось определить размер графа для JPEG.");
  }

  const width = Math.round(Number(viewBoxMatch[1]));
  const height = Math.round(Number(viewBoxMatch[2]));
  const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = svgUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#fbfcff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const jpegBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Браузер не смог создать JPEG-файл."));
          }
        },
        "image/jpeg",
        0.92
      );
    });
    return new Uint8Array(await jpegBlob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function findEdge(graph, from, to) {
  return graph.edges.find((edge) => edge.from === from && edge.to === to);
}

function describePath(model, solution) {
  const labels = solution.path.map((vertex) => model.graph.ids[vertex]);
  const weights = [];
  for (let i = 0; i < solution.path.length - 1; i += 1) {
    const edge = findEdge(model.graph, solution.path[i], solution.path[i + 1]);
    weights.push(formatWeight(edge.weight10));
  }
  return {
    route: labels.join(" → "),
    sum: `${weights.join(" + ")} = ${formatWeight(solution.distance10)}`,
  };
}

function buildFloydCode(model, dataFileName = "23.txt") {
  const start = model.graph.ids[model.graph.source];
  const finish = model.graph.ids[model.graph.target];
  const mode = model.config.questionType;

  const shortestBlock = `def floyd_min(vertices, edges):
    # Создаём матрицу: 0 на диагонали, бесконечность между остальными парами.
    inf = float('inf')
    d = {}
    # Проходим все вершины a, которые задают строки матрицы.
    for a in vertices:
        d[a] = {}
        # Проходим все вершины b, которые задают столбцы матрицы.
        for b in vertices:
            d[a][b] = inf
        d[a][a] = 0

    # Записываем в матрицу веса существующих направленных рёбер.
    # Проходим все тройки: начало ребра, конец ребра и его вес.
    for a, b, weight in edges:
        d[a][b] = weight

    # Разрешаем каждой вершине k быть промежуточной между i и j.
    # Проходим все возможные промежуточные вершины k.
    for k in vertices:
        # Для каждой k проходим все возможные начальные вершины i.
        for i in vertices:
            # Для каждой пары i и k проходим все конечные вершины j.
            for j in vertices:
                new_distance = d[i][k] + d[k][j]
                if new_distance < d[i][j]:
                    d[i][j] = new_distance
    return d`;

  const longestBlock = `def floyd_max(vertices, edges):
    # Для максимума недостижимую пару обозначаем как минус бесконечность.
    minus_inf = float('-inf')
    d = {}
    # Проходим все вершины a, которые задают строки матрицы.
    for a in vertices:
        d[a] = {}
        # Проходим все вершины b, которые задают столбцы матрицы.
        for b in vertices:
            d[a][b] = minus_inf
        d[a][a] = 0

    # Записываем в матрицу веса существующих направленных рёбер.
    # Проходим все тройки: начало ребра, конец ребра и его вес.
    for a, b, weight in edges:
        d[a][b] = weight

    # В DAG сохраняем большую длину пути через промежуточную вершину k.
    # Проходим все возможные промежуточные вершины k.
    for k in vertices:
        # Для каждой k проходим все возможные начальные вершины i.
        for i in vertices:
            # Для каждой пары i и k проходим все конечные вершины j.
            for j in vertices:
                if d[i][k] != minus_inf and d[k][j] != minus_inf:
                    new_distance = d[i][k] + d[k][j]
                    if new_distance > d[i][j]:
                        d[i][j] = new_distance
    return d`;

  let functions = "";
  let calculation = "";
  if (mode === "shortest") {
    functions = shortestBlock;
    calculation = `d_min = floyd_min(vertices, edges)
answer = d_min[START][FINISH]`;
  } else if (mode === "longest") {
    functions = longestBlock;
    calculation = `d_max = floyd_max(vertices, edges)
answer = d_max[START][FINISH]`;
  } else {
    functions = `${shortestBlock}\n\n\n${longestBlock}`;
    calculation = `d_min = floyd_min(vertices, edges)
d_max = floyd_max(vertices, edges)
answer = d_max[START][FINISH] - d_min[START][FINISH]`;
  }

  return `# Способ 1. Алгоритм Флойда
START = ${start}
FINISH = ${finish}

# Блок 1. Считываем все рёбра и собираем номера вершин.
edges = []
vertices = set()
with open('${dataFileName}') as file:
    # Проходим все строки файла; каждая строка описывает одно ребро.
    for line in file:
        L, M, W = line.split()
        L = int(L)
        M = int(M)
        W = float(W)
        edges.append((L, M, W))
        vertices.add(L)
        vertices.add(M)

vertices = sorted(vertices)

# Блок 2. Запускаем алгоритм Флойда.
${functions}


# Блок 3. Получаем требуемую длину пути.
${calculation}

# Блок 4. Берём целую часть ответа.
print(int(answer))`;
}

function buildRelaxationCode(model, dataFileName = "23.txt") {
  const start = model.graph.ids[model.graph.source];
  const finish = model.graph.ids[model.graph.target];
  const mode = model.config.questionType;

  const common = `START = ${start}
FINISH = ${finish}

graph = {}
vertices = set()
indegree = {}

with open('${dataFileName}') as file:
    # Проходим все строки файла; каждая строка описывает одно ребро.
    for line in file:
        L, M, W = line.split()
        L = int(L)
        M = int(M)
        W = float(W)
        vertices.add(L)
        vertices.add(M)
        if L not in graph:
            graph[L] = []
        graph[L].append((M, W))
        if L not in indegree:
            indegree[L] = 0
        if M not in indegree:
            indegree[M] = 0
        indegree[M] += 1

vertices = sorted(vertices)

# Проходим все вершины и добавляем пустой список тем, из которых нет рёбер.
for vertex in vertices:
    if vertex not in graph:
        graph[vertex] = []`;

  const dijkstra = `def dijkstra():
    inf = float('inf')
    distance = {}
    used = set()
    # Проходим все вершины и сначала считаем расстояние до них бесконечным.
    for vertex in vertices:
        distance[vertex] = inf
    distance[START] = 0

    # Повторяем выбор ближайшей вершины, пока не обработаем все достижимые.
    while len(used) < len(vertices):
        current = None
        # Проходим все вершины и ищем необработанную с наименьшим расстоянием.
        for vertex in vertices:
            if vertex not in used and distance[vertex] != inf:
                if current is None or distance[vertex] < distance[current]:
                    current = vertex

        if current is None:
            break
        used.add(current)

        # Проходим всех соседей current и уточняем расстояния до них.
        for neighbour, weight in graph[current]:
            new_distance = distance[current] + weight
            if new_distance < distance[neighbour]:
                distance[neighbour] = new_distance
    return distance[FINISH]`;

  const topological = `def topological_order():
    degree = indegree.copy()
    queue = []
    # Проходим все вершины и находим вершины без входящих рёбер.
    for vertex in vertices:
        if degree[vertex] == 0:
            queue.append(vertex)

    order = []
    # Извлекаем вершины из очереди, пока она не станет пустой.
    while len(queue) > 0:
        current = queue.pop(0)
        order.append(current)
        # Проходим исходящие рёбра current и уменьшаем степени соседей.
        for neighbour, weight in graph[current]:
            degree[neighbour] -= 1
            if degree[neighbour] == 0:
                queue.append(neighbour)
    return order


def longest_path():
    minus_inf = float('-inf')
    distance = {}
    # Проходим все вершины и сначала помечаем их как недостижимые.
    for vertex in vertices:
        distance[vertex] = minus_inf
    distance[START] = 0

    order = topological_order()
    # Проходим вершины в топологическом порядке: предшественники идут раньше.
    for current in order:
        if distance[current] != minus_inf:
            # Проходим всех соседей current и сохраняем большую длину пути.
            for neighbour, weight in graph[current]:
                new_distance = distance[current] + weight
                if new_distance > distance[neighbour]:
                    distance[neighbour] = new_distance
    return distance[FINISH]`;

  let functions = "";
  let calculation = "";
  let heading = "";
  if (mode === "shortest") {
    heading = "# Способ 2. Алгоритм Дейкстры";
    functions = dijkstra;
    calculation = "answer = dijkstra()";
  } else if (mode === "longest") {
    heading = "# Способ 2. Релаксация рёбер в топологическом порядке";
    functions = topological;
    calculation = "answer = longest_path()";
  } else {
    heading = "# Способ 2. Дейкстра для минимума и топологический порядок для максимума";
    functions = `${dijkstra}\n\n\n${topological}`;
    calculation = `shortest = dijkstra()
longest = longest_path()
answer = longest - shortest`;
  }

  return `${heading}
${common}


${functions}


${calculation}
# Берём целую часть ответа.
print(int(answer))`;
}

function buildSolutionContent(model, dataFileName = "23.txt") {
  const shortest = describePath(model, model.shortest);
  const longest = describePath(model, model.longest);
  const answer = getAnswer(model);
  const relevantSteps = [];

  relevantSteps.push(
    `Считываем каждую строку файла как направленное ребро <code>L → M</code> веса <code>W</code>. Номера вершин не требуется перенумеровывать вручную.`
  );
  relevantSteps.push(
    `Начальная вершина — <strong>${model.graph.ids[model.graph.source]}</strong>, конечная — <strong>${model.graph.ids[model.graph.target]}</strong>. Все веса положительны, а циклов в графе нет.`
  );
  relevantSteps.push(
    "В способе Флойда последовательно разрешаем каждой вершине стать промежуточной и сравниваем старое расстояние с расстоянием через неё."
  );
  if (model.config.questionType === "shortest") {
    relevantSteps.push(
      "Во втором способе Дейкстра выбирает вершину с минимальным известным расстоянием и выполняет релаксацию её исходящих рёбер."
    );
  } else {
    relevantSteps.push(
      "Для максимума строим топологический порядок: считаем входящие рёбра, помещаем в очередь вершины без входящих рёбер, затем по одной извлекаем их и уменьшаем количество входящих рёбер у соседей. Когда у соседа это количество становится нулевым, добавляем его в очередь. После этого перебираем вершины в полученном порядке и сохраняем большую из найденных длин. Обычный Дейкстра максимальный путь не ищет."
    );
  }
  relevantSteps.push(
    "После вычисления сразу применяем <code>int(answer)</code>: функция <code>int()</code> отбрасывает дробную часть и оставляет требуемую целую часть. Предварительно округлять результат не нужно."
  );

  let pathCards = "";
  if (model.config.questionType !== "longest") {
    pathCards += `<div class="path-box"><strong>Кратчайший путь</strong><p>${escapeHtml(shortest.route)}</p><p>${escapeHtml(shortest.sum)}</p></div>`;
  }
  if (model.config.questionType !== "shortest") {
    pathCards += `<div class="path-box"><strong>Самый длинный путь</strong><p>${escapeHtml(longest.route)}</p><p>${escapeHtml(longest.sum)}</p></div>`;
  }

  let differenceText = "";
  if (model.config.questionType === "difference") {
    differenceText = `<div class="note-box">Разность: ${formatWeight(
      model.longest.distance10
    )} − ${formatWeight(model.shortest.distance10)} = ${formatWeight(
      model.longest.distance10 - model.shortest.distance10
    )}.</div>`;
  }

  return `
    <ol>${relevantSteps.map((step) => `<li>${step}</li>`).join("")}</ol>
    <div class="path-grid">${pathCards}</div>
    ${differenceText}
    <div class="answer-box">Ответ: ${answer}</div>
    <div class="code-title">Способ 1. Python: алгоритм Флойда</div>
    <div class="python-wrap"><pre><code>${highlightPython(buildFloydCode(model, dataFileName))}</code></pre></div>
    <div class="code-title">Способ 2. Python: алгоритм Дейкстры / релаксация DAG</div>
    <div class="python-wrap"><pre><code>${highlightPython(buildRelaxationCode(model, dataFileName))}</code></pre></div>
  `;
}

function renderSolution(model) {
  elements.solutionWrap.innerHTML = `
    <details>
      <summary>Показать пошаговый разбор, два способа решения и ответ</summary>
      ${buildSolutionContent(model)}
    </details>
  `;
}

const PRINT_DOCUMENT_STYLES = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0 auto;
    max-width: 1000px;
    padding: 20px;
    color: #10223a;
    background: #fff;
    font-family: "Segoe UI", Tahoma, sans-serif;
    font-size: 14px;
    line-height: 1.48;
  }
  h1 { margin: 0 0 18px; font-size: 27px; }
  h2 { margin: 0 0 10px; font-size: 21px; }
  p { margin: 0 0 8px; }
  ol { padding-left: 22px; }
  li + li { margin-top: 6px; }
  .task-item, .solution-item { break-after: page; page-break-after: always; }
  .task-item:last-child, .solution-item:last-child { break-after: auto; page-break-after: auto; }
  .item-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #2563eb;
  }
  .file-note { color: #536883; font-size: 12px; }
  .graph-frame { margin: 14px 0 0; text-align: center; }
  .graph-frame img { width: 100%; max-height: 145mm; object-fit: contain; }
  .graph-frame figcaption { margin-top: 5px; color: #536883; font-size: 12px; }
  .path-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .path-box, .note-box, .answer-box {
    margin: 10px 0;
    padding: 10px 12px;
    border: 1px solid #cbd8ec;
    border-radius: 8px;
    background: #f7f9fd;
  }
  .answer-box { border-color: #9ed8b7; background: #eefaf3; font-size: 18px; font-weight: 700; }
  .code-title { margin: 16px 0 7px; font-weight: 700; }
  .python-wrap { border: 1px solid #cbd8ec; border-radius: 8px; background: #f7f9fd; }
  .python-wrap code { display: block; }
  .py-keyword { color: #1d4ed8; font-weight: 700; }
  .py-builtin { color: #08717f; font-weight: 700; }
  .py-string { color: #a13d10; }
  .py-number { color: #a51f55; }
  .py-comment { color: #16784a; font-style: italic; }
  pre { margin: 0; padding: 10px; white-space: pre-wrap; overflow-wrap: anywhere; font: 10px/1.4 Consolas, monospace; }
  code { font-family: Consolas, monospace; }
  @media print {
    body { max-width: none; padding: 0; }
    a { color: inherit; text-decoration: none; }
  }
`;

function makePrintDocument(title, body) {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_DOCUMENT_STYLES}</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${body}
</body>
</html>\n`;
}

function buildTasksDocument(variants) {
  const body = variants
    .map(
      (variant) => `
        <section class="task-item">
          <div class="item-heading">
            <h2>Задание ${variant.number}</h2>
            <span class="file-note">Данные: ${escapeHtml(variant.dataName)} · Схемы: ${escapeHtml(variant.graphName)}, ${escapeHtml(variant.graphJpegName)}</span>
          </div>
          ${buildTaskContent(variant.model, variant.dataName)}
          <figure class="graph-frame">
            <img src="Графы/${encodeURIComponent(variant.graphName)}" alt="Граф к заданию ${variant.number}" />
            <figcaption>Граф к заданию ${variant.number}. Исходные данные находятся в файле Данные/${escapeHtml(variant.dataName)}.</figcaption>
          </figure>
        </section>`
    )
    .join("\n");
  return makePrintDocument("Задание 23 ЕГЭ: печатные варианты", body);
}

function buildSolutionsDocument(variants) {
  const body = variants
    .map(
      (variant) => `
        <section class="solution-item">
          <div class="item-heading">
            <h2>Задание ${variant.number}</h2>
            <span class="file-note">Файл: ${escapeHtml(variant.dataName)}</span>
          </div>
          <p><strong>${escapeHtml(questionSentence(variant.model))}</strong></p>
          ${buildSolutionContent(variant.model, variant.dataName)}
        </section>`
    )
    .join("\n");
  return makePrintDocument("Задание 23 ЕГЭ: ответы и решения", body);
}

function buildPackageReadme(count) {
  return `КОМПЛЕКТ ЗАДАНИЯ 23 ЕГЭ

Количество задач: ${count}

Состав архива:
- Задания.html — формулировки без ответов и решений, готовые к печати;
- Ответы_и_решения.html — ответы, пошаговые разборы и два решения на Python;
- Графы/Граф_N.svg — векторная схема для задания N;
- Графы/Граф_N.jpeg — схема для задания N в формате JPEG;
- Данные/23_N.txt — исходные данные для задания N.

Перед открытием HTML-файлов распакуйте архив целиком, чтобы изображения графов
загружались по относительным ссылкам. Для печати откройте нужный HTML-файл в
браузере и выберите команду «Печать».
`;
}

function taskCountLabel(count) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) {
    return `${count} задач`;
  }
  if (last === 1) {
    return `${count} задача`;
  }
  if (last >= 2 && last <= 4) {
    return `${count} задачи`;
  }
  return `${count} задач`;
}

function waitForInterfaceUpdate() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function buildPrintPackage(count) {
  const variants = [];
  const files = [];

  for (let index = 1; index <= count; index += 1) {
    elements.printStatus.textContent = `Создаётся задание ${index} из ${count}...`;
    await waitForInterfaceUpdate();

    let variant = null;
    for (let attempt = 0; attempt < 12 && variant === null; attempt += 1) {
      try {
        const model = generateModel(getConfig());
        const lines = makeFileLines(model);
        const graph = serializeGraph(model);
        const graphJpeg = await graphSvgToJpeg(graph);
        variant = {
          number: index,
          model,
          lines,
          graph,
          graphJpeg,
          dataName: `23_${index}.txt`,
          graphName: `Граф_${index}.svg`,
          graphJpegName: `Граф_${index}.jpeg`,
        };
      } catch (error) {
        if (attempt === 11) {
          throw error;
        }
      }
    }

    variants.push(variant);
    files.push(
      { name: `Данные/${variant.dataName}`, data: `${variant.lines.join("\n")}\n` },
      { name: `Графы/${variant.graphName}`, data: variant.graph },
      { name: `Графы/${variant.graphJpegName}`, data: variant.graphJpeg }
    );
  }

  files.unshift(
    { name: "Задания.html", data: buildTasksDocument(variants) },
    { name: "Ответы_и_решения.html", data: buildSolutionsDocument(variants) },
    { name: "README.txt", data: buildPackageReadme(count) }
  );

  return {
    blob: window.PrintZip.buildZip(files),
    fileCount: files.length,
  };
}

function resetPrintDownload() {
  if (printPackageUrl) {
    URL.revokeObjectURL(printPackageUrl);
    printPackageUrl = null;
  }
  elements.printDownload.hidden = true;
  elements.printDownload.removeAttribute("href");
}

function setPrintBusy(isBusy) {
  elements.printCount.disabled = isBusy;
  elements.printCloseBtn.disabled = isBusy;
  elements.printCancelBtn.disabled = isBusy;
  elements.printCreateBtn.disabled = isBusy;
  elements.printCreateBtn.textContent = isBusy ? "Создание..." : "Создать комплект";
}

function openPrintDialog() {
  resetPrintDownload();
  elements.printStatus.textContent = "";
  elements.printDialog.showModal();
  elements.printCount.focus();
  elements.printCount.select();
}

function closePrintDialog() {
  if (!elements.printCreateBtn.disabled) {
    elements.printDialog.close();
  }
}

async function handlePrintSubmit(event) {
  event.preventDefault();
  if (!elements.printForm.reportValidity()) {
    return;
  }

  const count = clamp(Number(elements.printCount.value), 1, 30);
  elements.printCount.value = String(count);
  resetPrintDownload();
  setPrintBusy(true);

  try {
    const result = await buildPrintPackage(count);
    printPackageUrl = URL.createObjectURL(result.blob);
    elements.printDownload.href = printPackageUrl;
    elements.printDownload.download = `task23_print_${count}.zip`;
    elements.printDownload.hidden = false;
    elements.printStatus.textContent = `Готово: ${taskCountLabel(count)}, ${result.fileCount} файлов в ZIP-архиве.`;
    elements.printDownload.click();
  } catch (error) {
    elements.printStatus.textContent = `Не удалось создать комплект: ${error.message}`;
  } finally {
    setPrintBusy(false);
  }
}

function generateTask() {
  elements.generateBtn.disabled = true;
  elements.generateBtn.textContent = "Генерация...";
  try {
    const model = generateModel(getConfig());
    const lines = makeFileLines(model);
    renderTheory(model);
    renderTask(model);
    renderFile(model, lines);
    renderParams(model);
    renderGraph(model);
    renderPreview(lines);
    renderSolution(model);
  } catch (error) {
    elements.solutionWrap.innerHTML = `<div class="note-box">Ошибка генерации: ${escapeHtml(error.message)}</div>`;
  } finally {
    elements.generateBtn.disabled = false;
    elements.generateBtn.textContent = "Сгенерировать задание 23";
  }
}

elements.density.addEventListener("input", () => {
  elements.densityValue.textContent = elements.density.value;
});
elements.generateBtn.addEventListener("click", generateTask);
elements.printBtn.addEventListener("click", openPrintDialog);
elements.printCloseBtn.addEventListener("click", closePrintDialog);
elements.printCancelBtn.addEventListener("click", closePrintDialog);
elements.printForm.addEventListener("submit", handlePrintSubmit);

generateTask();
