import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activityLevel, pulseLevel, districtOf, districtBoosts, easeToward } from '../src/activity.js';
import { readParams } from '../src/params.js';
import { generateCity } from '../src/city.js';
import { formatStats } from '../src/format.js';
import { demoStats } from '../src/demo.js';

test('activityLevel curve', () => {
  assert.equal(activityLevel({ working: 0, subagents: 0 }), 0);
  assert.equal(activityLevel({ working: 1 }), 0.45);
  assert.ok(Math.abs(activityLevel({ working: 2 }) - 0.65) < 1e-9);
  assert.ok(Math.abs(activityLevel({ working: 1, subagents: 6 }) - 0.85) < 1e-9);
  assert.equal(activityLevel({ working: 8 }), 1);
  assert.equal(activityLevel({ subagents: 1 }), 0.45);
  assert.equal(activityLevel(undefined), 0);
});

test('pulseLevel clamps', () => {
  assert.equal(pulseLevel(0), 0);
  assert.equal(pulseLevel(50_000), 0.5);
  assert.equal(pulseLevel(1e9), 1);
});

test('districts are stable and bounded', () => {
  assert.equal(districtOf('/a'), districtOf('/a'));
  for (const k of ['/a', '/b', 'x', '']) assert.ok(districtOf(k) >= 0 && districtOf(k) < 8);
  const b = districtBoosts(['/a', '/a', '/a']);
  assert.equal(b.length, 8);
  assert.equal(Math.max(...b), 1);
});

test('easeToward converges', () => {
  let v = 0;
  for (let i = 0; i < 300; i++) v = easeToward(v, 1, 1 / 60, 1);
  assert.ok(v > 0.99 && v <= 1);
});

test('readParams defaults to the window and reads slices', () => {
  assert.deepEqual(readParams('', { w: 800, h: 600 }),
    { fullW: 800, fullH: 600, x: 0, y: 0, w: 800, h: 600, fps: 60, overlay: true, demo: false, seed: 7, forceActivity: -1 });
  const p = readParams('?fullW=5760&fullH=1080&x=1920&y=0&w=1920&h=1080&fps=30&overlay=0&demo=1', { w: 1, h: 1 });
  assert.equal(p.fullW, 5760); assert.equal(p.x, 1920); assert.equal(p.fps, 30);
  assert.equal(p.overlay, false); assert.equal(p.demo, true);
});

test('generateCity is deterministic, dense downtown, bounded', () => {
  const a = generateCity({ seed: 7 }), b = generateCity({ seed: 7 });
  assert.deepEqual(a.buildings.slice(0, 20), b.buildings.slice(0, 20));
  assert.ok(a.buildings.length > 3000);
  const { ox, oz, pitch, cols, rows } = a.grid;
  for (const bl of a.buildings) {
    assert.ok(bl.x > ox && bl.x < ox + cols * pitch && bl.z > oz && bl.z < oz + rows * pitch);
    assert.ok(bl.h > 0 && bl.district >= 0 && bl.district < 8);
  }
  const tallest = [...a.buildings].sort((p, q) => q.h - p.h).slice(0, 50);
  assert.ok(tallest.every((t) => t.h > 80));
});

test('formatStats', () => {
  assert.deepEqual(formatStats(null), { projects: '—', agents: '—', agentsSub: 'offline', tokens: '—', rate: '' });
  const f = formatStats({ source: 'herdr', working: 1, subagents: 6, projects: 1, tokensToday: 215615003, tokensPerMin: 218000 });
  assert.deepEqual(f, { projects: '1', agents: '7', agentsSub: '6 subagents · working', tokens: '215,615,003', rate: '218k / min' });
  assert.equal(formatStats({ working: 0, subagents: 0, projects: 0, tokensToday: 5, tokensPerMin: 0 }).agentsSub, 'idle');
  assert.equal(formatStats({ source: 'demo', working: 1, subagents: 0, projects: 1, tokensToday: 5, tokensPerMin: 900 }).agentsSub, 'demo working');
  assert.equal(formatStats({ working: 1, subagents: 1, projects: 1, tokensToday: 5, tokensPerMin: 900 }).rate, '900 / min');
});

test('demoStats cycles idle → busy and tokens only grow', () => {
  assert.equal(demoStats(1).working, 0);
  assert.ok(demoStats(20).working + demoStats(20).subagents >= 3);
  assert.ok(demoStats(21).tokensToday >= demoStats(20).tokensToday);
});
