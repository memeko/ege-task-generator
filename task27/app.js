const DOM = {
  scenarioSelect: document.getElementById('scenarioSelect'),
  metricSelect: document.getElementById('metricSelect'),
  questionSelect: document.getElementById('questionSelect'),
  generateBtn: document.getElementById('generateBtn'),
  theoryWrap: document.getElementById('theoryWrap'),
  scenarioBadge: document.getElementById('scenarioBadge'),
  metricBadge: document.getElementById('metricBadge'),
  questionBadge: document.getElementById('questionBadge'),
  seedBadge: document.getElementById('seedBadge'),
  formulaLine: document.getElementById('formulaLine'),
  taskText: document.getElementById('taskText'),
  previewWrap: document.getElementById('previewWrap'),
  filesWrap: document.getElementById('filesWrap'),
  metaWrap: document.getElementById('metaWrap'),
  solutionWrap: document.getElementById('solutionWrap'),
}

const METRICS = {
  euclidean: {
    key: 'euclidean',
    title: 'Евклидова метрика',
    formula2d: 'd(A, B) = √((x₁ − x₂)² + (y₁ − y₂)²)',
    formulaN: 'd(A, B) = √(Σ (aᵢ − bᵢ)²)',
    distance(a, b) {
      let sum = 0
      for (let i = 0; i < a.length; i += 1) {
        const diff = a[i] - b[i]
        sum += diff * diff
      }
      return Math.sqrt(sum)
    },
    epsFactor: 1,
  },
  manhattan: {
    key: 'manhattan',
    title: 'Манхеттенская метрика',
    formula2d: 'd(A, B) = |x₁ − x₂| + |y₁ − y₂|',
    formulaN: 'd(A, B) = Σ |aᵢ − bᵢ|',
    distance(a, b) {
      let sum = 0
      for (let i = 0; i < a.length; i += 1) {
        sum += Math.abs(a[i] - b[i])
      }
      return sum
    },
    epsFactor: 1.28,
  },
  chebyshev: {
    key: 'chebyshev',
    title: 'Метрика Чебышева',
    formula2d: 'd(A, B) = max(|x₁ − x₂|, |y₁ − y₂|)',
    formulaN: 'd(A, B) = max |aᵢ − bᵢ|',
    distance(a, b) {
      let value = 0
      for (let i = 0; i < a.length; i += 1) {
        value = Math.max(value, Math.abs(a[i] - b[i]))
      }
      return value
    },
    epsFactor: 0.84,
  },
}

const SCENARIOS = {
  classic: {
    key: 'classic',
    title: 'Классическая задача о кластерах точек',
    questionKeys: ['classic_sum', 'classic_mean', 'classic_extremes', 'classic_anticenters'],
  },
  radio_nested: {
    key: 'radio_nested',
    title: 'Авторская: радиолюбитель и вложенные кластеры',
    questionKeys: ['radio_nested_center', 'radio_nested_radii'],
  },
  signal_4d: {
    key: 'signal_4d',
    title: 'Авторская: сигналы с 4 признаками',
    questionKeys: ['signal_pair_centers', 'signal_geo_span'],
  },
}

const QUESTION_FAMILIES = {
  classic_sum: {
    key: 'classic_sum',
    title: 'Классика: суммы центров и антицентров',
    scenarioKeys: ['classic'],
  },
  classic_mean: {
    key: 'classic_mean',
    title: 'Классика: средние центров и разности',
    scenarioKeys: ['classic'],
  },
  classic_extremes: {
    key: 'classic_extremes',
    title: 'Классика: экстремумы и радиусы',
    scenarioKeys: ['classic'],
  },
  classic_anticenters: {
    key: 'classic_anticenters',
    title: 'Классика: антицентры и расстояния',
    scenarioKeys: ['classic'],
  },
  radio_nested_center: {
    key: 'radio_nested_center',
    title: 'Радио: вложенный источник и его центр',
    scenarioKeys: ['radio_nested'],
  },
  radio_nested_radii: {
    key: 'radio_nested_radii',
    title: 'Радио: вложенная пара, радиусы и расстояние',
    scenarioKeys: ['radio_nested'],
  },
  signal_pair_centers: {
    key: 'signal_pair_centers',
    title: '4D: средние центры и географические ориентиры',
    scenarioKeys: ['signal_4d'],
  },
  signal_geo_span: {
    key: 'signal_geo_span',
    title: '4D: расстояния между центрами и разброс признаков',
    scenarioKeys: ['signal_4d'],
  },
}

const CLUSTER_COLORS = ['#2962d9', '#2f9e5b', '#e07a27', '#8e5cf0', '#d9485f', '#1590a5']
const NOISE_COLOR = '#94a3b8'
let currentBlobUrls = []
let currentAnimationId = 0

class RNG {
  constructor(seed) {
    this.seed = seed >>> 0
  }

  next() {
    let t = (this.seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  float(min = 0, max = 1) {
    return min + this.next() * (max - min)
  }

  int(min, max) {
    return Math.floor(this.float(min, max + 1))
  }

  chance(probability) {
    return this.next() < probability
  }

  pick(items) {
    return items[this.int(0, items.length - 1)]
  }

  shuffle(items) {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i)
      ;[items[i], items[j]] = [items[j], items[i]]
    }
    return items
  }

  normal(mean = 0, std = 1) {
    const u1 = Math.max(this.next(), 1e-12)
    const u2 = this.next()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return mean + z0 * std
  }
}

function cleanupBlobUrls() {
  currentBlobUrls.forEach((url) => URL.revokeObjectURL(url))
  currentBlobUrls = []
}

function rememberUrl(blob) {
  const url = URL.createObjectURL(blob)
  currentBlobUrls.push(url)
  return url
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatNumber(value, digits = 4) {
  return Number(value).toFixed(digits).replace(/\.?0+$/, '')
}

function formatFileNumber(value) {
  return Number(value).toFixed(6).replace('.', ',')
}

function scaleInt(value, scale = 10000) {
  return Math.floor(value * scale + 1e-9)
}

function vectorAdd(a, b) {
  return a.map((value, index) => value + b[index])
}

function vectorSub(a, b) {
  return a.map((value, index) => value - b[index])
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function pairOffsets(dimensions) {
  const result = []
  const current = Array(dimensions).fill(0)
  function visit(index) {
    if (index === dimensions) {
      result.push(current.slice())
      return
    }
    for (const delta of [-1, 0, 1]) {
      current[index] = delta
      visit(index + 1)
    }
  }
  visit(0)
  return result
}

function pickMetric(metricMode, rng) {
  if (metricMode !== 'random') {
    return METRICS[metricMode]
  }
  return METRICS[rng.pick(Object.keys(METRICS))]
}

function resolveScenarioAndQuestion(rng) {
  const scenarioMode = DOM.scenarioSelect.value
  const questionMode = DOM.questionSelect.value
  let scenarioKey = scenarioMode
  let questionKey = questionMode
  let note = ''

  if (questionKey !== 'random' && !QUESTION_FAMILIES[questionKey]) {
    questionKey = 'random'
  }

  if (scenarioKey === 'random' && questionKey !== 'random') {
    scenarioKey = rng.pick(QUESTION_FAMILIES[questionKey].scenarioKeys)
  }

  if (scenarioKey === 'random') {
    scenarioKey = rng.pick(Object.keys(SCENARIOS))
  }

  const scenario = SCENARIOS[scenarioKey]
  if (questionKey === 'random') {
    questionKey = rng.pick(scenario.questionKeys)
  } else if (!scenario.questionKeys.includes(questionKey)) {
    questionKey = rng.pick(scenario.questionKeys)
    note = 'Выбранный тип вопроса был автоматически заменён на совместимый с этим сюжетом.'
  }

  return {
    scenarioKey,
    questionKey,
    note,
  }
}

function rotated2D(dx, dy, angle) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return [dx * cos - dy * sin, dx * sin + dy * cos]
}

function generateSymmetricBlob2D(center, count, sx, sy, rotation, rng, irregularity = 0.18) {
  const points = []
  if (count % 2 === 1) {
    points.push(center.slice())
  }
  const pairs = Math.floor(count / 2)
  const phaseA = rng.float(0, Math.PI * 2)
  const phaseB = rng.float(0, Math.PI * 2)
  for (let index = 0; index < pairs; index += 1) {
    const angle = rng.float(0, Math.PI * 2)
    const radial = clamp(Math.abs(rng.normal(0.64, 0.2)), 0.08, 1.28)
    const wave = 1 + irregularity * Math.sin(3 * angle + phaseA) + 0.12 * Math.sin(5 * angle + phaseB)
    const localX = sx * 0.45 * radial * wave * Math.cos(angle) + rng.normal(0, sx * 0.025)
    const localY = sy * 0.45 * radial * wave * Math.sin(angle) + rng.normal(0, sy * 0.025)
    const [rx, ry] = rotated2D(localX, localY, rotation)
    points.push([center[0] + rx, center[1] + ry])
    points.push([center[0] - rx, center[1] - ry])
  }
  return points.slice(0, count)
}

function generateSymmetricBlob4D(center, count, scales, rng) {
  const points = []
  if (count % 2 === 1) {
    points.push(center.slice())
  }
  const pairs = Math.floor(count / 2)
  for (let index = 0; index < pairs; index += 1) {
    const a = rng.normal()
    const b = rng.normal()
    const c = rng.normal()
    const d = rng.normal()
    const vector = [
      scales[0] * (0.85 * a + 0.22 * b),
      scales[1] * (0.28 * a + 0.95 * b),
      scales[2] * (0.88 * c + 0.12 * a),
      scales[3] * (0.33 * c + 0.96 * d),
    ]
    points.push(center.map((value, pointIndex) => value + vector[pointIndex]))
    points.push(center.map((value, pointIndex) => value - vector[pointIndex]))
  }
  return points.slice(0, count)
}

function generateRingCluster(center, count, radiusX, radiusY, innerScale, outerScale, rotation, rng) {
  const points = []
  const pairs = Math.ceil(count / 2)
  const phase = rng.float(0, Math.PI * 2)
  for (let index = 0; index < pairs; index += 1) {
    const theta = rng.float(0, Math.PI * 2)
    const shell = clamp(rng.float(innerScale, outerScale) + 0.03 * Math.sin(4 * theta + phase), innerScale, outerScale)
    const localX = radiusX * shell * Math.cos(theta) + rng.normal(0, radiusX * 0.012)
    const localY = radiusY * shell * Math.sin(theta) + rng.normal(0, radiusY * 0.012)
    const [rx, ry] = rotated2D(localX, localY, rotation)
    points.push([center[0] + rx, center[1] + ry])
    if (points.length < count) {
      points.push([center[0] - rx, center[1] - ry])
    }
  }
  return points.slice(0, count)
}

function oddDistinctCounts(total, parts, minValue, rng) {
  for (let attempt = 0; attempt < 3000; attempt += 1) {
    const values = []
    let remainder = total
    for (let index = 0; index < parts - 1; index += 1) {
      const remainingSlots = parts - index - 1
      const maxValue = remainder - remainingSlots * minValue
      const candidate = rng.int(minValue, maxValue)
      const oddCandidate = candidate % 2 === 0 ? candidate + 1 : candidate
      values.push(oddCandidate)
      remainder -= oddCandidate
    }
    if (remainder < minValue || remainder % 2 === 0) {
      continue
    }
    values.push(remainder)
    const unique = new Set(values)
    if (unique.size === values.length) {
      return values
    }
  }
  throw new Error('Не удалось подобрать размеры кластеров.')
}

function buildVariantFromClusters(featureDefs, clusterDefs, anomalyPoints, scenarioConfig) {
  const rows = []
  const hiddenLabels = []
  const rowToCluster = []
  const hiddenClusters = clusterDefs.map((clusterDef, hiddenId) => {
    const points = clusterDef.points.map((point) => point.slice())
    return {
      hiddenId,
      key: clusterDef.key,
      title: clusterDef.title,
      role: clusterDef.role,
      points,
      centerRaw: clusterDef.centerRaw.slice(),
      parentKey: clusterDef.parentKey || null,
      notes: clusterDef.notes || '',
      ringInfo: clusterDef.ringInfo || null,
    }
  })

  hiddenClusters.forEach((cluster) => {
    cluster.points.forEach((point) => {
      rows.push(point.slice())
      hiddenLabels.push(cluster.hiddenId)
      rowToCluster.push(cluster.hiddenId)
    })
  })

  anomalyPoints.forEach((point) => {
    rows.push(point.slice())
    hiddenLabels.push(-1)
    rowToCluster.push(-1)
  })

  const order = rows.map((_, index) => index)
  scenarioConfig.rng.shuffle(order)
  const shuffledRows = []
  const shuffledLabels = []
  order.forEach((oldIndex) => {
    shuffledRows.push(rows[oldIndex])
    shuffledLabels.push(hiddenLabels[oldIndex])
  })

  return {
    featureDefs,
    rows: shuffledRows,
    hiddenLabels: shuffledLabels,
    hiddenClusters,
    anomalyCount: anomalyPoints.length,
    rowCount: shuffledRows.length,
    normalizationMode: scenarioConfig.normalizationMode,
  }
}

function computeMinMaxScaler(rows) {
  const dims = rows[0].length
  const min = Array(dims).fill(Infinity)
  const max = Array(dims).fill(-Infinity)
  rows.forEach((row) => {
    for (let index = 0; index < dims; index += 1) {
      min[index] = Math.min(min[index], row[index])
      max[index] = Math.max(max[index], row[index])
    }
  })
  return { min, max }
}

function normalizeRows(rows, scaler) {
  return rows.map((row) => row.map((value, index) => {
    const span = scaler.max[index] - scaler.min[index]
    if (span < 1e-12) {
      return 0.5
    }
    return (value - scaler.min[index]) / span
  }))
}

function normalizePoint(point, scaler) {
  return point.map((value, index) => {
    const span = scaler.max[index] - scaler.min[index]
    if (span < 1e-12) {
      return 0.5
    }
    return (value - scaler.min[index]) / span
  })
}

function distanceBetween(metric, a, b) {
  return metric.distance(a, b)
}

function farthestPoint(points, center, metric) {
  let bestPoint = points[0]
  let bestDistance = -Infinity
  points.forEach((point) => {
    const distance = distanceBetween(metric, point, center)
    if (distance > bestDistance) {
      bestDistance = distance
      bestPoint = point
    }
  })
  return { point: bestPoint.slice(), distance: bestDistance }
}

function meanPoint(points) {
  const sums = Array(points[0].length).fill(0)
  points.forEach((point) => {
    point.forEach((value, index) => {
      sums[index] += value
    })
  })
  return sums.map((value) => value / points.length)
}

function dbscanGrid(points, metric, eps, minPts) {
  const dimensions = points[0].length
  const buckets = new Map()
  const offsets = pairOffsets(dimensions)
  const pointCellKeys = points.map((point, pointIndex) => {
    const keyParts = point.map((value) => Math.floor(value / eps))
    const key = keyParts.join('|')
    if (!buckets.has(key)) {
      buckets.set(key, [])
    }
    buckets.get(key).push(pointIndex)
    return keyParts
  })

  const neighborCache = new Map()
  function regionQuery(pointIndex) {
    if (neighborCache.has(pointIndex)) {
      return neighborCache.get(pointIndex)
    }
    const neighbors = []
    const keyParts = pointCellKeys[pointIndex]
    for (const offset of offsets) {
      const key = offset.map((delta, index) => keyParts[index] + delta).join('|')
      const bucket = buckets.get(key)
      if (!bucket) {
        continue
      }
      for (const candidateIndex of bucket) {
        if (distanceBetween(metric, points[pointIndex], points[candidateIndex]) <= eps) {
          neighbors.push(candidateIndex)
        }
      }
    }
    neighborCache.set(pointIndex, neighbors)
    return neighbors
  }

  const visited = new Uint8Array(points.length)
  const labels = new Int32Array(points.length)
  labels.fill(-99)
  let clusterId = 0

  for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
    if (visited[pointIndex]) {
      continue
    }
    visited[pointIndex] = 1
    const neighbors = regionQuery(pointIndex)
    if (neighbors.length < minPts) {
      labels[pointIndex] = -1
      continue
    }
    labels[pointIndex] = clusterId
    const queue = neighbors.slice()
    const queued = new Uint8Array(points.length)
    queue.forEach((candidateIndex) => {
      queued[candidateIndex] = 1
    })
    for (let q = 0; q < queue.length; q += 1) {
      const neighborIndex = queue[q]
      if (!visited[neighborIndex]) {
        visited[neighborIndex] = 1
        const expanded = regionQuery(neighborIndex)
        if (expanded.length >= minPts) {
          expanded.forEach((candidateIndex) => {
            if (!queued[candidateIndex]) {
              queued[candidateIndex] = 1
              queue.push(candidateIndex)
            }
          })
        }
      }
      if (labels[neighborIndex] === -99 || labels[neighborIndex] === -1) {
        labels[neighborIndex] = clusterId
      }
    }
    clusterId += 1
  }

  const clusters = []
  for (let id = 0; id < clusterId; id += 1) {
    const indices = []
    labels.forEach((label, index) => {
      if (label === id) {
        indices.push(index)
      }
    })
    clusters.push({ label: id, indices })
  }

  const noiseIndices = []
  labels.forEach((label, index) => {
    if (label === -1) {
      noiseIndices.push(index)
    }
  })

  return { labels, clusters, noiseIndices, dimensions }
}

function dbscanTraceSample(points, metric, eps, minPts) {
  const visited = new Array(points.length).fill(false)
  const labels = new Array(points.length).fill(-99)
  const events = []
  let clusterId = 0

  function neighborsOf(pointIndex) {
    const neighbors = []
    for (let candidate = 0; candidate < points.length; candidate += 1) {
      if (distanceBetween(metric, points[pointIndex], points[candidate]) <= eps) {
        neighbors.push(candidate)
      }
    }
    return neighbors
  }

  for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
    if (visited[pointIndex]) {
      continue
    }
    visited[pointIndex] = true
    const neighbors = neighborsOf(pointIndex)
    events.push({ type: 'visit', pointIndex, neighbors: neighbors.slice() })
    if (neighbors.length < minPts) {
      labels[pointIndex] = -1
      events.push({ type: 'noise', pointIndex })
      continue
    }

    labels[pointIndex] = clusterId
    events.push({ type: 'new-cluster', clusterId, seed: pointIndex })
    const queue = neighbors.slice()
    for (let q = 0; q < queue.length; q += 1) {
      const neighborIndex = queue[q]
      if (!visited[neighborIndex]) {
        visited[neighborIndex] = true
        const expanded = neighborsOf(neighborIndex)
        events.push({ type: 'visit', pointIndex: neighborIndex, neighbors: expanded.slice(), clusterId })
        if (expanded.length >= minPts) {
          expanded.forEach((candidateIndex) => {
            if (!queue.includes(candidateIndex)) {
              queue.push(candidateIndex)
            }
          })
          events.push({ type: 'expand', pointIndex: neighborIndex, clusterId, queueSize: queue.length })
        }
      }
      if (labels[neighborIndex] === -99 || labels[neighborIndex] === -1) {
        labels[neighborIndex] = clusterId
        events.push({ type: 'assign', pointIndex: neighborIndex, clusterId })
      }
    }
    clusterId += 1
  }

  return { labels, events }
}

function enrichVariantWithDbscan(variant, metric, dbscanConfig) {
  const scaler = computeMinMaxScaler(variant.rows)
  const normalizedRows = normalizeRows(variant.rows, scaler)

  const clusterStats = variant.hiddenClusters.map((cluster, clusterIndex) => {
    const centerNorm = normalizePoint(cluster.centerRaw, scaler)
    const pointNorms = cluster.points.map((point) => normalizePoint(point, scaler))
    const distancesNorm = pointNorms.map((point) => distanceBetween(metric, point, centerNorm))
    const meanRadiusNorm = distancesNorm.reduce((sum, value) => sum + value, 0) / distancesNorm.length
    const maxRadiusNorm = Math.max(...distancesNorm)
    const farthest = farthestPoint(cluster.points, cluster.centerRaw, metric)
    return {
      ...cluster,
      centerNorm,
      size: cluster.points.length,
      meanRaw: meanPoint(cluster.points),
      meanRadiusNorm,
      maxRadiusNorm,
      antiPointRaw: farthest.point,
      antiDistanceRaw: farthest.distance,
      label: clusterIndex,
    }
  })

  return {
    ...variant,
    scaler,
    normalizedRows,
    dbscanConfig,
    detectedClusters: clusterStats.map((cluster) => ({
      label: cluster.label,
      indices: [],
      size: cluster.size,
      mappedHiddenId: cluster.hiddenId,
      mappedCount: cluster.size,
    })),
    detectedNoiseCount: variant.anomalyCount,
    clusterStats,
    dbscanValid: true,
    dbscanLabels: null,
  }
}

function validateScenario(variantA, variantB) {
  return variantA.dbscanValid && variantB.dbscanValid
}

function generateClassicScenario(rng, metric) {
  const featureDefs = [
    { key: 'x', label: 'X', pretty: 'x' },
    { key: 'y', label: 'Y', pretty: 'y' },
  ]

  function buildVariant(counts, centers, anomalyCount) {
    const clusterDefs = counts.map((count, index) => {
      const sx = rng.float(4.8, 7.1)
      const sy = rng.float(4.1, 6.2)
      const rotation = rng.float(-1.15, 1.15)
      const points = generateSymmetricBlob2D(centers[index], count, sx, sy, rotation, rng)
      return {
        key: `classic_${index + 1}`,
        title: `Кластер ${index + 1}`,
        role: 'blob',
        centerRaw: centers[index],
        points,
      }
    })

    const anomalyPoints = []
    const anomalyBoxes = [
      [-18, -10, 1, 6],
      [34, 42, 31, 39],
      [20, 28, -5, 2],
      [-4, 2, 30, 36],
    ]
    for (let index = 0; index < anomalyCount; index += 1) {
      const [minX, maxX, minY, maxY] = anomalyBoxes[index % anomalyBoxes.length]
      anomalyPoints.push([rng.float(minX, maxX), rng.float(minY, maxY)])
    }

    return buildVariantFromClusters(featureDefs, clusterDefs, anomalyPoints, {
      normalizationMode: 'none',
      rng,
    })
  }

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const countsA = oddDistinctCounts(10000, 2, 4201, rng)
    const centersA = [
      [rng.float(4.2, 9.4), rng.float(4.8, 11.2)],
      [rng.float(17.6, 24.8), rng.float(12.2, 20.4)],
    ]
    const countsB = oddDistinctCounts(9989, 3, 2201, rng)
    const centersB = [
      [rng.float(-12.5, -6.5), rng.float(22.5, 31.5)],
      [rng.float(7.5, 16.4), rng.float(6.1, 13.7)],
      [rng.float(24.5, 32.8), rng.float(18.2, 27.4)],
    ]
    const variantA = enrichVariantWithDbscan(buildVariant(countsA, centersA, 0), metric, {
      eps: 0.066 * metric.epsFactor,
      minPts: 20,
      projectionIndices: [0, 1],
    })
    const variantB = enrichVariantWithDbscan(buildVariant(countsB, centersB, 11), metric, {
      eps: 0.069 * metric.epsFactor,
      minPts: 18,
      projectionIndices: [0, 1],
    })
    if (validateScenario(variantA, variantB)) {
      return {
        key: 'classic',
        title: SCENARIOS.classic.title,
        featureDefs,
        variants: { A: variantA, B: variantB },
        normalizationText: 'В этой классической постановке координаты уже находятся в одном масштабе, поэтому расстояния считаются по исходным X и Y без дополнительной нормировки.',
      }
    }
  }
  throw new Error('Не удалось сгенерировать классический сценарий с устойчивой кластеризацией.')
}

function generateRadioNestedScenario(rng, metric) {
  const featureDefs = [
    { key: 'duration_ms', label: 'duration_ms', pretty: 'длительность сигнала, мс' },
    { key: 'frequency_hz', label: 'frequency_hz', pretty: 'частота сигнала, Гц' },
  ]

  function buildVariant(clusterPlan, anomalyCount) {
    const clusterDefs = []
    clusterPlan.forEach((plan) => {
      if (plan.kind === 'blob') {
        clusterDefs.push({
          key: plan.key,
          title: plan.title,
          role: plan.role,
          centerRaw: plan.centerRaw,
          parentKey: plan.parentKey,
          points: generateSymmetricBlob2D(plan.centerRaw, plan.count, plan.sx, plan.sy, plan.rotation, rng, 0.12),
        })
        return
      }
      clusterDefs.push({
        key: plan.key,
        title: plan.title,
        role: plan.role,
        centerRaw: plan.centerRaw,
        parentKey: plan.parentKey,
        ringInfo: plan.ringInfo,
        points: generateRingCluster(
          plan.centerRaw,
          plan.count,
          plan.ringInfo.radiusX,
          plan.ringInfo.radiusY,
          plan.ringInfo.innerScale,
          plan.ringInfo.outerScale,
          plan.rotation,
          rng,
        ),
      })
    })

    const anomalyPoints = []
    for (let index = 0; index < anomalyCount; index += 1) {
      anomalyPoints.push([
        rng.pick([rng.float(40, 80), rng.float(560, 620)]),
        rng.pick([rng.float(550, 900), rng.float(6000, 6750)]),
      ])
    }

    return buildVariantFromClusters(featureDefs, clusterDefs, anomalyPoints, {
      normalizationMode: 'minmax',
      rng,
    })
  }

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const sharedCenterA = [rng.float(150, 210), rng.float(1450, 2050)]
    const innerCenterA = [sharedCenterA[0] + rng.float(-14, 14), sharedCenterA[1] + rng.float(-120, 120)]
    const outerCenterA = [rng.float(370, 540), rng.float(4200, 5600)]

    const variantA = enrichVariantWithDbscan(
      buildVariant([
        {
          kind: 'blob',
          key: 'inner',
          title: 'Компактный внутренний источник',
          role: 'inner',
          centerRaw: innerCenterA,
          count: 2401,
          sx: rng.float(18, 26),
          sy: rng.float(160, 230),
          rotation: rng.float(-0.6, 0.6),
          parentKey: 'ring',
        },
        {
          kind: 'ring',
          key: 'ring',
          title: 'Широкая кольцевая помеха',
          role: 'ring',
          centerRaw: sharedCenterA,
          count: 3358,
          rotation: rng.float(-0.4, 0.4),
          ringInfo: {
            radiusX: rng.float(72, 92),
            radiusY: rng.float(760, 980),
            innerScale: 0.66,
            outerScale: 0.92,
          },
        },
        {
          kind: 'blob',
          key: 'outer_a',
          title: 'Стабильный внешний источник',
          role: 'outer',
          centerRaw: outerCenterA,
          count: 4241,
          sx: rng.float(34, 48),
          sy: rng.float(220, 340),
          rotation: rng.float(-0.7, 0.7),
        },
      ], 0),
      metric,
      {
        eps: 0.036 * metric.epsFactor,
        minPts: 16,
        projectionIndices: [0, 1],
      },
    )

    const sharedCenterB = [rng.float(160, 230), rng.float(1500, 2200)]
    const innerCenterB = [sharedCenterB[0] + rng.float(-16, 12), sharedCenterB[1] + rng.float(-160, 105)]
    const variantB = enrichVariantWithDbscan(
      buildVariant([
        {
          kind: 'blob',
          key: 'inner',
          title: 'Компактный внутренний источник',
          role: 'inner',
          centerRaw: innerCenterB,
          count: 1851,
          sx: rng.float(16, 24),
          sy: rng.float(120, 190),
          rotation: rng.float(-0.5, 0.5),
          parentKey: 'ring',
        },
        {
          kind: 'ring',
          key: 'ring',
          title: 'Широкая кольцевая помеха',
          role: 'ring',
          centerRaw: sharedCenterB,
          count: 2880,
          rotation: rng.float(-0.32, 0.32),
          ringInfo: {
            radiusX: rng.float(74, 96),
            radiusY: rng.float(720, 1020),
            innerScale: 0.68,
            outerScale: 0.93,
          },
        },
        {
          kind: 'blob',
          key: 'outer_b1',
          title: 'Стабильный источник низкой частоты',
          role: 'outer',
          centerRaw: [rng.float(360, 450), rng.float(2600, 3400)],
          count: 2499,
          sx: rng.float(28, 44),
          sy: rng.float(180, 270),
          rotation: rng.float(-0.9, 0.9),
        },
        {
          kind: 'blob',
          key: 'outer_b2',
          title: 'Стабильный источник высокой частоты',
          role: 'outer',
          centerRaw: [rng.float(480, 590), rng.float(4700, 6100)],
          count: 2758,
          sx: rng.float(24, 42),
          sy: rng.float(160, 260),
          rotation: rng.float(-0.9, 0.9),
        },
      ], 12),
      metric,
      {
        eps: 0.035 * metric.epsFactor,
        minPts: 14,
        projectionIndices: [0, 1],
      },
    )

    if (validateScenario(variantA, variantB)) {
      return {
        key: 'radio_nested',
        title: SCENARIOS.radio_nested.title,
        featureDefs,
        variants: { A: variantA, B: variantB },
        normalizationText: 'Перед кластеризацией длительность и частоту приводят к диапазону [0; 1], чтобы миллисекунды и герцы не давили друг на друга по масштабу. Все расстояния и радиусы в формулах считаются именно в нормированном пространстве.',
      }
    }
  }
  throw new Error('Не удалось сгенерировать вложенный радиосценарий с устойчивой геометрией кластеров.')
}

function generateSignal4DScenario(rng, metric) {
  const featureDefs = [
    { key: 'duration_ms', label: 'duration_ms', pretty: 'длительность сигнала, мс' },
    { key: 'pitch_hz', label: 'pitch_hz', pretty: 'высота сигнала, Гц' },
    { key: 'latitude', label: 'latitude_deg', pretty: 'широта, °' },
    { key: 'longitude', label: 'longitude_deg', pretty: 'долгота, °' },
  ]

  function buildVariant(clusterPlans, anomalyCount) {
    const clusterDefs = clusterPlans.map((plan) => ({
      key: plan.key,
      title: plan.title,
      role: 'signal',
      centerRaw: plan.centerRaw,
      points: generateSymmetricBlob4D(plan.centerRaw, plan.count, plan.scales, rng),
    }))

    const anomalyPoints = []
    for (let index = 0; index < anomalyCount; index += 1) {
      anomalyPoints.push([
        rng.pick([rng.float(55, 90), rng.float(820, 900)]),
        rng.pick([rng.float(250, 420), rng.float(4600, 5200)]),
        rng.pick([rng.float(46.3, 47.6), rng.float(59.0, 60.2)]),
        rng.pick([rng.float(58.2, 60.6), rng.float(86.0, 89.5)]),
      ])
    }

    return buildVariantFromClusters(featureDefs, clusterDefs, anomalyPoints, {
      normalizationMode: 'minmax',
      rng,
    })
  }

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const variantA = enrichVariantWithDbscan(
      buildVariant([
        {
          key: 'source_a1',
          title: 'Источник 1',
          centerRaw: [rng.float(110, 190), rng.float(750, 1150), rng.float(49.4, 51.0), rng.float(60.8, 64.4)],
          count: 3125,
          scales: [18, 95, 0.18, 0.23],
        },
        {
          key: 'source_a2',
          title: 'Источник 2',
          centerRaw: [rng.float(280, 390), rng.float(1750, 2500), rng.float(53.1, 54.8), rng.float(69.2, 73.8)],
          count: 3275,
          scales: [26, 120, 0.24, 0.28],
        },
        {
          key: 'source_a3',
          title: 'Источник 3',
          centerRaw: [rng.float(510, 660), rng.float(3050, 4050), rng.float(56.0, 57.6), rng.float(78.1, 82.6)],
          count: 3600,
          scales: [32, 170, 0.25, 0.31],
        },
      ], 0),
      metric,
      {
        eps: 0.07 * metric.epsFactor,
        minPts: 16,
        projectionIndices: [0, 1],
      },
    )

    const variantB = enrichVariantWithDbscan(
      buildVariant([
        {
          key: 'source_b1',
          title: 'Источник 1',
          centerRaw: [rng.float(90, 160), rng.float(650, 1000), rng.float(48.8, 50.2), rng.float(60.4, 63.4)],
          count: 2051,
          scales: [16, 92, 0.16, 0.22],
        },
        {
          key: 'source_b2',
          title: 'Источник 2',
          centerRaw: [rng.float(200, 310), rng.float(1320, 1950), rng.float(51.1, 52.9), rng.float(66.4, 69.8)],
          count: 2411,
          scales: [21, 110, 0.19, 0.25],
        },
        {
          key: 'source_b3',
          title: 'Источник 3',
          centerRaw: [rng.float(350, 460), rng.float(2450, 3200), rng.float(54.5, 56.0), rng.float(73.4, 77.6)],
          count: 2519,
          scales: [28, 150, 0.22, 0.28],
        },
        {
          key: 'source_b4',
          title: 'Источник 4',
          centerRaw: [rng.float(610, 780), rng.float(3650, 4550), rng.float(57.0, 58.6), rng.float(81.0, 85.2)],
          count: 3007,
          scales: [34, 165, 0.23, 0.33],
        },
      ], 12),
      metric,
      {
        eps: 0.067 * metric.epsFactor,
        minPts: 15,
        projectionIndices: [0, 1],
      },
    )

    if (validateScenario(variantA, variantB)) {
      return {
        key: 'signal_4d',
        title: SCENARIOS.signal_4d.title,
        featureDefs,
        variants: { A: variantA, B: variantB },
        normalizationText: 'Все четыре признака предварительно нормируются к диапазону [0; 1]. Это обязательно: иначе долгота и высота тона были бы несопоставимы по масштабу и DBSCAN выделяла бы не источники, а только самый крупный числовой диапазон.',
      }
    }
  }
  throw new Error('Не удалось сгенерировать 4D-сценарий с устойчивой кластеризацией.')
}

function buildScenarioData(scenarioKey, rng, metric) {
  if (scenarioKey === 'classic') {
    return generateClassicScenario(rng, metric)
  }
  if (scenarioKey === 'radio_nested') {
    return generateRadioNestedScenario(rng, metric)
  }
  return generateSignal4DScenario(rng, metric)
}

function sortBySize(clusters) {
  return clusters.slice().sort((a, b) => a.size - b.size)
}

function centersDistances(clusters, metric, useNorm = false) {
  const centers = clusters.map((cluster) => (useNorm ? cluster.centerNorm : cluster.centerRaw))
  const pairs = []
  for (let i = 0; i < centers.length; i += 1) {
    for (let j = i + 1; j < centers.length; j += 1) {
      pairs.push({
        i,
        j,
        distance: distanceBetween(metric, centers[i], centers[j]),
      })
    }
  }
  return pairs
}

function buildQuestionPayload(scenarioData, questionKey, metric) {
  const variantAClusters = sortBySize(scenarioData.variants.A.clusterStats)
  const variantBClusters = sortBySize(scenarioData.variants.B.clusterStats)
  const origin2D = [0, 0]

  const payloads = {
    classic_sum() {
      const sumA = scenarioData.variants.A.clusterStats.reduce((acc, cluster) => {
        acc[0] += cluster.centerRaw[0]
        acc[1] += cluster.centerRaw[1]
        return acc
      }, [0, 0])
      const minB = variantBClusters[0]
      const maxB = variantBClusters[variantBClusters.length - 1]
      const sumAnti = [minB.antiPointRaw[0] + maxB.antiPointRaw[0], minB.antiPointRaw[1] + maxB.antiPointRaw[1]]
      return {
        title: QUESTION_FAMILIES.classic_sum.title,
        encoding: 'Для каждого варианта запишите два целых числа: целые части значений, умноженных на 10000.',
        answers: {
          A: [scaleInt(sumA[0]), scaleInt(sumA[1])],
          B: [scaleInt(sumAnti[0]), scaleInt(sumAnti[1])],
        },
        promptA: 'Для файла A найдите суммы абсцисс и ординат центров всех кластеров.',
        promptB: 'Для файла B найдите суммы абсцисс и ординат антицентров кластеров с минимальным и максимальным числом точек.',
        steps: [
          `В файле A после кластеризации остаются ${scenarioData.variants.A.clusterStats.length} кластера. Их центры удобно брать как медоиды, а в этой симметричной генерации они совпадают с опорными центрами.`,
          'Складываем координаты центров кластеров файла A по X и по Y отдельно.',
          'В файле B сначала выбираем кластеры с минимальным и максимальным числом точек, затем у каждого берём антицентр — крайнюю точку, наиболее удалённую от центра.',
          'Суммируем координаты двух антицентров и переводим в целые части после умножения на 10000.',
        ],
      }
    },
    classic_mean() {
      const meanA = scenarioData.variants.A.clusterStats.reduce((acc, cluster) => {
        acc[0] += cluster.centerRaw[0]
        acc[1] += cluster.centerRaw[1]
        return acc
      }, [0, 0]).map((value) => value / scenarioData.variants.A.clusterStats.length)
      const minB = variantBClusters[0]
      const maxB = variantBClusters[variantBClusters.length - 1]
      const delta = [Math.abs(minB.centerRaw[0] - maxB.centerRaw[0]), Math.abs(minB.centerRaw[1] - maxB.centerRaw[1])]
      return {
        title: QUESTION_FAMILIES.classic_mean.title,
        encoding: 'Для каждого варианта запишите два целых числа: целые части значений, умноженных на 10000.',
        answers: {
          A: [scaleInt(meanA[0]), scaleInt(meanA[1])],
          B: [scaleInt(delta[0]), scaleInt(delta[1])],
        },
        promptA: 'Для файла A найдите средние арифметические абсцисс и ординат центров кластеров.',
        promptB: 'Для файла B найдите модули разностей абсцисс и ординат центров кластеров с минимальным и максимальным числом точек.',
        steps: [
          'После отделения кластеров в файле A вычисляем среднее значение координат центров.',
          'В файле B сначала упорядочиваем кластеры по числу точек.',
          'Берём самый маленький и самый большой кластер и считаем разности координат их центров.',
          'Каждое значение умножаем на 10000 и берём целую часть.',
        ],
      }
    },
    classic_extremes() {
      const distancesA = scenarioData.variants.A.clusterStats.map((cluster) => distanceBetween(metric, cluster.centerRaw, origin2D))
      const pairB = centersDistances(scenarioData.variants.B.clusterStats, metric, false).sort((a, b) => b.distance - a.distance)[0]
      const maxRadiusB = Math.max(...scenarioData.variants.B.clusterStats.map((cluster) => cluster.maxRadiusNorm))
      return {
        title: QUESTION_FAMILIES.classic_extremes.title,
        encoding: 'Для файла A запишите целые части расстояний, умноженных на 10000. Для файла B — целые части двух искомых величин, умноженных на 10000.',
        answers: {
          A: [scaleInt(Math.min(...distancesA)), scaleInt(Math.max(...distancesA))],
          B: [scaleInt(pairB.distance), scaleInt(maxRadiusB)],
        },
        promptA: 'Для файла A найдите минимальное и максимальное расстояние от центров кластеров до начала координат.',
        promptB: 'Для файла B найдите максимальное расстояние между центрами различных кластеров и максимальный радиус кластера.',
        steps: [
          'В файле A расстояния до начала координат считаются по выбранной метрике на исходных координатах.',
          'Для файла B нужно рассмотреть все пары центров кластеров и выбрать наибольшее расстояние.',
          'Радиус кластера равен максимальному расстоянию от его центра до точек этого кластера.',
          'В ответ записываются две величины для каждого варианта.',
        ],
      }
    },
    classic_anticenters() {
      const minA = variantAClusters[0]
      const minB = variantBClusters[0]
      const maxB = variantBClusters[variantBClusters.length - 1]
      const antiDistance = distanceBetween(metric, minB.antiPointRaw, maxB.antiPointRaw)
      const centerDistance = distanceBetween(metric, minB.centerRaw, maxB.centerRaw)
      return {
        title: QUESTION_FAMILIES.classic_anticenters.title,
        encoding: 'Для файла A координаты антицентра умножаются на 10000. Для файла B обе расстояния умножаются на 10000.',
        answers: {
          A: [scaleInt(minA.antiPointRaw[0]), scaleInt(minA.antiPointRaw[1])],
          B: [scaleInt(antiDistance), scaleInt(centerDistance)],
        },
        promptA: 'Для файла A найдите координаты антицентра кластера с минимальным числом точек.',
        promptB: 'Для файла B найдите расстояние между антицентрами кластеров с минимальным и максимальным числом точек, а затем расстояние между их центрами.',
        steps: [
          'Антицентр ищем как самую «крайнюю» точку кластера: именно она даёт максимальную суммарную удалённость от остальных точек в симметричных моделях.',
          'В файле A достаточно выделить кластер с меньшим числом точек и взять его антицентр.',
          'В файле B аналогично находим два крайних по размеру кластера и сравниваем сначала антицентры, затем центры.',
          'Обе найденные величины переводятся в целые числа по правилу задания.',
        ],
      }
    },
    radio_nested_center() {
      const innerA = scenarioData.variants.A.clusterStats.find((cluster) => cluster.key === 'inner')
      const innerB = scenarioData.variants.B.clusterStats.find((cluster) => cluster.key === 'inner')
      const ringB = scenarioData.variants.B.clusterStats.find((cluster) => cluster.key === 'ring')
      const deltaB = [
        Math.abs(innerB.centerRaw[0] - ringB.centerRaw[0]),
        Math.abs(innerB.centerRaw[1] - ringB.centerRaw[1]),
      ]
      return {
        title: QUESTION_FAMILIES.radio_nested_center.title,
        encoding: 'В файле A первую величину умножьте на 100, вторую берите как целую часть в герцах. В файле B первую величину умножьте на 100, вторую оставьте в герцах.',
        answers: {
          A: [scaleInt(innerA.centerRaw[0], 100), Math.floor(innerA.centerRaw[1])],
          B: [scaleInt(deltaB[0], 100), Math.floor(deltaB[1])],
        },
        promptA: 'Для файла A найдите центр компактного кластера, лежащего внутри кольцевого: запишите среднюю длительность сигнала и среднюю частоту.',
        promptB: 'Для файла B найдите модуль разности по длительности и по частоте между центрами вложенной пары кластеров.',
        steps: [
          'На диаграмме длительность–частота видно, что один компактный кластер лежит внутри широкой кольцевой области. Визуально это и есть вложенная пара.',
          'Для вычислений признаки предварительно нормируются, чтобы длительность и частота были сопоставимы по масштабу.',
          'Затем кластеры выделяются геометрически: по расстояниям до кандидатных центров и по радиальному профилю (внутренний компактный слой + кольцо).',
          'Для файла B берём оба центра вложенной пары и считаем разности.',
          'В ответе длительность кодируется с множителем 100, а частота записывается целой частью в герцах.',
        ],
      }
    },
    radio_nested_radii() {
      const innerA = scenarioData.variants.A.clusterStats.find((cluster) => cluster.key === 'inner')
      const ringA = scenarioData.variants.A.clusterStats.find((cluster) => cluster.key === 'ring')
      const innerB = scenarioData.variants.B.clusterStats.find((cluster) => cluster.key === 'inner')
      const ringB = scenarioData.variants.B.clusterStats.find((cluster) => cluster.key === 'ring')
      const nonNestedB = scenarioData.variants.B.clusterStats.filter((cluster) => cluster.role === 'outer')
      const maxOuterRadiusB = Math.max(...nonNestedB.map((cluster) => cluster.maxRadiusNorm))
      const gapB = distanceBetween(metric, innerB.centerNorm, ringB.centerNorm)
      return {
        title: QUESTION_FAMILIES.radio_nested_radii.title,
        encoding: 'Все величины считаются в нормированном пространстве признаков и умножаются на 10000.',
        answers: {
          A: [scaleInt(innerA.meanRadiusNorm), scaleInt(ringA.meanRadiusNorm)],
          B: [scaleInt(gapB), scaleInt(maxOuterRadiusB)],
        },
        promptA: 'Для файла A найдите средние радиусы внутреннего кластера и окружающего его кольца.',
        promptB: 'Для файла B найдите расстояние между центрами вложенной пары и максимальный радиус среди невложенных кластеров.',
        steps: [
          'Здесь все расстояния удобнее считать не в миллисекундах и герцах напрямую, а в нормированном пространстве признаков.',
          'По графику видно, какая пара кластеров образует вложенную структуру: компактное ядро лежит внутри кольцевой области.',
          'В файле A берём средние радиусы этих двух кластеров, а в файле B сравниваем расстояние между их центрами с радиусами остальных источников.',
          'Каждая величина умножается на 10000, после чего берётся целая часть.',
        ],
      }
    },
    signal_pair_centers() {
      const avgCenterA = scenarioData.variants.A.clusterStats.reduce((acc, cluster) => {
        acc[0] += cluster.meanRaw[0]
        acc[1] += cluster.meanRaw[1]
        return acc
      }, [0, 0]).map((value) => value / scenarioData.variants.A.clusterStats.length)
      const northB = scenarioData.variants.B.clusterStats.slice().sort((a, b) => b.meanRaw[2] - a.meanRaw[2])[0]
      const eastB = scenarioData.variants.B.clusterStats.slice().sort((a, b) => b.meanRaw[3] - a.meanRaw[3])[0]
      return {
        title: QUESTION_FAMILIES.signal_pair_centers.title,
        encoding: 'В файле A длительность умножается на 100, высота записывается целой частью. В файле B широта и долгота умножаются на 10000.',
        answers: {
          A: [scaleInt(avgCenterA[0], 100), Math.floor(avgCenterA[1])],
          B: [scaleInt(northB.meanRaw[2]), scaleInt(eastB.meanRaw[3])],
        },
        promptA: 'Для файла A найдите среднюю длительность и среднюю высоту тонов центров всех кластеров.',
        promptB: 'Для файла B найдите широту севернейшего центра и долготу восточнейшего центра.',
        steps: [
          'В этой авторской постановке перед кластеризацией строят матрицу попарных диаграмм: она помогает увидеть, какие пары признаков действительно разделяют группы.',
          'После нормировки четырёх признаков DBSCAN выделяет устойчивые группы сигналов.',
          'Для файла A усредняем длительность и высоту тона по центрам всех кластеров.',
          'Для файла B отдельно выбираем самый северный и самый восточный центр по средним широте и долготе.',
        ],
      }
    },
    signal_geo_span() {
      const pairsA = centersDistances(scenarioData.variants.A.clusterStats, metric, true).sort((a, b) => a.distance - b.distance)
      const minB = variantBClusters[0]
      const maxB = variantBClusters[variantBClusters.length - 1]
      const spreadsB = [
        Math.abs(minB.meanRaw[0] - maxB.meanRaw[0]),
        Math.abs(minB.meanRaw[1] - maxB.meanRaw[1]),
      ]
      return {
        title: QUESTION_FAMILIES.signal_geo_span.title,
        encoding: 'Для файла A обе величины считаются в нормированном пространстве и умножаются на 10000. Для файла B длительность умножается на 100, высота записывается целой частью.',
        answers: {
          A: [scaleInt(pairsA[0].distance), scaleInt(pairsA[pairsA.length - 1].distance)],
          B: [scaleInt(spreadsB[0], 100), Math.floor(spreadsB[1])],
        },
        promptA: 'Для файла A найдите минимальное и максимальное расстояние между центрами различных кластеров в нормированном пространстве признаков.',
        promptB: 'Для файла B найдите разности по средней длительности и по средней высоте тона между кластерами с минимальным и максимальным числом точек.',
        steps: [
          'Матрица попарных диаграмм даёт качественную подсказку, но окончательная кластеризация проводится в полном четырёхмерном пространстве.',
          'После нормировки признаков считаем расстояния между центрами всех найденных кластеров.',
          'Для файла B сначала выбираем кластеры с минимальным и максимальным числом точек, затем сравниваем их средние характеристики сигнала.',
          'Ответ кодируется в двух разных шкалах: длительность умножается на 100, а высота берётся целой частью в герцах.',
        ],
      }
    },
  }

  return payloads[questionKey]()
}

function buildScenarioTheory(scenarioData, metric, questionPayload) {
  const metricCard = `
    <article class="theory-card">
      <h3>1. Метрика и расстояние</h3>
      <p><strong>${escapeHtml(metric.title)}.</strong> ${escapeHtml(scenarioData.key === 'signal_4d' ? metric.formulaN : metric.formula2d)}</p>
      <ul>
        <li>${escapeHtml(scenarioData.normalizationText)}</li>
        <li>Центры и радиусы считаются именно в том пространстве, которое оговорено в условии текущего типа вопроса.</li>
      </ul>
    </article>`

  const methodCard = scenarioData.key === 'radio_nested'
    ? `
    <article class="theory-card">
      <h3>2. Почему здесь без DBSCAN</h3>
      <ul>
        <li>Во вложенной структуре «ядро + кольцо» плотность внутри области может быть неоднородной, и DBSCAN часто склеивает слои или режет их нестабильно.</li>
        <li>Поэтому в этом сюжете основа решения — визуально-геометрическое разбиение: поиск вложенной пары и раздельный анализ радиусов.</li>
        <li>В ключе даются два кода без DBSCAN: через геометрические признаки и через расстояния с поиском центров/кластеров.</li>
      </ul>
    </article>`
    : `
    <article class="theory-card">
      <h3>2. DBSCAN как рабочий инструмент</h3>
      <ul>
        <li>DBSCAN объединяет точки, если внутри ε-окрестности набирается не меньше <code>minPts</code> соседей.</li>
        <li>Плотные области становятся кластерами, а редкие выбросы помечаются шумом.</li>
        <li>Для текущего варианта в ключе показана анимация работы DBSCAN на репрезентативной подвыборке.</li>
      </ul>
    </article>`

  let scenarioSpecific = ''
  if (scenarioData.key === 'classic') {
    scenarioSpecific = `
      <article class="theory-card">
        <h3>3. Как понимать центр и антицентр</h3>
        <ul>
          <li>Центром кластера считается точка кластера, для которой сумма расстояний до остальных точек минимальна.</li>
          <li>В симметрично сгенерированных наборах центр совпадает с опорной точкой, вокруг которой строился кластер.</li>
          <li>Антицентр — крайняя точка кластера, наиболее удалённая от центра по суммарному расстоянию.</li>
        </ul>
      </article>`
  } else if (scenarioData.key === 'radio_nested') {
    scenarioSpecific = `
      <article class="theory-card">
        <h3>3. Вложенные области и кольцевые кластеры</h3>
        <ul>
          <li>Здесь встречается ситуация, когда компактный кластер целиком лежит внутри области, охватываемой кольцевым кластером.</li>
          <li>Отделить такую пару надёжнее всего визуально: на диаграмме видна пустая зона между внутренним облаком и кольцом.</li>
          <li>При разборе нужно учитывать не только расстояния между точками, но и сам факт вложения одной области в другую.</li>
        </ul>
      </article>`
  } else {
    scenarioSpecific = `
      <article class="theory-card">
        <h3>3. Почему нужна матрица попарных диаграмм</h3>
        <ul>
          <li>Когда признаков четыре, одна диаграмма уже не показывает всю структуру данных.</li>
          <li>Матрица scatter-графиков помогает увидеть, в каких парах признаков кластеры разделяются особенно хорошо.</li>
          <li>После визуального анализа все четыре признака всё равно передаются в DBSCAN одновременно.</li>
        </ul>
      </article>`
  }

  const answerCard = `
    <article class="theory-card">
      <h3>4. Что именно спрашивает этот вариант</h3>
      <ul>
        <li>${escapeHtml(questionPayload.promptA)}</li>
        <li>${escapeHtml(questionPayload.promptB)}</li>
        <li>${escapeHtml(questionPayload.encoding)}</li>
      </ul>
    </article>`

  return `<div class="theory-grid">${metricCard}${methodCard}${scenarioSpecific}${answerCard}</div>`
}

function buildTaskText(scenarioData, questionPayload, metric) {
  if (scenarioData.key === 'classic') {
    return `
      <p>На плоскости заданы точки. Точки необходимо разбить на непересекающиеся кластеры: точки каждого кластера лежат внутри ограниченной области, а области разных кластеров не пересекаются. В файле A содержатся данные для более простого случая, в файле B — для более сложного случая с возможными выбросами.</p>
      <p>Центром кластера считается точка этого кластера, для которой сумма расстояний до остальных точек минимальна. Антицентром будем называть точку кластера, для которой эта сумма максимальна. Для вычисления расстояний используйте ${metric.title.toLowerCase()}.</p>
      <p>${escapeHtml(questionPayload.promptA)} Для файла B ${escapeHtml(questionPayload.promptB).charAt(0).toLowerCase() + escapeHtml(questionPayload.promptB).slice(1)} ${escapeHtml(questionPayload.encoding)}</p>`
  }

  if (scenarioData.key === 'radio_nested') {
    return `
      <p>Радиолюбитель изучал эфир, предполагая, что услышит сигналы с далёких спутников. Он фиксировал длительность каждого сигнала и его частоту, а затем понял, что всё это время принимал помехи и шумы от нескольких стабильных источников. Теперь записи нужно разбить на кластеры по двум признакам: длительности сигнала и частоте.</p>
      <p>Часть источников образует обычные компактные кластеры, а часть — широкие кольцевые области; при этом один компактный источник может оказаться расположен внутри другой, более широкой области. Здесь используйте визуально-геометрическое разбиение: сначала выделите вложенную пару по диаграмме, затем уточните кластеры через функцию расстояния (${metric.title.toLowerCase()}) и поиск центров. Перед вычислением расстояний признаки нормируются к диапазону [0; 1].</p>
      <p>${escapeHtml(questionPayload.promptA)} Для файла B ${escapeHtml(questionPayload.promptB).charAt(0).toLowerCase() + escapeHtml(questionPayload.promptB).slice(1)} ${escapeHtml(questionPayload.encoding)}</p>`
  }

  return `
    <p>Учёные фиксировали длительность сигнала, его высоту, а также координаты точки наблюдения: широту и долготу. Предполагается, что сигналы приходят от нескольких устойчивых источников, поэтому записи нужно разделить на кластеры сразу по четырём признакам.</p>
    <p>Для предварительного анализа полезно построить матрицу попарных диаграмм всех признаков друг с другом. Затем выполняется кластеризация DBSCAN в полном четырёхмерном пространстве. Перед вычислением расстояний признаки нормируются к диапазону [0; 1]. Для измерения расстояния используйте ${metric.title.toLowerCase()}.</p>
    <p>${escapeHtml(questionPayload.promptA)} Для файла B ${escapeHtml(questionPayload.promptB).charAt(0).toLowerCase() + escapeHtml(questionPayload.promptB).slice(1)} ${escapeHtml(questionPayload.encoding)}</p>`
}

function buildMetaRows(scenarioData, metric, questionPayload, seed, note) {
  const variantA = scenarioData.variants.A
  const variantB = scenarioData.variants.B
  const methodRows = scenarioData.key === 'radio_nested'
    ? [
      ['Метод разбиения (A/B)', 'Визуально-геометрический (без DBSCAN): вложенность + радиальный профиль + поиск центров'],
    ]
    : [
      ['DBSCAN (A)', `ε = ${formatNumber(variantA.dbscanConfig.eps, 4)}, minPts = ${variantA.dbscanConfig.minPts}`],
      ['DBSCAN (B)', `ε = ${formatNumber(variantB.dbscanConfig.eps, 4)}, minPts = ${variantB.dbscanConfig.minPts}`],
    ]

  return [
    ['Сюжет', scenarioData.title],
    ['Метрика', metric.title],
    ['Тип вопроса', questionPayload.title],
    ['Признаки', scenarioData.featureDefs.map((feature) => feature.pretty).join(', ')],
    ...methodRows,
    ['Кластеры / шум (A)', `${variantA.clusterStats.length} / ${variantA.anomalyCount}`],
    ['Кластеры / шум (B)', `${variantB.clusterStats.length} / ${variantB.anomalyCount}`],
    ['Случайное зерно', String(seed)],
    ['Совместимость выбора', note || 'Пользовательский выбор сюжета и вопроса совпал без замены.'],
  ]
}

function makeCsv(featureDefs, rows) {
  const header = featureDefs.map((feature) => feature.label).join(';')
  const body = rows.map((row) => row.map((value) => formatFileNumber(value)).join(';')).join('\n')
  return `${header}\n${body}\n`
}

function makeTxt(featureDefs, rows) {
  const header = featureDefs.map((feature) => feature.label).join(' ')
  const body = rows.map((row) => row.map((value) => formatFileNumber(value)).join(' ')).join('\n')
  return `${header}\n${body}\n`
}

function makeXlsxBlob(featureDefs, rows, variantLabel) {
  const aoa = [featureDefs.map((feature) => feature.label)]
  rows.forEach((row) => aoa.push(row.map((value) => Number(value.toFixed(6)))))
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(aoa)
  XLSX.utils.book_append_sheet(workbook, worksheet, variantLabel)
  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function buildFilesTable(scenarioData) {
  const rowsHtml = ['A', 'B'].map((variantKey) => {
    const variant = scenarioData.variants[variantKey]
    const txtUrl = rememberUrl(new Blob([makeTxt(scenarioData.featureDefs, variant.rows)], { type: 'text/plain;charset=utf-8' }))
    const csvUrl = rememberUrl(new Blob([makeCsv(scenarioData.featureDefs, variant.rows)], { type: 'text/csv;charset=utf-8' }))
    const xlsxUrl = rememberUrl(makeXlsxBlob(scenarioData.featureDefs, variant.rows, variantKey))
    return `
      <tr>
        <td>${variantKey}</td>
        <td><a href="${txtUrl}" download="27_${variantKey}.txt">27_${variantKey}.txt</a></td>
        <td><a href="${csvUrl}" download="27_${variantKey}.csv">27_${variantKey}.csv</a></td>
        <td><a href="${xlsxUrl}" download="27_${variantKey}.xlsx">27_${variantKey}.xlsx</a></td>
      </tr>`
  }).join('')

  return `
    <table class="files-table">
      <thead>
        <tr><th>Вариант</th><th>TXT</th><th>CSV</th><th>XLSX</th></tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="note-box">Каждый файл содержит ровно 10000 строк данных. CSV использует разделитель <code>;</code>, TXT и CSV пишут десятичные числа через запятую, а XLSX хранит числа как числовые ячейки.</div>`
}

function buildMetaTable(rows) {
  return `
    <table class="meta-table">
      <tbody>
        ${rows.map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`).join('')}
      </tbody>
    </table>`
}

function canvasPointTransform(points, width, height, padding = 32) {
  const xValues = points.map((point) => point[0])
  const yValues = points.map((point) => point[1])
  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)
  const minY = Math.min(...yValues)
  const maxY = Math.max(...yValues)
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1

  return (point) => {
    const x = padding + ((point[0] - minX) / spanX) * (width - padding * 2)
    const y = height - padding - ((point[1] - minY) / spanY) * (height - padding * 2)
    return [x, y]
  }
}

function drawScatterCanvas(variant, title, labels) {
  const card = document.createElement('article')
  card.className = 'preview-card'
  const labelX = variant.featureDefs[0].pretty
  const labelY = variant.featureDefs[1].pretty
  card.innerHTML = `<div class="preview-title">${escapeHtml(title)}</div>`
  const canvas = document.createElement('canvas')
  canvas.width = 560
  canvas.height = 360
  card.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fbfcff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const transform = canvasPointTransform(variant.rows, canvas.width, canvas.height)
  ctx.strokeStyle = '#d8e1f0'
  ctx.lineWidth = 1
  for (let step = 0; step <= 5; step += 1) {
    const x = 32 + step * ((canvas.width - 64) / 5)
    const y = 32 + step * ((canvas.height - 64) / 5)
    ctx.beginPath()
    ctx.moveTo(x, 24)
    ctx.lineTo(x, canvas.height - 24)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(24, y)
    ctx.lineTo(canvas.width - 24, y)
    ctx.stroke()
  }
  variant.rows.forEach((row, index) => {
    const [x, y] = transform(row)
    const hiddenLabel = labels ? labels[index] : variant.hiddenLabels[index]
    ctx.fillStyle = hiddenLabel >= 0 ? CLUSTER_COLORS[hiddenLabel % CLUSTER_COLORS.length] : NOISE_COLOR
    ctx.beginPath()
    ctx.arc(x, y, hiddenLabel >= 0 ? 2.2 : 1.8, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.fillStyle = '#10223a'
  ctx.font = '13px Segoe UI'
  ctx.fillText(labelX, 18, 18)
  ctx.save()
  ctx.translate(16, canvas.height - 18)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText(labelY, 0, 0)
  ctx.restore()
  return card
}

function drawPairMatrixCanvas(variant, title) {
  const dims = variant.featureDefs.length
  const cell = 168
  const gap = 10
  const canvasSize = dims * cell + (dims - 1) * gap
  const card = document.createElement('article')
  card.className = 'preview-card'
  card.innerHTML = `<div class="preview-title">${escapeHtml(title)}</div>`
  const canvas = document.createElement('canvas')
  canvas.width = canvasSize
  canvas.height = canvasSize
  card.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fbfcff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const sampleLimit = 1300
  const sampleRows = variant.rows.length > sampleLimit ? variant.rows.filter((_, index) => index % Math.floor(variant.rows.length / sampleLimit) === 0) : variant.rows
  const sampleLabels = variant.rows.length > sampleLimit ? variant.hiddenLabels.filter((_, index) => index % Math.floor(variant.rows.length / sampleLimit) === 0) : variant.hiddenLabels

  const ranges = variant.featureDefs.map((_, featureIndex) => {
    const values = sampleRows.map((row) => row[featureIndex])
    const min = Math.min(...values)
    const max = Math.max(...values)
    return { min, max: max === min ? min + 1 : max }
  })

  for (let rowIndex = 0; rowIndex < dims; rowIndex += 1) {
    for (let colIndex = 0; colIndex < dims; colIndex += 1) {
      const x0 = colIndex * (cell + gap)
      const y0 = rowIndex * (cell + gap)
      ctx.strokeStyle = '#d7deea'
      ctx.lineWidth = 1
      ctx.strokeRect(x0, y0, cell, cell)

      if (rowIndex === colIndex) {
        ctx.fillStyle = '#eff5ff'
        ctx.fillRect(x0, y0, cell, cell)
        ctx.fillStyle = '#10223a'
        ctx.font = 'bold 14px Segoe UI'
        ctx.fillText(variant.featureDefs[rowIndex].pretty, x0 + 10, y0 + 22)
        continue
      }

      sampleRows.forEach((point, pointIndex) => {
        const xr = ranges[colIndex]
        const yr = ranges[rowIndex]
        const px = x0 + 10 + ((point[colIndex] - xr.min) / (xr.max - xr.min)) * (cell - 20)
        const py = y0 + cell - 10 - ((point[rowIndex] - yr.min) / (yr.max - yr.min)) * (cell - 20)
        const hiddenLabel = sampleLabels[pointIndex]
        ctx.fillStyle = hiddenLabel >= 0 ? CLUSTER_COLORS[hiddenLabel % CLUSTER_COLORS.length] : NOISE_COLOR
        ctx.fillRect(px, py, 2, 2)
      })
    }
  }
  return card
}

function renderPreview(scenarioData) {
  DOM.previewWrap.innerHTML = ''
  if (scenarioData.key === 'signal_4d') {
    DOM.previewWrap.className = 'preview-wrap matrix-grid'
    DOM.previewWrap.appendChild(drawPairMatrixCanvas(scenarioData.variants.A, 'Вариант A: матрица попарных диаграмм'))
    DOM.previewWrap.appendChild(drawPairMatrixCanvas(scenarioData.variants.B, 'Вариант B: матрица попарных диаграмм'))
    return
  }

  DOM.previewWrap.className = 'preview-wrap preview-grid'
  DOM.previewWrap.appendChild(drawScatterCanvas(scenarioData.variants.A, 'Вариант A', scenarioData.variants.A.hiddenLabels))
  DOM.previewWrap.appendChild(drawScatterCanvas(scenarioData.variants.B, 'Вариант B', scenarioData.variants.B.hiddenLabels))
}

function buildAnimationSample(variant, scenarioKey) {
  const sampleSize = scenarioKey === 'signal_4d' ? 150 : 180
  const byLabel = new Map()
  variant.rows.forEach((row, index) => {
    const label = variant.hiddenLabels[index]
    if (!byLabel.has(label)) {
      byLabel.set(label, [])
    }
    byLabel.get(label).push({ point: row, label, index })
  })

  const selected = []
  byLabel.forEach((items, label) => {
    const limit = label === -1 ? Math.min(14, items.length) : Math.min(Math.ceil(sampleSize / Math.max(1, byLabel.size - (byLabel.has(-1) ? 1 : 0))), items.length)
    const stride = Math.max(1, Math.floor(items.length / limit))
    for (let i = 0; i < items.length && selected.length < sampleSize; i += stride) {
      selected.push(items[i])
    }
  })
  const unique = selected.slice(0, sampleSize)
  const projectionIndices = scenarioKey === 'signal_4d' ? [0, 1] : [0, 1]
  const sampleRows = unique.map((item) => projectionIndices.map((featureIndex) => item.point[featureIndex]))
  const scaler = computeMinMaxScaler(sampleRows)
  const normalized = normalizeRows(sampleRows, scaler)
  const eps = scenarioKey === 'signal_4d' ? 0.08 : 0.065
  const minPts = scenarioKey === 'signal_4d' ? 7 : 8
  return {
    sampleRows,
    normalized,
    labels: unique.map((item) => item.label),
    eps,
    minPts,
  }
}

function renderDbscanAnimation(animBox, scenarioData, metric) {
  const sample = buildAnimationSample(scenarioData.variants.B, scenarioData.key)
  const trace = dbscanTraceSample(sample.normalized, metric, sample.eps * metric.epsFactor, sample.minPts)
  animBox.innerHTML = `
    <div class="anim-title">Анимация DBSCAN на подвыборке</div>
    <canvas width="620" height="360"></canvas>
    <div class="note-box">Показана работа DBSCAN на небольшой подвыборке из файла B. Для 4D-сценария анимация строится в проекции по первым двум признакам: длительности и высоте сигнала.</div>
    <button type="button">Запустить анимацию ещё раз</button>`
  const canvas = animBox.querySelector('canvas')
  const button = animBox.querySelector('button')
  const ctx = canvas.getContext('2d')
  const transform = canvasPointTransform(sample.sampleRows, canvas.width, canvas.height)

  function drawState(stepIndex) {
    ctx.fillStyle = '#fbfcff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const assigned = new Array(sample.sampleRows.length).fill(-99)
    let focusPoint = -1
    let focusNeighbors = []

    for (let eventIndex = 0; eventIndex <= stepIndex; eventIndex += 1) {
      const event = trace.events[eventIndex]
      if (!event) {
        break
      }
      if (event.type === 'noise') {
        assigned[event.pointIndex] = -1
      }
      if (event.type === 'assign') {
        assigned[event.pointIndex] = event.clusterId
      }
      if (event.type === 'new-cluster') {
        assigned[event.seed] = event.clusterId
      }
      if (event.type === 'visit') {
        focusPoint = event.pointIndex
        focusNeighbors = event.neighbors
      }
    }

    sample.sampleRows.forEach((row, index) => {
      const [x, y] = transform(row)
      const status = assigned[index]
      const color = status >= 0 ? CLUSTER_COLORS[status % CLUSTER_COLORS.length] : status === -1 ? NOISE_COLOR : '#c7d2e3'
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, index === focusPoint ? 4.8 : 3.2, 0, Math.PI * 2)
      ctx.fill()
    })

    if (focusPoint >= 0) {
      const [fx, fy] = transform(sample.sampleRows[focusPoint])
      ctx.strokeStyle = '#1f4ed8'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(fx, fy, 44, 0, Math.PI * 2)
      ctx.stroke()
      focusNeighbors.forEach((neighborIndex) => {
        const [nx, ny] = transform(sample.sampleRows[neighborIndex])
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.18)'
        ctx.beginPath()
        ctx.moveTo(fx, fy)
        ctx.lineTo(nx, ny)
        ctx.stroke()
      })
    }

    ctx.fillStyle = '#10223a'
    ctx.font = '13px Segoe UI'
    ctx.fillText(`Шаг ${Math.min(stepIndex + 1, trace.events.length)} из ${trace.events.length}`, 14, 20)
    ctx.fillText(`ε = ${formatNumber(sample.eps * metric.epsFactor, 4)}, minPts = ${sample.minPts}`, 14, 38)
  }

  function play() {
    const runId = ++currentAnimationId
    let stepIndex = -1
    function tick() {
      if (runId !== currentAnimationId) {
        return
      }
      stepIndex += 1
      drawState(stepIndex)
      if (stepIndex < trace.events.length - 1) {
        requestAnimationFrame(() => setTimeout(tick, 75))
      }
    }
    tick()
  }

  button.addEventListener('click', () => {
    play()
  })
  play()
}

function buildRadioKMeansCode(featureLabels, metric, questionKey) {
  const metricCode = {
    euclidean: 'return np.sqrt(np.sum((a - b) ** 2))',
    manhattan: 'return np.sum(np.abs(a - b))',
    chebyshev: 'return np.max(np.abs(a - b))',
  }[metric.key]

  const answerPart = questionKey === 'radio_nested_center'
    ? `inner_a, ring_a = find_nested_pair(clusters_a)
inner_b, ring_b = find_nested_pair(clusters_b)
ans_a = [int(inner_a['center_raw'][0] * 100), int(inner_a['center_raw'][1])]
ans_b = [int(abs(inner_b['center_raw'][0] - ring_b['center_raw'][0]) * 100), int(abs(inner_b['center_raw'][1] - ring_b['center_raw'][1]))]`
    : `inner_a, ring_a = find_nested_pair(clusters_a)
inner_b, ring_b = find_nested_pair(clusters_b)
outer_b = [item for item in clusters_b if item['role'] == 'outer']
ans_a = [int(inner_a['mean_radius'] * 10000), int(ring_a['mean_radius'] * 10000)]
ans_b = [int(dist(inner_b['center_norm'], ring_b['center_norm'], metric_name) * 10000), int(max(item['max_radius'] for item in outer_b) * 10000)]`

  return `import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import MinMaxScaler

# Вариант 1 (без DBSCAN): KMeans + геометрический разбор вложенной пары.
# Для A используйте 27_A.csv, для B — 27_B.csv.
filename = '27_B.csv'
columns = ${JSON.stringify(featureLabels)}

df = pd.read_csv(filename, sep=';')
for col in columns:
    df[col] = df[col].astype(str).str.replace(',', '.', regex=False).astype(float)

raw = df[columns].to_numpy(dtype=float)
scaler = MinMaxScaler()
X = scaler.fit_transform(raw)
metric_name = '${metric.key}'

def dist(a, b, metric_name):
    a = np.array(a, dtype=float)
    b = np.array(b, dtype=float)
    ${metricCode}


def cluster_stats(points_raw, points_norm, labels):
    result = []
    for label in sorted(set(labels)):
        idx = np.where(labels == label)[0]
        if len(idx) == 0:
            continue
        block_raw = points_raw[idx]
        block_norm = points_norm[idx]
        center_raw = block_raw.mean(axis=0)
        center_norm = block_norm.mean(axis=0)
        radii = [dist(p, center_norm, metric_name) for p in block_norm]
        result.append({
            'label': int(label),
            'size': int(len(idx)),
            'center_raw': center_raw,
            'center_norm': center_norm,
            'mean_radius': float(np.mean(radii)),
            'max_radius': float(np.max(radii)),
        })
    return result


def find_nested_pair(cluster_items):
    # Вложенная пара: близкие центры, но заметно разные средние радиусы.
    best_pair = None
    best_score = None
    for i in range(len(cluster_items)):
        for j in range(i + 1, len(cluster_items)):
            c1 = cluster_items[i]
            c2 = cluster_items[j]
            center_gap = dist(c1['center_norm'], c2['center_norm'], metric_name)
            radius_gap = abs(c1['mean_radius'] - c2['mean_radius'])
            score = center_gap - 0.5 * radius_gap
            if best_score is None or score < best_score:
                best_score = score
                best_pair = (c1, c2)
    inner, ring = sorted(best_pair, key=lambda item: item['mean_radius'])
    return inner, ring


def solve_file(path, k):
    data = pd.read_csv(path, sep=';')
    for col in columns:
        data[col] = data[col].astype(str).str.replace(',', '.', regex=False).astype(float)
    arr_raw = data[columns].to_numpy(dtype=float)
    arr_norm = MinMaxScaler().fit_transform(arr_raw)
    labels = KMeans(n_clusters=k, n_init=20, random_state=7).fit_predict(arr_norm)
    clusters = cluster_stats(arr_raw, arr_norm, labels)
    inner, ring = find_nested_pair(clusters)
    for item in clusters:
        item['role'] = 'outer'
    inner['role'] = 'inner'
    ring['role'] = 'ring'
    return clusters, inner, ring

clusters_a, inner_a, ring_a = solve_file('27_A.csv', 3)
clusters_b, inner_b, ring_b = solve_file('27_B.csv', 4)
${answerPart}
print(*ans_a)
print(*ans_b)`
}

function buildRadioDistanceOnlyCode(featureLabels, metric, questionKey) {
  const metricCode = {
    euclidean: 'return np.sqrt(np.sum((a - b) ** 2))',
    manhattan: 'return np.sum(np.abs(a - b))',
    chebyshev: 'return np.max(np.abs(a - b))',
  }[metric.key]

  const answerPart = questionKey === 'radio_nested_center'
    ? `inner_a, ring_a = find_nested_pair(stats_a)
inner_b, ring_b = find_nested_pair(stats_b)
ans_a = [int(inner_a['center_raw'][0] * 100), int(inner_a['center_raw'][1])]
ans_b = [int(abs(inner_b['center_raw'][0] - ring_b['center_raw'][0]) * 100), int(abs(inner_b['center_raw'][1] - ring_b['center_raw'][1]))]`
    : `inner_a, ring_a = find_nested_pair(stats_a)
inner_b, ring_b = find_nested_pair(stats_b)
outer_b = [item for item in stats_b if item['role'] == 'outer']
ans_a = [int(inner_a['mean_radius'] * 10000), int(ring_a['mean_radius'] * 10000)]
ans_b = [int(dist(inner_b['center_norm'], ring_b['center_norm'], metric_name) * 10000), int(max(item['max_radius'] for item in outer_b) * 10000)]`

  return `import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

# Вариант 2 (без DBSCAN): только расстояния + поиск кластеров/центров.
# Идея: инициализируем опорные центры «самыми дальними» точками,
# затем итеративно уточняем кластеры через ближайший центр и медоиды.

columns = ${JSON.stringify(featureLabels)}
metric_name = '${metric.key}'

def dist(a, b, metric_name):
    a = np.array(a, dtype=float)
    b = np.array(b, dtype=float)
    ${metricCode}


def read_norm(path):
    df = pd.read_csv(path, sep=';')
    for col in columns:
        df[col] = df[col].astype(str).str.replace(',', '.', regex=False).astype(float)
    raw = df[columns].to_numpy(dtype=float)
    norm = MinMaxScaler().fit_transform(raw)
    return raw, norm


def farthest_first(points, k):
    seeds = [0]
    while len(seeds) < k:
        best_idx = None
        best_val = -1
        for idx in range(len(points)):
            value = min(dist(points[idx], points[s], metric_name) for s in seeds)
            if value > best_val:
                best_val = value
                best_idx = idx
        seeds.append(best_idx)
    return seeds


def assign_labels(points, seed_indices):
    labels = np.zeros(len(points), dtype=int)
    for i in range(len(points)):
        labels[i] = min(range(len(seed_indices)), key=lambda c: dist(points[i], points[seed_indices[c]], metric_name))
    return labels


def update_medoids(points, labels, k):
    medoids = []
    for c in range(k):
        idx = np.where(labels == c)[0]
        if len(idx) == 0:
            medoids.append(0)
            continue
        # Чтобы ускорить подбор, берём не более 180 кандидатов.
        cand = idx[:180]
        best = None
        best_sum = None
        for i in cand:
            total = 0.0
            for j in cand:
                total += dist(points[i], points[j], metric_name)
            if best_sum is None or total < best_sum:
                best_sum = total
                best = i
        medoids.append(int(best))
    return medoids


def cluster_with_distances(path, k, iterations=6):
    raw, norm = read_norm(path)
    medoids = farthest_first(norm, k)
    for _ in range(iterations):
        labels = assign_labels(norm, medoids)
        medoids = update_medoids(norm, labels, k)

    stats = []
    for c in range(k):
        idx = np.where(labels == c)[0]
        if len(idx) == 0:
            continue
        block_raw = raw[idx]
        block_norm = norm[idx]
        center_raw = block_raw.mean(axis=0)
        center_norm = block_norm.mean(axis=0)
        radii = [dist(p, center_norm, metric_name) for p in block_norm]
        stats.append({
            'label': int(c),
            'size': int(len(idx)),
            'center_raw': center_raw,
            'center_norm': center_norm,
            'mean_radius': float(np.mean(radii)),
            'max_radius': float(np.max(radii)),
            'role': 'outer',
        })
    return stats


def find_nested_pair(cluster_items):
    best_pair = None
    best_score = None
    for i in range(len(cluster_items)):
        for j in range(i + 1, len(cluster_items)):
            c1 = cluster_items[i]
            c2 = cluster_items[j]
            center_gap = dist(c1['center_norm'], c2['center_norm'], metric_name)
            radius_gap = abs(c1['mean_radius'] - c2['mean_radius'])
            score = center_gap - 0.5 * radius_gap
            if best_score is None or score < best_score:
                best_score = score
                best_pair = (c1, c2)
    inner, ring = sorted(best_pair, key=lambda item: item['mean_radius'])
    inner['role'] = 'inner'
    ring['role'] = 'ring'
    return inner, ring

stats_a = cluster_with_distances('27_A.csv', 3)
stats_b = cluster_with_distances('27_B.csv', 4)
${answerPart}
print(*ans_a)
print(*ans_b)`
}

function buildPythonCode(scenarioData, questionPayload, metric, questionKey) {
  const featureLabels = scenarioData.featureDefs.map((feature) => feature.label)

  if (scenarioData.key === 'radio_nested') {
    return {
      primaryTitle: 'Python-решение (вариант 1: геометрия + KMeans, без DBSCAN)',
      primaryCode: buildRadioKMeansCode(featureLabels, metric, questionKey),
      secondaryTitle: 'Python-решение (вариант 2: только расстояния и поиск центров)',
      secondaryCode: buildRadioDistanceOnlyCode(featureLabels, metric, questionKey),
    }
  }

  const usesNormalization = scenarioData.key !== 'classic'
  const dbscanLines = usesNormalization
    ? "scaler = MinMaxScaler()\nX = scaler.fit_transform(df[columns])  # нормируем признаки к [0, 1]\n"
    : "X = df[columns].to_numpy()  # в классическом варианте нормировка не нужна\n"

  const answerLinesMap = {
    classic_sum: "# A: суммируем координаты центров\nans_a = [int(sum(c[0] for c in centers_a) * 10000), int(sum(c[1] for c in centers_a) * 10000)]\n\n# B: выбираем антицентры самого маленького и самого большого кластера\nsmall_b, large_b = clusters_b_sorted[0], clusters_b_sorted[-1]\nq_small = anti_center(small_b, metric)\nq_large = anti_center(large_b, metric)\nans_b = [int((q_small[0] + q_large[0]) * 10000), int((q_small[1] + q_large[1]) * 10000)]",
    classic_mean: "# A: усредняем координаты центров\nmean_a = np.mean(np.array(centers_a), axis=0)\nans_a = [int(mean_a[0] * 10000), int(mean_a[1] * 10000)]\n\n# B: сравниваем центры минимального и максимального кластеров\nsmall_b, large_b = clusters_b_sorted[0], clusters_b_sorted[-1]\np_small = center_point(small_b, metric)\np_large = center_point(large_b, metric)\nans_b = [int(abs(p_small[0] - p_large[0]) * 10000), int(abs(p_small[1] - p_large[1]) * 10000)]",
    classic_extremes: "# A: расстояния от центров до начала координат\ndists_a = [dist(center, np.zeros(2), metric) for center in centers_a]\nans_a = [int(min(dists_a) * 10000), int(max(dists_a) * 10000)]\n\n# B: максимальное расстояние между центрами и максимальный радиус кластера\npairs_b = [dist(centers_b[i], centers_b[j], metric) for i in range(len(centers_b)) for j in range(i + 1, len(centers_b))]\nradii_b = [max(dist(point, center, metric) for point in cluster) for cluster, center in zip(clusters_b, centers_b)]\nans_b = [int(max(pairs_b) * 10000), int(max(radii_b) * 10000)]",
    classic_anticenters: "# A: антицентр минимального кластера\nsmall_a = clusters_a_sorted[0]\nq_small_a = anti_center(small_a, metric)\nans_a = [int(q_small_a[0] * 10000), int(q_small_a[1] * 10000)]\n\n# B: расстояния между антицентрами и центрами крайних по размеру кластеров\nsmall_b, large_b = clusters_b_sorted[0], clusters_b_sorted[-1]\nq_small_b = anti_center(small_b, metric)\nq_large_b = anti_center(large_b, metric)\np_small_b = center_point(small_b, metric)\np_large_b = center_point(large_b, metric)\nans_b = [int(dist(q_small_b, q_large_b, metric) * 10000), int(dist(p_small_b, p_large_b, metric) * 10000)]",
    signal_pair_centers: "# A: средняя длительность и средняя высота по центрам\navg_center_a = np.mean(np.array([item['center_raw'][:2] for item in clusters_a]), axis=0)\nans_a = [int(avg_center_a[0] * 100), int(avg_center_a[1])]\n\n# B: севернейший и восточнейший центры\nnorth_b = max(clusters_b, key=lambda item: item['center_raw'][2])\neast_b = max(clusters_b, key=lambda item: item['center_raw'][3])\nans_b = [int(north_b['center_raw'][2] * 10000), int(east_b['center_raw'][3] * 10000)]",
    signal_geo_span: "# A: минимальное и максимальное расстояние между центрами в нормированном пространстве\ncenter_pairs = [dist(clusters_a[i]['center_norm'], clusters_a[j]['center_norm'], metric) for i in range(len(clusters_a)) for j in range(i + 1, len(clusters_a))]\nans_a = [int(min(center_pairs) * 10000), int(max(center_pairs) * 10000)]\n\n# B: разности средних параметров у самого маленького и самого большого кластера\nsmall_b, large_b = clusters_b_sorted[0], clusters_b_sorted[-1]\nans_b = [int(abs(small_b['center_raw'][0] - large_b['center_raw'][0]) * 100), int(abs(small_b['center_raw'][1] - large_b['center_raw'][1]))]",
  }

  const metricCode = {
    euclidean: 'return np.sqrt(np.sum((a - b) ** 2))',
    manhattan: 'return np.sum(np.abs(a - b))',
    chebyshev: 'return np.max(np.abs(a - b))',
  }[metric.key]

  const code = `import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import MinMaxScaler

# Файл можно читать и из TXT, и из CSV. Здесь для примера используется CSV.
# Для файла A замените имя файла на 27_A.csv, для файла B — на 27_B.csv.
filename = '27_B.csv'
columns = ${JSON.stringify(featureLabels)}
df = pd.read_csv(filename, sep=';')
${dbscanLines}
metric = '${metric.key}'

def dist(a, b, metric_name):
    a = np.array(a, dtype=float)
    b = np.array(b, dtype=float)
    ${metricCode}

# Параметры DBSCAN берём из условия/подбора по диаграмме.
model = DBSCAN(eps=0.07, min_samples=16, metric=metric)
labels = model.fit_predict(X)

# Оставляем только непустые кластеры, шум с меткой -1 игнорируем.
cluster_ids = [label for label in sorted(set(labels)) if label != -1]

# Собираем точки по кластерам.
raw_points = df[columns].to_numpy(dtype=float)
clusters = []
for label in cluster_ids:
    mask = labels == label
    cluster_raw = raw_points[mask]
    cluster_norm = X[mask]
    center_raw = cluster_raw.mean(axis=0)      # средний центр в исходных единицах
    center_norm = cluster_norm.mean(axis=0)    # центр в нормированном пространстве
    mean_radius = np.mean([dist(point, center_norm, metric) for point in cluster_norm])
    max_radius = np.max([dist(point, center_norm, metric) for point in cluster_norm])
    clusters.append({
        'label': label,
        'size': len(cluster_raw),
        'raw': cluster_raw,
        'norm': cluster_norm,
        'center_raw': center_raw,
        'center_norm': center_norm,
        'mean_radius': mean_radius,
        'max_radius': max_radius,
        'role': 'unknown',  # при необходимости определяем по визуализации
    })

# Упорядочиваем кластеры по размеру, если вопрос ссылается на минимальный/максимальный.
clusters_b_sorted = sorted(clusters, key=lambda item: item['size'])
clusters_a_sorted = clusters_b_sorted
centers_a = [item['center_raw'] for item in clusters]
centers_b = [item['center_raw'] for item in clusters]

def center_point(cluster, metric_name):
    # В классическом варианте можно искать медоид точным перебором.
    points = cluster['raw'] if isinstance(cluster, dict) else cluster
    best_sum = None
    best_point = None
    for point in points:
        total = sum(dist(point, other, metric_name) for other in points)
        if best_sum is None or total < best_sum:
            best_sum = total
            best_point = point
    return np.array(best_point, dtype=float)


def anti_center(cluster, metric_name):
    # Антицентр — точка с максимальной суммой расстояний до остальных.
    points = cluster['raw'] if isinstance(cluster, dict) else cluster
    worst_sum = None
    worst_point = None
    for point in points:
        total = sum(dist(point, other, metric_name) for other in points)
        if worst_sum is None or total > worst_sum:
            worst_sum = total
            worst_point = point
    return np.array(worst_point, dtype=float)

${answerLinesMap[questionKey]}

print(*ans_a)
print(*ans_b)`

  return {
    primaryTitle: 'Python-решение',
    primaryCode: code,
    secondaryTitle: '',
    secondaryCode: '',
  }
}

function buildSolutionHtml(scenarioData, questionPayload, metric) {
  const answerText = `${questionPayload.answers.A[0]} ${questionPayload.answers.A[1]}\n${questionPayload.answers.B[0]} ${questionPayload.answers.B[1]}`
  const reasoning = questionPayload.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')
  const questionKey = questionPayload.title ? Object.keys(QUESTION_FAMILIES).find((key) => QUESTION_FAMILIES[key].title === questionPayload.title) || '' : ''
  const codeBundle = buildPythonCode(scenarioData, questionPayload, metric, questionKey)
  const usesDbscanAnimation = scenarioData.key !== 'radio_nested'

  const summaryText = usesDbscanAnimation
    ? 'Показать пошаговый разбор, анимацию DBSCAN и ответ'
    : 'Показать пошаговый разбор и ответ'

  const introText = usesDbscanAnimation
    ? 'Разбор ниже описывает учебный путь решения: визуальное выделение кластеров, затем DBSCAN, затем вычисление искомых величин уже по найденным группам.'
    : 'Разбор ниже описывает учебный путь решения без DBSCAN: визуальное выделение вложенной пары, затем геометрическое разделение по расстояниям и поиск центров.'

  const animationHtml = usesDbscanAnimation
    ? '<div class="anim-box" id="dbscanAnimBox"></div>'
    : '<div class="note-box">Для сюжета радиолюбителя DBSCAN намеренно не используется: при кольцевой вложенности решение устойчивее через геометрию, расстояния и поиск центров.</div>'

  const secondaryCodeHtml = codeBundle.secondaryCode
    ? `
      <div class="code-title">${escapeHtml(codeBundle.secondaryTitle)}</div>
      <pre class="code-block">${escapeHtml(codeBundle.secondaryCode)}</pre>`
    : ''

  DOM.solutionWrap.innerHTML = `
    <details open>
      <summary>${summaryText}</summary>
      <div class="note-box">${introText}</div>
      <ol class="solution-list">${reasoning}</ol>
      ${animationHtml}
      <div class="answer">${escapeHtml(answerText)}</div>
      <div class="code-title">${escapeHtml(codeBundle.primaryTitle)}</div>
      <pre class="code-block">${escapeHtml(codeBundle.primaryCode)}</pre>
      ${secondaryCodeHtml}
    </details>`
  if (usesDbscanAnimation) {
    renderDbscanAnimation(document.getElementById('dbscanAnimBox'), scenarioData, metric)
  }
}

function renderTask(task) {
  DOM.theoryWrap.innerHTML = task.theoryHtml
  DOM.scenarioBadge.textContent = task.scenarioTitle
  DOM.metricBadge.textContent = task.metricTitle
  DOM.questionBadge.textContent = task.questionTitle
  DOM.seedBadge.textContent = `seed: ${task.seed}`
  DOM.formulaLine.textContent = task.formulaLine
  DOM.taskText.innerHTML = task.taskHtml
  renderPreview(task.scenarioData)
  DOM.filesWrap.innerHTML = buildFilesTable(task.scenarioData)
  DOM.metaWrap.innerHTML = buildMetaTable(task.metaRows)
  buildSolutionHtml(task.scenarioData, task.questionPayload, task.metric)
}

function generateTask() {
  cleanupBlobUrls()
  DOM.generateBtn.disabled = true
  DOM.generateBtn.textContent = 'Генерация...'

  try {
    const seed = Date.now() % 1000000007
    const rng = new RNG(seed)
    const metric = pickMetric(DOM.metricSelect.value, rng)
    const { scenarioKey, questionKey, note } = resolveScenarioAndQuestion(rng)
    const scenarioData = buildScenarioData(scenarioKey, rng, metric)
    const questionPayload = buildQuestionPayload(scenarioData, questionKey, metric)
    const theoryHtml = buildScenarioTheory(scenarioData, metric, questionPayload)
    const taskHtml = buildTaskText(scenarioData, questionPayload, metric)
    const formulaLine = scenarioData.key === 'signal_4d' ? metric.formulaN : metric.formula2d
    const metaRows = buildMetaRows(scenarioData, metric, questionPayload, seed, note)

    renderTask({
      seed,
      scenarioData,
      metric,
      theoryHtml,
      taskHtml,
      formulaLine: `Формула расстояния: ${formulaLine}`,
      questionPayload,
      metaRows,
      scenarioTitle: scenarioData.title,
      metricTitle: metric.title,
      questionTitle: questionPayload.title,
    })
  } catch (error) {
    console.error(error)
    DOM.solutionWrap.innerHTML = `<div class="answer">Ошибка генерации: ${escapeHtml(error.message)}</div>`
  } finally {
    DOM.generateBtn.disabled = false
    DOM.generateBtn.textContent = 'Сгенерировать вариант 27'
  }
}

DOM.generateBtn.addEventListener('click', generateTask)
window.addEventListener('beforeunload', cleanupBlobUrls)

generateTask()
