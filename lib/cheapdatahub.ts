const CHEAPDATAHUB_BASE_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers";

const API_KEY = process.env.CHEAPDATAHUB_API_KEY;

if (!API_KEY) {
  throw new Error("CHEAPDATAHUB_API_KEY is not configured");
}

export async function purchaseData(
  bundleId: number,
  phoneNumber: string
) {
  const response = await fetch(
    `${CHEAPDATAHUB_BASE_URL}/data/purchase/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bundle_id: bundleId,
        phone_number: phoneNumber,
      }),
      cache: "no-store",
    }
  );

  const text = await response.text();

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    return {
      success: false,
      status: response.status,
      error: "CheapDataHub returned a non-JSON response",
      responsePreview: text.slice(0, 500),
    };
  }

  return {
    success: response.ok && data?.status === "true",
    status: response.status,
    data,
  };
}