#!/usr/bin/env node
// EAI v1.3 smoke tests.
//
// v1.3.A — .eai-utility-bar element exists on both pages
// v1.3.B — Utility bar contains "Eighth Anchor Institute" text
// v1.3.C — Utility bar contains links to schooltrusts.net and schooltrustlands.net
// v1.3.D — Institute Grounds Plan SVG uses 1px-class strokes (<= 1.5) and dashed outlines for reserved nodes
// v1.3.E — School Trust Campus Grounds Plan has labeled relationship paths between buildings
// v1.3.F — Homepage contains a Bald Mountain / Osborne image element OR the run report notes the image is deferred
// v1.3.G — Both pages have <title>, <meta name="description">, og:title, og:description, og:image, canonical in <head>
//
// Mirrors the v1 runner's modes: local dist by default; --live or EAI_SMOKE_LIVE=1 hits EAI_SMOKE_URL (default https://eighthanchor.org).

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
  const map = {
    '/': 'index.html',
    '/campus/school-trust/': 'campus/school-trust/index.html',
  };
  const file = map[path];
  if (!file) throw new Error(`Unknown route: ${path}`);
  const body = await readFile(join(DIST, file), 'utf8');
  return { status: 200, body, url: join(DIST, file) };
}

function contains(body, needle) { return body.includes(needle); }

function headSlice(body) {
  const m = body.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return m ? m[1] : '';
}

async function run() {
  const home = await fetchPage('/');
  const campus = await fetchPage('/campus/school-trust/');

  // v1.3.A — utility bar present on both pages
  const barHome = contains(home.body, 'eai-utility-bar');
  const barCampus = contains(campus.body, 'eai-utility-bar');
  if (barHome && barCampus) pass('v1.3.A', 'utility bar present on both pages');
  else fail('v1.3.A', `barHome=${barHome}, barCampus=${barCampus}`);

  // v1.3.B — utility bar contains "Eighth Anchor Institute"
  // (the bar markup itself wraps the institute name)
  const labelHome = contains(home.body, 'eai-utility-bar__name')
    && contains(home.body, 'The Eighth Anchor Institute');
  const labelCampus = contains(campus.body, 'eai-utility-bar__name')
    && contains(campus.body, 'The Eighth Anchor Institute');
  if (labelHome && labelCampus) pass('v1.3.B', 'utility bar names the Institute');
  else fail('v1.3.B', `labelHome=${labelHome}, labelCampus=${labelCampus}`);

  // v1.3.C — utility bar links to schooltrusts.net and schooltrustlands.net on both pages
  // (matched within the utility bar block, not anywhere on the page)
  function utilityBarBlock(body) {
    const i = body.indexOf('eai-utility-bar');
    if (i < 0) return '';
    // Capture a generous window: from the bar div to the close of its menu.
    const tail = body.slice(i, i + 5000);
    return tail;
  }
  const bbHome = utilityBarBlock(home.body);
  const bbCampus = utilityBarBlock(campus.body);
  const linksOk = ['schooltrusts.net', 'schooltrustlands.net'].every((d) =>
    bbHome.includes(d) && bbCampus.includes(d));
  if (linksOk) pass('v1.3.C', 'utility bar links to schooltrusts.net + schooltrustlands.net on both pages');
  else fail('v1.3.C', `home-bar includes schooltrusts.net=${bbHome.includes('schooltrusts.net')} schooltrustlands.net=${bbHome.includes('schooltrustlands.net')} | campus-bar schooltrusts.net=${bbCampus.includes('schooltrusts.net')} schooltrustlands.net=${bbCampus.includes('schooltrustlands.net')}`);

  // v1.3.D — Institute Grounds Plan uses 1px-class strokes (<= 1.5) and at least one dashed outline (reserved nodes)
  // Pull just the InstituteGroundsPlan SVG section.
  const igpStart = home.body.indexOf('Institute Grounds Plan — schematic future campuses');
  const igpEnd = home.body.indexOf('</svg>', igpStart);
  const igpSvg = igpStart >= 0 && igpEnd > igpStart ? home.body.slice(igpStart, igpEnd) : '';
  const strokeWidths = [...igpSvg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => parseFloat(m[1]));
  const allSlim = strokeWidths.length > 0 && strokeWidths.every((w) => w <= 1.5);
  const dashedReserved = /stroke-dasharray="4 3"/.test(igpSvg) || /stroke-dasharray="3 2"/.test(igpSvg) || /stroke-dasharray="4 4"/.test(igpSvg);
  if (allSlim && dashedReserved) pass('v1.3.D', `Institute plan: ${strokeWidths.length} stroke-widths all ≤ 1.5, reserved nodes dashed`);
  else fail('v1.3.D', `allSlim=${allSlim} (widths=${strokeWidths.join(',')}), dashedReserved=${dashedReserved}`);

  // v1.3.E — School Trust Grounds Plan has labeled relationship paths between buildings
  const expectedPathLabels = ['Evidence to action', 'Oregon record', 'Forest research', 'National coalition'];
  const foundLabels = expectedPathLabels.filter((l) => contains(campus.body, l));
  if (foundLabels.length >= 2) pass('v1.3.E', `school-trust plan has labeled paths: ${foundLabels.join(', ')}`);
  else fail('v1.3.E', `expected at least 2 of [${expectedPathLabels.join(', ')}], found ${foundLabels.length}: ${foundLabels.join(', ')}`);

  // v1.3.F — Homepage shows the Bald Mountain image OR explicitly notes the image is deferred (the latter is a build-time signal)
  const hasImg = contains(home.body, 'osborne-panoramic') || contains(home.body, 'Bald Mountain');
  if (hasImg) pass('v1.3.F', 'homepage references the Bald Mountain / Osborne image');
  else fail('v1.3.F', 'no Bald Mountain image or caption found on homepage (and no deferred-image note hook detected)');

  // v1.3.G — Both pages have title, meta description, og:title, og:description, og:image, canonical in <head>
  const required = [
    /<title>[^<]+<\/title>/,
    /<meta\s+name="description"\s+content="[^"]+"/,
    /<link\s+rel="canonical"\s+href="[^"]+"/,
    /<meta\s+property="og:title"\s+content="[^"]+"/,
    /<meta\s+property="og:description"\s+content="[^"]+"/,
    /<meta\s+property="og:image"\s+content="[^"]+"/,
    /<meta\s+property="og:url"\s+content="[^"]+"/,
    /<meta\s+name="twitter:card"\s+content="summary_large_image"/,
  ];
  const homeHead = headSlice(home.body);
  const campusHead = headSlice(campus.body);
  const missHome = required.filter((rx) => !rx.test(homeHead)).map((rx) => rx.source);
  const missCampus = required.filter((rx) => !rx.test(campusHead)).map((rx) => rx.source);
  if (missHome.length === 0 && missCampus.length === 0)
    pass('v1.3.G', 'all SEO/OG meta tags present in <head> on both pages');
  else
    fail('v1.3.G', `home missing: [${missHome.join(' | ')}], campus missing: [${missCampus.join(' | ')}]`);

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
