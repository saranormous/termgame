import {
  HOME_DIR,
  PROFILE_PATH,
  PROJECT_NAME,
  STORAGE_KEY,
  TOOL_CONFIG,
  makeInitialState,
  projectDir,
  scriptProjectDir,
  selectedToolConfig
} from "./lessons.js?v=8";

// ---------------------------------------------------------------------------
// Helpers shared across command handlers
// ---------------------------------------------------------------------------

function parseExport(text) {
  const match = text.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) return null;

  const name = match[1];
  const value = match[2].replace(/^['"]/, "").replace(/['"]$/, "");
  return { name, value };
}

function sourceFile(state, path) {
  state.sourcedProfile = false;

  state.files[path].content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("export ")) return;

    const parsed = parseExport(trimmed.slice(7));
    if (!parsed) return;

    state.env[parsed.name] = parsed.value;
    if (path === "/Users/player/.zshrc") {
      state.sourcedProfile = true;
    }
  });
}

function projectPackagePath() {
  return `${projectDir()}/package.json`;
}

function tetrisGameContent() {
  return [
    'const button = document.getElementById("start-button");',
    'const board = document.getElementById("board");',
    '',
    'const COLS = 10, ROWS = 20, BLOCK = 24;',
    'const COLORS = ["","#ff4757","#ffa502","#2ed573","#1e90ff","#a55eea","#ff6b81","#eccc68"];',
    'const PIECES = [',
    '  [[1,1,1,1]],',
    '  [[2,2],[2,2]],',
    '  [[0,3,0],[3,3,3]],',
    '  [[0,4,4],[4,4,0]],',
    '  [[5,5,0],[0,5,5]],',
    '  [[6,0,0],[6,6,6]],',
    '  [[0,0,7],[7,7,7]]',
    '];',
    '',
    'let canvas, ctx, grid, piece, pieceX, pieceY, score, running;',
    '',
    'function init() {',
    '  board.innerHTML = "";',
    '  canvas = document.createElement("canvas");',
    '  canvas.width = COLS * BLOCK;',
    '  canvas.height = ROWS * BLOCK;',
    '  canvas.style.cssText = "display:block;margin:0 auto;border-radius:8px";',
    '  board.appendChild(canvas);',
    '  ctx = canvas.getContext("2d");',
    '  grid = Array.from({length: ROWS}, () => Array(COLS).fill(0));',
    '  score = 0; running = true;',
    '  button.textContent = "Restart";',
    '  spawn(); requestAnimationFrame(loop);',
    '}',
    '',
    'function spawn() {',
    '  const shape = PIECES[Math.floor(Math.random() * PIECES.length)];',
    '  piece = shape.map(r => [...r]);',
    '  pieceX = Math.floor((COLS - piece[0].length) / 2); pieceY = 0;',
    '  if (collides(piece, pieceX, pieceY)) endGame();',
    '}',
    '',
    'function collides(p, px, py) {',
    '  return p.some((row, r) => row.some((v, c) =>',
    '    v && (py+r >= ROWS || px+c < 0 || px+c >= COLS || grid[py+r]?.[px+c])));',
    '}',
    '',
    'function merge() {',
    '  piece.forEach((row, r) => row.forEach((v, c) => { if (v) grid[pieceY+r][pieceX+c] = v; }));',
    '}',
    '',
    'function clearLines() {',
    '  let n = 0;',
    '  for (let r = ROWS-1; r >= 0; r--)',
    '    if (grid[r].every(v => v)) { grid.splice(r,1); grid.unshift(Array(COLS).fill(0)); n++; r++; }',
    '  score += [0,100,300,500,800][n] || 0;',
    '}',
    '',
    'function rotate(p) { return p[0].map((_,c) => p.map(row => row[c]).reverse()); }',
    '',
    'let last = 0;',
    'function loop(t) {',
    '  if (!running) return;',
    '  if (t - last > 600) {',
    '    last = t; pieceY++;',
    '    if (collides(piece, pieceX, pieceY)) { pieceY--; merge(); clearLines(); spawn(); }',
    '  }',
    '  draw(); requestAnimationFrame(loop);',
    '}',
    '',
    'function draw() {',
    '  ctx.fillStyle = "#0b1020"; ctx.fillRect(0, 0, canvas.width, canvas.height);',
    '  grid.forEach((row, r) => row.forEach((v, c) => {',
    '    if (v) { ctx.fillStyle = COLORS[v]; ctx.fillRect(c*BLOCK+1, r*BLOCK+1, BLOCK-2, BLOCK-2); }',
    '  }));',
    '  piece.forEach((row, r) => row.forEach((v, c) => {',
    '    if (v) { ctx.fillStyle = COLORS[v]; ctx.fillRect((pieceX+c)*BLOCK+1, (pieceY+r)*BLOCK+1, BLOCK-2, BLOCK-2); }',
    '  }));',
    '  ctx.fillStyle = "#f3f7ff"; ctx.font = "14px monospace";',
    '  ctx.fillText("Score: " + score, 8, canvas.height - 8);',
    '}',
    '',
    'function endGame() {',
    '  running = false;',
    '  ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(0, 0, canvas.width, canvas.height);',
    '  ctx.fillStyle = "#f3f7ff"; ctx.textAlign = "center";',
    '  ctx.font = "bold 20px monospace";',
    '  ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2 - 10);',
    '  ctx.font = "14px monospace";',
    '  ctx.fillText("Score: " + score, canvas.width/2, canvas.height/2 + 16);',
    '  ctx.textAlign = "left";',
    '}',
    '',
    'document.addEventListener("keydown", e => {',
    '  if (!running) return;',
    '  if (e.key === "ArrowLeft" && !collides(piece, pieceX-1, pieceY)) pieceX--;',
    '  if (e.key === "ArrowRight" && !collides(piece, pieceX+1, pieceY)) pieceX++;',
    '  if (e.key === "ArrowDown") { pieceY++; if (collides(piece, pieceX, pieceY)) { pieceY--; merge(); clearLines(); spawn(); } }',
    '  if (e.key === "ArrowUp") { const r = rotate(piece); if (!collides(r, pieceX, pieceY)) piece = r; }',
    '  if (e.key === " ") { while (!collides(piece, pieceX, pieceY+1)) pieceY++; merge(); clearLines(); spawn(); }',
    '  draw();',
    '});',
    '',
    'button.addEventListener("click", init);',
    ''
  ].join("\n");
}

function createAgentProjectFiles(state) {
  state.files[`${projectDir()}/index.html`] = {
    type: "file",
    content: [
      "<!doctype html>",
      '<html lang="en">',
      "  <head>",
      '    <meta charset="UTF-8">',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      "    <title>Tiny Tetris</title>",
      '    <link rel="stylesheet" href="./style.css">',
      "  </head>",
      "  <body>",
      '    <main class="app">',
      "      <h1>Tiny Tetris</h1>",
      "      <p>A tiny browser game made with help from your coding agent.</p>",
      '      <button id="start-button">Start game</button>',
      '      <div id="board" aria-live="polite">Board loads here.</div>',
      "    </main>",
      '    <script src="./game.js"></script>',
      "  </body>",
      "</html>",
      ""
    ].join("\n")
  };

  state.files[`${projectDir()}/style.css`] = {
    type: "file",
    content: [
      "body {",
      "  margin: 0;",
      '  font-family: "Avenir Next", sans-serif;',
      "  background: #0b1020;",
      "  color: #f3f7ff;",
      "}",
      "",
      ".app {",
      "  max-width: 720px;",
      "  margin: 0 auto;",
      "  padding: 48px 20px;",
      "}",
      "",
      "#board {",
      "  margin-top: 24px;",
      "  min-height: 240px;",
      "  border: 2px dashed #7dc4ff;",
      "  border-radius: 16px;",
      "  padding: 20px;",
      "}",
      ""
    ].join("\n")
  };

  state.files[`${projectDir()}/game.js`] = {
    type: "file",
    content: tetrisGameContent()
  };

  state.files[projectPackagePath()] = {
    type: "file",
    content: [
      "{",
      '  "name": "tetris-game",',
      '  "private": true,',
      '  "scripts": {',
      '    "dev": "vite",',
      '    "build": "vite build"',
      "  },",
      '  "devDependencies": {',
      '    "vite": "^6.0.0"',
      "  }",
      "}",
      ""
    ].join("\n")
  };
}

function createAgentScriptFiles(state) {
  const dir = scriptProjectDir();
  state.files[`${dir}/sort-downloads.js`] = {
    type: "file",
    content: [
      'const fs = require("fs");',
      'const path = require("path");',
      "",
      'const downloads = path.join(require("os").homedir(), "Downloads");',
      "const rules = {",
      '  images: [".png", ".jpg", ".gif"],',
      '  documents: [".pdf", ".csv", ".txt", ".doc"],',
      "};",
      "",
      "for (const file of fs.readdirSync(downloads)) {",
      "  const ext = path.extname(file).toLowerCase();",
      '  let folder = "other";',
      "  for (const [name, exts] of Object.entries(rules)) {",
      '    if (exts.includes(ext)) { folder = name; break; }',
      "  }",
      "  const dest = path.join(downloads, folder);",
      '  if (!fs.existsSync(dest)) fs.mkdirSync(dest);',
      "  fs.renameSync(path.join(downloads, file), path.join(dest, file));",
      "}",
      "",
      'console.log("Done sorting files.");',
      ""
    ].join("\n")
  };
}

const DOC_KEYWORDS = ["email", "draft", "summarize", "memo", "letter", "meeting", "rewrite", "report", "paragraph", "linkedin", "post", "tweet", "write a", "announce", "blog"];

function isDocPrompt(prompt) {
  const lower = prompt.toLowerCase();
  return DOC_KEYWORDS.some((k) => lower.includes(k));
}

function runAgentPrompt(state, tool, prompt, context) {
  if (!prompt) {
    context.addLine("Give the agent a prompt in quotes — it needs to know what you want.", "warn");
    return;
  }

  const inTetris = context.inProjectDir();
  const inScript = state.cwd === scriptProjectDir();

  if (!inTetris && !inScript) {
    const promptLower = prompt.toLowerCase();
    const hasBudgetFile = promptLower.includes("budget.csv");
    const isVagueSpend = !hasBudgetFile && (promptLower.includes("spending") || promptLower.includes("finances"));
    const isWantsNeeds = hasBudgetFile && (promptLower.includes("wants") || promptLower.includes("needs"));

    if (isVagueSpend) {
      state.explore.vagueRan = true;
      context.addLine("Sure! To help with your spending I'll need a bit more context:", "info");
      context.addLine("- What currency and time period are we looking at?", "system");
      context.addLine("- Do you have a specific file or spreadsheet I can reference?", "system");
      context.addLine("- Are you trying to reduce total spend, understand categories, or something else?", "system");
      context.addLine("", "system");
      context.addLine("If you have a CSV or file with your data, point me at it and I can work with that directly.", "system");
      return;
    }

    if (isWantsNeeds) {
      state.explore.specificRan = true;
      context.addLine("Reading ~/Downloads/budget.csv...", "info");
      context.addLine("", "system");
      context.addLine("Needs:", "system");
      context.addLine("  coffee            $5   (debatable, but fine)", "system");
      context.addLine("  therapy         $150   (non-negotiable)", "system");
      context.addLine("  token spend      $47   (growing)", "system");
      context.addLine("", "system");
      context.addLine("Wants:", "system");
      context.addLine("  ice cream        $23   (want)", "system");
      context.addLine("  unused gym       $40   (want you keep deferring)", "system");
      context.addLine("", "system");
      context.addLine("Needs: $202/mo  |  Wants: $63/mo", "system");
      context.addLine("The gym is the easiest cut. The therapy stays.", "info");
      return;
    }

    if (hasBudgetFile || isDocPrompt(prompt)) {
      state.explore.docWritten = true;
      context.addLine("Reading ~/Downloads/budget.csv...", "info");
      context.addLine("", "system");
      context.addLine("Found 5 line items:", "system");
      context.addLine("  coffee                 $5", "system");
      context.addLine("  therapy               $150   (largest fixed cost)", "system");
      context.addLine("  token spend            $47   (going up)", "system");
      context.addLine("  ice cream              $23", "system");
      context.addLine("  unused gym membership  $40", "system");
      context.addLine("", "system");
      context.addLine("Total: $262/month", "system");
      context.addLine("", "system");
      context.addLine("A few observations:", "system");
      context.addLine("- Therapy costs 30x your coffee habit. Correlation unclear.", "system");
      context.addLine("- Your token spend will probably keep going up after this tutorial.", "system");
      context.addLine("- The gym membership situation needs to be addressed separately.", "system");
      context.addLine("", "system");
      context.addLine("Want me to add a category column, flag anything over $50, or write", "info");
      context.addLine("a script that tracks this automatically from a bank export?", "info");
      return;
    }
    if (state.cwd === HOME_DIR) {
      context.addLine("Give me something specific to work with — a file path, a question with context, or a clear task.", "warn");
    } else {
      context.addLine("cd into a project folder first so the agent knows where to put the files.", "warn");
    }
    return;
  }

  if (inScript) {
    createAgentScriptFiles(state);
    state.script.built = true;
    state.script.reviewed = false;
    context.addLine(`${tool.label} wrote sort-downloads.js. Read it before you run it — trust but verify.`, "info");
    return;
  }

  // Fix It flow — error recovery and iteration
  if (inTetris && state.fix.broken && !state.fix.fixed) {
    const lower = prompt.toLowerCase();
    if (lower.includes("error") || lower.includes("fix") || lower.includes("getelementbyld")) {
      state.fix.fixed = true;
      // Restore game.js to the working version
      state.files[`${projectDir()}/game.js`] = {
        type: "file",
        content: tetrisGameContent()
      };
      context.addLine("Found the bug in game.js — getElementByld → getElementById. Fixed.", "info");
      context.addLine("That's the error loop: break → read error → tell agent → fixed. You'll use this constantly.", "system");
      return;
    }
  }

  if (inTetris && state.fix.fixed && !state.fix.iterated) {
    const lower = prompt.toLowerCase();
    if (lower.includes("score") || lower.includes("feature") || lower.includes("add")) {
      state.fix.iterated = true;
      context.addLine(`${tool.label} updated game.js with a high-score display using localStorage.`, "info");
      context.addLine("You didn't start over — you built on what was there. That's iterative prompting: start simple, then layer on.", "system");
      return;
    }
  }

  createAgentProjectFiles(state);
  state.app.built = true;
  state.app.packageViewed = false;
  state.app.indexViewed = false;
  state.app.depsInstalled = false;
  state.app.serverRunning = false;
  state.app.previewOpened = false;
  state.app.buildReady = false;
  state.app.deployed = false;

  context.addLine(`${tool.label} generated index.html, style.css, game.js, and package.json. Look before you leap.`, "info");
  context.addLine("Note: browser code is public — never put secret API keys in those files.", "system");
}

// ---------------------------------------------------------------------------
// Command registry — each handler receives (state, args, command, tool, context)
// ---------------------------------------------------------------------------

const COMMAND_NAMES = [];

const commands = {};

function register(name, handler) {
  commands[name] = handler;
  COMMAND_NAMES.push(name);
}

// -- Shell basics -----------------------------------------------------------

register("help", (_state, _args, _command, _tool, context) => {
  context.addLine(`Commands: ${COMMAND_NAMES.join(", ")}`, "system");
});

register("pwd", (state, _args, _command, _tool, context) => {
  context.addLine(state.cwd, "system");
});

register("ls", (state, args, _command, _tool, context) => {
  const target = context.normalizePath(args[0] || ".");
  if (!context.isDir(target)) {
    context.addLine("No such directory.", "error");
    return;
  }
  context.addLine(context.listDir(target).join("  ") || "(empty)", "system");
});

register("cd", (state, args, _command, _tool, context) => {
  const target = context.normalizePath(args[0] || "~");
  if (!context.isDir(target)) {
    context.addLine("No such directory.", "error");
    return;
  }
  state.cwd = target;
});

register("mkdir", (state, args, _command, _tool, context) => {
  const name = args[0];
  if (!name) {
    context.addLine("Usage: mkdir <folder-name>", "error");
    return;
  }
  const target = context.normalizePath(name);
  if (context.exists(target)) {
    context.addLine("That folder already exists.", "warn");
    return;
  }
  state.files[target] = { type: "dir" };
  context.addLine(`Created folder ${target}`, "info");
});

register("touch", (state, args, _command, _tool, context) => {
  if (!args.length) {
    context.addLine("Usage: touch <file> [more-files...]", "error");
    return;
  }
  args.forEach((name) => {
    const target = context.normalizePath(name);
    const parent = target.split("/").slice(0, -1).join("/") || "/";
    if (!context.isDir(parent)) return;
    if (!context.exists(target)) state.files[target] = { type: "file", content: "" };
  });
  context.addLine("Created files.", "info");
});

register("which", (state, args, _command, _tool, context) => {
  const name = args[0];
  if (!name) {
    context.addLine("Usage: which <command>", "error");
    return;
  }
  if (name === "terminal") {
    context.addLine("This is already a terminal — you're inside it! To check for Node.js, try: which node", "info");
    return;
  }
  if (name === "node" && state.installed.node) context.addLine("/opt/homebrew/bin/node", "system");
  else if (name === "npm" && state.installed.npm) context.addLine("/opt/homebrew/bin/npm", "system");
  else if (name === "codex" && state.installed.codex) context.addLine("/opt/homebrew/bin/codex", "system");
  else if (name === "claude" && state.installed.claude) context.addLine("/opt/homebrew/bin/claude", "system");
  else context.addLine(`${name} not found`, "warn");
});

register("export", (state, args, _command, _tool, context) => {
  const parsed = parseExport(args.join(" "));
  if (!parsed) {
    context.addLine("Usage: export NAME=value", "error");
    return;
  }
  state.env[parsed.name] = parsed.value;
  state.lastEchoedVar = "";
  context.addLine(`Saved ${parsed.name} in this terminal window.`, "info");
});

register("echo", (state, args, _command, _tool, context) => {
  const joined = args.join(" ");
  if (joined.startsWith("$")) {
    state.lastEchoedVar = joined.slice(1);
    context.addLine(state.env[state.lastEchoedVar] || "", "system");
  } else {
    context.addLine(joined, "system");
  }
});

register("cat", (state, args, _command, _tool, context) => {
  const target = context.normalizePath(args[0] || "");
  if (!context.isFile(target)) {
    context.addLine("No such file.", "error");
    return;
  }
  if (target === projectPackagePath()) state.app.packageViewed = true;
  if (target === `${projectDir()}/index.html`) state.app.indexViewed = true;
  if (target === `${scriptProjectDir()}/sort-downloads.js`) state.script.reviewed = true;
  if (target === `${HOME_DIR}/.claude/settings.json`) state.explore.mcpViewed = true;
  context.addLine(state.files[target].content || "(empty)", "system");
});

register("nano", (state, args, _command, _tool, context) => {
  const target = context.normalizePath(args[0] || "");
  if (!context.isFile(target)) {
    context.addLine("Only existing files are editable in this lesson. Try nano ~/.zshrc", "error");
    return;
  }
  context.openEditor(target);
  const tool = selectedToolConfig(state);
  const envPath = `${projectDir()}/.env`;
  const gitignorePath = `${projectDir()}/.gitignore`;
  if (target === PROFILE_PATH && tool) {
    context.addLine(`Opened ${target} in nano. Paste this on a new line: export ${tool.envVar}=your-key-here`, "info");
    context.addLine("Then hit Save and Exit.", "system");
  } else if (target === envPath && tool) {
    context.addLine(`Opened ${target} in nano. Paste: ${tool.envVar}=your-key-here`, "info");
    context.addLine("No export keyword — .env files don't need it. Save and Exit.", "system");
  } else if (target === gitignorePath) {
    context.addLine(`Opened ${target} in nano. Add: .env`, "info");
    context.addLine("One entry per line. Save and Exit.", "system");
  } else {
    context.addLine(`Opened ${target} in nano. Edit, then save and exit.`, "info");
  }
});

register("source", (state, args, _command, _tool, context) => {
  const target = context.normalizePath(args[0] || "");
  if (!context.isFile(target)) {
    context.addLine("No such file.", "error");
    return;
  }
  sourceFile(state, target);
  context.addLine(`Reloaded ${target}.`, "info");
});

// -- Package management -----------------------------------------------------

register("brew", (state, args, _command, _tool, context) => {
  if (args[0] === "install" && args[1] === "node") {
    state.installed.node = true;
    state.installed.npm = true;
    context.addLine("Installed node and npm. You've got JavaScript superpowers now.", "info");
  } else {
    context.addLine("Try: brew install node", "error");
  }
});

register("npm", (state, _args, command, tool, context) => {
  if (!state.installed.node) {
    context.addLine("npm isn't ready yet — install Node.js first.", "error");
    return;
  }
  if (command === tool.installCommand) {
    state.installed[tool.key] = true;
    context.addLine(`Installed ${tool.label}.`, "info");
  } else if (command === "npm install") {
    if (!context.inProjectDir()) {
      context.addLine(`cd into ${PROJECT_NAME} first — npm needs to be in the right folder.`, "warn");
      return;
    }
    if (!context.isFile(projectPackagePath())) {
      context.addLine("No package.json yet — ask the agent to create the app first.", "warn");
      return;
    }
    state.app.depsInstalled = true;
    context.addLine("Packages installed. The app has everything it needs.", "info");
  } else if (command === "npm run dev") {
    if (!context.inProjectDir()) {
      context.addLine(`cd into ${PROJECT_NAME} first.`, "warn");
      return;
    }
    if (!state.app.depsInstalled) {
      context.addLine("Run npm install first — the app needs its packages before it can start.", "warn");
      return;
    }
    if (state.fix.broken && !state.fix.fixed) {
      state.fix.errorSeen = true;
      context.addLine("Dev server running at http://127.0.0.1:5173", "info");
      context.addLine("", "system");
      context.addLine("TypeError: document.getElementByld is not a function", "error");
      context.addLine("    at game.js:1:26", "error");
      context.addLine("", "system");
      context.addLine("That's a typo — getElementByld isn't a real function. The error tells you the file (game.js) and the line (1). Copy the error and give it to the agent.", "warn");
      return;
    }
    state.app.serverRunning = true;
    context.addLine("Dev server running at http://127.0.0.1:5173", "info");
    context.addLine("Now run: open http://127.0.0.1:5173 — it'll open your Tetris game in a new tab.", "system");
  } else if (command === "npm run build") {
    if (!context.inProjectDir()) {
      context.addLine(`cd into ${PROJECT_NAME} first.`, "warn");
      return;
    }
    if (!state.app.depsInstalled) {
      context.addLine("Run npm install first — can't build without the packages.", "warn");
      return;
    }
    state.app.buildReady = true;
    context.addLine("Production build ready. This is what visitors will actually see.", "info");
  } else {
    context.addLine(`Try ${tool.installCommand}, npm install, npm run dev, or npm run build.`, "error");
  }
});

register("node", (state, args, _command, _tool, context) => {
  if (!state.installed.node) {
    context.addLine("Node.js isn't installed yet. Run brew install node first.", "error");
    return;
  }
  const scriptName = args[0];
  if (!scriptName) {
    context.addLine("Usage: node <script.js>", "error");
    return;
  }
  const scriptPath = context.normalizePath(scriptName);
  if (!context.isFile(scriptPath)) {
    context.addLine(`No such file: ${scriptName}`, "error");
    return;
  }
  if (scriptPath === `${scriptProjectDir()}/sort-downloads.js` && state.script.built) {
    state.script.ran = true;
    context.addLine("Scanning ~/Downloads...", "system");
    context.addLine("  photo.png → images/", "info");
    context.addLine("  notes.pdf → documents/", "info");
    context.addLine("  budget.csv → documents/", "info");
    context.addLine("  readme.txt → documents/", "info");
    context.addLine("  song.mp3 → other/", "info");
    context.addLine("Done — 5 files sorted into 3 folders. Tidy!", "info");
  } else {
    context.addLine(`Ran ${scriptName}. (No visible output in this simulation.)`, "system");
  }
});

// -- Git --------------------------------------------------------------------

register("git", (state, _args, command, _tool, context) => {
  if (!context.inProjectDir()) {
    context.addLine(`cd into ${PROJECT_NAME} first — git needs to be in the project folder.`, "warn");
    return;
  }
  if (command === "git init") {
    state.git.initialized = true;
    state.git.staged = false;
    context.addLine(`Started git in ${projectDir()}`, "info");
  } else if (command === "git add .") {
    if (!state.git.initialized) {
      context.addLine("Run git init first.", "warn");
      return;
    }
    state.git.staged = true;
    context.addLine("Files staged and ready to commit.", "info");
  } else if (command === 'git commit -m "Start Tetris game"' || command === "git commit -m 'Start Tetris game'") {
    if (!state.git.initialized) {
      context.addLine("Run git init first.", "warn");
      return;
    }
    if (!state.git.staged) {
      context.addLine("Stage files first with git add .", "warn");
      return;
    }
    state.git.commitCount += 1;
    state.git.staged = false;
    context.addLine('Saved commit: "Start Tetris game"', "info");
  } else if (command.startsWith("git remote add origin ")) {
    if (!state.git.initialized) {
      context.addLine("Run git init first.", "warn");
      return;
    }
    state.git.remoteUrl = command.slice("git remote add origin ".length);
    context.addLine(`Connected this project to ${state.git.remoteUrl}`, "info");
  } else if (command === "git push -u origin main") {
    if (!state.git.remoteUrl) {
      context.addLine("Connect GitHub first with git remote add origin ...", "warn");
      return;
    }
    if (!state.git.commitCount) {
      context.addLine("Create a commit before you push.", "warn");
      return;
    }
    state.git.pushed = true;
    context.addLine("Pushed to GitHub. Your code is online (the website isn't — yet).", "info");
    context.addLine("Now a web host like Vercel can grab it and deploy.", "system");
  } else {
    context.addLine('Try: git init, git add ., git commit -m "Start Tetris game", git remote add origin ..., or git push -u origin main', "error");
  }
});

// -- Browser / deploy -------------------------------------------------------

register("open", (state, args, _command, _tool, context) => {
  if (args[0] === "http://127.0.0.1:5173" || args[0] === "http://127.0.0.1:8000") {
    if (state.app.serverRunning) {
      state.app.previewOpened = true;
      const css = state.files[`${projectDir()}/style.css`]?.content || "";
      const js = state.files[`${projectDir()}/game.js`]?.content || "";
      const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tiny Tetris</title>
  <style>${css}</style>
</head>
<body>
  <main class="app">
    <h1>Tiny Tetris</h1>
    <p>A tiny browser game made with help from your coding agent.</p>
    <button id="start-button">Start game</button>
    <div id="board" aria-live="polite">Board loads here.</div>
  </main>
  <script>${js}</script>
</body>
</html>`;
      context.openBrowserWindow(html);
      context.addLine("Opened in a new tab — hit Start game and use arrow keys to play. Space bar drops.", "info");
      context.addLine("Come back to this tab when you're ready to continue.", "system");
    } else {
      context.addLine("Nothing to open yet — start the dev server first with npm run dev.", "warn");
    }
  } else if (args[0] === "https://vercel.com/new") {
    if (!state.git.pushed) {
      context.addLine("Push to GitHub first — the host needs something to import.", "warn");
      return;
    }
    state.app.deployed = true;
    context.addLine("Vercel import page opened. In real life: pick your GitHub repo, leave the defaults, and hit Deploy.", "info");
  } else if (args[0] === "-a") {
    const appName = args.slice(1).join(" ").replace(/^["']|["']$/g, "");
    if (!appName) {
      context.addLine('Usage: open -a "App Name"', "error");
      return;
    }
    state.explore.openedApp = true;
    context.addLine(`${appName} is opening.`, "info");
    context.addLine("open -a works with any app in your Applications folder.", "system");
  } else {
    context.addLine('Try: open http://127.0.0.1:5173, open https://vercel.com/new, or open -a "App Name"', "error");
  }
});

register("say", (state, args, _command, _tool, context) => {
  const text = args.join(" ").replace(/^["']|["']$/g, "");
  if (!text) {
    context.addLine('Usage: say "something"', "error");
    return;
  }
  state.explore.spoke = true;
  context.addLine(`[spoken] "${text}"`, "info");
  context.addLine("On a real Mac that plays aloud — the terminal routes directly to the OS speech engine.", "system");
});

register("curl", (state, args, _command, _tool, context) => {
  const url = args.join(" ").replace(/^["']|["']$/g, "");
  if (!url) {
    context.addLine('Usage: curl "https://..."', "error");
    return;
  }
  state.explore.curled = true;
  if (url.includes("wttr.in")) {
    context.addLine("San Francisco: Partly cloudy, 66F", "system");
    context.addLine("(Simulated. Real curl fetches live data from that URL.)", "system");
  } else {
    context.addLine(`Fetching ${url}...`, "system");
    context.addLine("(Response would appear here.)", "system");
  }
});

// -- Agent tools ------------------------------------------------------------

register("codex", (state, args, _command, tool, context) => {
  if (!state.installed.codex) {
    context.addLine("codex is not installed yet.", "error");
    return;
  }
  if (args[0] === "--login") {
    state.auth.codex = true;
    state.started.codex = true;
    context.addLine("Codex sign-in complete. You're in.", "info");
  } else if (args.length) {
    if (!state.started.codex) {
      if (state.env.OPENAI_API_KEY || state.auth.codex) state.started.codex = true;
      else {
        context.addLine("Codex needs either codex --login or an OPENAI_API_KEY first.", "warn");
        return;
      }
    }
    runAgentPrompt(state, tool, args.join(" "), context);
  } else if (state.env.OPENAI_API_KEY) {
    state.started.codex = true;
    context.addLine("Codex is ready. Using your OPENAI_API_KEY.", "info");
  } else {
    context.addLine("Codex needs either codex --login or an OPENAI_API_KEY first.", "warn");
  }
});

register("claude", (state, args, _command, tool, context) => {
  if (!state.installed.claude) {
    context.addLine("claude is not installed yet.", "error");
    return;
  }
  if (args.length) {
    state.auth.claude = true;
    state.started.claude = true;
    runAgentPrompt(state, tool, args.join(" "), context);
  } else {
    state.auth.claude = true;
    state.started.claude = true;
    if (state.env.ANTHROPIC_API_KEY) {
      context.addLine("Claude Code is ready. Using your ANTHROPIC_API_KEY.", "info");
    } else {
      context.addLine("Claude Code is ready. (In real life, it may ask you to sign in.)", "info");
    }
  }
});

// -- Meta -------------------------------------------------------------------

register("quests", (state, _args, _command, _tool, context) => {
  context.getActiveQuests().forEach((quest) => {
    const marker = state.questsDone[quest.id] ? "[x]" : "[ ]";
    context.addLine(`${marker} ${quest.title}`, "system");
  });
});

// -- Part-completion helpers -------------------------------------------------
// Each function defines the complete "done" state for one part of the lesson.
// Used by `skip` (and any future "jump to" feature) so the required state for
// each part is defined in exactly one place.  When you add a new quest or
// state flag to a part, update the corresponding helper here.

function applyPart1Done(state, tool) {
  state.installed.node = true;
  state.installed.npm = true;
  state.installed[tool.key] = true;
  state.env[tool.envVar] = "sk-skipped";
  state.lastEchoedVar = tool.envVar;
  state.sourcedProfile = true;
  state.files[PROFILE_PATH] = { type: "file", content: `# shell config\nexport ${tool.envVar}=sk-skipped\n` };
  state.auth[tool.key] = true;
  state.started[tool.key] = true;
  state.files[projectDir()] = { type: "dir" };
  state.cwd = projectDir();
  createAgentProjectFiles(state);
  state.app.built = true;
  state.app.packageViewed = true;
  state.app.indexViewed = true;
  state.app.depsInstalled = true;
  state.app.serverRunning = true;
  state.app.previewOpened = true;
}

function applyPart2Done(state, tool) {
  state.app.buildReady = true;
  state.app.envHasKey = true;
  state.app.gitignoreOk = true;
  state.files[`${projectDir()}/.env`] = { type: "file", content: `${tool.envVar}=sk-skipped\n` };
  state.files[`${projectDir()}/.gitignore`] = { type: "file", content: ".env\n" };
  state.git.initialized = true;
  state.git.staged = false;
  state.git.commitCount = 1;
  state.git.remoteUrl = `https://github.com/you/${PROJECT_NAME}.git`;
  state.git.pushed = true;
  state.app.deployed = true;
  state.files[scriptProjectDir()] = { type: "dir" };
  state.cwd = scriptProjectDir();
}

function applyPart3Done(state) {
  state.script.built = true;
  state.script.reviewed = true;
  state.script.ran = true;
  state.files[`${scriptProjectDir()}/sort-downloads.js`] = { type: "file", content: "// sort-downloads.js\n" };
  state.cwd = HOME_DIR;
}

function applyPart4Done(state) {
  state.explore.openedApp = true;
  state.explore.spoke = true;
  state.explore.curled = true;
  state.explore.vagueRan = true;
  state.explore.docWritten = true;
  state.explore.specificRan = true;
  state.explore.mcpViewed = true;
  state.cwd = projectDir();
}

register("skip", (state, args, _command, tool, context) => {
  const partNum = parseInt(args[0], 10);
  if (!(partNum >= 2 && partNum <= 5)) {
    context.addLine("Usage: skip 2, skip 3, skip 4, or skip 5 — jumps to that part.", "error");
    return;
  }

  applyPart1Done(state, tool);
  if (partNum >= 3) applyPart2Done(state, tool);
  if (partNum >= 4) applyPart3Done(state);
  if (partNum >= 5) applyPart4Done(state);

  // Mark matching quests as done
  const quests = context.getActiveQuests();
  quests.forEach((quest) => {
    if (quest.part && quest.part < partNum) {
      state.questsDone[quest.id] = true;
    }
  });

  context.addLine(`Jumped to Part ${partNum}. Earlier steps marked done.`, "info");
});

register("clear", (state) => {
  state.terminalLines = [];
});

register("reset", (_state, _args, _command, _tool, context) => {
  localStorage.removeItem(STORAGE_KEY);
  const nextState = makeInitialState();
  context.setState(nextState);
  context.closeEditor();
  context.addIntroLines();
});

// ---------------------------------------------------------------------------
// Typo hints — suggest the closest command when the user mistypes
// ---------------------------------------------------------------------------

function editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function closestCommand(typed) {
  let best = null;
  let bestDist = Infinity;
  for (const name of COMMAND_NAMES) {
    const d = editDistance(typed.toLowerCase(), name.toLowerCase());
    if (d < bestDist) { bestDist = d; best = name; }
  }
  // Only suggest if the typo is within 2 edits
  return bestDist <= 2 ? best : null;
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

export function executeCommand(raw, context) {
  const command = raw.trim();
  if (!command) return;

  const state = context.getState();
  if (!state.selectedTool) {
    context.addLine("Choose Codex or Claude Code above first.", "warn");
    context.saveState();
    context.render();
    return;
  }

  state.lastCommand = command;
  context.addPrompt(command);

  const parts = command.split(" ");
  const bin = parts[0];
  const args = parts.slice(1);
  const tool = selectedToolConfig(state);

  const handler = commands[bin];
  if (handler) {
    handler(state, args, command, tool, context);
  } else {
    const suggestion = closestCommand(bin);
    if (suggestion) {
      context.addLine(`Command not found: ${bin}. Did you mean ${suggestion}?`, "error");
    } else {
      context.addLine(`Command not found: ${bin}`, "error");
    }
  }

  context.updateQuests();
  context.saveState();
  context.render();
}

export function pathStatusMessage(toolKey) {
  return `You are already on the ${TOOL_CONFIG[toolKey].label} track. Your progress is still here.`;
}
