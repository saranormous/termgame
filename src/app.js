import {
  LESSON_NOTE,
  STORAGE_KEY,
  buildQuests,
  getActiveHintIds,
  getConcepts,
  getIntroLines,
  makeInitialState,
  projectDir,
  selectedToolConfig
} from "./lessons.js?v=8";
import { executeCommand, pathStatusMessage } from "./commands.js?v=8";

let state = loadState();
let editingPath = null;
let lastCommand = "";
let heroForceExpanded = false;

// Theme toggle
const THEME_KEY = "termgame-theme";
const themeToggleEl = document.getElementById("theme-toggle");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggleEl.textContent = theme === "light" ? "\uD83C\uDF19" : "\u2600\uFE0F";
  localStorage.setItem(THEME_KEY, theme);
}

const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
if (savedTheme === "light") applyTheme("light");

themeToggleEl.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(current === "light" ? "dark" : "light");
});

const terminalEl = document.getElementById("terminal");
const formEl = document.getElementById("command-form");
const inputEl = document.getElementById("command");
const runButtonEl = formEl.querySelector('button[type="submit"]');
const questListEl = document.getElementById("quest-list");
const activeTipListEl = document.getElementById("active-tip-list");
const hintListEl = document.getElementById("hint-list");
const lessonNoteEl = document.getElementById("lesson-note");
const questsTitleEl = document.getElementById("quests-title");
const heroEl = document.querySelector(".hero");
const editorEl = document.getElementById("editor");
const editorHeadEl = document.getElementById("editor-head");
const editorTextEl = document.getElementById("editor-text");
const saveEditorEl = document.getElementById("save-editor");
const closeEditorEl = document.getElementById("close-editor");
const pathButtons = Array.from(document.querySelectorAll(".path-button"));
const feedbackLinkEl = document.getElementById("feedback-link");
const shareTwitterEl = document.getElementById("share-twitter");

function loadState() {
  const base = makeInitialState();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;

    const parsed = JSON.parse(raw);
    return {
      ...base,
      ...parsed,
      app: { ...base.app, ...(parsed.app || {}) },
      script: { ...base.script, ...(parsed.script || {}) },
      fix: { ...base.fix, ...(parsed.fix || {}) },
      explore: { ...base.explore, ...(parsed.explore || {}) },
      installed: { ...base.installed, ...(parsed.installed || {}) },
      env: { ...(parsed.env || {}) },
      auth: { ...base.auth, ...(parsed.auth || {}) },
      git: { ...base.git, ...(parsed.git || {}) },
      started: { ...base.started, ...(parsed.started || {}) },
      files: { ...base.files, ...(parsed.files || {}) },
      questsDone: parsed.questsDone && typeof parsed.questsDone === "object" && !Array.isArray(parsed.questsDone)
        ? parsed.questsDone
        : {},
      terminalLines: Array.isArray(parsed.terminalLines) ? parsed.terminalLines : []
    };
  } catch (_) {
    return base;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getState() {
  return state;
}

function setState(nextState) {
  state = nextState;
}

function inProjectDir() {
  return state.cwd === projectDir();
}

function getActiveQuests() {
  return buildQuests(state);
}

function activeQuestId() {
  const nextQuest = getActiveQuests().find((quest) => !state.questsDone[quest.id]);
  return nextQuest ? nextQuest.id : "";
}

// -- Feedback link with pre-filled state context ----------------------------
// Replace FORM_URL with your Google Form URL. To pre-fill fields, append
// &entry.XXXX= params from the form's "Get pre-filled link" option.
const FEEDBACK_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdj_Bh24rJmqCWVQcPSMCALddLdc_Qq5MEwF3jUwjlbNDHIbg/viewform";

const SITE_URL = "https://termgame.ai/";

function updateFooterLinks() {
  if (feedbackLinkEl) {
    const quests = getActiveQuests();
    const doneCount = quests.filter((q) => state.questsDone[q.id]).length;
    const currentQuest = quests.find((q) => !state.questsDone[q.id]);
    const context = `[${state.selectedTool || "none"} · quest ${currentQuest ? currentQuest.id : "complete"} · ${doneCount}/${quests.length}]`;
    const params = new URLSearchParams({
      "usp": "pp_url",
      "entry.425290015": context
    });
    feedbackLinkEl.href = `${FEEDBACK_FORM_URL}?${params}`;
  }
  if (shareTwitterEl) {
    const text = "You don't need to know how to code to level up your use of AI. All you need is the terminal.";
    shareTwitterEl.href = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(SITE_URL)}`;
  }
}

function render() {
  renderTerminal();
  renderQuests();
  renderHints();
  renderLessonNote();
  renderPathButtons();
  renderCommandState();
  renderHeroCollapse();
  updateFooterLinks();
}

function renderTerminal() {
  terminalEl.innerHTML = "";
  state.terminalLines.forEach((line) => {
    const div = document.createElement("div");
    div.className = `line ${line.kind || "system"}`;
    if (line.kind === "input-text" && line.text.includes(" $ ")) {
      const idx = line.text.indexOf(" $ ");
      const pathSpan = document.createElement("span");
      pathSpan.className = "prompt-path";
      pathSpan.textContent = line.text.slice(0, idx);
      const rest = document.createTextNode(` $ ${line.text.slice(idx + 3)}`);
      div.appendChild(pathSpan);
      div.appendChild(rest);
    } else {
      div.textContent = line.text;
    }
    terminalEl.appendChild(div);
  });
  terminalEl.scrollTop = terminalEl.scrollHeight;
}

function renderQuests() {
  const quests = getActiveQuests();
  questListEl.innerHTML = "";

  if (!quests.length) {
    const article = document.createElement("article");
    article.className = "quest";
    article.innerHTML =
      '<h3 class="quest-title">Choose a track</h3>' +
      '<p class="quest-copy">Pick Codex or Claude Code above to get started.</p>';
    questListEl.appendChild(article);
    return;
  }

  const doneCount = quests.filter((q) => state.questsDone[q.id]).length;
  questsTitleEl.textContent = `Quests (${doneCount}/${quests.length})`;

  const PART_LABELS = { 1: "Part 1 — Build it", 2: "Part 2 — Ship it", 3: "Part 3 — Script it", 4: "Part 4 — Connect it", 5: "Part 5 — Fix it" };
  let lastPart = 0;

  const currentId = activeQuestId();
  const currentQuest = quests.find((q) => q.id === currentId);
  const currentPart = currentQuest ? currentQuest.part : 1;
  let lockedShown = 0;

  quests.forEach((quest, index) => {
    const done = Boolean(state.questsDone[quest.id]);
    const current = quest.id === currentId;

    // Only show done quests within the current part — done quests from other parts
    // are counted in the progress number but don't clutter the sidebar
    if (done && quest.part !== currentPart) return;

    // Only show current and the next 1 locked quest (beyond done)
    if (!done && !current) {
      lockedShown += 1;
      if (lockedShown > 1) return;
    }

    if (quest.part && quest.part !== lastPart) {
      lastPart = quest.part;
      const header = document.createElement("div");
      header.className = "quest-part-header";
      header.textContent = PART_LABELS[quest.part] || `Part ${quest.part}`;
      questListEl.appendChild(header);
    }

    const article = document.createElement("article");
    article.setAttribute("role", "listitem");
    article.dataset.questId = quest.id;
    article.className = `quest${done ? " done" : ""}${current ? " current" : " collapsed"}`;

    let stateLabel = "Locked";
    if (done) stateLabel = "Done";
    else if (current) stateLabel = "Current";

    let innerHtml =
      '<div class="quest-top">' +
      `<h3 class="quest-title">${index + 1}. ${quest.title}</h3>` +
      (done ? '<span class="quest-chevron">▶</span>' : '') +
      `<span class="quest-state">${stateLabel}</span>` +
      "</div>";

    if (current) {
      const commandsHtml = quest.commands
        .map((command) => `<code>${escapeHtml(command)}</code>`)
        .join("");
      innerHtml +=
        `<p class="quest-helper">${quest.helper}</p>` +
        `<div class="quest-command"><span class="quest-command-label">Type this — click to paste</span>${commandsHtml}</div>`;
    } else if (done) {
      innerHtml += `<p class="quest-helper quest-helper-done">${quest.helper}</p>`;
    } else {
      innerHtml += '<p class="quest-summary">Finish the current step to unlock this one.</p>';
    }

    article.innerHTML = innerHtml;

    if (current) {
      article.querySelectorAll(".quest-command code").forEach((codeEl) => {
        codeEl.addEventListener("click", () => {
          inputEl.value = codeEl.textContent;
          inputEl.focus();
        });
      });
    }

    if (done) {
      article.style.cursor = "pointer";
      article.addEventListener("click", () => {
        article.classList.toggle("expanded");
      });
    }

    questListEl.appendChild(article);
  });
}

function renderHints() {
  const concepts = getConcepts(state);
  const activeHints = getActiveHintIds(activeQuestId())
    .map((id) => concepts.find((concept) => concept.id === id))
    .filter(Boolean);

  activeTipListEl.innerHTML = activeHints.map((concept) => renderTipCard({
    title: concept.title,
    body: concept.body,
    ready: true
  })).join("") || renderTipCard({
    title: "Terminal",
    body: "Pick a track above. Definitions for each step will show up here as you go.",
    ready: true
  });

  hintListEl.innerHTML = concepts.map((concept) => renderLibraryItem(concept)).join("");
}

function renderLessonNote() {
  const complete = getActiveQuests().length > 0 && getActiveQuests().every((quest) => Boolean(state.questsDone[quest.id]));
  if (!complete) {
    lessonNoteEl.hidden = true;
    lessonNoteEl.innerHTML = "";
    return;
  }

  lessonNoteEl.hidden = false;
  lessonNoteEl.innerHTML = LESSON_NOTE;
}

function renderPathButtons() {
  pathButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === state.selectedTool);
  });
}

function renderCommandState() {
  const enabled = Boolean(state.selectedTool);
  inputEl.disabled = !enabled;
  runButtonEl.disabled = !enabled;
  inputEl.placeholder = enabled ? "Try: help" : "Choose Codex or Claude Code first";
}

function renderHeroCollapse() {
  heroEl.classList.toggle("collapsed", Boolean(state.selectedTool) && !heroForceExpanded);
}

function renderTipCard(item) {
  return `<p class="tip${item.ready ? " ready" : ""}"><span class="tip-title">${item.title}</span>${item.body}</p>`;
}

function renderLibraryItem(item) {
  return `<details class="library-item"><summary>${item.title}</summary><div class="library-item-body">${item.body}</div></details>`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function addLine(text, kind = "system") {
  state.terminalLines.push({ text, kind });
}

function addPrompt(command) {
  addLine(`${promptText()} ${command}`, "input-text");
}

function promptText() {
  return `${state.cwd} $`;
}

function addIntroLines() {
  getIntroLines(state).forEach((line) => addLine(line.text, line.kind));
}

function normalizePath(input) {
  if (!input || input === ".") return state.cwd;
  if (input === "~") return "/Users/player";

  let nextInput = input;
  if (nextInput.startsWith("~/")) nextInput = `/Users/player/${nextInput.slice(2)}`;
  if (!nextInput.startsWith("/")) nextInput = `${state.cwd}/${nextInput}`;

  const parts = nextInput.split("/");
  const stack = [];
  parts.forEach((part) => {
    if (!part || part === ".") return;
    if (part === "..") {
      stack.pop();
      return;
    }
    stack.push(part);
  });

  return `/${stack.join("/")}`;
}

function exists(path) {
  return Boolean(state.files[path]);
}

function isDir(path) {
  return exists(path) && state.files[path].type === "dir";
}

function isFile(path) {
  return exists(path) && state.files[path].type === "file";
}

function listDir(path) {
  return Object.keys(state.files)
    .filter((filePath) => {
      if (filePath === path) return false;
      if (!filePath.startsWith(path === "/" ? "/" : `${path}/`)) return false;
      const rest = filePath.slice(path.length === 1 ? 1 : path.length + 1);
      return rest && !rest.includes("/");
    })
    .map((filePath) => filePath.split("/").pop())
    .sort();
}

function updateQuests() {
  const quests = getActiveQuests();
  const wasComplete = quests.length > 0 && quests.every((quest) => Boolean(state.questsDone[quest.id]));
  let changed = false;
  const justDone = [];

  quests.forEach((quest) => {
    if (!state.questsDone[quest.id] && quest.check(state)) {
      state.questsDone[quest.id] = true;
      justDone.push(quest.id);
      changed = true;
      if (window.goatcounter?.count) {
        window.goatcounter.count({ path: `event/quest-${quest.id}`, title: quest.id, event: true });
      }
    }
  });

  if (changed) {
    celebrate();
    requestAnimationFrame(() => {
      justDone.forEach((id) => {
        const el = questListEl.querySelector(`.quest.done[data-quest-id="${id}"]`);
        if (el) {
          el.classList.add("just-done");
          el.addEventListener("animationend", () => el.classList.remove("just-done"), { once: true });
        }
      });
    });
  }

  if (!wasComplete && quests.length > 0 && quests.every((quest) => Boolean(state.questsDone[quest.id]))) {
    addLine(`All done! You know the loop now: prompt the agent, check the code, run it, ship it. Go build something real.`, "info");
    if (window.goatcounter?.count) {
      window.goatcounter.count({ path: `event/lesson-complete-${state.selectedTool}`, title: "Lesson complete", event: true });
    }
  }
}

function celebrate() {
  try {
    if (navigator.vibrate) navigator.vibrate(70);
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.value = 640;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.12);
  } catch (_) {
    return;
  }
}

function openEditor(path) {
  editingPath = path;
  editorHeadEl.textContent = `Nano Editor — ${path}`;
  editorTextEl.value = state.files[path].content;
  editorEl.classList.add("active");
  editorTextEl.focus();
}

function closeEditor() {
  editingPath = null;
  editorEl.classList.remove("active");
}

function chooseTool(toolKey) {
  if (state.selectedTool === toolKey) {
    addLine(pathStatusMessage(toolKey), "system");
    saveState();
    render();
    return;
  }

  const switching = state.selectedTool && state.selectedTool !== toolKey;
  state = makeInitialState();
  state.selectedTool = toolKey;
  closeEditor();
  addIntroLines();

  if (switching) {
    state.terminalLines[0] = {
      text: `Switched tracks. Progress reset for ${selectedToolConfig(state).label}.`,
      kind: "info"
    };
  }

  updateQuests();
  saveState();
  render();
}

function openBrowserWindow(html) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const commandContext = {
  getState,
  setState,
  addLine,
  addPrompt,
  saveState,
  render,
  openEditor,
  closeEditor,
  updateQuests,
  getActiveQuests,
  addIntroLines,
  normalizePath,
  exists,
  isDir,
  isFile,
  listDir,
  inProjectDir,
  openBrowserWindow
};

pathButtons.forEach((button) => {
  button.addEventListener("click", () => {
    heroForceExpanded = false;
    chooseTool(button.dataset.tool);
    if (window.goatcounter?.count) {
      window.goatcounter.count({ path: `event/tool-${button.dataset.tool}`, title: `Tool: ${button.dataset.tool}`, event: true });
    }
  });
});

document.querySelector(".ascii-title").addEventListener("click", () => {
  if (!state.selectedTool) return;
  heroForceExpanded = !heroForceExpanded;
  renderHeroCollapse();
});

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = inputEl.value;
  if (value.trim()) lastCommand = value;
  inputEl.value = "";
  executeCommand(value, commandContext);
});

inputEl.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp" && lastCommand) {
    event.preventDefault();
    inputEl.value = lastCommand;
  }
});

saveEditorEl.addEventListener("click", () => {
  if (!editingPath) return;
  state.files[editingPath].content = editorTextEl.value;

  const tool = selectedToolConfig(state);
  const envPath = `${projectDir()}/.env`;
  const gitignorePath = `${projectDir()}/.gitignore`;
  if (editingPath === envPath && tool && editorTextEl.value.includes(tool.envVar + "=")) {
    state.app.envHasKey = true;
  }
  if (editingPath === gitignorePath && editorTextEl.value.includes(".env")) {
    state.app.gitignoreOk = true;
  }
  const gameJsPath = `${projectDir()}/game.js`;
  if (editingPath === gameJsPath && editorTextEl.value.includes("getElementByld")) {
    state.fix.broken = true;
  }

  addLine(`Saved ${editingPath}.`, "info");
  updateQuests();
  saveState();
  render();
});

closeEditorEl.addEventListener("click", () => {
  if (editingPath) {
    addLine("Exited nano.", "system");
  }
  closeEditor();
  saveState();
  render();
});

if (!state.terminalLines.length) {
  addIntroLines();
  updateQuests();
  saveState();
}

render();
