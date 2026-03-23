export const STORAGE_KEY = "termgame-v2";
export const HOME_DIR = "/Users/player";
export const PROFILE_PATH = `${HOME_DIR}/.zshrc`;
export const PROJECT_NAME = "tetris-game";
export const SCRIPT_PROJECT_NAME = "file-sorter";
export const LESSON_NOTE = [
  "<p><strong>You finished the lesson.</strong> Now you know the loop: prompt the agent, check the code, run it, ship it.</p>",
  "<p><strong>Now do it for real:</strong></p>",
  '<ol class="next-steps">',
  "<li>Open Terminal on your Mac (search for \"Terminal\" in Spotlight).</li>",
  "<li>Install Node.js: <code>brew install node</code> (if you don't have Homebrew, visit <a href=\"https://brew.sh\" target=\"_blank\" rel=\"noopener\">brew.sh</a>).</li>",
  "<li>Install the tool you chose — <code>npm install -g @openai/codex</code> or <code>npm install -g @anthropic-ai/claude-code</code>.</li>",
  '<li>Get an API key from the <a href="https://console.anthropic.com/" target="_blank" rel="noopener">Anthropic Console</a> or the <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">OpenAI API keys page</a>. Each key is pay-as-you-go — you pay a small amount per request.</li>',
  "<li>Set your key: <code>export ANTHROPIC_API_KEY=your-key</code> (or <code>OPENAI_API_KEY</code>). Add the same line to <code>~/.zshrc</code> so new terminal windows load it.</li>",
  "<li>Make a folder, move into it, and ask the agent to build something.</li>",
  "<li>Check what it made, run it locally, and when you're ready, push to GitHub and deploy.</li>",
  "</ol>",
  "<p>Everything here — git, npm, hosting, API keys — goes way deeper. Ask a chat AI when you're curious.</p>"
].join("");

export const TOOL_CONFIG = {
  codex: {
    key: "codex",
    label: "Codex",
    envVar: "OPENAI_API_KEY",
    installCommand: "npm install -g @openai/codex",
    startDisplay: "codex --login or codex",
    startCommands: ["codex --login", "codex"],
    keySourceHint: "Go to <code>platform.openai.com/api-keys</code>, create an OpenAI API key, and copy it.",
    installCheck: (state) => state.installed.codex,
    startCheck: (state) => state.started.codex
  },
  claude: {
    key: "claude",
    label: "Claude Code",
    envVar: "ANTHROPIC_API_KEY",
    installCommand: "npm install -g @anthropic-ai/claude-code",
    startDisplay: "claude",
    startCommands: ["claude"],
    keySourceHint: "Go to <code>console.anthropic.com</code>, create an Anthropic API key, and copy it.",
    installCheck: (state) => state.installed.claude,
    startCheck: (state) => state.started.claude
  }
};

export function makeInitialState() {
  return {
    selectedTool: null,
    cwd: HOME_DIR,
    lastCommand: "",
    lastEchoedVar: "",
    sourcedProfile: false,
    app: {
      built: false,
      packageViewed: false,
      indexViewed: false,
      depsInstalled: false,
      serverRunning: false,
      previewOpened: false,
      buildReady: false,
      envHasKey: false,
      gitignoreOk: false,
      deployed: false,
    },
    script: {
      built: false,
      reviewed: false,
      ran: false,
    },
    fix: {
      broken: false,
      errorSeen: false,
      fixed: false,
      iterated: false,
    },
    explore: {
      openedApp: false,
      spoke: false,
      curled: false,
      docWritten: false,
      mcpViewed: false,
      vagueRan: false,
      specificRan: false,
    },
    installed: {
      brew: true,
      node: false,
      npm: false,
      codex: false,
      claude: false
    },
    env: {},
    auth: {
      codex: false,
      claude: false
    },
    git: {
      initialized: false,
      staged: false,
      commitCount: 0,
      remoteUrl: "",
      pushed: false
    },
    started: {
      codex: false,
      claude: false
    },
    files: {
      "/Users": { type: "dir" },
      [HOME_DIR]: { type: "dir" },
      [PROFILE_PATH]: { type: "file", content: "# shell config\n" },
      [`${HOME_DIR}/Downloads`]: { type: "dir" },
      [`${HOME_DIR}/Downloads/photo.png`]: { type: "file", content: "(image data)" },
      [`${HOME_DIR}/Downloads/notes.pdf`]: { type: "file", content: "(pdf data)" },
      [`${HOME_DIR}/Downloads/budget.csv`]: { type: "file", content: "item,cost\ncoffee,5\ntherapy,150\ntoken spend,47\nice cream,23\nunused gym membership,40\n" },
      [`${HOME_DIR}/Downloads/song.mp3`]: { type: "file", content: "(audio data)" },
      [`${HOME_DIR}/Downloads/readme.txt`]: { type: "file", content: "Hello world\n" },
      [`${HOME_DIR}/.claude`]: { type: "dir" },
      [`${HOME_DIR}/.claude/settings.json`]: {
        type: "file",
        content: JSON.stringify({
          mcpServers: {
            "google-calendar": {
              command: "npx",
              args: ["-y", "@anthropic-ai/mcp-server-google-calendar"]
            }
          }
        }, null, 2)
      }
    },
    questsDone: {},
    terminalLines: []
  };
}

export function selectedToolConfig(state) {
  return state.selectedTool ? TOOL_CONFIG[state.selectedTool] : null;
}

function currentKeyName(state) {
  const tool = selectedToolConfig(state);
  return tool ? tool.envVar : "API_KEY";
}

export function projectDir() {
  return `${HOME_DIR}/${PROJECT_NAME}`;
}

export function scriptProjectDir() {
  return `${HOME_DIR}/${SCRIPT_PROJECT_NAME}`;
}

function toolQuest(toolKey, type) {
  const tool = TOOL_CONFIG[toolKey];

  if (type === "install") {
    return {
      id: "install-tool",
      title: `Install ${tool.label}`,
      helper: "This installs the agent so you can run it from anywhere on your computer.",
      commands: [tool.installCommand],
      check: (state) => tool.installCheck(state)
    };
  }

  return {
    id: "start-tool",
    title: `Start ${tool.label}`,
    helper: "Fire up the agent. After this you can start telling it what to build.",
    commands: tool.startCommands,
    check: (state) => tool.startCheck(state)
  };
}

function agentPromptCommand(toolKey) {
  const binary = toolKey === "codex" ? "codex" : "claude";
  return `${binary} "Build a simple Tetris web app in index.html, style.css, and game.js. Add package.json with dev and build commands. Do not put API keys in browser code."`;
}

function agentScriptPromptCommand(toolKey) {
  const binary = toolKey === "codex" ? "codex" : "claude";
  return `${binary} "Write a Node.js script called sort-downloads.js that reads ~/Downloads and moves files into subfolders by type — images, documents, and other."`;
}

export function buildQuests(state) {
  if (!state.selectedTool) return [];

  const tool = selectedToolConfig(state);
  const keyName = currentKeyName(state);

  return [
    {
      id: "check-node",
      part: 1,
      title: "Check for Node.js",
      helper: "First things first — is Node.js already on this computer? Coding tools need it.",
      commands: ["which node"],
      check: (currentState) => currentState.lastCommand === "which node"
    },
    {
      id: "install-node",
      part: 1,
      title: "Install Node.js",
      helper: "Homebrew is a Mac tool for installing stuff. Use it to grab Node.js, which most coding tools depend on.",
      commands: ["brew install node"],
      check: (currentState) => currentState.installed.node
    },
    { ...toolQuest(tool.key, "install"), part: 1 },
    {
      id: "set-key",
      part: 1,
      title: "Get and verify your API key",
      helper: `${tool.keySourceHint} Then run the command below — replace <code>your-key-here</code> with the key you copied, and run <code>echo</code> to confirm it's set. Treat the key like a password: don't share it or paste it into files others can see.`,
      commands: [`export ${keyName}=your-key-here`, `echo $${keyName}`],
      check: (currentState) => Boolean(currentState.env[keyName]) && currentState.lastEchoedVar === keyName
    },
    {
      id: "persist-key",
      part: 1,
      title: "Save the key for future terminal windows",
      helper: "That <code>export</code> only lasts until you close this window — then it's gone. <code>~/.zshrc</code> is a file that runs every time you open a new terminal. Add your key there so it's always available. <code>nano</code> is a tiny text editor that runs right inside the terminal — use it to open the file, paste your key, then save.",
      commands: ["nano ~/.zshrc", "source ~/.zshrc"],
      check: (currentState) => currentState.sourcedProfile && currentState.files[PROFILE_PATH].content.includes(`export ${keyName}=`)
    },
    { ...toolQuest(tool.key, "start"), part: 1 },
    {
      id: "create-project",
      part: 1,
      title: "Create your Tetris project",
      helper: "Make a folder for the project, then <code>cd</code> into it. Every project lives in its own folder.",
      commands: [`mkdir ${PROJECT_NAME}`, `cd ${PROJECT_NAME}`],
      check: (currentState) => currentState.cwd === projectDir()
    },
    {
      id: "agent-build",
      part: 1,
      title: `Ask ${tool.label} to make the app`,
      helper: "Tell the agent what to build. The prompt below is specific on purpose — it says what kind of app, what files to create, and how to structure it. The more precise you are, the better the result.",
      commands: [agentPromptCommand(tool.key)],
      check: (currentState) => currentState.app.built
    },
    {
      id: "review-app",
      part: 1,
      title: "Review the generated files",
      helper: "Don't just trust the agent — read what it made. <code>ls</code> lists files. <code>cat</code> prints a file's contents so you can read it right here in the terminal. Check <code>package.json</code> (the app's config) and <code>index.html</code> (what people see in the browser).",
      commands: ["ls", "cat package.json", "cat index.html"],
      check: (currentState) => currentState.app.packageViewed && currentState.app.indexViewed
    },
    {
      id: "install-app-deps",
      part: 1,
      title: "Install the app's packages",
      helper: "Packages are chunks of code other people wrote that your app uses instead of reinventing. <code>npm install</code> reads <code>package.json</code> and downloads them all.",
      commands: ["npm install"],
      check: (currentState) => currentState.app.depsInstalled
    },
    {
      id: "run-localhost",
      part: 1,
      title: "Run the app locally",
      helper: "<code>npm run dev</code> starts the app on your computer. Open the localhost URL to see your Tetris game in a browser — no one else can see it yet.",
      commands: ["npm run dev", "open http://127.0.0.1:5173"],
      check: (currentState) => currentState.app.serverRunning && currentState.app.previewOpened
    },
    {
      id: "build-production",
      part: 2,
      title: "Build the website version",
      helper: "<code>npm run build</code> bundles your app into a compact package ready for the web. This is the version Vercel will put online — not the development version you ran locally.",
      commands: ["npm run build"],
      check: (currentState) => currentState.app.buildReady
    },
    {
      id: "create-env",
      part: 2,
      title: "Move your API key to a .env file",
      helper: `Each project should carry its own API key — that's what a <code>.env</code> file is for. Create it, open it with <code>nano</code>, and add your key in this format: <code>${keyName}=your-key-here</code>. One key per line, nothing else.`,
      commands: ["touch .env", "nano .env"],
      check: (currentState) => currentState.app.envHasKey
    },
    {
      id: "create-gitignore",
      part: 2,
      title: "Protect .env with .gitignore",
      helper: "<code>.gitignore</code> tells git which files to skip. Add <code>.env</code> to it so your secret key never gets uploaded to GitHub. This is a real-world habit — every project with secrets has a <code>.gitignore</code>.",
      commands: ["touch .gitignore", "nano .gitignore"],
      check: (currentState) => currentState.app.gitignoreOk
    },
    {
      id: "git-init",
      part: 2,
      title: "Start git tracking",
      helper: "git tracks every change you make to your project — like version history for your code. <code>git init</code> turns this folder into a git project.",
      commands: ["git init"],
      check: (currentState) => currentState.git.initialized
    },
    {
      id: "first-commit",
      part: 2,
      title: "Save your first version",
      helper: "<code>git add .</code> stages your files (\"hey git, include these\") and <code>git commit</code> saves a snapshot you can always come back to.",
      commands: ["git add .", 'git commit -m "Start Tetris game"'],
      check: (currentState) => currentState.git.commitCount > 0
    },
    {
      id: "github-push",
      part: 2,
      title: "Copy it from your computer to GitHub",
      helper: "Right now the code only lives on your computer. These commands upload it to GitHub so you have a backup — and so a web host can grab it from there.",
      commands: [`git remote add origin https://github.com/you/${PROJECT_NAME}.git`, "git push -u origin main"],
      check: (currentState) => Boolean(currentState.git.remoteUrl) && currentState.git.pushed
    },
    {
      id: "host-app",
      part: 2,
      title: "Connect GitHub to a web host",
      helper: "Vercel pulls your code from GitHub, builds it, and gives you a live URL. This is the last step — after this, anyone can visit your Tetris game.",
      commands: ["open https://vercel.com/new"],
      check: (currentState) => currentState.app.deployed
    },
    {
      id: "new-project",
      part: 3,
      title: "Start a new project",
      helper: "New project, same drill: make a folder, move into it. This time you're building a script that runs on your computer, not a website.",
      commands: ["cd ~", `mkdir ${SCRIPT_PROJECT_NAME}`, `cd ${SCRIPT_PROJECT_NAME}`],
      check: (currentState) => currentState.cwd === scriptProjectDir()
    },
    {
      id: "agent-script",
      part: 3,
      title: `Ask ${tool.label} to write a script`,
      helper: "Same move as before — tell the agent what to build. This time it's a script that tidies up your Downloads folder by sorting files into subfolders.",
      commands: [agentScriptPromptCommand(tool.key)],
      check: (currentState) => currentState.script.built
    },
    {
      id: "review-script",
      part: 3,
      title: "Review the script",
      helper: "Always read before you run — especially a script that moves your files around. <code>cat</code> prints the file so you can eyeball it.",
      commands: ["cat sort-downloads.js"],
      check: (currentState) => currentState.script.reviewed
    },
    {
      id: "run-script",
      part: 3,
      title: "Run the script",
      helper: "<code>node sort-downloads.js</code> runs the script. No browser, no server — it just does its thing and exits. This same workflow works for anything: organizing files, pulling data, automating boring stuff.",
      commands: ["node sort-downloads.js"],
      check: (currentState) => currentState.script.ran
    },
    {
      id: "part4-home",
      part: 4,
      title: "Head back home",
      helper: "Three parts done. Now for what most tutorials skip: the terminal isn't just for code projects — it's the control layer for your entire Mac.",
      commands: ["cd ~"],
      check: (currentState) => currentState.questsDone && currentState.questsDone["run-script"] && currentState.cwd === HOME_DIR
    },
    {
      id: "open-app",
      part: 4,
      title: "Open any Mac app from here",
      helper: "The terminal can launch any application on your Mac. No Dock, no Spotlight — just the name.",
      commands: ['open -a "TextEdit"'],
      check: (currentState) => currentState.explore.openedApp
    },
    {
      id: "terminal-speaks",
      part: 4,
      title: "Make the terminal speak",
      helper: "Your Mac has a speech synthesizer built in. The terminal has a direct line to it — and to hundreds of other system services just like this.",
      commands: ['say "The terminal runs everything"'],
      check: (currentState) => currentState.explore.spoke
    },
    {
      id: "curl-web",
      part: 4,
      title: "Pull live data from anywhere",
      helper: "<code>curl</code> fetches any URL — a weather API, a GitHub endpoint, a raw file on the internet. If it has an address, the terminal can reach it.",
      commands: ['curl "https://wttr.in/?format=3"'],
      check: (currentState) => currentState.explore.curled
    },
    {
      id: "vague-prompt",
      part: 4,
      title: "Ask vaguely, get vagueness back",
      helper: "Try asking Claude about your spending without giving it any context. See what it does with that.",
      commands: [`${tool.key} "help me understand my spending"`],
      check: (currentState) => currentState.explore.vagueRan
    },
    {
      id: "claude-doc",
      part: 4,
      title: "Now give it the actual file",
      helper: "Same topic, specific context. Point Claude at a real file with a real question — watch the difference.",
      commands: [`${tool.key} "Read ~/Downloads/budget.csv and tell me what's in it"`],
      check: (currentState) => currentState.explore.docWritten
    },
    {
      id: "specific-followup",
      part: 4,
      title: "Ask a follow-up question",
      helper: "You got the analysis. Now push further — ask Claude to categorize what it found. Same file, new angle. This is what the loop looks like.",
      commands: [`${tool.key} "Read ~/Downloads/budget.csv — which of those are wants vs. needs?"`],
      check: (currentState) => currentState.explore.specificRan
    },
    {
      id: "mcp-intro",
      part: 4,
      title: "Connect Claude to everything else",
      helper: "MCP servers plug new capabilities into Claude — your calendar, Slack, databases, GitHub. This file is where they're configured. Add one and Claude can read your inbox, schedule meetings, or query your data directly.",
      commands: ["cat ~/.claude/settings.json"],
      check: (currentState) => currentState.explore.mcpViewed
    },
    {
      id: "fix-return",
      part: 5,
      title: "Go back to your Tetris project",
      helper: "Time to learn the most important skill: what to do when something breaks. Head back to your Tetris project.",
      commands: [`cd ${PROJECT_NAME}`],
      check: (currentState) => currentState.questsDone && currentState.questsDone["mcp-intro"] && currentState.cwd === projectDir()
    },
    {
      id: "fix-break",
      part: 5,
      title: "Break something on purpose",
      helper: "Open <code>game.js</code> in nano and change <code>getElementById</code> to <code>getElementByld</code> (lowercase L → lowercase d). Save it. You're about to learn what an error looks like.",
      commands: ["nano game.js"],
      check: (currentState) => currentState.fix.broken
    },
    {
      id: "fix-see-error",
      part: 5,
      title: "Run it and watch it fail",
      helper: "Now run the app. It will break — and that's the point. Read the error message. It tells you exactly what went wrong.",
      commands: ["npm run dev"],
      check: (currentState) => currentState.fix.errorSeen
    },
    {
      id: "fix-feed-error",
      part: 5,
      title: "Feed the error back to the agent",
      helper: "Copy the error message and give it to the agent. This is the real workflow: break → read error → tell agent → fixed. Most people quit at the red text. You won't.",
      commands: [`${tool.key} "I got an error: getElementByld is not a function. Fix game.js."`],
      check: (currentState) => currentState.fix.fixed
    },
    {
      id: "fix-iterate",
      part: 5,
      title: "Ask for a new feature",
      helper: "The app works again. Now push it further — ask the agent to add something new. You don't have to get everything right in one shot. Real agent use is a conversation, not a single prompt.",
      commands: [`${tool.key} "Add a high-score display to the Tetris game that persists between games using localStorage"`],
      check: (currentState) => currentState.fix.iterated
    }
  ];
}

const BASE_CONCEPTS = [
  {
    id: "terminal",
    title: "What is: Terminal",
    body: "The text window where you type commands. Move between folders, start tools, see what's happening — all by typing."
  },
  {
    id: "path",
    title: "What is: a path",
    body: "A file's address on your computer, like <code>/Users/player/tetris-game</code>. Every file and folder has one."
  },
  {
    id: "node",
    title: "What is: Node.js",
    body: "A tool that lets JavaScript run on your computer, not just in a browser. Most coding agents need it installed — it's the first thing to check."
  },
  {
    id: "homebrew",
    title: "What is: Homebrew",
    body: "A Mac tool that installs other tools. Think of it as an app store for your terminal."
  },
  {
    id: "npm",
    title: "What is: npm",
    body: "The package manager for JavaScript. It downloads tools and libraries your project needs."
  },
  {
    id: "prompt",
    title: "Workflow: the agent prompt",
    body: "The message you type telling the agent what to build. The more specific, the better the result."
  },
  {
    id: "review",
    title: "Workflow: check the agent's work",
    body: "Agents are helpful but not perfect. Always read what they made before you run it — look for missing files, weird code, or leaked secrets."
  },
  {
    id: "api-key",
    title: "What is: an API key",
    body: "A secret token that proves you're allowed to use a service. Treat it like a password — anyone who has it can use your account."
  },
  {
    id: "nano",
    title: "What is: nano",
    body: "A tiny text editor that runs right inside the terminal. Handy for quick edits to config files."
  },
  {
    id: "export",
    title: "Command: export",
    body: "<code>export NAME=value</code> stores a value in this terminal window so programs you run can find it. Close the window and it's gone — unless you save it in <code>~/.zshrc</code>."
  },
  {
    id: "package-json",
    title: "What is: package.json",
    body: "The app's manifest. Lists which packages (other people's code) it depends on, plus shortcut commands like <code>dev</code> and <code>build</code>."
  },
  {
    id: "npm-install",
    title: "Command: npm install",
    body: "Reads <code>package.json</code> and downloads everything the app needs. Run this before anything else."
  },
  {
    id: "npm-run-dev",
    title: "Command: npm run dev",
    body: "Starts a local server so you can test the app in your browser. Only you can see it."
  },
  {
    id: "npm-run-build",
    title: "Command: npm run build",
    body: "Bundles your app into the optimized version a web host will serve to the world."
  },
  {
    id: "frontend-secrets",
    title: "Concept: secret keys in website code",
    body: "Browser code is public — anyone can read it. Never put API keys in <code>index.html</code>, <code>game.js</code>, or anything a visitor's browser downloads."
  },
  {
    id: "persist",
    title: "Why: save it to ~/.zshrc",
    body: "<code>export</code> only lasts for one terminal session. Add the same line to <code>~/.zshrc</code> and every new terminal window will have it."
  },
  {
    id: "dotenv",
    title: "What is: a .env file",
    body: "A file in your project folder that holds secret keys. Many tools read it automatically so you don't need <code>export</code>. Never commit it to git — add <code>.env</code> to <code>.gitignore</code>."
  },
  {
    id: "gitignore",
    title: "What is: .gitignore",
    body: "A list of files git should pretend don't exist. Put <code>.env</code> in here so your secret keys never end up on GitHub."
  },
  {
    id: "python",
    title: "What is: Python",
    body: "Another programming language. You won't write any Python here — it just comes up because it has a handy built-in web server."
  },
  {
    id: "ip",
    title: "What is: an IP address",
    body: "A number that identifies a computer on a network. <code>127.0.0.1</code> always means \"this computer\" — yours."
  },
  {
    id: "localhost",
    title: "What is: localhost",
    body: "Your computer can run a web server just like the ones hosting real sites. <code>localhost</code> and <code>127.0.0.1</code> are its local address — only reachable from your own machine. Once it looks right here, you deploy and it gets a real public URL."
  },
  {
    id: "local",
    title: "Concept: local",
    body: "On your own computer. Nothing is online yet — just you and your code."
  },
  {
    id: "git",
    title: "What is: git",
    body: "Version control for your code. Every time you save a commit, git remembers exactly what changed and lets you go back."
  },
  {
    id: "github",
    title: "What is: GitHub",
    body: "A website that stores your git projects online. Backup, collaboration, and the place web hosts pull your code from."
  },
  {
    id: "zshrc",
    title: "What is: ~/.zshrc",
    body: "A startup script that runs every time you open a new terminal. Put settings here that you always want."
  },
  {
    id: "hosting",
    title: "What is: a web host",
    body: "A service that takes your project and makes it available at a real URL anyone can visit."
  },
  {
    id: "vercel",
    title: "What is: Vercel",
    body: "One popular web host. It grabs your code from GitHub, builds it, and gives you a live URL in about a minute."
  },
  {
    id: "remote",
    title: "Concept: remote computer",
    body: "Someone else's computer, out on the internet. GitHub and Vercel run your code on remote computers."
  },
  {
    id: "go-deeper",
    title: "Tip: going deeper",
    body: "Everything here — git, npm, hosting, API keys — has layers we barely scratched. Ask a chat AI when you're curious. Rabbit holes are fun."
  },
  {
    id: "node-run",
    title: "Command: node script.js",
    body: "Runs a JavaScript file directly on your computer. No browser, no server — it does its thing and exits."
  },
  {
    id: "local-tools",
    title: "Concept: local tools",
    body: "Agents aren't just for websites. They can write scripts that rename files, sort folders, pull data, or automate any tedious task you can describe."
  },
  {
    id: "same-workflow",
    title: "Concept: same workflow",
    body: "Folder → prompt → review → run. Whether it's a website or a file-sorting script, the steps are the same. You already know the loop."
  },
  {
    id: "git-staging",
    title: "Why: git add before commit",
    body: "<code>git add</code> picks which changes go into the next snapshot. <code>git commit</code> names and saves it. Two steps so you can include exactly what's ready and leave out what isn't."
  },
  {
    id: "environments",
    title: "What is: an environment",
    body: "The set of settings that configure where your code runs. Your laptop is the dev environment — local, private, safe to break. The web host is production — public, real traffic. <code>.env</code> files hold the settings that differ between them."
  },
  {
    id: "open-a",
    title: "Command: open -a",
    body: "Launches any application on your Mac by name. <code>open -a 'Spotify'</code>, <code>open -a 'Safari'</code> — anything in your Applications folder is reachable this way."
  },
  {
    id: "say-cmd",
    title: "Command: say",
    body: "Sends text to macOS's built-in speech synthesizer. A good reminder that the terminal has access to your entire OS, not just files and code."
  },
  {
    id: "curl-cmd",
    title: "Command: curl",
    body: "Makes HTTP requests from the terminal — fetches a URL and prints the response. Most APIs, web services, and webhooks speak HTTP, so <code>curl</code> can talk to all of them."
  },
  {
    id: "mcp",
    title: "What is: MCP servers",
    body: "Plugins that give Claude new capabilities beyond coding: calendar access, GitHub, Slack, databases, email. Configured in a JSON file. Add one and Claude can take action in those systems on your behalf."
  },
  {
    id: "action-ai",
    title: "Concept: action AI",
    body: "Claude in the terminal isn't a chatbot — it's an agent that takes actions. It reads files, writes code, runs commands, and with MCP can reach into external services. Chat AI answers. Action AI does."
  },
  {
    id: "prompt-specificity",
    title: "Concept: specificity = quality",
    body: "The gap between a vague prompt and a specific one is usually the difference between 'meh' and 'useful'. A file path, a concrete question, and a clear goal give Claude everything it needs. Context in, quality out."
  },
  {
    id: "errors-are-data",
    title: "Concept: errors are data",
    body: "An error message tells you what went wrong and where. It's not a dead end — it's the next clue. Read it, copy it, and give it to the agent."
  },
  {
    id: "error-loop",
    title: "Workflow: the error loop",
    body: "Break → read the error → tell the agent → fixed. This is 80% of real-world agent use. Most people close the terminal when they see red text. The fix is usually one prompt away."
  },
  {
    id: "iterative-prompting",
    title: "Concept: iterative prompting",
    body: "You don't have to get everything right in one shot. Start simple, get it working, then ask for more. Each prompt builds on the last. The agent remembers what it already made."
  }
];

export function getConcepts(state) {
  const tool = selectedToolConfig(state);
  const concepts = [...BASE_CONCEPTS];

  if (tool) {
    concepts.push(
      {
        id: "tool-install",
        title: "Setup: install the tool",
        body: `For this track, install the tool with <code>${tool.installCommand}</code>.`
      },
      {
        id: "tool-key-source",
        title: "Setup: API key source",
        body: tool.keySourceHint
      },
      {
        id: "tool-key-safety",
        title: "Concept: keep keys safe",
        body: "Treat the key like a password. Do not save it in git, put it in website code, or paste it into public screenshots."
      },
      {
        id: "tool-flow",
        title: "Concept: from your computer to the web",
        body: "localhost → git → GitHub → web host → live site. Each step moves your code one hop closer to the public internet."
      },
      {
        id: "tool-start",
        title: "Setup: open the tool",
        body: `Once installed, open ${tool.label} with <code>${tool.startDisplay}</code> while you work on the Tetris game.`
      }
    );
  } else {
    concepts.push({
      id: "track-choice",
      title: "Setup: track choice",
      body: "Choose a track first so the lesson can show the right install command, API key name, and start command."
    });
  }

  return concepts;
}

export function getActiveHintIds(currentQuestId) {
  if (!currentQuestId) return ["terminal", "track-choice"];
  if (currentQuestId === "check-node") return ["terminal", "node"];
  if (currentQuestId === "install-node") return ["homebrew", "node"];
  if (currentQuestId === "install-tool") return ["npm", "tool-install"];
  if (currentQuestId === "set-key") return ["api-key", "tool-key-source", "export", "tool-key-safety"];
  if (currentQuestId === "persist-key") return ["nano", "zshrc", "persist", "dotenv"];
  if (currentQuestId === "start-tool") return ["tool-start", "prompt"];
  if (currentQuestId === "create-project") return ["local", "path", "tool-flow"];
  if (currentQuestId === "agent-build") return ["prompt", "review", "frontend-secrets"];
  if (currentQuestId === "review-app") return ["review", "package-json", "frontend-secrets"];
  if (currentQuestId === "install-app-deps") return ["package-json", "npm-install", "go-deeper"];
  if (currentQuestId === "run-localhost") return ["npm-run-dev", "localhost", "local"];
  if (currentQuestId === "build-production") return ["npm-run-build", "hosting"];
  if (currentQuestId === "create-env") return ["dotenv", "api-key", "tool-key-safety"];
  if (currentQuestId === "create-gitignore") return ["gitignore", "dotenv", "tool-key-safety"];
  if (currentQuestId === "git-init") return ["git", "environments"];
  if (currentQuestId === "first-commit") return ["git", "git-staging"];
  if (currentQuestId === "github-push") return ["github", "hosting", "remote", "tool-flow"];
  if (currentQuestId === "host-app") return ["vercel", "hosting", "remote", "npm-run-build", "go-deeper"];
  if (currentQuestId === "new-project") return ["path", "same-workflow"];
  if (currentQuestId === "agent-script") return ["prompt", "review", "local-tools"];
  if (currentQuestId === "review-script") return ["review", "node-run"];
  if (currentQuestId === "run-script") return ["node-run", "same-workflow", "go-deeper"];
  if (currentQuestId === "part4-home") return ["action-ai", "same-workflow"];
  if (currentQuestId === "open-app") return ["open-a", "action-ai"];
  if (currentQuestId === "terminal-speaks") return ["say-cmd", "action-ai"];
  if (currentQuestId === "curl-web") return ["curl-cmd", "action-ai"];
  if (currentQuestId === "vague-prompt") return ["prompt", "prompt-specificity"];
  if (currentQuestId === "claude-doc") return ["prompt-specificity", "action-ai"];
  if (currentQuestId === "specific-followup") return ["prompt-specificity", "action-ai"];
  if (currentQuestId === "mcp-intro") return ["mcp", "action-ai", "go-deeper"];
  if (currentQuestId === "fix-return") return ["same-workflow", "errors-are-data"];
  if (currentQuestId === "fix-break") return ["errors-are-data", "nano"];
  if (currentQuestId === "fix-see-error") return ["errors-are-data", "error-loop"];
  if (currentQuestId === "fix-feed-error") return ["error-loop", "prompt-specificity"];
  if (currentQuestId === "fix-iterate") return ["iterative-prompting", "prompt", "go-deeper"];
  return ["terminal"];
}

export function getIntroLines(state) {
  const lines = [{ text: "Welcome to TermGame.", kind: "info" }];

  if (!state.selectedTool) {
    lines.push({ text: "Choose Codex or Claude Code above to begin.", kind: "system" });
    return lines;
  }

  lines.push(
    { text: `You picked: ${selectedToolConfig(state).label}.`, kind: "info" },
    { text: "The plan: set up a coding agent, build a Tetris game with it, check the code, ship it live, then use the same trick for a local script.", kind: "system" },
    { text: "Let's go. Type: which node", kind: "system" }
  );

  return lines;
}
