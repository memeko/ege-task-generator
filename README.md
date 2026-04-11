# EGE Task Generator

GitHub Pages для генераторов ЕГЭ.

## Ссылки

- Задание 1: https://memeko.github.io/ege-task-generator/
- Новое задание 12: https://memeko.github.io/ege-task-generator/task12/
- Задание 25: https://memeko.github.io/ege-task-generator/task25/
- Задание 26: https://memeko.github.io/ege-task-generator/task26/
- Задание 27: https://memeko.github.io/ege-task-generator/task27/
- Задания 19–21: https://memeko.github.io/ege-task-generator/task19-21/

## Структура

- `/` — генератор задания 1
- `/task12/` — генератор нового задания 12 по новым исполнителям
- `/task25/` — генератор задания 25 (числа, делители, маски, степени)
- `/task26/` — генератор задания 26 (сортировка и оптимальный выбор)
- `/task27/` — генератор задания 27 (анализ данных, несколько сюжетов)
- `/task19-21/` — генератор связанного игрового задания 19–21

## Локальный запуск страницы 12

```bash
cd task12
python3 -m http.server 5082
```

Открыть: `http://127.0.0.1:5082`

## Локальный запуск страницы 19–21

```bash
cd task19-21
python3 -m http.server 5084
```

Открыть: `http://127.0.0.1:5084`

## Локальный запуск страницы 27

```bash
cd task27
python3 -m http.server 5091
```

Открыть: `http://127.0.0.1:5091`

## Локальный запуск страницы 25

```bash
cd task25
python3 -m http.server 5090
```

Открыть: `http://127.0.0.1:5090`

## Локальный запуск страницы 26

```bash
cd task26
python3 -m http.server 5092
```

Открыть: `http://127.0.0.1:5092`
