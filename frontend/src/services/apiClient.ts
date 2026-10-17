import { tryRefreshAfterUnauthorized } from "./authSession";

export interface ApiClientOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Automatically include JWT. Defaults to true. */
  auth?: boolean;
  /** Internal: set after a silent refresh so a second 401 surfaces instead of looping. */
  _retried?: boolean;
}

export async function apiClient<T>(
  endpoint: string,
  {
    method = "GET",
    body,
    headers = {},
    auth = true,
    _retried = false,
  }: ApiClientOptions = {}
): Promise<T> {
  const finalHeaders: Record<string, string> = { ...headers };

  if (auth) {
    const token = localStorage.getItem("jwt");
    if (token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...finalHeaders,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !_retried) {
    const refreshed = await tryRefreshAfterUnauthorized();
    if (refreshed) {
      return apiClient<T>(endpoint, {
        method,
        body,
        headers,
        auth,
        _retried: true,
      });
    }
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      (errorBody as { error?: string })?.error || "Request failed"
    );
  }

  return (await res.json()) as T;
}
