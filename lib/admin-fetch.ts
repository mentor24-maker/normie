type AdminApiPayload = {
  error?: string;
  code?: string;
};

export async function parseAdminJsonResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    const preview = text.replace(/\s+/g, " ").trim().slice(0, 160);
    const target = response.url ? ` ${response.url}` : "";
    throw new Error(
      `${fallbackMessage}${target} returned ${response.status} ${response.statusText || "non-JSON"}: ${preview || "No response body."}`
    );
  }

  return (await response.json()) as T;
}

export async function readAdminJson<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const data = await parseAdminJsonResponse<T>(response, fallbackMessage);

  if (!response.ok) {
    const payload = data as AdminApiPayload;
    throw new Error(payload.error ?? fallbackMessage);
  }

  return data;
}
