// lib/naijaResultPinsClient.ts
//
// Shared helpers for talking to the NaijaResultPins API. Used by both
// /api/exams/products and /api/exams/purchase so the two routes don't
// duplicate (and drift on) this logic.

// ---------------------------------------------------------------------
// CHALLENGE-PAGE HANDLING
//
// The provider occasionally serves an HTML "checking your browser
// before accessing..." page (a WAF/CDN bot check) instead of JSON, even
// with a valid API key and correct headers — this is exactly what the
// production logs show (403, Content-Type text/html, <!DOCTYPE ...>).
// A plain server-to-server request can trip this. Detect it explicitly
// instead of letting JSON.parse() throw an opaque SyntaxError, and
// retry once after a short delay before giving up.
// ---------------------------------------------------------------------

export const NAIJARESULTPINS_CHALLENGE_MESSAGE =
  "The Exam PIN provider is temporarily blocking automated requests. Please try again in a moment.";

function looksLikeChallengePage(
  text: string,
  contentType: string | null
): boolean {
  const trimmed = text.trimStart();

  return (
    (contentType || "").includes("text/html") ||
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html")
  );
}

export async function fetchNaijaResultPins(
  url: string,
  init: RequestInit,
  options: { retryOnChallenge?: boolean; retryDelayMs?: number } = {}
): Promise<{ response: Response; text: string; isChallenge: boolean }> {
  const { retryOnChallenge = true, retryDelayMs = 1500 } = options;

  const attempt = async () => {
    const response = await fetch(url, { ...init, cache: "no-store" });
    const text = await response.text();
    return { response, text };
  };

  let { response, text } = await attempt();
  let isChallenge = looksLikeChallengePage(
    text,
    response.headers.get("content-type")
  );

  if (retryOnChallenge && isChallenge) {
    console.warn(
      `NaijaResultPins served a non-JSON challenge page for ${url} — retrying once in ${retryDelayMs}ms.`
    );

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));

    ({ response, text } = await attempt());
    isChallenge = looksLikeChallengePage(
      text,
      response.headers.get("content-type")
    );
  }

  return { response, text, isChallenge };
}

// ---------------------------------------------------------------------
// EXACT AMOUNT SPLITTING
//
// `totalAmount / quantity` then `.toFixed(2)` does NOT guarantee the
// per-card amounts sum back to `totalAmount` — rounding drift creeps in
// (e.g. ₦100 / 3 = ₦33.33 x 3 = ₦99.99, one kobo short). Split in whole
// kobo instead so the shares always sum exactly.
// ---------------------------------------------------------------------

export function splitAmountEvenly(total: number, count: number): number[] {
  const totalKobo = Math.round(total * 100);
  const base = Math.floor(totalKobo / count);
  const remainder = totalKobo - base * count;

  return Array.from(
    { length: count },
    (_, index) => (base + (index < remainder ? 1 : 0)) / 100
  );
}

// ---------------------------------------------------------------------
// CUSTOMER-FACING ERROR MESSAGES
//
// Provider error codes sometimes describe OUR reseller account, not the
// customer's wallet on our platform — passing them through verbatim is
// actively misleading.
// ---------------------------------------------------------------------

export function getCustomerFacingPurchaseMessage(providerResult: any): {
  message: string;
  isBusinessAccountIssue: boolean;
} {
  const code = providerResult?.code;

  // 013 = insufficient funds in OUR NaijaResultPins reseller wallet, not
  // the customer's wallet on our platform (already verified as
  // sufficient before we ever called the provider).
  if (code === "013") {
    return {
      message:
        "This Exam PIN is temporarily unavailable. Please try again shortly.",
      isBusinessAccountIssue: true,
    };
  }

  if (code === "012") {
    return {
      message: "You can purchase a maximum of 100 Exam PINs at a time.",
      isBusinessAccountIssue: false,
    };
  }

  return {
    message: providerResult?.message || "Exam PIN purchase failed.",
    isBusinessAccountIssue: false,
  };
}