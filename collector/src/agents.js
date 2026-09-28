import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

// herdr statuses: idle | working | blocked | done | unknown. `blocked` waits on the user, so it doesn't count.
export function parseHerdrList(text) {
  const agents = JSON.parse(text)?.result?.agents;
  if (!Array.isArray(agents)) throw new Error('unexpected herdr output');
  const working = agents.filter((a) => a.agent_status === 'working');
  return {
    total: agents.length,
    working: working.length,
    blocked: agents.filter((a) => a.agent_status === 'blocked').length,
    cwds: working.map((a) => a.cwd || a.foreground_cwd || ''),
  };
}

/** Resolves to the parsed agent list, or null when herdr is missing, fails, or prints something unexpected. */
export function runHerdr(bin = 'herdr', timeoutMs = 3000) {
  return new Promise((resolve) => {
    execFile(bin, ['agent', 'list'], { timeout: timeoutMs }, (err, stdout) => {
      if (err) return resolve(null);
      try { resolve(parseHerdrList(stdout)); } catch { resolve(null); }
    });
  });
}

/** Folds Claude Code worktrees into their repo, for both real paths and ~/.claude/projects dir names. */
export function projectKey(s) {
  return s.replace(/\/\.claude\/worktrees\/[^/]+\/?$/, '').replace(/--claude-worktrees-.*$/, '');
}

const readdir = (d) => { try { return fs.readdirSync(d, { withFileTypes: true }); } catch { return []; } };
const mtimeMs = (p) => { try { return fs.statSync(p).mtimeMs; } catch { return 0; } };

/**
 * Activity inferred from Claude Code logs: a session whose log was written recently is working.
 * `keys` has one project-dir name per active main session; `subagents` counts active subagent logs.
 */
export function scanClaudeActivity(root, nowMs, { mainWindowMs = 30_000, subWindowMs = 30_000 } = {}) {
  const keys = [];
  let subagents = 0;
  for (const proj of readdir(root)) {
    if (!proj.isDirectory()) continue;
    const pdir = path.join(root, proj.name);
    for (const e of readdir(pdir)) {
      const full = path.join(pdir, e.name);
      if (e.isFile() && e.name.endsWith('.jsonl')) {
        if (nowMs - mtimeMs(full) <= mainWindowMs) keys.push(proj.name);
      } else if (e.isDirectory()) {
        const sdir = path.join(full, 'subagents');
        for (const s of readdir(sdir)) {
          if (s.isFile() && s.name.endsWith('.jsonl') && nowMs - mtimeMs(path.join(sdir, s.name)) <= subWindowMs) subagents++;
        }
      }
    }
  }
  return { keys, subagents };
}
