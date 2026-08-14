const NETWORKDATASUB_BASE_URL =
  process.env.NETWORKDATASUB_BASE_URL ||
  "https://networkdatasub.com/api";

type NetworkDataSubOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<
    string,
    string
  >;
};

export async function networkDataSubRequest<T>(
  endpoint: string,
  options: NetworkDataSubOptions = {}
): Promise<{
  response: Response;
  data: T;
}> {
  const apiKey =
    process.env.NETWORKDATASUB_API_KEY;

  if (!apiKey) {
    throw new Error(
      "NETWORKDATASUB_API_KEY is not configured."
    );
  }

  const url =
    `${NETWORKDATASUB_BASE_URL.replace(
      /\/$/,
      ""
    )}/${endpoint.replace(
      /^\//,
      ""
    )}`;

  const response =
    await fetch(url, {
      method:
        options.method ||
        "GET",

      headers: {
        Accept:
          "application/json",

        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${apiKey}`,

        ...(options.headers || {}),
      },

      ...(options.body !==
      undefined
        ? {
            body:
              JSON.stringify(
                options.body
              ),
          }
        : {}),

      cache:
        "no-store",
    });

  const text =
    await response.text();

  let data: T;

  try {
    data = text
      ? JSON.parse(text)
      : ({} as T);
  } catch {
    data =
      ({
        message:
          text ||
          "Invalid provider response.",
      } as T);
  }

  return {
    response,
    data,
  };
}