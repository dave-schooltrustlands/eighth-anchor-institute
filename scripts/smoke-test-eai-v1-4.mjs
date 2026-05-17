#!/usr/bin/env node
// EAI v1.4 smoke tests — Cross-site OASTL linkage patch (ALPHA).
//
// v1.4.A — Utility bar dropdown contains <a> with href="https://oastl-oregon.drdavesullivan.workers.dev"
// v1.4.B — Utility bar dropdown's OASTL entry text reads "OASTL Oregon"
// v1.4.C — Utility bar dropdown does NOT contain "coming soon" anywhere in its block
// v1.4.D — School Trust Campus page's OASTL BuildingCard contains an active CTA link to the workers.dev URL
//
// Mirrors the v1 / v1.3 runners: local dist by default; --live or EAI_SMOKE_LIVE=1 hits EAI_SMOKE_URL.

import { readFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = join(ROOT, 'dist');

const args = new Set(process.argv.slice(2));
const LIVE = args.has('--live') || process.env.EAI_SMOKE_LIVE === '1';
const LIVE_URL = process.env.EAI_SMOKE_URL || 'https://eighthanchor.org';

const OASTL_URL = 'https://oastl-oregon.drdavesullivan.workers.dev';

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

// Capture the utility-bar dropdown block: from the first .eai-utility-bar
// occurrence up to the closing </details> of the dropdown.
function utilityBarBlock(body) {
  const i = body.indexOf('eai-utility-bar');
  if (i < 0) return '';
  const detailsEnd = body.indexOf('</details>', i);
  if (detailsEnd < 0) return body.slice(i, i + 5000);
  return body.slice(i, detailsEnd + '</details>'.length);
}

// Capture the OASTL BuildingCard region on the campus page.
function oastlCardBlock(body) {
  const i = body.indexOf('id="building-oastl"');
  if (i < 0) return '';
  const end = body.indexOf('</article>', i);
  if (end < 0) return body.slice(i, i + 4000);
  return body.slice(i, end + '</article>'.length);
}

async function run() {
  const home = await fetchPage('/');
  const campus = await fetchPage('/campus/school-trust/');

  // v1.4.A — Utility bar contains an anchor to the OASTL workers.dev URL on both pages
  const barHome = utilityBarBlock(home.body);
  const barCampus = utilityBarBlock(campus.body);
  const hrefRx = new RegExp(`<a[^>]+href="${OASTL_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`);
  const aHome = hrefRx.test(barHome);
  const aCampus = hrefRx.test(barCampus);
  if (aHome && aCampus) pass('v1.4.A', `utility bar links to ${OASTL_URL} on both pages`);
  else fail('v1.4.A', `home=${aHome}, campus=${aCampus}`);

  // v1.4.B — OASTL entry text reads "OASTL Oregon"
  const labelHome = barHome.includes('OASTL Oregon');
  const labelCampus = barCampus.includes('OASTL Oregon');
  if (labelHome && labelCampus) pass('v1.4.B', 'utility bar OASTL entry label is "OASTL Oregon"');
  else fail('v1.4.B', `home=${labelHome}, campus=${labelCampus}`);

  // v1.4.C — Utility bar block does NOT contain "coming soon"
  const csHome = barHome.toLowerCase().includes('coming soon');
  const csCampus = barCampus.toLowerCase().includes('coming soon');
  if (!csHome && !csCampus) pass('v1.4.C', 'utility bar contains no "coming soon" string');
  else fail('v1.4.C', `home has coming-soon=${csHome}, campus has coming-soon=${csCampus}`);

  // v1.4.D — School Trust Campus OASTL BuildingCard has an active CTA <a> to the workers.dev URL
  const card = oastlCardBlock(campus.body);
  const cardHasUrl = card.includes(OASTL_URL);
  const cardHasAnchor = /<a[\s\S]+?href="https:\/\/oastl-oregon\.drdavesullivan\.workers\.dev"/.test(card);
  const cardHasForthcoming = /site forthcoming/i.test(card);
  if (cardHasUrl && cardHasAnchor && !cardHasForthcoming)
    pass('v1.4.D', 'OASTL BuildingCard has active CTA link to workers.dev URL');
  else
    fail('v1.4.D', `cardHasUrl=${cardHasUrl}, cardHasAnchor=${cardHasAnchor}, cardHasForthcoming=${cardHasForthcoming}`);

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
