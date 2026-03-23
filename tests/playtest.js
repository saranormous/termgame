const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const rootDir = path.resolve(__dirname, "..");

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  return "text/plain; charset=utf-8";
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    const requestPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
    const normalizedPath = path.normalize(requestPath).replace(/^([.][.][/\\])+/, "");
    const filePath = path.join(rootDir, normalizedPath);

    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      res.writeHead(200, { "Content-Type": contentType(filePath) });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

async function run() {
  const { server, url } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("pageerror", (error) => {
    throw error;
  });

  async function loadFreshPage() {
    await page.goto(`${url}/index.html`, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
  }

  async function chooseTool(tool) {
    await page.locator(`.path-button[data-tool="${tool}"]`).click();
  }

  async function runCommand(command) {
    const input = page.locator("#command");
    await input.fill(command);
    await input.press("Enter");
  }

  async function questCount() {
    const title = await page.locator("#quests-title").innerText();
    const match = title.match(/(\d+)\/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async function terminalText() {
    return page.locator("#terminal").innerText();
  }

  async function assertQuestCount(expected, message) {
    const done = await questCount();
    if (done !== expected) {
      throw new Error(`${message} Expected ${expected}, got ${done}.`);
    }
  }

  async function assertProgressPreservedAcrossReload(expectedDone) {
    await page.reload({ waitUntil: "networkidle" });
    await assertQuestCount(expectedDone, "Quest progress changed after reload.");
  }

  async function assertSamePathClickKeepsProgress(tool, expectedDone) {
    await chooseTool(tool);
    await assertQuestCount(expectedDone, "Clicking the active path should keep progress.");
  }

  async function assertSwitchPathResetsProgress(tool) {
    await chooseTool(tool);
    await assertQuestCount(0, "Switching to a different path should reset progress.");
  }

  async function runFlow(config, iteration) {
    await loadFreshPage();
    await chooseTool(config.tool);

    const hintText = await page.locator("#hint-list").evaluate((node) => node.textContent || "");
    if (!hintText.includes(config.keySourceText) || !hintText.toLowerCase().includes("password")) {
      throw new Error(`API key source or safety guidance missing for ${config.tool}`);
    }

    await runCommand(config.startProbeCommand);
    let text = await terminalText();
    if (!text.includes(config.preInstallMessage)) {
      throw new Error(`Pre-install guidance missing for ${config.tool}`);
    }

    await runCommand("which node");
    await runCommand("brew install node");
    await assertProgressPreservedAcrossReload(2);
    await assertSamePathClickKeepsProgress(config.tool, 2);

    await runCommand(config.installCommand);
    await runCommand(`export ${config.keyName}=sk-test-value`);
    await runCommand(`echo $${config.keyName}`);
    await runCommand("nano ~/.zshrc");

    await page.locator("#editor").waitFor({ state: "visible" });
    await page.locator("#editor-text").fill(`# shell config\nexport ${config.keyName}=sk-test-value\n`);
    await page.locator("#save-editor").click();
    await page.locator("#close-editor").click();

    await runCommand("source ~/.zshrc");
    await assertProgressPreservedAcrossReload(5);
    await runCommand(config.startCommand);
    await runCommand("mkdir tetris-game");
    await runCommand("cd tetris-game");
    await runCommand(config.agentPromptCommand);
    await runCommand("ls");
    await runCommand("cat package.json");
    await runCommand("cat index.html");
    await runCommand("npm install");
    await runCommand("npm run dev");
    await runCommand("open http://127.0.0.1:5173");
    await runCommand("npm run build");

    // .env + .gitignore quests
    await runCommand("touch .env");
    await runCommand("nano .env");
    await page.locator("#editor-text").fill(`${config.keyName}=sk-test-value\n`);
    await page.locator("#save-editor").click();
    await page.locator("#close-editor").click();
    await runCommand("touch .gitignore");
    await runCommand("nano .gitignore");
    await page.locator("#editor-text").fill(".env\n");
    await page.locator("#save-editor").click();
    await page.locator("#close-editor").click();

    await runCommand("git init");
    await runCommand("git add .");
    await runCommand('git commit -m "Start Tetris game"');
    await runCommand("git remote add origin https://github.com/you/tetris-game.git");
    await runCommand("git push -u origin main");
    await runCommand("open https://vercel.com/new");

    // Part 3 — Beyond websites
    await runCommand("cd ~");
    await runCommand("mkdir file-sorter");
    await runCommand("cd file-sorter");
    await runCommand(config.agentScriptCommand);
    await runCommand("cat sort-downloads.js");
    await runCommand("node sort-downloads.js");

    // Part 4 — The terminal reaches everything
    await runCommand("cd ~");
    await runCommand('open -a "TextEdit"');
    await runCommand('say "The terminal runs everything"');
    await runCommand('curl "https://wttr.in/?format=3"');
    await runCommand(config.vaguePromptCommand);
    await runCommand(config.docPromptCommand);
    await runCommand(config.followupPromptCommand);
    await runCommand("cat ~/.claude/settings.json");

    await assertQuestCount(30, "Happy path did not complete all quests.");

    text = await terminalText();
    if (!text.includes("All done!")) {
      throw new Error(`Completion message missing for ${config.tool}`);
    }
    if (!text.includes(config.startMessage)) {
      throw new Error(`Start message missing for ${config.tool}`);
    }
    if (!text.includes("Pushed to GitHub")) {
      throw new Error(`GitHub push message missing for ${config.tool}`);
    }
    if (!text.includes("Vercel import page opened")) {
      throw new Error(`Hosting step missing for ${config.tool}`);
    }
    if (!text.includes("5 files sorted into 3 folders")) {
      throw new Error(`Script run output missing for ${config.tool}`);
    }

    await runCommand("reset");
    text = await terminalText();
    if (!text.includes("Choose Codex or Claude Code above to begin.")) {
      throw new Error(`Reset did not return the lesson to path selection for ${config.tool}`);
    }

    await chooseTool(config.tool);
    await runCommand("which node");
    await assertQuestCount(1, "Restart flow did not begin cleanly.");

    if (iteration === 0) {
      await assertSwitchPathResetsProgress(config.otherTool);
    }
  }

  const flows = [
    {
      tool: "codex",
      otherTool: "claude",
      keyName: "OPENAI_API_KEY",
      installCommand: "npm install -g @openai/codex",
      startCommand: "codex",
      startProbeCommand: "codex",
      agentPromptCommand: 'codex "Build a simple Tetris web app in index.html, style.css, and game.js. Add package.json with dev and build commands. Do not put API keys in browser code."',
      agentScriptCommand: 'codex "Write a Node.js script called sort-downloads.js that reads ~/Downloads and moves files into subfolders by type — images, documents, and other."',
      startMessage: "Codex is ready",
      preInstallMessage: "codex is not installed yet.",
      keySourceText: "OpenAI API key",
      vaguePromptCommand: 'codex "help me understand my spending"',
      docPromptCommand: 'codex "Read ~/Downloads/budget.csv and tell me what\'s in it"',
      followupPromptCommand: 'codex "Read ~/Downloads/budget.csv — which of those are wants vs. needs?"'
    },
    {
      tool: "claude",
      otherTool: "codex",
      keyName: "ANTHROPIC_API_KEY",
      installCommand: "npm install -g @anthropic-ai/claude-code",
      startCommand: "claude",
      startProbeCommand: "claude",
      agentPromptCommand: 'claude "Build a simple Tetris web app in index.html, style.css, and game.js. Add package.json with dev and build commands. Do not put API keys in browser code."',
      agentScriptCommand: 'claude "Write a Node.js script called sort-downloads.js that reads ~/Downloads and moves files into subfolders by type — images, documents, and other."',
      startMessage: "Claude Code is ready",
      preInstallMessage: "claude is not installed yet.",
      keySourceText: "Anthropic API key",
      vaguePromptCommand: 'claude "help me understand my spending"',
      docPromptCommand: 'claude "Read ~/Downloads/budget.csv and tell me what\'s in it"',
      followupPromptCommand: 'claude "Read ~/Downloads/budget.csv — which of those are wants vs. needs?"'
    }
  ];

  async function assertTerminalContains(substring, message) {
    const text = await terminalText();
    if (!text.includes(substring)) {
      throw new Error(`${message} Expected terminal to contain: "${substring}"`);
    }
  }

  async function runErrorPathTests() {
    await loadFreshPage();
    await chooseTool("claude");

    // Commands before prerequisites
    await runCommand("npm install");
    await assertTerminalContains("npm isn't ready yet", "npm before node installed");

    await runCommand("brew install node");
    await runCommand("npm install -g @anthropic-ai/claude-code");

    await runCommand("npm install");
    await assertTerminalContains("cd into tetris-game first","npm install outside project dir");

    await runCommand("npm run dev");
    await assertTerminalContains("cd into tetris-game first","npm run dev outside project dir");

    await runCommand("npm run build");
    await assertTerminalContains("cd into tetris-game first","npm run build outside project dir");

    // git outside project dir
    await runCommand("git init");
    await assertTerminalContains("cd into tetris-game first","git outside project dir");

    // cd to nonexistent dir
    await runCommand("cd tetris-game");
    await assertTerminalContains("No such directory", "cd to nonexistent dir");

    // mkdir, cd, then agent without prompt
    await runCommand("mkdir tetris-game");
    await runCommand("cd tetris-game");

    await runCommand("claude");
    // claude without args starts the tool, not an error

    // npm install before agent creates package.json — agent hasn't run yet
    await runCommand("npm install");
    await assertTerminalContains("No package.json yet", "npm install before agent");

    // npm run dev before npm install
    await runCommand('claude "Build a simple Tetris web app"');
    await runCommand("npm run dev");
    await assertTerminalContains("Run npm install first", "npm run dev before npm install");

    // npm run build before npm install
    await runCommand("npm run build");
    await assertTerminalContains("Run npm install first", "npm run build before npm install");

    await runCommand("npm install");

    // open localhost before server running
    await runCommand("open http://127.0.0.1:5173");
    await assertTerminalContains("Nothing to open yet", "open localhost before dev server");

    // git commit before init
    await runCommand('git commit -m "Start Tetris game"');
    await assertTerminalContains("Run git init first", "git commit before init");

    await runCommand("git init");

    // git commit before staging
    await runCommand('git commit -m "Start Tetris game"');
    await assertTerminalContains("Stage files first", "git commit before add");

    // git push before remote
    await runCommand("git add .");
    await runCommand('git commit -m "Start Tetris game"');
    await runCommand("git push -u origin main");
    await assertTerminalContains("Connect GitHub first", "git push before remote");

    // open vercel before push
    await runCommand("open https://vercel.com/new");
    await assertTerminalContains("Push to GitHub first", "vercel before push");

    // Unknown command
    await runCommand("whoami");
    await assertTerminalContains("Command not found: whoami", "unknown command");

    // Empty nano target
    await runCommand("nano /nonexistent");
    await assertTerminalContains("Only existing files are editable", "nano nonexistent file");

    // cat nonexistent file
    await runCommand("cat /nonexistent");
    await assertTerminalContains("No such file", "cat nonexistent file");

    // ls nonexistent dir
    await runCommand("ls /nowhere");
    await assertTerminalContains("No such directory", "ls nonexistent dir");

    // export with bad format
    await runCommand("export");
    await assertTerminalContains("Usage: export NAME=value", "export without args");

    // which with no arg
    await runCommand("which");
    await assertTerminalContains("Usage: which", "which without args");

    // node before install (need fresh page since brew install already happened)
    // node without args
    await runCommand("node");
    await assertTerminalContains("Usage: node", "node without args");

    // node on nonexistent file
    await runCommand("node missing.js");
    await assertTerminalContains("No such file", "node nonexistent file");

    // skip without valid part number
    await runCommand("skip");
    await assertTerminalContains("Usage: skip 2, skip 3, or skip 4", "skip without args");

    console.log("  Error path tests passed.");
  }

  async function runNewFeatureTests() {
    await loadFreshPage();
    await chooseTool("claude");

    // Part 1 header renders (Part 2 is hidden until Part 1 is nearly done)
    const partHeaders = await page.locator(".quest-part-header").allTextContents();
    if (partHeaders.length < 1) {
      throw new Error("Expected at least 1 part header");
    }
    if (!partHeaders[0].includes("Build it")) {
      throw new Error(`Part 1 header wrong: ${partHeaders[0]}`);
    }

    // "go deeper" glossary entry exists
    const glossaryText = await page.locator("#hint-list").evaluate((node) => node.textContent || "");
    if (!glossaryText.includes("Rabbit holes are fun")) {
      throw new Error("Go-deeper glossary entry missing");
    }

    // Hero collapses after choosing a track (eyebrow, paragraphs hidden)
    const heroCollapsed = await page.locator(".hero").evaluate((el) => el.classList.contains("collapsed"));
    if (!heroCollapsed) {
      throw new Error("Hero should collapse after choosing a track");
    }

    // Context panel intro renders
    const hintIntro = await page.locator(".sidebar-section .panel-intro").nth(1).innerText();
    if (!hintIntro.includes("Definitions")) {
      throw new Error("Context panel intro should describe what the section is for");
    }

    // Only a few quests visible (not all 16)
    const visibleQuests = await page.locator(".quest").count();
    if (visibleQuests > 3) {
      throw new Error(`Too many quests visible at start: ${visibleQuests}. Expected at most 3 (current + 1 locked).`);
    }

    // Run full flow to check lesson note appears with checklist
    await runCommand("which node");
    await runCommand("brew install node");
    await runCommand("npm install -g @anthropic-ai/claude-code");
    await runCommand("export ANTHROPIC_API_KEY=sk-test-value");
    await runCommand("echo $ANTHROPIC_API_KEY");
    await runCommand("nano ~/.zshrc");
    await page.locator("#editor-text").fill("# shell config\nexport ANTHROPIC_API_KEY=sk-test-value\n");
    await page.locator("#save-editor").click();
    await page.locator("#close-editor").click();
    await runCommand("source ~/.zshrc");
    await runCommand("claude");
    await runCommand("mkdir tetris-game");
    await runCommand("cd tetris-game");
    await runCommand('claude "Build a simple Tetris web app in index.html, style.css, and game.js. Add package.json with dev and build commands. Do not put API keys in browser code."');
    await runCommand("ls");
    await runCommand("cat package.json");
    await runCommand("cat index.html");
    await runCommand("npm install");
    await runCommand("npm run dev");
    await runCommand("open http://127.0.0.1:5173");
    await runCommand("npm run build");

    await runCommand("touch .env");
    await runCommand("nano .env");
    await page.locator("#editor-text").fill("ANTHROPIC_API_KEY=sk-test-value\n");
    await page.locator("#save-editor").click();
    await page.locator("#close-editor").click();
    await runCommand("touch .gitignore");
    await runCommand("nano .gitignore");
    await page.locator("#editor-text").fill(".env\n");
    await page.locator("#save-editor").click();
    await page.locator("#close-editor").click();

    await runCommand("git init");
    await runCommand("git add .");
    await runCommand('git commit -m "Start Tetris game"');
    await runCommand("git remote add origin https://github.com/you/tetris-game.git");
    await runCommand("git push -u origin main");
    await runCommand("open https://vercel.com/new");

    // Part 3
    await runCommand("cd ~");
    await runCommand("mkdir file-sorter");
    await runCommand("cd file-sorter");
    await runCommand('claude "Write a Node.js script called sort-downloads.js that reads ~/Downloads and moves files into subfolders by type — images, documents, and other."');
    await runCommand("cat sort-downloads.js");
    await runCommand("node sort-downloads.js");

    // Part 4
    await runCommand("cd ~");
    await runCommand('open -a "TextEdit"');
    await runCommand('say "The terminal runs everything"');
    await runCommand('curl "https://wttr.in/?format=3"');
    await runCommand('claude "help me understand my spending"');
    await runCommand('claude "Read ~/Downloads/budget.csv and tell me what\'s in it"');
    await runCommand('claude "Read ~/Downloads/budget.csv — which of those are wants vs. needs?"');
    await runCommand("cat ~/.claude/settings.json");

    // Lesson note should be visible with checklist and go-deeper message
    const noteEl = page.locator("#lesson-note");
    await noteEl.waitFor({ state: "visible" });
    const noteText = await noteEl.innerText();
    if (!noteText.includes("Now do it for real")) {
      throw new Error("Lesson note missing 'do it for real' checklist");
    }
    if (!noteText.includes("Open Terminal on your Mac")) {
      throw new Error("Lesson note missing first checklist step");
    }
    if (!noteText.toLowerCase().includes("ask a chat ai")) {
      throw new Error("Lesson note missing go-deeper message");
    }

    console.log("  New feature tests passed.");
  }

  async function runPart3ReloadTests() {
    await loadFreshPage();
    await chooseTool("claude");

    // Speed through Parts 1-2
    await runCommand("which node");
    await runCommand("brew install node");
    await runCommand("npm install -g @anthropic-ai/claude-code");
    await runCommand("export ANTHROPIC_API_KEY=sk-test-value");
    await runCommand("echo $ANTHROPIC_API_KEY");
    await runCommand("nano ~/.zshrc");
    await page.locator("#editor-text").fill("# shell config\nexport ANTHROPIC_API_KEY=sk-test-value\n");
    await page.locator("#save-editor").click();
    await page.locator("#close-editor").click();
    await runCommand("source ~/.zshrc");
    await runCommand("claude");
    await runCommand("mkdir tetris-game");
    await runCommand("cd tetris-game");
    await runCommand('claude "Build a simple Tetris web app in index.html, style.css, and game.js. Add package.json with dev and build commands. Do not put API keys in browser code."');
    await runCommand("ls");
    await runCommand("cat package.json");
    await runCommand("cat index.html");
    await runCommand("npm install");
    await runCommand("npm run dev");
    await runCommand("open http://127.0.0.1:5173");
    await runCommand("npm run build");

    await runCommand("touch .env");
    await runCommand("nano .env");
    await page.locator("#editor-text").fill("ANTHROPIC_API_KEY=sk-test-value\n");
    await page.locator("#save-editor").click();
    await page.locator("#close-editor").click();
    await runCommand("touch .gitignore");
    await runCommand("nano .gitignore");
    await page.locator("#editor-text").fill(".env\n");
    await page.locator("#save-editor").click();
    await page.locator("#close-editor").click();

    await runCommand("git init");
    await runCommand("git add .");
    await runCommand('git commit -m "Start Tetris game"');
    await runCommand("git remote add origin https://github.com/you/tetris-game.git");
    await runCommand("git push -u origin main");
    await runCommand("open https://vercel.com/new");

    // Enter Part 3
    await runCommand("cd ~");
    await runCommand("mkdir file-sorter");
    await runCommand("cd file-sorter");

    // ls ~/Downloads should show the fake files
    await runCommand("ls ~/Downloads");
    const text = await terminalText();
    if (!text.includes("photo.png") || !text.includes("song.mp3") || !text.includes("budget.csv")) {
      throw new Error("ls ~/Downloads should list the fake download files");
    }

    await runCommand('claude "Write a Node.js script called sort-downloads.js that reads ~/Downloads and moves files into subfolders by type — images, documents, and other."');

    // Reload mid-Part-3 — cwd and script state should persist
    // 18 (Parts 1-2) + new-project (cwd persists) + agent-script (scriptBuilt persists) = 20
    await assertProgressPreservedAcrossReload(20);

    // Verify cwd survived reload
    await runCommand("pwd");
    const pwdText = await terminalText();
    if (!pwdText.includes("/Users/player/file-sorter")) {
      throw new Error("cwd should be /Users/player/file-sorter after reload");
    }

    // Continue Part 3 after reload
    await runCommand("cat sort-downloads.js");
    await runCommand("node sort-downloads.js");

    await assertQuestCount(22, "Part 3 should complete after reload.");

    console.log("  Part 3 reload tests passed.");
  }

  async function runSkipTests() {
    // skip 2 should complete Part 1 (11 quests) and land in Part 2
    await loadFreshPage();
    await chooseTool("claude");
    await runCommand("skip 2");
    await assertQuestCount(11, "skip 2 should complete all 11 Part 1 quests.");
    await assertTerminalContains("Jumped to Part 2", "skip 2 message");

    // Can continue from Part 2
    await runCommand("npm run build");
    await assertQuestCount(12, "Should be able to continue Part 2 after skip (build).");

    // skip 3 should complete Parts 1+2 (16 quests) and land in Part 3
    await loadFreshPage();
    await chooseTool("codex");
    await runCommand("skip 3");
    // 18 from Parts 1+2, plus new-project auto-completes because cwd is file-sorter
    await assertQuestCount(19, "skip 3 should complete Parts 1-2 plus new-project.");
    await assertTerminalContains("Jumped to Part 3", "skip 3 message");

    // cwd should be in file-sorter
    await runCommand("pwd");
    await assertTerminalContains("/Users/player/file-sorter", "skip 3 should set cwd to file-sorter");

    // Can complete Part 3 from here
    await runCommand('codex "Write a Node.js script called sort-downloads.js that reads ~/Downloads and moves files into subfolders by type — images, documents, and other."');
    await runCommand("cat sort-downloads.js");
    await runCommand("node sort-downloads.js");
    await assertQuestCount(22, "Should complete all quests after skip 3 + Part 3 commands.");

    // skip with bad args
    await loadFreshPage();
    await chooseTool("claude");
    await runCommand("skip");
    await assertTerminalContains("Usage: skip 2, skip 3, or skip 4", "skip without args");
    await runCommand("skip 1");
    await assertTerminalContains("Usage: skip 2, skip 3, or skip 4", "skip 1 is invalid");

    // skip 4 is valid — should complete Parts 1-3 and land in Part 4
    await loadFreshPage();
    await chooseTool("claude");
    await runCommand("skip 4");
    await assertTerminalContains("Jumped to Part 4", "skip 4 message");
    // 22 from Parts 1-3 + part4-home auto-completes because cwd is HOME_DIR and run-script is done
    await assertQuestCount(23, "skip 4 should complete Parts 1-3 plus part4-home.");

    // skip should survive reload
    await loadFreshPage();
    await chooseTool("claude");
    await runCommand("skip 3");
    await assertProgressPreservedAcrossReload(19);

    console.log("  Skip tests passed.");
  }

  try {
    for (let iteration = 0; iteration < 3; iteration += 1) {
      for (const flow of flows) {
        await runFlow(flow, iteration);
      }
    }
    console.log("  Happy path tests passed.");

    await runErrorPathTests();
    await runNewFeatureTests();
    await runPart3ReloadTests();
    await runSkipTests();

    console.log("All play tests passed.");
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
