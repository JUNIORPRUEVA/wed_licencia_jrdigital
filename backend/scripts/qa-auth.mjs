// Usage:
//   node scripts/qa-auth.mjs http://localhost:3000 [--wait]
// It will test:
//   GET  /api/health
//   POST /api/auth/login
//
// Notes:
// - Requires the web server (Next) and API server to be running.
// - Uses default credentials from .env examples.

const webBase = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const waitMode = process.argv.includes("--wait");

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text().catch(() => "");
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

async function main() {
  console.log(`[QA] WEB_BASE=${webBase}`);

  const healthUrl = `${webBase}/api/health`;
  console.log(`[QA] GET ${healthUrl}`);
  const deadline = Date.now() + (waitMode ? 45_000 : 0);
  while (true) {
    try {
      const { res, json, text } = await fetchJson(healthUrl);
      console.log(`[QA] status=${res.status}`);
      console.log(`[QA] body=${json ? JSON.stringify(json) : text.slice(0, 200)}`);
      if (!res.ok) process.exit(1);
      break;
    } catch (e) {
      if (!waitMode || Date.now() > deadline) {
        console.error(`[QA] health failed: ${String(e)}`);
        process.exit(2);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  const loginUrl = `${webBase}/api/auth/login`;
  console.log(`[QA] POST ${loginUrl}`);
  const email = process.env.ADMIN_EMAIL || "admin@fulltech.local";
  const password = process.env.ADMIN_PASSWORD || "Admin123!";
  try {
    const { res, json, text } = await fetchJson(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    console.log(`[QA] status=${res.status}`);
    console.log(`[QA] body=${json ? JSON.stringify(json).slice(0, 300) : text.slice(0, 300)}`);
    if (!res.ok) process.exit(1);
  } catch (e) {
    console.error(`[QA] login failed: ${String(e)}`);
    process.exit(2);
  }

  console.log("[QA] OK");
}

main().catch((e) => {
  console.error(String(e));
  process.exit(2);
});
