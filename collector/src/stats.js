import { scanClaudeActivity, projectKey } from './agents.js';

/** Merges herdr (preferred) or Claude-log activity with token counts into one Stats object. */
export async function collect({ herdr, claudeRoot, counter, nowMs }) {
  const h = herdr ? await herdr() : null;
  const act = scanClaudeActivity(claudeRoot, nowMs);
  counter.scan();
  const rawKeys = h ? h.cwds : act.keys;
  const keys = [...new Set(rawKeys.map(projectKey))];
  return {
    source: h ? 'herdr' : 'claude',
    working: h ? h.working : act.keys.length,
    subagents: act.subagents,
    projects: keys.length,
    keys,
    tokensToday: counter.total,
    tokensPerMin: counter.perMinute,
    updatedAt: nowMs,
  };
}
