export async function api<T>(path: string, data?: unknown): Promise<T> {
  const res = await fetch("/api/" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: "no-store",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error?.message ?? "Request failed.");
  return body.data as T;
}
export const uid = () => crypto.randomUUID();
