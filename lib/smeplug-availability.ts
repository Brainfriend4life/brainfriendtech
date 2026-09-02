import { prisma } from "@/lib/prisma";

// ============================================================
// SMEPLUG AVAILABILITY TRACKER
//
// SMEPlug's /data/plans response has no stock/availability field
// at all (confirmed against a live response — every plan object
// only has id, name, dispense_method, input_type, telco_price,
// price). So instead of reading availability, we INFER it: if a
// real purchase attempt against a plan fails with a message that
// looks like a stock-out, we flag that plan as unavailable for a
// while. A successful purchase for a plan immediately clears the
// flag, so a plan that comes back in stock un-flags itself the
// next time someone successfully buys it.
//
// Flags are stored in the existing SystemSetting table (same
// key/value pattern already used for REFERRAL_COMMISSION_DATA)
// so this works across serverless invocations, not just within
// one running process.
// ============================================================

const SMEPLUG_UNAVAILABLE_SETTING_KEY = "SMEPLUG_UNAVAILABLE_PLANS";

// How long a flag lasts before it expires on its own even if we
// never see a successful purchase to clear it. Adjust via env if
// 45 minutes is too long/short for how often plans restock.
const SMEPLUG_UNAVAILABLE_TTL_MINUTES = Number(
  process.env.SMEPLUG_UNAVAILABLE_TTL_MINUTES ?? 45
);

type UnavailableMap = Record<string, string>; // "networkId:planId" -> ISO timestamp

function planKey(
  networkId: number | string,
  planId: number | string
): string {
  return `${networkId}:${planId}`;
}

async function readMap(): Promise<UnavailableMap> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SMEPLUG_UNAVAILABLE_SETTING_KEY },
    });

    if (!setting?.value) {
      return {};
    }

    const parsed = JSON.parse(setting.value);

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("SMEPLUG UNAVAILABLE MAP READ ERROR:", error);
    return {};
  }
}

async function writeMap(map: UnavailableMap): Promise<void> {
  try {
    await prisma.systemSetting.upsert({
      where: { key: SMEPLUG_UNAVAILABLE_SETTING_KEY },
      update: { value: JSON.stringify(map) },
      create: {
        key: SMEPLUG_UNAVAILABLE_SETTING_KEY,
        value: JSON.stringify(map),
      },
    });
  } catch (error) {
    console.error("SMEPLUG UNAVAILABLE MAP WRITE ERROR:", error);
  }
}

// ============================================================
// FAILURE MESSAGE CLASSIFIER
//
// SMEPlug doesn't document their exact failure wording, so this
// is a best-effort keyword match. It intentionally does NOT match
// generic phrases like "insufficient" (that's SMEPlug's own
// wallet balance, not customer-facing stock) or "invalid phone" —
// only phrases that suggest the plan itself is the problem.
//
// Check the "SMEPLUG PURCHASE FAILURE MESSAGE" log after a real
// failure. If SMEPlug uses wording this doesn't catch, add a
// pattern here.
// ============================================================

const OUT_OF_STOCK_PATTERNS: RegExp[] = [
  /out\s*of\s*stock/i,
  /no\s*stock/i,
  /sold\s*out/i,
  /temporarily\s*(unavailable|disabled)/i,
  /currently\s*(unavailable|disabled)/i,
  /plan\s*(is\s*)?(currently\s*)?(disabled|unavailable|inactive|suspended)/i,
  /not\s*available/i,
  /\bunavailable\b/i,
  /discontinued/i,
];

export function looksLikeStockFailure(message: unknown): boolean {
  const text = String(message ?? "");

  if (!text) {
    return false;
  }

  return OUT_OF_STOCK_PATTERNS.some((pattern) => pattern.test(text));
}

// ============================================================
// PUBLIC API
// ============================================================

export async function markSmePlugPlanUnavailable(
  networkId: number | string,
  planId: number | string
): Promise<void> {
  const map = await readMap();
  map[planKey(networkId, planId)] = new Date().toISOString();
  await writeMap(map);
}

export async function markSmePlugPlanAvailable(
  networkId: number | string,
  planId: number | string
): Promise<void> {
  const map = await readMap();
  const key = planKey(networkId, planId);

  if (key in map) {
    delete map[key];
    await writeMap(map);
  }
}

// Returns the set of "networkId:planId" keys currently flagged
// unavailable (i.e. not yet expired). Also opportunistically
// prunes expired entries from storage (fire-and-forget, doesn't
// block the caller).
export async function getUnavailableSmePlugPlanKeys(): Promise<
  Set<string>
> {
  const map = await readMap();
  const ttlMs = SMEPLUG_UNAVAILABLE_TTL_MINUTES * 60 * 1000;
  const now = Date.now();

  const activeKeys = new Set<string>();
  const prunedMap: UnavailableMap = {};
  let changed = false;

  for (const [key, isoTimestamp] of Object.entries(map)) {
    const timestamp = new Date(isoTimestamp).getTime();

    if (Number.isFinite(timestamp) && now - timestamp < ttlMs) {
      activeKeys.add(key);
      prunedMap[key] = isoTimestamp;
    } else {
      changed = true;
    }
  }

  if (changed) {
    writeMap(prunedMap).catch((error) =>
      console.error("SMEPLUG UNAVAILABLE MAP PRUNE ERROR:", error)
    );
  }

  return activeKeys;
}

export function smePlugPlanKey(
  networkId: number | string,
  planId: number | string
): string {
  return planKey(networkId, planId);
}