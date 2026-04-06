export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ?? "";

export type TokenResponse = { access_token: string; token_type: string };

export type CompanyPublic = {
  id: number;
  name: string;
  address: string;
  geocoded_address: string;
  country: string;
  tax_id: string;
  latitude: number;
  longitude: number;
  code: string;
  public_url: string;
  created_at: string;
};

export type GeocodeCandidate = {
  osm_ref: string;
  display_name: string;
  latitude?: number | null;
  longitude?: number | null;
  category?: string | null;
  type?: string | null;
};

export type GeocodeSearchResponse = { items: GeocodeCandidate[] };

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as any),
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
