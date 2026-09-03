/**
 * Strips internal vendor identifiers from a transaction's description
 * (belt-and-braces: if a description was ever generated with the
 * fulfillment provider's name baked in, e.g. "SMEPlug - 1.5GB Data",
 * this scrubs it so it never reaches the client either).
 *
 * Add any other internal vendor names here as you integrate them.
 */
const INTERNAL_PROVIDER_NAMES = [
  "SMEPlug",
  "NetworkDataSub",
  "PAYSTACK",
  "Paystack",
];

export function sanitizeDescription(description: string): string {
  let clean = description;

  for (const name of INTERNAL_PROVIDER_NAMES) {
    // Strip the vendor name plus a trailing separator like " - " or ": "
    clean = clean.replace(
      new RegExp(`\\b${name}\\b\\s*[-:]?\\s*`, "gi"),
      ""
    );
  }

  return clean.trim() || "Transaction";
}