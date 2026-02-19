"use strict";

const LETTERS = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ".split("");

const elements = {
  vertexCount: document.getElementById("vertexCount"),
  density: document.getElementById("density"),
  densityValue: document.getElementById("densityValue"),
  weightedMode: document.getElementById("weightedMode"),
  weightRange: document.getElementById("weightRange"),
  minWeight: document.getElementById("minWeight"),
  maxWeight: document.getElementById("maxWeight"),
  generateBtn: document.getElementById("generateBtn"),
  taskText: document.getElementById("taskText"),
  graphWrap: document.getElementById("graphWrap"),
  tableWrap: document.getElementById("tableWrap"),
  solutionWrap: document.getElementById("solutionWrap"),
};

const state = {
  task: null,
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shuffle(input) {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function edgeKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function getVertexLabels(count) {
  if (count <= LETTERS.length) {
    return LETTERS.slice(0, count);
  }

  const labels = [];
  for (let i = 0; i < count; i += 1) {
    const base = LETTERS[i % LETTERS.length];
    const round = Math.floor(i / LETTERS.length);
    labels.push(round === 0 ? base : `${base}${round + 1}`);
  }
  return labels;
}

function getNormalizedInputs() {
  const vertexCount = clamp(Number(elements.vertexCount.value) || 8, 4, 15);
  elements.vertexCount.value = String(vertexCount);

  const densityPercent = clamp(Number(elements.density.value) || 45, 25, 85);
  elements.density.value = String(densityPercent);
  elements.densityValue.textContent = String(densityPercent);

  let minWeight = clamp(Number(elements.minWeight.value) || 1, 1, 99);
  let maxWeight = clamp(Number(elements.maxWeight.value) || 50, 1, 99);

  if (minWeight > maxWeight) {
    [minWeight, maxWeight] = [maxWeight, minWeight];
  }

  elements.minWeight.value = String(minWeight);
  elements.maxWeight.value = String(maxWeight);

  return {
    vertexCount,
    densityPercent,
    weightedMode: elements.weightedMode.checked,
    minWeight,
    maxWeight,
    allowSymmetry: true,
  };
}

function calcTargetEdges(vertexCount, densityPercent) {
  const maxEdges = (vertexCount * (vertexCount - 1)) / 2;
  const minEdges = vertexCount - 1;
  const rawTarget = Math.round((maxEdges * densityPercent) / 100);
  return clamp(rawTarget, minEdges, maxEdges);
}

function addUndirectedEdge(edgeMap, adjacency, a, b, minWeight, maxWeight) {
  if (a === b) {
    return false;
  }

  const key = edgeKey(a, b);
  if (edgeMap.has(key)) {
    return false;
  }

  const edge = {
    a: Math.min(a, b),
    b: Math.max(a, b),
    weight: randInt(minWeight, maxWeight),
  };

  edgeMap.set(key, edge);
  adjacency[a].add(b);
  adjacency[b].add(a);
  return true;
}

function generateRandomGraph(config) {
  const { vertexCount, densityPercent, minWeight, maxWeight } = config;
  const labels = getVertexLabels(vertexCount);
  const adjacency = Array.from({ length: vertexCount }, () => new Set());
  const edgeMap = new Map();
  const targetEdges = calcTargetEdges(vertexCount, densityPercent);

  const order = shuffle([...Array(vertexCount).keys()]);
  for (let i = 1; i < order.length; i += 1) {
    const from = order[i];
    const to = order[randInt(0, i - 1)];
    addUndirectedEdge(edgeMap, adjacency, from, to, minWeight, maxWeight);
  }

  const pairs = [];
  for (let i = 0; i < vertexCount; i += 1) {
    for (let j = i + 1; j < vertexCount; j += 1) {
      pairs.push([i, j]);
    }
  }

  for (const [a, b] of shuffle(pairs)) {
    if (edgeMap.size >= targetEdges) {
      break;
    }
    addUndirectedEdge(edgeMap, adjacency, a, b, minWeight, maxWeight);
  }

  return {
    labels,
    adjacency,
    edges: Array.from(edgeMap.values()),
  };
}

function generateSymmetricGraph(config) {
  const { vertexCount, densityPercent, minWeight, maxWeight } = config;
  if (vertexCount < 7 || vertexCount % 2 === 0) {
    return null;
  }

  const labels = getVertexLabels(vertexCount);
  const adjacency = Array.from({ length: vertexCount }, () => new Set());
  const edgeMap = new Map();
  const targetEdges = calcTargetEdges(vertexCount, densityPercent);
  const pairs = (vertexCount - 1) / 2;
  const center = vertexCount - 1;

  const mirror = (v) => {
    if (v === center) {
      return center;
    }
    return v < pairs ? v + pairs : v - pairs;
  };

  const addSymmetricEdge = (a, b) => {
    const firstAdded = addUndirectedEdge(
      edgeMap,
      adjacency,
      a,
      b,
      minWeight,
      maxWeight
    );
    if (!firstAdded) {
      return false;
    }

    const ma = mirror(a);
    const mb = mirror(b);
    if (edgeKey(a, b) !== edgeKey(ma, mb)) {
      addUndirectedEdge(edgeMap, adjacency, ma, mb, minWeight, maxWeight);
    }
    return true;
  };

  for (let i = 0; i < pairs - 1; i += 1) {
    addSymmetricEdge(i, i + 1);
  }

  addUndirectedEdge(edgeMap, adjacency, center, 0, minWeight, maxWeight);
  addUndirectedEdge(
    edgeMap,
    adjacency,
    center,
    mirror(0),
    minWeight,
    maxWeight
  );
  addUndirectedEdge(
    edgeMap,
    adjacency,
    center,
    pairs - 1,
    minWeight,
    maxWeight
  );
  addUndirectedEdge(
    edgeMap,
    adjacency,
    center,
    mirror(pairs - 1),
    minWeight,
    maxWeight
  );

  const allPairs = [];
  for (let i = 0; i < vertexCount; i += 1) {
    for (let j = i + 1; j < vertexCount; j += 1) {
      allPairs.push([i, j]);
    }
  }

  for (const [a, b] of shuffle(allPairs)) {
    if (edgeMap.size >= targetEdges) {
      break;
    }
    addSymmetricEdge(a, b);
  }

  return {
    labels,
    adjacency,
    edges: Array.from(edgeMap.values()),
  };
}

function generateGraph(config) {
  const trySymmetric =
    config.allowSymmetry &&
    config.vertexCount >= 7 &&
    config.vertexCount % 2 === 1 &&
    Math.random() < 0.35;

  if (trySymmetric) {
    const symmetric = generateSymmetricGraph(config);
    if (symmetric) {
      return {
        ...symmetric,
        isSymmetric: true,
      };
    }
  }

  return {
    ...generateRandomGraph(config),
    isSymmetric: false,
  };
}

function generatePointMapping(vertexCount) {
  return shuffle([...Array(vertexCount).keys()].map((index) => index + 1));
}

function buildRoadTable(vertexCount, edges, pointByVertex, weightedMode) {
  const table = Array.from({ length: vertexCount }, () =>
    Array(vertexCount).fill(null)
  );

  for (const edge of edges) {
    const pA = pointByVertex[edge.a] - 1;
    const pB = pointByVertex[edge.b] - 1;
    const value = weightedMode ? edge.weight : "*";
    table[pA][pB] = value;
    table[pB][pA] = value;
  }

  return table;
}

function buildTableAdjacency(table) {
  const size = table.length;
  const adjacency = Array.from({ length: size }, () => new Set());
  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size; j += 1) {
      if (i !== j && table[i][j] !== null) {
        adjacency[i].add(j);
      }
    }
  }
  return adjacency;
}

function countFrequencies(values) {
  const frequency = new Map();
  for (const value of values) {
    frequency.set(value, (frequency.get(value) || 0) + 1);
  }
  return frequency;
}

function getNeighborDegreeSignature(adjacency, degrees, index) {
  return [...adjacency[index]]
    .map((v) => degrees[v])
    .sort((a, b) => a - b)
    .join(",");
}

function buildDeduction(graph, table) {
  const n = graph.labels.length;
  const graphDegrees = graph.adjacency.map((neighbors) => neighbors.size);
  const tableAdjacency = buildTableAdjacency(table);
  const tableDegrees = tableAdjacency.map((neighbors) => neighbors.size);
  const graphDegreeFreq = countFrequencies(graphDegrees);
  const tableDegreeFreq = countFrequencies(tableDegrees);

  const graphSignatures = graphDegrees.map((_, i) =>
    getNeighborDegreeSignature(graph.adjacency, graphDegrees, i)
  );
  const tableSignatures = tableDegrees.map((_, i) =>
    getNeighborDegreeSignature(tableAdjacency, tableDegrees, i)
  );

  const candidates = Array.from({ length: n }, (_, vertex) => {
    const byDegreeAndSignature = new Set();
    const byDegreeOnly = new Set();
    for (let point = 0; point < n; point += 1) {
      if (graphDegrees[vertex] !== tableDegrees[point]) {
        continue;
      }
      byDegreeOnly.add(point);
      if (graphSignatures[vertex] === tableSignatures[point]) {
        byDegreeAndSignature.add(point);
      }
    }
    return byDegreeAndSignature.size > 0 ? byDegreeAndSignature : byDegreeOnly;
  });

  const anchorCandidates = [];
  for (let vertex = 0; vertex < n; vertex += 1) {
    const degree = graphDegrees[vertex];
    if (graphDegreeFreq.get(degree) !== 1 || tableDegreeFreq.get(degree) !== 1) {
      continue;
    }
    const point = tableDegrees.findIndex((value) => value === degree);
    if (point >= 0 && candidates[vertex].has(point)) {
      anchorCandidates.push({ vertex, point, degree });
    }
  }

  if (anchorCandidates.length === 0) {
    return {
      ok: false,
      reason: "no_unique_vertex",
    };
  }

  const resolvedLetterToPoint = new Map();
  const resolvedPointToLetter = new Map();
  const resolutionSteps = [];

  const resolve = (vertex, point, reason) => {
    if (resolvedLetterToPoint.has(vertex)) {
      return false;
    }
    resolvedLetterToPoint.set(vertex, point);
    resolvedPointToLetter.set(point, vertex);
    resolutionSteps.push({
      vertex,
      point,
      reason,
    });
    return true;
  };

  const anchor = anchorCandidates[0];
  resolve(
    anchor.vertex,
    anchor.point,
    `Уникальная степень ${anchor.degree}: только вершина ${graph.labels[anchor.vertex]} на графе и только пункт П${anchor.point + 1} в таблице имеют такую степень, поэтому ${graph.labels[anchor.vertex]} = П${anchor.point + 1}.`
  );

  let changed = true;
  while (changed) {
    changed = false;

    for (let vertex = 0; vertex < n; vertex += 1) {
      if (resolvedLetterToPoint.has(vertex)) {
        continue;
      }

      for (const point of [...candidates[vertex]]) {
        if (resolvedPointToLetter.has(point)) {
          candidates[vertex].delete(point);
          changed = true;
          continue;
        }

        let isValid = true;
        for (const [knownVertex, knownPoint] of resolvedLetterToPoint.entries()) {
          const graphConnected = graph.adjacency[vertex].has(knownVertex);
          const tableConnected = tableAdjacency[point].has(knownPoint);
          if (graphConnected !== tableConnected) {
            isValid = false;
            break;
          }
        }

        if (!isValid) {
          candidates[vertex].delete(point);
          changed = true;
        }
      }

      if (candidates[vertex].size === 0) {
        return {
          ok: false,
          reason: "inconsistent_candidates",
        };
      }
    }

    for (let vertex = 0; vertex < n; vertex += 1) {
      if (resolvedLetterToPoint.has(vertex) || candidates[vertex].size !== 1) {
        continue;
      }
      const [point] = [...candidates[vertex]];
      const didResolve = resolve(
        vertex,
        point,
        `После учёта уже найденных соответствий для вершины ${graph.labels[vertex]} остаётся единственный подходящий пункт: П${point + 1}.`
      );
      if (didResolve) {
        changed = true;
      }
    }

    const pointOwners = new Map();
    for (let vertex = 0; vertex < n; vertex += 1) {
      if (resolvedLetterToPoint.has(vertex)) {
        continue;
      }
      for (const point of candidates[vertex]) {
        if (!pointOwners.has(point)) {
          pointOwners.set(point, []);
        }
        pointOwners.get(point).push(vertex);
      }
    }

    for (const [point, owners] of pointOwners.entries()) {
      if (owners.length !== 1) {
        continue;
      }
      const vertex = owners[0];
      if (resolvedLetterToPoint.has(vertex)) {
        continue;
      }
      const didResolve = resolve(
        vertex,
        point,
        `Пункт П${point + 1} по степеням и смежности может соответствовать только вершине ${graph.labels[vertex]}.`
      );
      if (didResolve) {
        changed = true;
      }
    }
  }

  const unresolvedVertices = [];
  for (let vertex = 0; vertex < n; vertex += 1) {
    if (!resolvedLetterToPoint.has(vertex)) {
      unresolvedVertices.push(vertex);
    }
  }

  return {
    ok: true,
    graphDegrees,
    tableDegrees,
    tableAdjacency,
    anchor,
    candidates,
    resolutionSteps,
    resolvedLetterToPoint,
    resolvedPointToLetter,
    unresolvedVertices,
  };
}

function findResolvedPaths(graph, resolvedSet, edgeCount) {
  const paths = [];
  const unique = new Set();
  const allResolved = [...resolvedSet];

  const dfs = (path) => {
    if (path.length === edgeCount + 1) {
      const direct = path.join("-");
      const reverse = [...path].reverse().join("-");
      const key = direct < reverse ? direct : reverse;
      if (!unique.has(key)) {
        unique.add(key);
        paths.push([...path]);
      }
      return;
    }

    const last = path[path.length - 1];
    for (const next of graph.adjacency[last]) {
      if (!resolvedSet.has(next) || path.includes(next)) {
        continue;
      }
      path.push(next);
      dfs(path);
      path.pop();
    }
  };

  for (const start of allResolved) {
    dfs([start]);
  }

  return paths;
}

function chooseQuestion(taskModel) {
  const { graph, pointByVertex, table, weightedMode, deduction } = taskModel;
  const { labels, edges, adjacency } = graph;
  const resolvedSet = new Set(deduction.resolvedLetterToPoint.keys());

  if (weightedMode) {
    const routeLengths = shuffle([3, 2]);
    for (const routeEdgeCount of routeLengths) {
      const routes = findResolvedPaths(graph, resolvedSet, routeEdgeCount);
      if (routes.length === 0) {
        continue;
      }
      const vertices = routes[randInt(0, routes.length - 1)];
      const segments = [];
      let answer = 0;

      for (let i = 0; i < vertices.length - 1; i += 1) {
        const from = vertices[i];
        const to = vertices[i + 1];
        const fromPoint = pointByVertex[from];
        const toPoint = pointByVertex[to];
        const value = Number(table[fromPoint - 1][toPoint - 1]);
        segments.push({
          fromLabel: labels[from],
          toLabel: labels[to],
          fromPoint,
          toPoint,
          value,
        });
        answer += value;
      }

      const intermediates = vertices.slice(1, -1).map((v) => labels[v]);
      const viaText =
        intermediates.length === 1
          ? `через пункт ${intermediates[0]}`
          : `через пункты ${intermediates.join(" и ")}`;

      return {
        kind: "routeSum",
        text:
          `Определите суммарную протяжённость маршрута из пункта ${labels[vertices[0]]} ` +
          `в пункт ${labels[vertices[vertices.length - 1]]} ${viaText}.`,
        answer,
        vertices,
        segments,
      };
    }

    const eligibleEdges = edges.filter(
      (edge) => resolvedSet.has(edge.a) && resolvedSet.has(edge.b)
    );
    if (eligibleEdges.length === 0) {
      return null;
    }

    const edge = eligibleEdges[randInt(0, eligibleEdges.length - 1)];
    const value = Number(
      table[pointByVertex[edge.a] - 1][pointByVertex[edge.b] - 1]
    );
    return {
      kind: "singleWeight",
      text: `Определите длину дороги между пунктами ${labels[edge.a]} и ${labels[edge.b]}.`,
      answer: value,
      road: {
        fromLabel: labels[edge.a],
        toLabel: labels[edge.b],
        fromPoint: pointByVertex[edge.a],
        toPoint: pointByVertex[edge.b],
        value,
      },
    };
  }

  const resolvedVertices = [...resolvedSet];
  if (resolvedVertices.length < 2) {
    return null;
  }

  const allPairs = [];
  for (let i = 0; i < labels.length; i += 1) {
    for (let j = i + 1; j < labels.length; j += 1) {
      if (!resolvedSet.has(i) || !resolvedSet.has(j)) {
        continue;
      }
      allPairs.push([i, j]);
    }
  }

  if (allPairs.length === 0) {
    return null;
  }

  const [a, b] = allPairs[randInt(0, allPairs.length - 1)];
  const hasRoad = adjacency[a].has(b);
  return {
    kind: "adjacency",
    text:
      `Есть ли дорога между пунктами ${labels[a]} и ${labels[b]}? ` +
      `В ответе укажите 1, если дорога есть, иначе 0.`,
    answer: hasRoad ? 1 : 0,
    fromLabel: labels[a],
    toLabel: labels[b],
    fromPoint: pointByVertex[a],
    toPoint: pointByVertex[b],
    hasRoad,
  };
}

function renderGraph(taskModel) {
  const { labels, edges } = taskModel.graph;
  const width = 700;
  const height = 480;
  const cx = width / 2;
  const cy = height / 2;
  const ring = Math.min(width, height) * 0.38;
  const vertexRadius = 22;

  const points = labels.map((_, index) => {
    const angle = (-Math.PI / 2) + (2 * Math.PI * index) / labels.length;
    return {
      x: cx + ring * Math.cos(angle),
      y: cy + ring * Math.sin(angle),
    };
  });

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Схема дорог");

  for (const edge of edges) {
    const from = points[edge.a];
    const to = points[edge.b];

    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", String(from.x));
    line.setAttribute("y1", String(from.y));
    line.setAttribute("x2", String(to.x));
    line.setAttribute("y2", String(to.y));
    line.setAttribute("stroke", "#4a6181");
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);
  }

  labels.forEach((label, index) => {
    const { x, y } = points[index];
    const circle = document.createElementNS(ns, "circle");
    circle.setAttribute("cx", String(x));
    circle.setAttribute("cy", String(y));
    circle.setAttribute("r", String(vertexRadius));
    circle.setAttribute("fill", "#fefefe");
    circle.setAttribute("stroke", "#1f4f8d");
    circle.setAttribute("stroke-width", "2.5");
    svg.appendChild(circle);

    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", String(x));
    text.setAttribute("y", String(y + 5));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "15");
    text.setAttribute("font-weight", "700");
    text.setAttribute("fill", "#0e2b54");
    text.textContent = label;
    svg.appendChild(text);
  });

  elements.graphWrap.replaceChildren(svg);
}

function renderTable(taskModel) {
  const { table } = taskModel;
  const size = table.length;
  const tableElement = document.createElement("table");

  const header = document.createElement("tr");
  const emptyCell = document.createElement("th");
  emptyCell.textContent = "";
  header.appendChild(emptyCell);

  for (let i = 1; i <= size; i += 1) {
    const th = document.createElement("th");
    th.textContent = `П${i}`;
    header.appendChild(th);
  }
  tableElement.appendChild(header);

  for (let row = 0; row < size; row += 1) {
    const tr = document.createElement("tr");
    const rowHeader = document.createElement("th");
    rowHeader.textContent = `П${row + 1}`;
    tr.appendChild(rowHeader);

    for (let col = 0; col < size; col += 1) {
      const td = document.createElement("td");
      if (row === col) {
        td.textContent = "—";
        td.classList.add("diagonal");
      } else {
        td.textContent = table[row][col] === null ? "" : String(table[row][col]);
      }
      tr.appendChild(td);
    }

    tableElement.appendChild(tr);
  }

  elements.tableWrap.replaceChildren(tableElement);
}

function renderTaskText(taskModel) {
  const intro = taskModel.weightedMode
    ? "На рисунке слева представлена схема дорог N-ского района, справа — таблица протяжённостей дорог между пунктами П1, П2 и так далее. Схема и таблица составлялись независимо друг от друга."
    : "На рисунке слева представлена схема дорог N-ского района, справа — таблица, где символ * означает наличие дороги между пунктами П1, П2 и так далее. Схема и таблица составлялись независимо друг от друга.";

  const density = `Плотность дорог — это доля существующих дорог от максимально возможного числа дорог между всеми парами вершин. В этом варианте плотность: ${taskModel.densityPercent}%.`;
  const symmetry =
    "Граф может оказаться симметричным, но это не является обязательным условием решения.";
  const noLoop = "Ограничение: дорога не может выходить из вершины и приходить в неё же.";
  const end = taskModel.weightedMode
    ? "В ответе запишите целое число."
    : "В ответе укажите число.";

  elements.taskText.textContent = `${intro} На схеме показана только структура дорог (без весов на рёбрах). ${density} ${symmetry} ${taskModel.question.text} ${noLoop} ${end}`;
}

function renderSolution(taskModel) {
  const { graph, deduction } = taskModel;
  const { question } = taskModel;
  const steps = [];

  const graphDegreesText = graph.labels
    .map((label, index) => `${label}:${deduction.graphDegrees[index]}`)
    .join(", ");
  const tableDegreesText = deduction.tableDegrees
    .map((degree, index) => `П${index + 1}:${degree}`)
    .join(", ");

  steps.push(`Считаем степени вершин на графе: ${graphDegreesText}.`);
  steps.push(`Считаем степени пунктов по таблице: ${tableDegreesText}.`);

  const [anchorStep, ...otherResolutionSteps] = deduction.resolutionSteps;
  if (anchorStep) {
    steps.push(anchorStep.reason);
  }
  for (const resolutionStep of otherResolutionSteps.slice(0, 5)) {
    steps.push(resolutionStep.reason);
  }

  if (deduction.unresolvedVertices.length > 0) {
    const unresolvedLabels = deduction.unresolvedVertices
      .map((index) => graph.labels[index])
      .join(", ");
    steps.push(
      `Часть вершин образует неоднозначные (часто симметричные) пары: ${unresolvedLabels}. Для ответа достаточно уже найденных соответствий нужных вершин.`
    );
  }

  if (question.kind === "routeSum") {
    const routeMapText = question.vertices
      .map((vertex) => {
        const point = deduction.resolvedLetterToPoint.get(vertex);
        return `${graph.labels[vertex]}=П${point + 1}`;
      })
      .join(", ");

    steps.push(
      `Для вершин маршрута получаем сопоставление: ${routeMapText}.`
    );
    for (const segment of question.segments) {
      steps.push(
        `По таблице: П${segment.fromPoint}-П${segment.toPoint} = ${segment.value}.`
      );
    }
    const expression = question.segments.map((segment) => segment.value).join(" + ");
    steps.push(`Суммируем длины по маршруту: ${expression} = ${question.answer}.`);
  } else if (question.kind === "singleWeight") {
    const road = question.road;
    steps.push(
      `Для искомой пары после сопоставления: ${road.fromLabel}=П${road.fromPoint}, ${road.toLabel}=П${road.toPoint}.`
    );
    steps.push(`Берём значение из ячейки П${road.fromPoint}-П${road.toPoint}: ${road.value}.`);
  } else {
    const sign = question.hasRoad ? "*" : "пусто";
    const logic = question.hasRoad
      ? "значит дорога существует и в ответе пишем 1"
      : "значит дороги нет и в ответе пишем 0";
    steps.push(`После сопоставления: ${question.fromLabel}=П${question.fromPoint}, ${question.toLabel}=П${question.toPoint}.`);
    steps.push(`В этой ячейке: ${sign}, ${logic}.`);
  }

  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Показать пошаговое решение и ответ (спойлер)";
  details.appendChild(summary);

  const list = document.createElement("ol");
  for (const step of steps) {
    const item = document.createElement("li");
    item.textContent = step;
    list.appendChild(item);
  }
  details.appendChild(list);

  const answer = document.createElement("p");
  answer.className = "final-answer";
  answer.textContent = `Ответ: ${question.answer}`;
  details.appendChild(answer);

  elements.solutionWrap.replaceChildren(details);
}

function updateWeightInputs() {
  const disabled = !elements.weightedMode.checked;
  elements.weightRange.classList.toggle("disabled", disabled);
  elements.minWeight.disabled = disabled;
  elements.maxWeight.disabled = disabled;
}

function buildTask(config) {
  for (let attempt = 0; attempt < 220; attempt += 1) {
    const graph = generateGraph(config);
    const pointByVertex = generatePointMapping(config.vertexCount);
    const table = buildRoadTable(
      config.vertexCount,
      graph.edges,
      pointByVertex,
      config.weightedMode
    );
    const deduction = buildDeduction(graph, table);

    if (!deduction.ok) {
      continue;
    }

    const task = {
      graph,
      pointByVertex,
      table,
      weightedMode: config.weightedMode,
      densityPercent: config.densityPercent,
      deduction,
    };

    const question = chooseQuestion(task);
    if (!question) {
      continue;
    }

    task.question = question;
    return task;
  }

  return null;
}

function generateTask() {
  const config = getNormalizedInputs();
  const task = buildTask(config);
  if (!task) {
    elements.taskText.textContent =
      "Не удалось сгенерировать корректный вариант для выбранных параметров. Попробуйте изменить количество вершин или плотность.";
    elements.graphWrap.replaceChildren();
    elements.tableWrap.replaceChildren();
    elements.solutionWrap.replaceChildren();
    return;
  }

  state.task = task;
  renderTaskText(task);
  renderGraph(task);
  renderTable(task);
  renderSolution(task);
}

elements.density.addEventListener("input", () => {
  elements.densityValue.textContent = elements.density.value;
});

elements.weightedMode.addEventListener("change", () => {
  updateWeightInputs();
  generateTask();
});

elements.generateBtn.addEventListener("click", generateTask);

updateWeightInputs();
generateTask();
