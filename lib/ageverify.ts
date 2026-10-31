type AgeVerifyResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  body: any;
};

export async function av(
  path: string,
  init: RequestInit = {},
): Promise<AgeVerifyResponse> {
  const baseUrl = process.env.AGEVERIFY_BASE_URL?.trim();
  const apiKey =
    process.env.AGEVERIFY_API_KEY?.trim() ||
    process.env.AGEVERIFY_TOKEN?.trim();

  if (!baseUrl || !apiKey) {
    throw new Error("AgeVerify API configuration is missing.");
  }

  const rootUrl = baseUrl.replace(/\/+$/, "").replace(/\/api\/v[12]$/i, "");

  const cleanPath = path.replace(/^\/+/, "");
  const endpoint = `${rootUrl}/${cleanPath}`;

  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");
  headers.set("x-api-key", apiKey);

  if (
    init.body &&
    !(typeof FormData !== "undefined" && init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(endpoint, {
    ...init,
    headers,
    cache: "no-store",
  });

  const responseText = await response.text();

  let responseBody: any = null;

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = { message: responseText };
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body: responseBody,
  };
}
