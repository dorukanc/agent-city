import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { collect } from '../src/stats.js';

const fakeCounter = { scan() {}, total: 1234, perMinute: 56 };
const emptyRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ac-stats-'));

test('uses herdr when available and folds worktrees into projects', async () => {
  const s = await collect({
    herdr: async () => ({ total: 3, working: 2, blocked: 0, cwds: ['/r', '/r/.claude/worktrees/x'] }),
    claudeRoot: emptyRoot(), counter: fakeCounter, nowMs: 1,
  });
  assert.equal(s.source, 'herdr');
  assert.equal(s.working, 2);
  assert.equal(s.projects, 1);
  assert.deepEqual(s.keys, ['/r']);
  assert.equal(s.tokensToday, 1234);
  assert.equal(s.tokensPerMin, 56);
});

test('falls back to claude logs when herdr returns null', async () => {
  const root = emptyRoot();
  fs.mkdirSync(path.join(root, '-p'));
  fs.writeFileSync(path.join(root, '-p', 's.jsonl'), '{}\n');
  const s = await collect({ herdr: async () => null, claudeRoot: root, counter: fakeCounter, nowMs: Date.now() });
  assert.equal(s.source, 'claude');
  assert.equal(s.working, 1);
  assert.equal(s.projects, 1);
});
