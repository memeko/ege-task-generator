"use strict";

const elements = {
  distanceMetric: document.getElementById("distanceMetric"),
  questionType: document.getElementById("questionType"),
  generateBtn: document.getElementById("generateBtn"),
  metricBadge: document.getElementById("metricBadge"),
  questionBadge: document.getElementById("questionBadge"),
  formulaLine: document.getElementById("formulaLine"),
  taskText: document.getElementById("taskText"),
  previewImage: document.getElementById("previewImage"),
  filesWrap: document.getElementById("filesWrap"),
  solutionWrap: document.getElementById("solutionWrap"),
};

function renderText(lines) {
  elements.taskText.replaceChildren();
  for (const line of lines) {
    const p = document.createElement("p");
    p.textContent = line;
    elements.taskText.appendChild(p);
  }
}

function renderFiles(files) {
  const table = document.createElement("table");
  const header = document.createElement("tr");
  ["Вариант", "TXT", "CSV", "XLSX"].forEach((title) => {
    const th = document.createElement("th");
    th.textContent = title;
    header.appendChild(th);
  });
  table.appendChild(header);

  for (const variant of ["A", "B"]) {
    const tr = document.createElement("tr");
    const variantCell = document.createElement("th");
    variantCell.textContent = variant;
    tr.appendChild(variantCell);

    for (const ext of ["txt", "csv", "xlsx"]) {
      const td = document.createElement("td");
      const file = files[variant][ext];
      const link = document.createElement("a");
      link.href = file.url;
      link.textContent = file.name;
      link.target = "_blank";
      td.appendChild(link);
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }

  elements.filesWrap.replaceChildren(table);
}

function renderSolution(spoiler) {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Показать пошаговое решение и ответ (спойлер)";
  details.appendChild(summary);

  const list = document.createElement("ol");
  for (const step of spoiler.steps) {
    const item = document.createElement("li");
    item.textContent = step;
    list.appendChild(item);
  }
  details.appendChild(list);

  if (spoiler.python_solution) {
    const codeTitle = document.createElement("p");
    codeTitle.className = "code-title";
    codeTitle.textContent = "Вариант решения на Python (с комментариями по строкам):";
    details.appendChild(codeTitle);

    const pre = document.createElement("pre");
    pre.className = "code-block";
    const code = document.createElement("code");
    code.textContent = spoiler.python_solution;
    pre.appendChild(code);
    details.appendChild(pre);
  }

  const answer = document.createElement("div");
  answer.className = "answer";
  answer.textContent = `Ответ:\n${spoiler.answer_line_1}\n${spoiler.answer_line_2}`;
  details.appendChild(answer);

  elements.solutionWrap.replaceChildren(details);
}

function renderError(message) {
  const div = document.createElement("div");
  div.className = "error";
  div.textContent = message;
  elements.solutionWrap.replaceChildren(div);
}

async function generateTask27() {
  const distanceMetric = elements.distanceMetric.value;
  const questionType = elements.questionType.value;
  elements.generateBtn.disabled = true;
  elements.generateBtn.textContent = "Генерация...";

  try {
    const response = await fetch("/api/task27/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        distance_metric: distanceMetric,
        question_type: questionType,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    elements.metricBadge.textContent = payload.distance_metric_title;
    elements.questionBadge.textContent = payload.question_title;
    elements.formulaLine.textContent = `Формула расстояния: ${payload.distance_metric_formula}`;
    renderText(payload.condition_lines);
    renderFiles(payload.files);
    renderSolution(payload.spoiler);
    elements.previewImage.src = `${payload.image_url}?v=${Date.now()}`;
  } catch (error) {
    renderError(`Ошибка генерации: ${String(error)}`);
  } finally {
    elements.generateBtn.disabled = false;
    elements.generateBtn.textContent = "Сгенерировать вариант 27";
  }
}

elements.generateBtn.addEventListener("click", generateTask27);
generateTask27();
