// Cloudflare Worker — eighthanchor-contribute
// Two-tier edit submission pipeline for eighthanchor.org.
//
// POST /                : form submission (passcode -> tier -> R2 photo -> GitHub Issue)
// GET  /status?issue=N  : pipeline progress for the browser to poll
//
// Tier model
//   passcode === BOARD_PASSCODE   -> label issue "tier:board"  -> auto-execute (commit to main)
//   passcode === PUBLIC_PASSCODE  -> label issue "tier:public" -> open PR for review

const ALLOWED_ORIGINS = [
  "https://eighthanchor.org",
  "https://www.eighthanchor.org",
  "https://eighth-anchor-institute.pages.dev",
  "http://localhost:4321",
];

const ALLOWED_TYPES = ["fact", "photo", "correction", "addition", "comment"];

// Page paths are validated as plausible URL paths; the processor resolves to a file in the repo.
const PAGE_PATH_RE = /^\/[a-z0-9\-\/]{0,120}$/;

function corsHeaders(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : "https://eighthanchor.org",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function jsonResp(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

const REPO = "dave-schooltrustlands/eighth-anchor-institute";
const GH_HEADERS = (token) => ({
  "Authorization": `Bearer ${token}`,
  "Accept": "application/vnd.github+json",
  "User-Agent": "eighthanchor-contribute-worker",
});

function tierFromPasscode(env, passcode) {
  if (!passcode) return null;
  if (env.BOARD_PASSCODE && passcode === env.BOARD_PASSCODE) return "board";
  if (env.PUBLIC_PASSCODE && passcode === env.PUBLIC_PASSCODE) return "public";
  return null;
}

async function handleStatus(url, env, origin) {
  const issue = url.searchParams.get("issue");
  if (!issue) return jsonResp({ error: "missing issue param" }, 400, origin);

  const out = { stage: "unknown", progress: 0, issue: Number(issue) };

  try {
    const issueResp = await fetch(`https://api.github.com/repos/${REPO}/issues/${issue}`, { headers: GH_HEADERS(env.GITHUB_TOKEN) });
    if (!issueResp.ok) return jsonResp({ error: "issue not found", status: issueResp.status }, 404, origin);
    const issueData = await issueResp.json();
    out.issueState = issueData.state;

    const labelNames = (issueData.labels || []).map(l => typeof l === "string" ? l : l.name);
    const tier = labelNames.includes("tier:board") ? "board" : (labelNames.includes("tier:public") ? "public" : "unknown");
    out.tier = tier;

    // OPEN issue: AI hasn't finished yet
    if (issueData.state === "open") {
      out.stage = "ai_drafting";
      out.progress = 30;
      out.message = tier === "public"
        ? "AI is reviewing your suggestion and drafting a pull request for a moderator to review."
        : "AI is reading the page and drafting your edit.";
      return jsonResp(out, 200, origin);
    }

    // CLOSED issue: depends on tier
    if (tier === "public") {
      // Look for a PR opened by the bot referencing this issue
      const prsResp = await fetch(`https://api.github.com/repos/${REPO}/pulls?state=open&per_page=30`, { headers: GH_HEADERS(env.GITHUB_TOKEN) });
      const prs = await prsResp.json();
      const matchingPR = (Array.isArray(prs) ? prs : []).find(p => p.body && p.body.includes(`Submission #${issue}`));
      if (matchingPR) {
        out.stage = "pr_open";
        out.progress = 90;
        out.message = "Your suggestion was drafted into a pull request awaiting a moderator's review.";
        out.prUrl = matchingPR.html_url;
        out.prNumber = matchingPR.number;
        return jsonResp(out, 200, origin);
      }
      // Maybe already merged
      const closedPRsResp = await fetch(`https://api.github.com/repos/${REPO}/pulls?state=closed&per_page=30`, { headers: GH_HEADERS(env.GITHUB_TOKEN) });
      const closedPRs = await closedPRsResp.json();
      const mergedPR = (Array.isArray(closedPRs) ? closedPRs : []).find(p => p.body && p.body.includes(`Submission #${issue}`) && p.merged_at);
      if (mergedPR) {
        out.stage = "live";
        out.progress = 100;
        out.message = "Your suggestion was approved by a moderator and merged. Site updating in ~60s.";
        out.prUrl = mergedPR.html_url;
        return jsonResp(out, 200, origin);
      }
      out.stage = "no_pr";
      out.progress = 95;
      out.message = "Issue closed without a PR. A moderator may have handled this manually.";
      return jsonResp(out, 200, origin);
    }

    // BOARD tier: look for the bot commit
    const sinceParam = encodeURIComponent(issueData.created_at);
    const commitsResp = await fetch(`https://api.github.com/repos/${REPO}/commits?since=${sinceParam}&per_page=30`, { headers: GH_HEADERS(env.GITHUB_TOKEN) });
    const commits = await commitsResp.json();
    const matchingCommit = (Array.isArray(commits) ? commits : []).find(c =>
      c.commit && c.commit.author && c.commit.author.name === "eighthanchor-bot"
      && c.commit.message && c.commit.message.includes(`Submission #${issue}`)
    );
    if (!matchingCommit) {
      out.stage = "ai_finishing";
      out.progress = 45;
      out.message = "AI finished; finalizing commit.";
      return jsonResp(out, 200, origin);
    }
    out.commitSha = matchingCommit.sha;

    // Cloudflare Pages auto-builds on every main push.
    // We approximate "live" by looking at how long since the commit landed.
    const commitTs = Date.parse(matchingCommit.commit.author.date);
    const ageSec = Math.max(0, Math.floor((Date.now() - commitTs) / 1000));
    if (ageSec < 30) {
      out.stage = "deploy_queued";
      out.progress = 60;
      out.message = "Building the new site.";
    } else if (ageSec < 120) {
      out.stage = "deploying";
      out.progress = 80;
      out.message = "Going live worldwide.";
    } else {
      out.stage = "live";
      out.progress = 100;
      out.message = "Your edit is live.";
    }
    return jsonResp(out, 200, origin);
  } catch (err) {
    return jsonResp({ error: "status check failed", detail: String(err).slice(0, 200) }, 500, origin);
  }
}

async function handleSubmit(request, env, origin) {
  const formData = await request.formData();
  const passcode = (formData.get("passcode") || "").toString().trim();
  const name = (formData.get("name") || "").toString().trim().slice(0, 80);
  const pagePath = (formData.get("page") || "").toString().trim();
  const type = (formData.get("type") || "").toString().trim();
  const content = (formData.get("content") || "").toString().trim().slice(0, 4000);
  const photo = formData.get("photo") || formData.get("cameraPhoto");

  if (!env.BOARD_PASSCODE || !env.PUBLIC_PASSCODE) return jsonResp({ error: "Server misconfigured (passcodes not set)" }, 500, origin);

  const tier = tierFromPasscode(env, passcode);
  if (!tier) return jsonResp({ error: "Wrong passcode" }, 401, origin);

  if (!name) return jsonResp({ error: "Name is required" }, 400, origin);
  if (!pagePath || !PAGE_PATH_RE.test(pagePath)) return jsonResp({ error: "Invalid page path: " + pagePath }, 400, origin);
  if (!ALLOWED_TYPES.includes(type)) return jsonResp({ error: "Invalid type" }, 400, origin);
  if (content.length < 10) return jsonResp({ error: "Content must be at least 10 characters" }, 400, origin);

  // R2 photo upload
  let photoUrl = null;
  let photoKey = null;
  if (photo && typeof photo === "object" && photo.size > 0 && photo.size < 25 * 1024 * 1024) {
    const ext = (photo.name && photo.name.includes(".")) ? photo.name.split(".").pop().toLowerCase().slice(0, 5) : "jpg";
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const rand = Math.random().toString(36).substring(2, 8);
    photoKey = `submissions/${ts}-${rand}.${ext}`;
    await env.PHOTOS.put(photoKey, photo.stream(), {
      httpMetadata: { contentType: photo.type || "image/jpeg" },
      customMetadata: { submitter: name, page: pagePath, type, tier },
    });
    photoUrl = `R2 key: ${photoKey} (fetch via wrangler r2 object get eighthanchor-contributions ${photoKey})`;
  }

  const submittedAt = new Date().toISOString();
  const pageSlugForLabel = (pagePath === "/" ? "home" : pagePath.replace(/^\/|\/$/g, "").replace(/\//g, "--").slice(0, 40)) || "home";

  const lines = [
    `**Submitted by:** ${name}`,
    `**Page:** ${pagePath}`,
    `**Type:** ${type}`,
    `**Tier:** ${tier}`,
    `**Submitted at:** ${submittedAt}`,
  ];
  if (photoUrl) lines.push(`**Photo:** ${photoUrl}`);
  lines.push("", "## Content", "", content);
  const issueBody = lines.join("\n");
  const issueTitle = `[${type}] ${name} (${tier}): ${content.slice(0, 60).replace(/\n/g, " ")}${content.length > 60 ? "…" : ""}`;

  const labels = ["submission", `tier:${tier}`, `type:${type}`, `page:${pageSlugForLabel}`];

  const ghResp = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers: { ...GH_HEADERS(env.GITHUB_TOKEN), "Content-Type": "application/json" },
    body: JSON.stringify({ title: issueTitle, body: issueBody, labels }),
  });

  if (!ghResp.ok) {
    const errText = await ghResp.text();
    return jsonResp({ error: "GitHub issue creation failed", status: ghResp.status, detail: errText.slice(0, 500) }, 502, origin);
  }
  const issue = await ghResp.json();
  return jsonResp({
    success: true,
    issueNumber: issue.number,
    issueUrl: issue.html_url,
    tier,
    summary: { name, page: pagePath, type, tier, contentExcerpt: content.slice(0, 200) },
  }, 200, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method === "GET" && url.pathname === "/status") {
      return handleStatus(url, env, origin);
    }
    if (request.method === "POST") {
      try {
        return await handleSubmit(request, env, origin);
      } catch (err) {
        return jsonResp({ error: "Server error", detail: String(err).slice(0, 200) }, 500, origin);
      }
    }
    return jsonResp({ error: "Method not allowed" }, 405, origin);
  },
};
