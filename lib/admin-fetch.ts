type AdminApiPayload = {
  error?: string;
  code?: string;
};

export async function readAdminJson<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    const preview = text.replace(/\s+/g, " ").trim().slice(0, 160);
    throw new Error(
      `${fallbackMessage} (${response.status} ${response.statusText || "non-JSON"}): ${preview || "No response body."}`
    );
  }

  const data = (await response.json()) as T;

  if (!response.ok) {
    const payload = data as AdminApiPayload;
    throw new Error(payload.error ?? fallbackMessage);
  }

  return data;
}
