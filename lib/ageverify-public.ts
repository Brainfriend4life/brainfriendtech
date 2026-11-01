const PROVIDER_HOST = "ageverify.com.ng";

const PRIVATE_KEYS = new Set([
  "pdf_url",
  "download_url",
  "status_check",
  "balance_remaining",
  "balance",
  "amount_charged",
  "price_per_nin",
  "price_per_id",
  "record_id",
  "report_id",
  "processing_time",
]);

export function isProviderUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      (url.hostname === PROVIDER_HOST ||
        url.hostname.endsWith(`.${PROVIDER_HOST}`))
    );
  } catch {
    return false;
  }
}

export function publicResult(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(publicResult);
  }

  if (value && typeof value === "object") {
    const clean: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (PRIVATE_KEYS.has(key.toLowerCase())) continue;
      clean[key] = publicResult(item);
    }

    return clean;
  }

  return value;
}

export function hasDocumentUrl(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;

  const pending: unknown[] = [result];

  while (pending.length) {
    const current = pending.pop();

    if (!current || typeof current !== "object") continue;

    if (Array.isArray(current)) {
      pending.push(...current);
      continue;
    }

    const item = current as Record<string, unknown>;

    if (isProviderUrl(item.pdf_url) || isProviderUrl(item.download_url)) {
      return true;
    }

    pending.push(...Object.values(item));
  }

  return false;
}

export function documentPath(id: string, result: unknown): string | null {
  return id && hasDocumentUrl(result)
    ? `/api/verification/ageverify/file/${encodeURIComponent(id)}`
    : null;
}

export function resultText(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;

  const root = result as Record<string, any>;
  const data =
    root.status_check && typeof root.status_check === "object"
      ? root.status_check
      : root;

  const first = Array.isArray(data.requests) ? data.requests[0] : null;

  const text =
    data.admin_reply ??
    data.reply ??
    first?.admin_reply ??
    first?.reply ??
    null;

  return typeof text === "string" && text.trim() ? text.trim() : null;
}
