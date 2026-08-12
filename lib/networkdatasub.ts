const NETWORKDATASUB_API_URL =
  process.env.NETWORKDATASUB_API_URL ||
  "https://www.networkdatasub.com/api";

const NETWORKDATASUB_API_TOKEN =
  process.env.NETWORKDATASUB_API_TOKEN;

type NetworkDataSubOptions = {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
};

export async function networkDataSubRequest<T = any>(
  endpoint: string,
  options: NetworkDataSubOptions = {}
): Promise<{
  response: Response;
  data: T | null;
}> {
  if (!NETWORKDATASUB_API_TOKEN) {
    throw new Error(
      "NETWORKDATASUB_API_TOKEN is not configured."
    );
  }

  const method = options.method || "GET";

  const baseUrl =
    NETWORKDATASUB_API_URL.replace(/\/+$/, "");

  const cleanEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const url = `${baseUrl}${cleanEndpoint}`;

  console.log("NETWORKDATASUB REQUEST:", {
    method,
    url,
  });

  const response = await fetch(url, {
    method,

    headers: {
      Authorization: `Token ${NETWORKDATASUB_API_TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "BrainfriendTech/1.0",
    },

    ...(method === "POST"
      ? {
          body: JSON.stringify(
            options.body || {}
          ),
        }
      : {}),

    cache: "no-store",
  });

  const text = await response.text();

  console.log(
    "NETWORKDATASUB RESPONSE STATUS:",
    response.status
  );

  console.log(
    "NETWORKDATASUB RESPONSE BODY:",
    text
  );

  let data: T | null = null;

  try {
    data = text.trim()
      ? JSON.parse(text)
      : null;
  } catch {
    data = null;
  }

  return {
    response,
    data,
  };
}