# TermGame

You don't need to know how to code to level up your use of AI. All you need is the terminal.

**[termgame.ai](https://termgame.ai/)** — runs in your browser, nothing touches your real computer.

TermGame teaches you how to use AI coding agents through a simulated terminal. Pick Codex or Claude Code, then work through 35 quests across five parts.

## What it covers

**Part 1 — Build it**
Set up a coding agent, give it a prompt, check what it made, install packages, preview locally.

**Part 2 — Ship it**
Build, save with git, push to GitHub, connect to a host.

**Part 3 — Script it**
Same workflow, different use case: a local script that sorts files in ~/Downloads.

**Part 4 — Connect it**
The terminal reaches everything: apps, APIs, the web.

**Part 5 — Fix it**
Break something, read the error, feed it back to the agent, then iterate on a new feature.

## API keys

The lesson is a simulation — no real key needed. When you're ready to try for real:

- **Claude Code:** [Anthropic Console](https://console.anthropic.com/) → set as `ANTHROPIC_API_KEY`
- **Codex:** [OpenAI API keys](https://platform.openai.com/api-keys) → set as `OPENAI_API_KEY`

Both are pay-as-you-go. Treat them like passwords.

## Feedback

[Send feedback](https://docs.google.com/forms/d/e/1FAIpQLSdj_Bh24rJmqCWVQcPSMCALddLdc_Qq5MEwF3jUwjlbNDHIbg/viewform) — your tool, quest, and progress are pre-filled automatically.

## Analytics

Page views and events (tool picks, quest completions) are tracked via [GoatCounter](https://saranormous.goatcounter.com/) — privacy-friendly, no cookies, open source.

---

## For contributors

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture, quest-authoring guide, and extension ideas.

### Quick start

```bash
npm install
npx playwright install chromium
npm run lint
npm test
```

For local dev: `npm run dev`, then open [http://127.0.0.1:8000](http://127.0.0.1:8000).

### What it is

- Static web app — no framework, no build step
- Simulated terminal and filesystem (nothing real runs)
- Beginner lesson focused on useful mental models, not perfect realism
- State grouped into `app`, `script`, `fix`, `explore` objects
- Light/dark theme support

### Project structure

```text
index.html          Single-page shell + OG meta tags
favicon.svg         Terminal prompt favicon (>_)
og-image.png        Social sharing card (1200x630)
CNAME               Custom domain (termgame.ai)
src/
  lessons.js        Quest definitions, state, glossary, tool configs
  commands.js       Command registry (one register() call per command)
  app.js            Rendering, events, analytics, feedback/share links
  styles.css        12/13/14px type scale, dark/light themes
tests/
  playtest.js       Playwright E2E tests (35 quests, skip, error paths)
```

### Safety

- Never commit real API keys
- Keep examples clearly fake (`sk-test-value`)
- Do not put secrets in browser code examples

---

Made by [Sarah Guo](https://x.com/saranormous)
