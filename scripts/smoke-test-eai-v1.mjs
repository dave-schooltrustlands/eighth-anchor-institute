#!/usr/bin/env node
// EAI v1 smoke tests.
//
// Two modes:
//   1. Local dist mode (default): asserts against ./dist after `npm run build`.
//   2. Live mode: pass --live (or set EAI_SMOKE_LIVE=1) and EAI_SMOKE_URL to
//      hit a deployed origin. Default live URL: https://eighthanchor.org.
//
// Tests:
//   v1.A — / returns 200 and contains the Institute thesis sentence
//   v1.B — / contains "Schools of the Republic" and "The Eighth Anchor"
//   v1.C — /campus/school-trust/ returns 200 with four building cards
//   v1.D — Building cards link to schooltrusts.net, schooltrustlands.net, orww.org
//   v1.E — Each Grounds Plan has a visible Legend
//   v1.F — Governance note appears on both pages

import { readFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = join(ROOT, 'dist');

const args = new Set(process.argv.slice(2));
const LIVE = args.has('--live') || process.env.EAI_SMOKE_LIVE === '1';
const LIVE_URL = process.env.EAI_SMOKE_URL || 'https://eighthanchor.org';

const results = [];
function pass(id, msg) { results.push({ id, ok: true, msg }); }
function fail(id, msg) { results.push({ id, ok: false, msg }); }

async function fetchPage(path) {
  if (LIVE) {
    const url = new URL(path, LIVE_URL).toString();
    const res = await fetch(url);
    const body = await res.text();
    return { status: res.status, body, url };
  }
  // Local: map / and /campus/school-trust/ to dist files.
  const map = {
    '/': 'index.html',
    '/campus/school-trust/': 'campus/school-trust/index.html',
  };
  const file = map[path];
  if (!file) throw new Error(`Unknown route: ${path}`);
  const body = await readFile(join(DIST, file), 'utf8');
  return { status: 200, body, url: join(DIST, file) };
}

function contains(body, needle) {
  return body.includes(needle);
}

async function run() {
  const home = await fetchPage('/');
  const campus = await fetchPage('/campus/school-trust/');

  // v1.A — homepage returns 200, contains thesis sentence
  if (home.status === 200 && contains(home.body, 'Long-horizon trusts fail when obligation loses its architecture'))
    pass('v1.A', 'homepage 200 + thesis sentence present');
  else
    fail('v1.A', `home status=${home.status}, thesis-present=${contains(home.body, 'Long-horizon trusts fail when obligation loses its architecture')}`);

  // v1.B — homepage contains both founding-text titles
  const hasSOR = contains(home.body, 'Schools of the Republic');
  const hasTEA = contains(home.body, 'The Eighth Anchor');
  if (hasSOR && hasTEA) pass('v1.B', 'homepage references both founding texts');
  else fail('v1.B', `SOR=${hasSOR}, TEA=${hasTEA}`);

  // v1.C — campus page returns 200 with all four building cards (by address)
  const addresses = ['Record Walk', 'Accountability Row', 'Oregon House', 'Field Station Road'];
  const missingAddr = addresses.filter((a) => !contains(campus.body, a));
  if (campus.status === 200 && missingAddr.length === 0)
    pass('v1.C', 'campus 200 + four building cards present');
  else
    fail('v1.C', `campus status=${campus.status}, missing=${missingAddr.join(',') || 'none'}`);

  // v1.D — building cards link to the three external domains
  const domains = ['schooltrusts.net', 'schooltrustlands.net', 'orww.org'];
  const missingDomains = domains.filter((d) => !contains(campus.body, d));
  if (missingDomains.length === 0) pass('v1.D', 'all three external domains linked');
  else fail('v1.D', `missing domains: ${missingDomains.join(', ')}`);

  // v1.E — Legend on both Grounds Plans
  const legendHome = contains(home.body, 'Status taxonomy') || contains(home.body, 'Legend');
  const legendCampus = contains(campus.body, 'Status taxonomy') || contains(campus.body, 'Legend');
  if (legendHome && legendCampus) pass('v1.E', 'legend present on both grounds plans');
  else fail('v1.E', `legendHome=${legendHome}, legendCampus=${legendCampus}`);

  // v1.F — Governance note on both pages
  const govNote = 'Campus maps show intellectual and operating relationships';
  const govHome = contains(home.body, govNote);
  const govCampus = contains(campus.body, govNote);
  if (govHome && govCampus) pass('v1.F', 'governance note on both pages');
  else fail('v1.F', `govHome=${govHome}, govCampus=${govCampus}`);

  // Report
  let failures = 0;
  for (const r of results) {
    const tag = r.ok ? 'PASS' : 'FAIL';
    console.log(`[${tag}] ${r.id} — ${r.msg}`);
    if (!r.ok) failures++;
  }
  console.log(`\n${results.length - failures}/${results.length} passed (${LIVE ? 'live: ' + LIVE_URL : 'local dist'})`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error('smoke runner error:', err);
  process.exit(2);
});
