export interface ApiClientOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  auth?: boolean; // automatically include JWT
}

export async function apiClient<T>(
  endpoint: string,
  { method = 'GET', body, headers = {}, auth = true }: ApiClientOptions = {}
): Promise<T> {
  const finalHeaders: Record<string, string> = { ...headers };

  if (auth) {
    const token = localStorage.getItem('jwt'); // or wherever you store it
    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...finalHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error || 'Request failed');
  }

  // Cast the JSON response to type T
  const data: T = await res.json();
  return data;
}