#!/usr/bin/env node
// Process a submission Issue on dave-schooltrustlands/eighth-anchor-institute:
//   - Tier "board"  -> auto-execute: commit directly to main; Cloudflare Pages deploys.
//   - Tier "public" -> PR path: create branch, commit, open PR; moderator reviews.

import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const issueNumber = process.env.ISSUE_NUMBER;
const issueBody = process.env.ISSUE_BODY || "";
const labels = (() => {
  try { return JSON.parse(process.env.ISSUE_LABELS || "[]"); }
  catch { return []; }
})();
const labelNames = labels.map(l => typeof l === "string" ? l : l.name);
const tier = labelNames.includes("tier:board") ? "board"
            : labelNames.includes("tier:public") ? "public"
            : "unknown";

function parseField(label) {
  const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]+)`);
  const m = issueBody.match(re);
  return m ? m[1].trim() : null;
}

const name = parseField("Submitted by") || "Anonymous";
const pagePath = parseField("Page") || "/";
const type = parseField("Type") || "comment";
const photoRef = parseField("Photo");

const contentMatch = issueBody.match(/##\s*Content\s*\n+([\s\S]+)$/);
const content = contentMatch ? contentMatch[1].trim() : issueBody;

console.log(`Processing issue #${issueNumber}: tier=${tier}, page=${pagePath}, type=${type}, by=${name}`);

if (tier === "unknown") {
  console.error("No tier label found. Aborting.");
  execSync(`gh issue comment ${issueNumber} --body "Could not determine tier (no tier:board or tier:public label). Manual handling needed."`, { stdio: 'inherit' });
  process.exit(1);
}

// ---------- Page path -> file resolver ----------

function resolveFilePath(p) {
  // Normalize: leading slash, no trailing slash, no double-slash
  let norm = p.replace(/\/+/g, "/").replace(/\/$/, "");
  if (norm === "") norm = "/";
  // Home special case
  if (norm === "/") {
    if (existsSync("src/pages/index.astro")) return "src/pages/index.astro";
    if (existsSync("src/pages/index.md")) return "src/pages/index.md";
    return null;
  }
  const rel = norm.replace(/^\//, "");
  const candidates = [
    `src/pages/${rel}.astro`,
    `src/pages/${rel}/index.astro`,
    `src/pages/${rel}.md`,
    `src/pages/${rel}/index.md`,
    `src/pages/${rel}.mdx`,
  ];
  // Content collection guess: last path segment as filename in content/<first segment>/
  const segs = rel.split("/");
  if (segs.length >= 2) {
    candidates.push(`src/content/${segs[0]}/${segs[segs.length - 1]}.md`);
    candidates.push(`src/content/${segs[0]}/${segs[segs.length - 1]}.mdx`);
  }
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

const filePath = resolveFilePath(pagePath);

if (!filePath) {
  console.log(`Could not resolve "${pagePath}" to a repo file.`);
  execSync(`gh issue comment ${issueNumber} --body "Could not resolve page \\\`${pagePath}\\\` to a file in the repo. The page may not exist or its file path is not in the standard locations (src/pages/, src/content/). Manual handling needed."`, { stdio: 'inherit' });
  execSync(`gh issue close ${issueNumber}`, { stdio: 'inherit' });
  process.exit(0);
}

console.log(`Resolved to file: ${filePath}`);

// ---------- Photo from R2 (optional) ----------

let photoLocalPath = null;
let photoSitePath = null;
if (photoRef) {
  const keyMatch = photoRef.match(/R2 key:\s*(\S+)/);
  if (keyMatch) {
    const r2Key = keyMatch[1];
    const baseName = path.basename(r2Key);
    console.log(`Fetching photo from R2: ${r2Key}`);
    const tmpRaw = `/tmp/raw-${baseName}`;
    try {
      execSync(
        `npx -y wrangler@4 r2 object get "eighthanchor-contributions/${r2Key}" --file "${tmpRaw}" --remote`,
        {
          stdio: 'inherit',
          env: {
            ...process.env,
            CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
            CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
          },
        }
      );
      mkdirSync("public/images/submissions", { recursive: true });
      const sitePath = `public/images/submissions/${baseName}`;
      execSync(`convert "${tmpRaw}" -auto-orient -resize "1600x>" -quality 82 -strip "${sitePath}"`, { stdio: 'inherit' });
      photoLocalPath = sitePath;
      photoSitePath = `/images/submissions/${baseName}`;
      console.log(`Photo resized, served at ${photoSitePath}`);
    } catch (e) {
      console.error("Photo fetch/resize failed:", e.message);
    }
  }
}

// ---------- Comment-type submissions don't edit files ----------

if (type === "comment") {
  const comment = tier === "public"
    ? `Recorded public question/comment from ${name}. No file change made; tier:public comments are visible here for moderator review and reply.`
    : `Recorded board-tier comment from ${name}. No file change made; comments are not auto-applied to pages.`;
  execSync(`gh issue comment ${issueNumber} --body "${comment.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
  execSync(`gh issue close ${issueNumber}`, { stdio: 'inherit' });
  process.exit(0);
}

// ---------- Read current file ----------

const currentContent = readFileSync(filePath, "utf-8");
const isAstro = filePath.endsWith(".astro");
const isMd = filePath.endsWith(".md") || filePath.endsWith(".mdx");

const photoLine = photoSitePath
  ? `- Photo: this has been resized and saved to \`${photoSitePath}\` (already-resized, ready to embed). Use this path when adding the image to the page.`
  : (photoRef ? `- Photo: ${photoRef} (note: not yet pulled into static assets)` : "");

// ---------- System prompt: Astro-aware ----------

const systemPromptAstro = `You are a careful editor for the eighthanchor.org site, the institutional home of The Eighth Anchor Institute. The site is built with Astro 5 + Tailwind CSS.

You are editing an .astro page file. Astro files have three sections:
1. The frontmatter script block delimited by --- markers at the top (imports, props, constants).
2. The template section (HTML/JSX-like syntax with components, Tailwind classes, expressions).
3. Optionally a script tag or style tag at the bottom.

Editorial principles:
- Preserve the frontmatter --- block exactly unless the submission explicitly asks to change a title, description, or other declared value.
- Preserve imports and component invocations (e.g., <StateDossierMasthead .../>, <BaseLayout>, <CorrectionCTA />). Do not rename or remove them unless the submission asks.
- For factual updates or corrections: modify the relevant prose paragraph or component prop. Keep Tailwind classes intact.
- For "addition" type: add a new paragraph or list item in the most natural location given the page's structure.
- For "photo" type: insert an <img> tag at the right place, with src pointing to the provided photo site path. Include a sensible alt attribute. Use Tailwind: \`class="my-6 rounded shadow"\`.
- Match the existing tone: Eighth Anchor institutional register — sans-forward, plain language, civic-operations voice. Avoid jargon ("substrate", "L0", "research run"). Avoid emphatic adjectives.
- Never invent facts not present in the submission. If the submission is vague, edit conservatively and flag uncertainty in the Friendly: line.
- Do not add "submitted by" attributions inline in the body text — those live in commit messages.
- This is the institutional home of The Eighth Anchor Institute; hold to the neutral, evidence-forward voice already present. Do not insert litigation-team framings or partisan editorial positions.

Output format — EXACTLY this shape, nothing else:

Friendly: <one short user-friendly sentence describing what changed, written for a non-technical board member>

\\\`\\\`\\\`astro
<complete replacement file content>
\\\`\\\`\\\`

The Friendly: line MUST come first, on its own line, before the code fence. No commentary outside.`;

const systemPromptMd = `You are a careful editor for the eighthanchor.org site (Eighth Anchor Institute). You are editing a markdown file (likely a content collection entry).

Editorial principles:
- Preserve YAML frontmatter exactly unless the submission asks to update a declared value (title, date, kicker, etc.).
- Match the existing register: sans-forward, plain language, civic-operations voice. No jargon.
- For "addition" type: insert at the natural location.
- For "photo" type: embed with \`![caption](/images/submissions/xxx.jpg)\` using the provided site path.
- Never invent facts; flag uncertainty in the Friendly: line if needed.
- Do not add "submitted by" attributions inline.

Output format — exactly:

Friendly: <one short user-friendly sentence>

\\\`\\\`\\\`markdown
<complete replacement file content>
\\\`\\\`\\\`

The Friendly: line MUST come first, on its own line, before the code fence.`;

const systemPrompt = isAstro ? systemPromptAstro : systemPromptMd;

const userPrompt = `Submission from ${name} (tier: ${tier}):
- Page: ${pagePath}
- File: ${filePath}
- Type: ${type}
${photoLine}

Content:
${content}

---

Current file content (\`${filePath}\`):

\`\`\`${isAstro ? "astro" : "markdown"}
${currentContent}
\`\`\`

---

Propose the updated file content.`;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
console.log("Calling Anthropic API…");
const msg = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 12000,
  system: systemPrompt,
  messages: [{ role: "user", content: userPrompt }],
});

const responseText = msg.content[0].text;
const fenceRe = isAstro
  ? /```(?:astro|html|jsx)?\n([\s\S]+?)\n```/
  : /```(?:markdown|md|mdx)?\n([\s\S]+?)\n```/;
let codeBlockMatch = responseText.match(fenceRe);
// Fall back to any code fence
if (!codeBlockMatch) codeBlockMatch = responseText.match(/```[a-zA-Z]*\n([\s\S]+?)\n```/);

if (!codeBlockMatch) {
  console.error("AI response did not contain a fenced code block.");
  execSync(`gh issue comment ${issueNumber} --body "AI processor failed to produce a parseable edit. Submission preserved here for manual handling."`, { stdio: 'inherit' });
  process.exit(1);
}

const newContent = codeBlockMatch[1];

if (newContent.trim() === currentContent.trim() && !photoLocalPath) {
  console.log("AI produced identical content — no edit needed.");
  execSync(`gh issue comment ${issueNumber} --body "AI processor reviewed the submission but determined no file change is needed (likely a question or comment best handled directly)."`, { stdio: 'inherit' });
  execSync(`gh issue close ${issueNumber}`, { stdio: 'inherit' });
  process.exit(0);
}

const friendlyMatch = responseText.match(/Friendly:\s*(.+?)(?:\n|$)/);
const friendlyLine = friendlyMatch ? friendlyMatch[1].trim() : `${name} ${type} on ${pagePath}`;
console.log("Friendly summary:", friendlyLine);

// ---------- Tier-aware commit/push ----------

execSync(`git config user.name "eighthanchor-bot"`);
execSync(`git config user.email "drdavesullivan@gmail.com"`);

writeFileSync(filePath, newContent);
console.log(`Wrote new content to ${filePath}`);

const filesToAdd = [filePath];
if (photoLocalPath) filesToAdd.push(photoLocalPath);

if (tier === "board") {
  // AUTO-EXECUTE: commit directly to main
  execSync(`git add ${filesToAdd.map(f => `"${f}"`).join(" ")}`);
  execSync(`git commit -m "Submission #${issueNumber}: ${type} on ${pagePath} from ${name}\n\nFriendly: ${friendlyLine.replace(/"/g, '\\"')}\n\nAuto-applied via AI processor (tier:board)."`);
  execSync(`git push origin main`);
  const commitSha = execSync(`git rev-parse HEAD`).toString().trim();
  // Push to main triggers Cloudflare Pages auto-deploy (no GitHub Action needed).
  execSync(`gh issue close ${issueNumber} --comment "Auto-applied as ${commitSha.slice(0,7)}. Cloudflare Pages will deploy in ~60-90s. Friendly: ${friendlyLine.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
  console.log(`Committed directly to main as ${commitSha}.`);
} else {
  // PR PATH: branch + commit + open PR
  const branch = `submission-${issueNumber}-${Date.now().toString(36)}`;
  execSync(`git checkout -b "${branch}"`);
  execSync(`git add ${filesToAdd.map(f => `"${f}"`).join(" ")}`);
  execSync(`git commit -m "Submission #${issueNumber}: ${type} on ${pagePath} from ${name}\n\nFriendly: ${friendlyLine.replace(/"/g, '\\"')}\n\nDrafted by AI from public-tier submission. Pending moderator review."`);
  execSync(`git push origin "${branch}"`);

  const prBody = [
    `**Submission #${issueNumber}** — public tier (requires moderator review)`,
    ``,
    `**Submitter:** ${name}`,
    `**Page:** \`${pagePath}\` (\`${filePath}\`)`,
    `**Type:** ${type}`,
    ``,
    `### Friendly summary`,
    `${friendlyLine}`,
    ``,
    `### What the submitter wrote`,
    `> ${content.split("\n").join("\n> ")}`,
    ``,
    `### How to handle this`,
    `- **Approve:** review the diff, then merge. Cloudflare Pages will deploy in ~60-90s.`,
    `- **Reject:** close without merging and add a comment to the underlying issue (#${issueNumber}) explaining why.`,
    `- **Refine:** push additional commits to this branch before merging.`,
    ``,
    `Closes #${issueNumber}.`,
  ].join("\n");
  const prTitle = `Submission #${issueNumber}: ${type} on ${pagePath} from ${name}`;
  // Use gh CLI to open the PR
  const prCreateCmd = `gh pr create --base main --head "${branch}" --title "${prTitle.replace(/"/g, '\\"')}" --body-file -`;
  execSync(prCreateCmd, { input: prBody, stdio: ['pipe', 'inherit', 'inherit'] });
  // Close the issue with a pointer to the PR
  const prUrl = execSync(`gh pr view "${branch}" --json url -q .url`).toString().trim();
  execSync(`gh issue close ${issueNumber} --comment "Drafted as PR for review: ${prUrl}\\n\\nFriendly: ${friendlyLine.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
  console.log(`Opened PR ${prUrl} from branch ${branch}.`);
}
