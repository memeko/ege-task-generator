from __future__ import annotations

import csv
import math
import os
import random
import shutil
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import matplotlib
from flask import Flask, abort, jsonify, render_template, request, send_from_directory
from openpyxl import Workbook

matplotlib.use("Agg")
from matplotlib import pyplot as plt


BASE_DIR = Path(__file__).resolve().parent
GENERATED_DIR = BASE_DIR / "generated"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)


app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "templates"),
    static_folder=str(BASE_DIR / "static"),
)


Point = tuple[float, float]
Bounds = tuple[float, float, float, float]  # min_x, max_x, min_y, max_y


@dataclass
class Cluster:
    center: Point
    points: list[Point]


@dataclass
class DistanceMetric:
    key: str
    title: str
    formula: str
    distance_fn: Callable[[Point, Point], float]


@dataclass
class QuestionType:
    key: str
    title: str
    description_a: str
    description_b: str
    compute: Callable[[dict, DistanceMetric], dict]


def format_decimal_for_file(value: float) -> str:
    return f"{value:.7f}".replace(".", ",")


def format_decimal_for_text(value: float) -> str:
    return f"{value:.6f}".replace(".", ",")


def format_decimal_for_code(value: float) -> str:
    return f"{value:.6f}"


def int_scaled(value: float) -> int:
    return int(abs(value) * 10_000)


def format_bounds(bounds: Bounds) -> str:
    min_x, max_x, min_y, max_y = bounds
    return (
        f"{format_decimal_for_text(min_x)} <= x <= {format_decimal_for_text(max_x)}, "
        f"{format_decimal_for_text(min_y)} <= y <= {format_decimal_for_text(max_y)}"
    )


def cluster_bounds(points: list[Point]) -> Bounds:
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return (min(xs), max(xs), min(ys), max(ys))


def dist_euclidean(a: Point, b: Point) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def dist_manhattan(a: Point, b: Point) -> float:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def dist_chebyshev(a: Point, b: Point) -> float:
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]))


DISTANCE_METRICS: dict[str, DistanceMetric] = {
    "euclidean": DistanceMetric(
        key="euclidean",
        title="Евклидова метрика",
        formula="d(A,B)=sqrt((x₁-x₂)² + (y₁-y₂)²)",
        distance_fn=dist_euclidean,
    ),
    "manhattan": DistanceMetric(
        key="manhattan",
        title="Манхеттенская метрика",
        formula="d(A,B)=|x₁-x₂| + |y₁-y₂|",
        distance_fn=dist_manhattan,
    ),
    "chebyshev": DistanceMetric(
        key="chebyshev",
        title="Метрика Чебышева",
        formula="d(A,B)=max(|x₁-x₂|, |y₁-y₂|)",
        distance_fn=dist_chebyshev,
    ),
}


QUESTION_WRAPPERS = [
    "Определите требуемые величины и запишите ответ в указанном формате.",
    "Найдите значения по условиям и укажите ответ в две строки.",
    "Рассчитайте искомые характеристики кластеров для вариантов A и B.",
]


def choose_odd_pair(total: int, rng: random.Random) -> tuple[int, int]:
    first = rng.randrange(4201, 5801, 2)
    second = total - first
    if second % 2 == 0:
        first += 2
        second -= 2
    return first, second


def choose_odd_triplet(total: int, rng: random.Random) -> tuple[int, int, int]:
    for _ in range(20_000):
        first = rng.randrange(2501, 4501, 2)
        second = rng.randrange(2001, 3801, 2)
        third = total - first - second
        if third < 1501 or third % 2 == 0:
            continue
        if len({first, second, third}) != 3:
            continue
        return first, second, third
    raise RuntimeError("Cannot generate odd distinct cluster sizes")


def generate_irregular_symmetric_cluster(
    center: Point, count: int, h: float, w: float, rng: random.Random
) -> list[Point]:
    if count < 3 or count % 2 == 0:
        raise ValueError("Cluster size must be odd and >= 3")

    rotation = math.radians(rng.uniform(-165, 165))
    cos_r = math.cos(rotation)
    sin_r = math.sin(rotation)
    lobe_a = rng.uniform(0.12, 0.32)
    lobe_b = rng.uniform(0.08, 0.24)
    roughness = rng.uniform(0.02, 0.085)
    skew = rng.uniform(-0.2, 0.2)
    arm_count = rng.randint(2, 4)
    arm_centers = [rng.uniform(0, 2 * math.pi) for _ in range(arm_count)]
    arm_spread = rng.uniform(0.45, 1.1)

    points: list[Point] = [center]
    pair_count = (count - 1) // 2
    for _ in range(pair_count):
        if rng.random() < 0.72:
            pivot = rng.choice(arm_centers)
            angle = pivot + rng.gauss(0, arm_spread)
        else:
            angle = rng.uniform(0, 2 * math.pi)

        base_radius = abs(rng.gauss(0.53, 0.24))
        wave = (
            1
            + lobe_a * math.sin(3 * angle + rng.uniform(-0.25, 0.25))
            + lobe_b * math.sin(5 * angle + rng.uniform(-0.25, 0.25))
        )
        radius = base_radius * wave + rng.gauss(0, roughness)
        radius = min(1.22, max(0.03, radius))

        local_x = h * 0.42 * radius * math.cos(angle)
        local_y = w * 0.42 * radius * math.sin(angle)

        local_x = local_x + skew * local_y
        local_y = local_y - 0.5 * skew * local_x
        local_x += rng.gauss(0, h * 0.018)
        local_y += rng.gauss(0, w * 0.018)

        dx = local_x * cos_r - local_y * sin_r
        dy = local_x * sin_r + local_y * cos_r
        points.append((center[0] + dx, center[1] + dy))
        points.append((center[0] - dx, center[1] - dy))
    return points


def pick_variant_a_centers(h: float, w: float, rng: random.Random) -> tuple[Point, Point]:
    layouts = [
        {"x": (3.0, 7.5), "y": (5.0, 9.8), "dx": (9.5, 14.5), "dy": (7.0, 13.0)},
        {"x": (2.8, 7.8), "y": (11.0, 15.5), "dx": (10.5, 16.0), "dy": (-7.0, -1.2)},
        {"x": (6.0, 11.0), "y": (4.0, 8.4), "dx": (1.5, 6.0), "dy": (11.0, 17.0)},
        {"x": (4.0, 10.0), "y": (14.0, 19.0), "dx": (11.0, 15.0), "dy": (2.0, 8.0)},
    ]
    layout = rng.choice(layouts)
    c1 = (rng.uniform(*layout["x"]), rng.uniform(*layout["y"]))
    c2 = (
        c1[0] + rng.uniform(*layout["dx"]),
        c1[1] + rng.uniform(*layout["dy"]),
    )

    min_gap_x = h + 3.5
    min_gap_y = w + 3.5
    if abs(c1[0] - c2[0]) < min_gap_x:
        c2 = (c2[0] + math.copysign(min_gap_x, c2[0] - c1[0] or 1), c2[1])
    if abs(c1[1] - c2[1]) < min_gap_y:
        c2 = (c2[0], c2[1] + math.copysign(min_gap_y, c2[1] - c1[1] or 1))
    return c1, c2


def pick_variant_b_centers(h: float, w: float, rng: random.Random) -> list[Point]:
    layouts = [
        [
            (rng.uniform(-12.0, -6.0), rng.uniform(26.0, 35.0)),
            (rng.uniform(7.0, 15.5), rng.uniform(5.5, 12.5)),
            (rng.uniform(23.0, 32.0), rng.uniform(17.0, 26.0)),
        ],
        [
            (rng.uniform(-13.0, -7.0), rng.uniform(13.0, 20.5)),
            (rng.uniform(6.0, 14.5), rng.uniform(25.0, 33.0)),
            (rng.uniform(22.0, 31.0), rng.uniform(6.0, 13.5)),
        ],
        [
            (rng.uniform(-11.5, -5.5), rng.uniform(22.0, 29.5)),
            (rng.uniform(8.5, 16.0), rng.uniform(31.0, 39.0)),
            (rng.uniform(24.0, 32.5), rng.uniform(17.0, 24.0)),
        ],
        [
            (rng.uniform(-9.0, -2.0), rng.uniform(3.0, 9.0)),
            (rng.uniform(7.5, 16.0), rng.uniform(21.0, 29.0)),
            (rng.uniform(26.0, 34.0), rng.uniform(7.0, 15.0)),
        ],
    ]
    centers = rng.choice(layouts)

    min_gap = max(h, w) + 4.2
    for i in range(len(centers)):
        for j in range(i + 1, len(centers)):
            if dist_euclidean(centers[i], centers[j]) < min_gap:
                shift = min_gap - dist_euclidean(centers[i], centers[j]) + 1.0
                centers[j] = (centers[j][0] + shift, centers[j][1] + shift * 0.35)
    return centers


def generate_variant_a(rng: random.Random) -> dict:
    h = rng.uniform(5.4, 6.8)
    w = rng.uniform(4.4, 5.8)

    c1, c2 = pick_variant_a_centers(h, w, rng)

    n1, n2 = choose_odd_pair(10_000, rng)
    clusters = [
        Cluster(center=c1, points=generate_irregular_symmetric_cluster(c1, n1, h, w, rng)),
        Cluster(center=c2, points=generate_irregular_symmetric_cluster(c2, n2, h, w, rng)),
    ]

    points_with_labels: list[tuple[float, float, int]] = []
    for cluster_index, cluster in enumerate(clusters):
        for x, y in cluster.points:
            points_with_labels.append((x, y, cluster_index))
    rng.shuffle(points_with_labels)
    points_for_files = [(x, y) for x, y, _ in points_with_labels]

    return {
        "h": h,
        "w": w,
        "clusters": clusters,
        "bounds": [cluster_bounds(cluster.points) for cluster in clusters],
        "points_for_files": points_for_files,
    }


def generate_variant_b(rng: random.Random) -> dict:
    h = rng.uniform(5.6, 7.4)
    w = rng.uniform(4.8, 6.8)
    anomalies_count = rng.choice([9, 11, 13, 15])
    total_cluster_points = 10_000 - anomalies_count
    n1, n2, n3 = choose_odd_triplet(total_cluster_points, rng)

    centers = pick_variant_b_centers(h, w, rng)

    clusters = [
        Cluster(
            center=centers[0],
            points=generate_irregular_symmetric_cluster(centers[0], n1, h, w, rng),
        ),
        Cluster(
            center=centers[1],
            points=generate_irregular_symmetric_cluster(centers[1], n2, h, w, rng),
        ),
        Cluster(
            center=centers[2],
            points=generate_irregular_symmetric_cluster(centers[2], n3, h, w, rng),
        ),
    ]

    anomaly_boxes: list[Bounds] = [
        (-23.0, -15.0, -9.0, -1.0),
        (34.0, 44.0, -6.0, 2.0),
        (35.0, 45.0, 33.0, 43.0),
    ]
    anomalies: list[Point] = []
    while len(anomalies) < anomalies_count:
        box = anomaly_boxes[len(anomalies) % len(anomaly_boxes)]
        x = rng.uniform(box[0], box[1])
        y = rng.uniform(box[2], box[3])
        if min(dist_euclidean((x, y), cluster.center) for cluster in clusters) > 10:
            anomalies.append((x, y))

    points_with_labels: list[tuple[float, float, int]] = []
    for cluster_index, cluster in enumerate(clusters):
        for x, y in cluster.points:
            points_with_labels.append((x, y, cluster_index))
    for x, y in anomalies:
        points_with_labels.append((x, y, -1))
    rng.shuffle(points_with_labels)
    points_for_files = [(x, y) for x, y, _ in points_with_labels]

    return {
        "h": h,
        "w": w,
        "clusters": clusters,
        "bounds": [cluster_bounds(cluster.points) for cluster in clusters],
        "anomalies_count": anomalies_count,
        "anomaly_boxes": anomaly_boxes,
        "points_for_files": points_for_files,
    }


def write_txt(path: Path, points: list[Point]) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write("X Y\n")
        for x, y in points:
            handle.write(f"{format_decimal_for_file(x)} {format_decimal_for_file(y)}\n")


def write_csv(path: Path, points: list[Point]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter=";")
        writer.writerow(["X", "Y"])
        for x, y in points:
            writer.writerow([format_decimal_for_file(x), format_decimal_for_file(y)])


def write_xlsx(path: Path, points: list[Point]) -> None:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Data"
    worksheet.append(["X", "Y"])
    for x, y in points:
        worksheet.append([round(x, 7), round(y, 7)])
    workbook.save(path)


def read_points_from_csv(path: Path) -> list[Point]:
    points: list[Point] = []
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle, delimiter=";")
        for row in reader:
            x = float(row["X"].replace(",", "."))
            y = float(row["Y"].replace(",", "."))
            points.append((x, y))
    return points


def draw_preview_from_files(csv_a: Path, csv_b: Path, png_path: Path) -> None:
    points_a = read_points_from_csv(csv_a)
    points_b = read_points_from_csv(csv_b)

    fig, axes = plt.subplots(1, 2, figsize=(13.2, 5.4), dpi=120)
    axes[0].scatter(
        [point[0] for point in points_a],
        [point[1] for point in points_a],
        s=4.5,
        c="#2f6de0",
        alpha=0.34,
    )
    axes[0].set_title("Вариант A (10000 точек)")
    axes[0].grid(alpha=0.25)
    axes[0].set_xlabel("X")
    axes[0].set_ylabel("Y")

    axes[1].scatter(
        [point[0] for point in points_b],
        [point[1] for point in points_b],
        s=4.5,
        c="#1f8b4c",
        alpha=0.34,
    )
    axes[1].set_title("Вариант B (10000 точек)")
    axes[1].grid(alpha=0.25)
    axes[1].set_xlabel("X")
    axes[1].set_ylabel("Y")

    fig.suptitle("Иллюстративная визуализация данных из сгенерированных файлов", fontsize=13)
    fig.tight_layout()
    fig.savefig(png_path)
    plt.close(fig)


def pairwise_center_distances(
    centers: list[Point], distance_fn: Callable[[Point, Point], float]
) -> list[float]:
    values: list[float] = []
    for i in range(len(centers)):
        for j in range(i + 1, len(centers)):
            values.append(distance_fn(centers[i], centers[j]))
    return values


def build_stats(variant_a: dict, variant_b: dict, metric: DistanceMetric) -> dict:
    centers_a = [cluster.center for cluster in variant_a["clusters"]]
    centers_b = [cluster.center for cluster in variant_b["clusters"]]
    sizes_b = [len(cluster.points) for cluster in variant_b["clusters"]]
    radii_b = [
        max(metric.distance_fn(cluster.center, point) for point in cluster.points)
        for cluster in variant_b["clusters"]
    ]
    pair_distances_b = pairwise_center_distances(centers_b, metric.distance_fn)
    min_index = min(range(len(sizes_b)), key=lambda idx: sizes_b[idx])
    max_index = max(range(len(sizes_b)), key=lambda idx: sizes_b[idx])

    return {
        "centers_a": centers_a,
        "centers_b": centers_b,
        "sizes_b": sizes_b,
        "radii_b": radii_b,
        "pair_distances_b": pair_distances_b,
        "min_size_index": min_index,
        "max_size_index": max_index,
    }


def compute_question_demo(stats: dict, metric: DistanceMetric) -> dict:
    centers_a = stats["centers_a"]
    centers_b = stats["centers_b"]
    sizes_b = stats["sizes_b"]
    radii_b = stats["radii_b"]
    min_i = stats["min_size_index"]
    max_i = stats["max_size_index"]

    px = min(center[0] for center in centers_a)
    py = min(center[1] for center in centers_a)
    q1 = metric.distance_fn(centers_b[min_i], centers_b[max_i])
    q2 = max(radii_b)

    return {
        "values": (px, py, q1, q2),
        "calc_lines": [
            f"Pₓ = min(x центров A) = {format_decimal_for_text(px)}",
            f"Pᵧ = min(y центров A) = {format_decimal_for_text(py)}",
            f"Q₁ = расстояние по выбранной метрике между центрами кластеров B с минимальным ({sizes_b[min_i]}) и максимальным ({sizes_b[max_i]}) числом точек = {format_decimal_for_text(q1)}",
            f"Q₂ = максимальное расстояние от центра кластера B до точки этого кластера (по выбранной метрике) = {format_decimal_for_text(q2)}",
        ],
    }


def compute_question_center_extremes(stats: dict, metric: DistanceMetric) -> dict:
    centers_a = stats["centers_a"]
    pair_distances_b = stats["pair_distances_b"]

    px = max(center[0] for center in centers_a)
    py = max(center[1] for center in centers_a)
    q1 = min(pair_distances_b)
    q2 = max(pair_distances_b)

    return {
        "values": (px, py, q1, q2),
        "calc_lines": [
            f"Pₓ = max(x центров A) = {format_decimal_for_text(px)}",
            f"Pᵧ = max(y центров A) = {format_decimal_for_text(py)}",
            f"Q₁ = минимальное расстояние между центрами любых двух кластеров B по выбранной метрике = {format_decimal_for_text(q1)}",
            f"Q₂ = максимальное расстояние между центрами любых двух кластеров B по выбранной метрике = {format_decimal_for_text(q2)}",
        ],
    }


def compute_question_mean_and_delta(stats: dict, metric: DistanceMetric) -> dict:
    del metric
    centers_a = stats["centers_a"]
    centers_b = stats["centers_b"]
    sizes_b = stats["sizes_b"]
    min_i = stats["min_size_index"]
    max_i = stats["max_size_index"]

    px = sum(center[0] for center in centers_a) / len(centers_a)
    py = sum(center[1] for center in centers_a) / len(centers_a)
    q1 = abs(centers_b[min_i][0] - centers_b[max_i][0])
    q2 = abs(centers_b[min_i][1] - centers_b[max_i][1])

    return {
        "values": (px, py, q1, q2),
        "calc_lines": [
            f"Pₓ = среднее арифметическое абсцисс центров A = {format_decimal_for_text(px)}",
            f"Pᵧ = среднее арифметическое ординат центров A = {format_decimal_for_text(py)}",
            f"Q₁ = |xₘᵢₙ - xₘₐₓ| для центров кластеров B с размерами {sizes_b[min_i]} и {sizes_b[max_i]} = {format_decimal_for_text(q1)}",
            f"Q₂ = |yₘᵢₙ - yₘₐₓ| для тех же центров кластеров B = {format_decimal_for_text(q2)}",
        ],
    }


QUESTION_TYPES: dict[str, QuestionType] = {
    "demo_2026": QuestionType(
        key="demo_2026",
        title="Тип вопроса 1 (минимумы + радиус)",
        description_a="Для файла A найдите Pₓ и Pᵧ: минимальные абсциссу и ординату среди центров кластеров.",
        description_b="Для файла B найдите Q₁: расстояние между центрами кластеров с минимальным и максимальным числом точек; и Q₂: максимальное расстояние от центра кластера до точки этого кластера.",
        compute=compute_question_demo,
    ),
    "center_extremes": QuestionType(
        key="center_extremes",
        title="Тип вопроса 2 (экстремумы расстояний между центрами)",
        description_a="Для файла A найдите Pₓ и Pᵧ: максимальные абсциссу и ординату среди центров кластеров.",
        description_b="Для файла B найдите Q₁ и Q₂: соответственно минимальное и максимальное расстояние между центрами любых двух кластеров.",
        compute=compute_question_center_extremes,
    ),
    "mean_delta": QuestionType(
        key="mean_delta",
        title="Тип вопроса 3 (средние и разности координат)",
        description_a="Для файла A найдите Pₓ и Pᵧ: средние арифметические абсцисс и ординат центров кластеров.",
        description_b="Для файла B найдите Q₁ и Q₂: абсолютные разности абсцисс и ординат центров кластеров с минимальным и максимальным числом точек.",
        compute=compute_question_mean_and_delta,
    ),
}


def pick_distance_metric(metric_mode: str, rng: random.Random) -> DistanceMetric:
    if metric_mode == "random":
        return rng.choice(list(DISTANCE_METRICS.values()))
    return DISTANCE_METRICS.get(metric_mode, DISTANCE_METRICS["euclidean"])


def pick_question_type(question_mode: str, rng: random.Random) -> QuestionType:
    if question_mode == "random":
        return rng.choice(list(QUESTION_TYPES.values()))
    return QUESTION_TYPES.get(question_mode, QUESTION_TYPES["demo_2026"])


def build_condition_lines(
    question_type: QuestionType,
    distance_metric: DistanceMetric,
    variant_a: dict,
    variant_b: dict,
    rng: random.Random,
) -> list[str]:
    h_a = format_decimal_for_text(variant_a["h"])
    w_a = format_decimal_for_text(variant_a["w"])
    h_b = format_decimal_for_text(variant_b["h"])
    w_b = format_decimal_for_text(variant_b["w"])
    anomalies = variant_b["anomalies_count"]

    return [
        "Задание выполняется с использованием прилагаемых файлов.",
        (
            "Фрагмент звёздного неба спроецирован на плоскость с декартовой системой координат. "
            "Учёный решил провести кластеризацию полученных точек, являющихся изображениями звёзд, "
            "то есть разбить их множество на N непересекающихся непустых подмножеств (кластеров), "
            "таких, что точки каждого подмножества лежат внутри прямоугольника со сторонами длиной H и W, "
            "причём эти прямоугольники между собой не пересекаются."
        ),
        (
            "Стороны прямоугольников не обязательно параллельны координатным осям. "
            "Гарантируется, что такое разбиение существует и единственно для заданных размеров прямоугольников."
        ),
        (
            "Будем называть центром кластера точку этого кластера, сумма расстояний от которой до всех остальных "
            "точек кластера минимальна. Для каждого кластера гарантируется единственность его центра."
        ),
        (
            "Расстояние между двумя точками на плоскости A(x₁, y₁) и B(x₂, y₂) "
            f"в текущем варианте вычисляется по формуле: {distance_metric.formula} "
            f"({distance_metric.title})."
        ),
        (
            "В файле A хранятся координаты точек двух кластеров. "
            f"Файл содержит 10000 строк с парами координат X и Y; для каждого кластера H={h_a}, W={w_a}."
        ),
        (
            "В файле Б хранятся координаты точек трёх кластеров. "
            f"Файл содержит 10000 строк с парами координат X и Y; для каждого кластера H={h_b}, W={w_b}. "
            f"В файле Б присутствуют {anomalies} «лишних» точек (аномалии), возникших из-за помех при передаче данных; "
            "эти точки не относятся ни к одному кластеру и при вычислениях не учитываются."
        ),
        question_type.description_a,
        question_type.description_b,
        (
            "В ответе запишите четыре числа: в первой строке — целые части |Pₓ×10000| и |Pᵧ×10000|, "
            "во второй строке — целые части |Q₁×10000| и |Q₂×10000|."
        ),
        rng.choice(QUESTION_WRAPPERS),
        (
            "Возможные данные одного из файлов проиллюстрированы графиком ниже. "
            "График строится автоматически по данным сгенерированных файлов и дан для визуального анализа."
        ),
    ]


def bounds_to_code_tuple(bounds: Bounds) -> str:
    min_x, max_x, min_y, max_y = bounds
    return (
        f"({format_decimal_for_code(min_x)}, {format_decimal_for_code(max_x)}, "
        f"{format_decimal_for_code(min_y)}, {format_decimal_for_code(max_y)})"
    )


def build_python_solution(
    variant_a: dict,
    variant_b: dict,
    distance_metric: DistanceMetric,
    question_type: QuestionType,
) -> str:
    a_boxes_code = ",\n    ".join(bounds_to_code_tuple(bounds) for bounds in variant_a["bounds"])
    b_boxes_code = ",\n    ".join(bounds_to_code_tuple(bounds) for bounds in variant_b["bounds"])
    anomaly_boxes_code = ",\n    ".join(
        bounds_to_code_tuple(bounds) for bounds in variant_b["anomaly_boxes"]
    )

    if distance_metric.key == "euclidean":
        distance_line = "    return math.hypot(a[0] - b[0], a[1] - b[1])  # Евклидово расстояние"
    elif distance_metric.key == "manhattan":
        distance_line = (
            "    return abs(a[0] - b[0]) + abs(a[1] - b[1])  # Манхеттенское расстояние"
        )
    else:
        distance_line = (
            "    return max(abs(a[0] - b[0]), abs(a[1] - b[1]))  # Расстояние Чебышева"
        )

    if question_type.key == "demo_2026":
        metric_block = [
            "px = min(center[0] for center in centers_a)  # Px: минимум по абсциссам центров A",
            "py = min(center[1] for center in centers_a)  # Py: минимум по ординатам центров A",
            "idx_min_b = min(range(len(clusters_b)), key=lambda i: len(clusters_b[i]))  # индекс наименьшего кластера B",
            "idx_max_b = max(range(len(clusters_b)), key=lambda i: len(clusters_b[i]))  # индекс наибольшего кластера B",
            "q1 = dist(centers_b[idx_min_b], centers_b[idx_max_b])  # Q1: расстояние между центрами min/max кластеров B",
            "q2 = max(  # Q2: максимальное расстояние от центра кластера B до точки этого же кластера",
            "    max(dist(centers_b[i], point) for point in clusters_b[i])",
            "    for i in range(len(clusters_b))",
            ")",
        ]
    elif question_type.key == "center_extremes":
        metric_block = [
            "px = max(center[0] for center in centers_a)  # Px: максимум по абсциссам центров A",
            "py = max(center[1] for center in centers_a)  # Py: максимум по ординатам центров A",
            "pair_distances = [  # все расстояния между центрами различных кластеров B",
            "    dist(centers_b[i], centers_b[j])",
            "    for i in range(len(centers_b))",
            "    for j in range(i + 1, len(centers_b))",
            "]",
            "q1 = min(pair_distances)  # Q1: минимальное межкластерное расстояние центров B",
            "q2 = max(pair_distances)  # Q2: максимальное межкластерное расстояние центров B",
        ]
    else:
        metric_block = [
            "px = sum(center[0] for center in centers_a) / len(centers_a)  # Px: средняя абсцисса центров A",
            "py = sum(center[1] for center in centers_a) / len(centers_a)  # Py: средняя ордината центров A",
            "idx_min_b = min(range(len(clusters_b)), key=lambda i: len(clusters_b[i]))  # индекс минимального кластера B",
            "idx_max_b = max(range(len(clusters_b)), key=lambda i: len(clusters_b[i]))  # индекс максимального кластера B",
            "q1 = abs(centers_b[idx_min_b][0] - centers_b[idx_max_b][0])  # Q1: |x_min_size - x_max_size|",
            "q2 = abs(centers_b[idx_min_b][1] - centers_b[idx_max_b][1])  # Q2: |y_min_size - y_max_size|",
        ]

    lines = [
        "import math  # импортируем math для вычисления расстояний",
        "",
        "def dist(a, b):  # функция расстояния для двух точек a=(x1,y1), b=(x2,y2)",
        distance_line,
        "",
        "def read_points(path):  # читаем точки из TXT с заголовком и десятичной запятой",
        "    points = []  # сюда складываем пары координат",
        "    with open(path, encoding='utf-8') as file:  # открываем файл в UTF-8",
        "        next(file)  # пропускаем строку заголовка: X Y",
        "        for raw in file:  # читаем файл построчно",
        "            raw = raw.strip()  # удаляем пробелы и перевод строки",
        "            if not raw:  # защищаемся от пустых строк",
        "                continue  # пустую строку просто пропускаем",
        "            x_s, y_s = raw.split()  # разделяем строку на x и y",
        "            x = float(x_s.replace(',', '.'))  # заменяем запятую на точку и парсим число",
        "            y = float(y_s.replace(',', '.'))  # аналогично для y",
        "            points.append((x, y))  # добавляем точку в массив",
        "    return points  # возвращаем список точек",
        "",
        "def in_box(point, box):  # проверяем попадание точки в прямоугольную область",
        "    x, y = point  # распаковываем координаты точки",
        "    min_x, max_x, min_y, max_y = box  # распаковываем границы области",
        "    return min_x <= x <= max_x and min_y <= y <= max_y  # условие принадлежности области",
        "",
        "def split_by_boxes(points, boxes):  # раскладываем точки по кластерам через границы областей",
        "    clusters = [[] for _ in boxes]  # создаем пустой список для каждого кластера",
        "    for point in points:  # перебираем все точки",
        "        for idx, box in enumerate(boxes):  # проверяем по очереди каждую область",
        "            if in_box(point, box):  # если точка попала в область кластера",
        "                clusters[idx].append(point)  # добавляем точку в соответствующий кластер",
        "                break  # прекращаем проверку текущей точки",
        "    return [cluster for cluster in clusters if cluster]  # удаляем пустые кластеры",
        "",
        "def center(cluster):  # находим центр кластера: точку с минимальной суммой расстояний",
        "    best_point = None  # текущий лучший кандидат на центр",
        "    best_sum = None  # текущая минимальная сумма расстояний",
        "    for point in cluster:  # перебираем все точки-кандидаты",
        "        current_sum = sum(dist(point, other) for other in cluster)  # суммарное расстояние до всех точек кластера",
        "        if best_sum is None or current_sum < best_sum:  # если нашли более удачный центр",
        "            best_sum = current_sum  # обновляем минимум суммы расстояний",
        "            best_point = point  # запоминаем текущую точку как центр",
        "    return best_point  # возвращаем найденный центр",
        "",
        "a_boxes = [  # области кластеров для файла A",
        f"    {a_boxes_code}",
        "]",
        "b_boxes = [  # области кластеров для файла B",
        f"    {b_boxes_code}",
        "]",
        "anomaly_boxes = [  # области, в которых находятся аномалии файла B",
        f"    {anomaly_boxes_code}",
        "]",
        "",
        "points_a = read_points('27_A.txt')  # читаем точки варианта A",
        "points_b = read_points('27_B.txt')  # читаем точки варианта B",
        "",
        "clusters_a = split_by_boxes(points_a, a_boxes)  # делим A на кластеры по областям",
        "filtered_b = [  # фильтруем B: удаляем аномалии",
        "    point for point in points_b",
        "    if not any(in_box(point, box) for box in anomaly_boxes)",
        "]",
        "clusters_b = split_by_boxes(filtered_b, b_boxes)  # делим очищенный B на кластеры",
        "",
        "centers_a = [center(cluster) for cluster in clusters_a]  # центры кластеров A",
        "centers_b = [center(cluster) for cluster in clusters_b]  # центры кластеров B",
        "",
    ]
    lines.extend(metric_block)
    lines.extend(
        [
            "",
            "print(int(abs(px) * 10000), int(abs(py) * 10000))  # первая строка ответа",
            "print(int(abs(q1) * 10000), int(abs(q2) * 10000))  # вторая строка ответа",
        ]
    )
    return "\n".join(lines)


def make_explanation(
    variant_a: dict,
    variant_b: dict,
    distance_metric: DistanceMetric,
    question_type: QuestionType,
    metrics_result: dict,
) -> dict:
    centers_a = [cluster.center for cluster in variant_a["clusters"]]
    centers_b = [cluster.center for cluster in variant_b["clusters"]]
    sizes_b = [len(cluster.points) for cluster in variant_b["clusters"]]
    values = metrics_result["values"]

    bounds_a_text = "; ".join(
        f"K{i + 1}: {format_bounds(bounds)}"
        for i, bounds in enumerate(variant_a["bounds"])
    )
    bounds_b_text = "; ".join(
        f"K{i + 1}: {format_bounds(bounds)}"
        for i, bounds in enumerate(variant_b["bounds"])
    )
    anomaly_text = "; ".join(
        f"A{i + 1}: {format_bounds(bounds)}"
        for i, bounds in enumerate(variant_b["anomaly_boxes"])
    )

    center_a_line = "; ".join(
        f"C{i + 1}=({format_decimal_for_text(center[0])}; {format_decimal_for_text(center[1])})"
        for i, center in enumerate(centers_a)
    )
    center_b_line = "; ".join(
        f"C{i + 1}=({format_decimal_for_text(center[0])}; {format_decimal_for_text(center[1])}), |кластер|={sizes_b[i]}"
        for i, center in enumerate(centers_b)
    )

    answer_1 = f"{int_scaled(values[0])} {int_scaled(values[1])}"
    answer_2 = f"{int_scaled(values[2])} {int_scaled(values[3])}"

    steps = [
        "Откройте файл A и файл B, постройте точечную диаграмму и визуально оцените разбиение.",
        f"Ограничения областей для кластеров файла A: {bounds_a_text}. Эти неравенства используем для разделения точек на K1..K2.",
        f"Ограничения областей для кластеров файла B: {bounds_b_text}.",
        f"Отсев аномалий для B: удаляем точки, попавшие в области {anomaly_text}. Эквивалентно: оставляем только точки, которые попадают хотя бы в одну из областей K1..K3.",
        f"Центр каждого кластера ищем по выбранной метрике ({distance_metric.title}) с формулой {distance_metric.formula}: выбираем точку кластера с минимальной суммой расстояний до остальных точек кластера.",
        f"Полученные центры для A: {center_a_line}.",
        f"Полученные центры для B: {center_b_line}.",
        f"Подставляем найденные центры в формулы текущего типа вопроса: {question_type.title}.",
    ]
    steps.extend(metrics_result["calc_lines"])
    steps.append(
        "Преобразуйте найденные величины по формату ответа: берём целую часть абсолютного значения произведения каждой величины на 10000."
    )

    python_solution = build_python_solution(
        variant_a=variant_a,
        variant_b=variant_b,
        distance_metric=distance_metric,
        question_type=question_type,
    )

    return {
        "steps": steps,
        "python_solution": python_solution,
        "answer_line_1": answer_1,
        "answer_line_2": answer_2,
    }


def prune_old_tasks(limit: int = 40) -> None:
    task_dirs = [path for path in GENERATED_DIR.iterdir() if path.is_dir()]
    task_dirs.sort(key=lambda path: path.stat().st_mtime, reverse=True)
    for stale in task_dirs[limit:]:
        shutil.rmtree(stale, ignore_errors=True)


def generate_task(distance_metric_mode: str, question_type_mode: str) -> dict:
    seed = random.SystemRandom().randrange(1, 10**9)
    rng = random.Random(seed)
    distance_metric = pick_distance_metric(distance_metric_mode, rng)
    question_type = pick_question_type(question_type_mode, rng)

    variant_a = generate_variant_a(rng)
    variant_b = generate_variant_b(rng)

    if len(variant_a["points_for_files"]) != 10_000:
        raise RuntimeError("Variant A size mismatch")
    if len(variant_b["points_for_files"]) != 10_000:
        raise RuntimeError("Variant B size mismatch")

    task_id = uuid.uuid4().hex[:12]
    task_dir = GENERATED_DIR / task_id
    task_dir.mkdir(parents=True, exist_ok=True)

    files = {
        "A": {
            "txt": task_dir / "27_A.txt",
            "csv": task_dir / "27_A.csv",
            "xlsx": task_dir / "27_A.xlsx",
        },
        "B": {
            "txt": task_dir / "27_B.txt",
            "csv": task_dir / "27_B.csv",
            "xlsx": task_dir / "27_B.xlsx",
        },
    }

    write_txt(files["A"]["txt"], variant_a["points_for_files"])
    write_csv(files["A"]["csv"], variant_a["points_for_files"])
    write_xlsx(files["A"]["xlsx"], variant_a["points_for_files"])

    write_txt(files["B"]["txt"], variant_b["points_for_files"])
    write_csv(files["B"]["csv"], variant_b["points_for_files"])
    write_xlsx(files["B"]["xlsx"], variant_b["points_for_files"])

    preview_path = task_dir / "preview.png"
    draw_preview_from_files(files["A"]["csv"], files["B"]["csv"], preview_path)

    stats = build_stats(variant_a, variant_b, distance_metric)
    metrics_result = question_type.compute(stats, distance_metric)
    spoiler = make_explanation(
        variant_a, variant_b, distance_metric, question_type, metrics_result
    )
    condition_lines = build_condition_lines(
        question_type, distance_metric, variant_a, variant_b, rng
    )

    prune_old_tasks()

    response_files = {}
    for variant in ("A", "B"):
        response_files[variant] = {}
        for extension, path in files[variant].items():
            response_files[variant][extension] = {
                "name": path.name,
                "url": f"/task27/download/{task_id}/{path.name}",
            }

    return {
        "task_id": task_id,
        "seed": seed,
        "distance_metric_title": distance_metric.title,
        "distance_metric_formula": distance_metric.formula,
        "question_title": question_type.title,
        "condition_lines": condition_lines,
        "rows_per_file": 10_000,
        "files": response_files,
        "image_url": f"/task27/download/{task_id}/{preview_path.name}",
        "spoiler": spoiler,
    }


@app.get("/")
def root() -> str:
    return render_template("task27.html")


@app.post("/api/task27/generate")
def api_generate():
    payload = request.get_json(silent=True) or {}
    distance_metric_mode = str(
        payload.get("distance_metric", payload.get("metric_mode", "random"))
    )
    question_type_mode = str(payload.get("question_type", "random"))
    task_payload = generate_task(distance_metric_mode, question_type_mode)
    return jsonify(task_payload)


@app.get("/task27/download/<task_id>/<path:filename>")
def download(task_id: str, filename: str):
    if not task_id.isalnum():
        abort(404)

    target_dir = (GENERATED_DIR / task_id).resolve()
    if not target_dir.exists():
        abort(404)
    if GENERATED_DIR.resolve() not in target_dir.parents:
        abort(404)

    file_path = target_dir / filename
    if not file_path.exists() or not file_path.is_file():
        abort(404)

    as_attachment = not filename.lower().endswith(".png")
    return send_from_directory(target_dir, filename, as_attachment=as_attachment)


if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5057")),
        debug=False,
    )
