# EGE Task Generator

GitHub Pages для генераторов ЕГЭ.

## Ссылки

- Задание 1: https://memeko.github.io/ege-task-generator/
- Новое задание 12: https://memeko.github.io/ege-task-generator/task12/
- Задание 27: https://memeko.github.io/ege-task-generator/task27/
- Задания 19–21: https://memeko.github.io/ege-task-generator/task19-21/

## Структура

- `/` — генератор задания 1
- `/task12/` — генератор нового задания 12 по новым исполнителям
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
