/**
 * recover-nin.ts
 *
 * ONE-OFF SCRIPT — run this locally, not part of your app.
 *
 * Pulls your NIN verification history from NetworkDataSub and
 * prints everything so you can match it against the 3 stuck
 * (PENDING) transactions in your own database:
 *
 *   1) ~16:53:21 on 12/08/2026 — standard  — ₦160 charged to customer
 *   2) ~17:38:07 on 12/08/2026 — regular   — ₦150 charged to customer
 *   3) ~18:05:35 on 12/08/2026 — regular   — ₦150 charged to customer
 *
 * HOW TO RUN:
 *
 *   1. Make sure this file sits in your project root (same folder
 *      as package.json), so it can read your .env / .env.local.
 *
 *   2. Install tsx if you don't already have it:
 *        npm install -D tsx
 *
 *   3. Run it:
 *        npx tsx recover-nin.ts
 *
 * It does NOT touch your database. It only reads from
 * NetworkDataSub and prints to your terminal.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ------------------------------------------------------------------
// Minimal .env loader (avoids needing the "dotenv" package installed)
// ------------------------------------------------------------------
function loadEnvFile(filename: string) {
  const fullPath = resolve(process.cwd(), filename);

  if (!existsSync(fullPath)) {
    return;
  }

  const content = readFileSync(fullPath, "utf-8");

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");

    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// Load in the same priority order Next.js typically uses
loadEnvFile(".env.local");
loadEnvFile(".env");

// ------------------------------------------------------------------
// Config
// ------------------------------------------------------------------

const NETWORKDATASUB_API_URL =
  process.env.NETWORKDATASUB_API_URL ||
  "https://www.networkdatasub.com/api";

const NETWORKDATASUB_API_TOKEN =
  process.env.NETWORKDATASUB_API_TOKEN;

if (!NETWORKDATASUB_API_TOKEN) {
  console.error(
    "❌ NETWORKDATASUB_API_TOKEN is not set. Make sure this script runs from your project root where .env / .env.local live."
  );

  process.exit(1);
}

// The window we're hunting in — widen if nothing shows up
const WINDOW_START = new Date("2026-08-12T15:30:00");
const WINDOW_END = new Date("2026-08-12T19:00:00");

// ------------------------------------------------------------------
// Fetch helper
// ------------------------------------------------------------------

async function fetchJson(path: string) {
  const url = `${NETWORKDATASUB_API_URL.replace(/\/+$/, "")}${path}`;

  console.log(`\n➡️  GET ${url}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Token ${NETWORKDATASUB_API_TOKEN}`,
      Accept: "application/json",
    },
  });

  const text = await response.text();

  let json: any = null;

  try {
    json = text.trim() ? JSON.parse(text) : null;
  } catch {
    console.error("⚠️  Response was not valid JSON:", text.slice(0, 500));
    return null;
  }

  console.log(`   status: ${response.status}`);

  return json;
}

// ------------------------------------------------------------------
// Try to find a timestamp on an arbitrary record, whatever it's called
// ------------------------------------------------------------------

function extractTimestamp(record: any): Date | null {
  const candidates = [
    record?.created_at,
    record?.createdAt,
    record?.date,
    record?.timestamp,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const parsed = new Date(candidate);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

async function main() {
  console.log("========================================");
  console.log("NetworkDataSub NIN history recovery");
  console.log("========================================");

  const history = await fetchJson("/verification/nin/history");

  if (!history) {
    console.error("❌ Could not load NIN history. Stopping.");
    return;
  }

  // The docs don't show the exact shape for this endpoint, so we
  // defensively check a few common shapes.
  const records: any[] =
    Array.isArray(history?.data) ? history.data :
    Array.isArray(history?.data?.data) ? history.data.data :
    Array.isArray(history) ? history :
    [];

  if (records.length === 0) {
    console.log("\n⚠️  No records found in the response. Full raw response below:");
    console.log(JSON.stringify(history, null, 2));
    return;
  }

  console.log(`\n✅ Found ${records.length} total record(s). Full list:\n`);

  console.log(JSON.stringify(records, null, 2));

  console.log(
    `\n----------------------------------------`
  );
  console.log(
    `Filtering for window ${WINDOW_START.toISOString()} → ${WINDOW_END.toISOString()}`
  );
  console.log(`----------------------------------------\n`);

  const matches = records.filter((record) => {
    const ts = extractTimestamp(record);
    return ts && ts >= WINDOW_START && ts <= WINDOW_END;
  });

  if (matches.length === 0) {
    console.log(
      "⚠️  No records matched the time window automatically. Scroll up and check the full list manually — the timestamp field name may differ from what this script checks for (created_at / createdAt / date / timestamp)."
    );
    return;
  }

  console.log(`✅ ${matches.length} record(s) matched the time window:\n`);

  for (const match of matches) {
    console.log(JSON.stringify(match, null, 2));
    console.log("---");
  }

  console.log(
    "\nCopy the matching record(s) above and paste them back so we can write the finalization script."
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});