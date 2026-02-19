# Генератор задания 27

## Локальный запуск

```bash
cd /Users/anso/Documents/ИИ/ege-task-generator/task27
python3 -m pip install -r requirements.txt
python3 app.py
```

Откройте:

`http://127.0.0.1:5057`

## Что генерируется

- Полная формулировка задания 27 в стиле демо-текста.
- Два варианта сложности: `A` и `B`.
- Для каждого варианта по `10000` строк в `txt`, `csv`, `xlsx`.
- Иллюстрация (график), построенная по данным сгенерированных файлов.
- Ключ в спойлере: пошаговое объяснение + ответ + код решения на Python.

## Метрики расстояния

- `euclidean`
- `manhattan`
- `chebyshev`
- `random` (по умолчанию)

## Типы вопросов

- `demo_2026`
- `center_extremes`
- `mean_delta`
- `random` (по умолчанию)

## Публикация на Render (Blueprint)

Подготовленные файлы:

- `/Users/anso/Documents/ИИ/ege-task-generator/render.yaml`
- `/Users/anso/Documents/ИИ/ege-task-generator/task27/requirements.txt`
- `/Users/anso/Documents/ИИ/ege-task-generator/task27/.python-version`

Шаги деплоя:

1. Запушьте проект в GitHub/GitLab/Bitbucket.
2. Убедитесь, что в репозитории есть `render.yaml` в корне.
3. В Render откройте `New` -> `Blueprint`.
4. Выберите репозиторий и подтвердите создание сервиса.
5. Дождитесь сборки и запуска, затем откройте URL сервиса.

Технические параметры уже зашиты в `render.yaml`:

- `buildCommand: pip install --upgrade pip && pip install -r task27/requirements.txt`
- `startCommand: gunicorn --chdir task27 app:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120`
- Python: `3.11.9`

Примечание: папка `generated` в Render хранится на эфемерном диске (данные файлов задач не постоянны между перезапусками/деплоями).

## Публикация на Render (без Blueprint, вручную)

Если хотите создать сервис вручную:

1. `New` -> `Web Service`.
2. Runtime: `Python`.
3. Build Command: `pip install --upgrade pip && pip install -r task27/requirements.txt`.
4. Start Command: `gunicorn --chdir task27 app:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120`.
5. Root Directory можно оставить пустым.
6. Добавьте переменную окружения `PYTHON_VERSION=3.11.9`.

## Если появилась ошибка `ModuleNotFoundError: No module named 'app'`

Причина: старт выполняется из корня репозитория, а файл приложения находится в `task27/app.py`.

Исправление в Render Service Settings:

1. Build Command: `pip install --upgrade pip && pip install -r task27/requirements.txt`
2. Start Command: `gunicorn --chdir task27 app:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120`
3. Нажмите `Save Changes` и `Manual Deploy` -> `Deploy latest commit`.
