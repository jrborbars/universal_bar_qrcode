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

export type ProductStatus = "Active" | "Draft" | "Discontinued";

export type ProductPublic = {
  id: number;
  company_id: number;
  company_name: string;
  sku: string;
  code: string;
  public_url: string;
  description: string;
  short_description: string;
  category: string;
  status: ProductStatus;
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  volume?: number | null;
  customer_field: string;
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

function splitCode(code: string): string[] {
  return code
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function productIdFromPublicCode(code: string): string {
  const parts = splitCode(code);
  if (parts.length === 0) return code;
  return parts[parts.length - 1];
}

export function publicPathFromUrl(publicUrl: string): string {
  try {
    const parsed = new URL(publicUrl, window.location.origin);
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
  } catch {
    return publicUrl;
  }
}

async function readErrorMessage(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await res.json().catch(() => null);
    const detail = data?.detail;

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      if (typeof first === "string" && first.trim()) {
        return first;
      }
      if (first && typeof first.msg === "string" && first.msg.trim()) {
        return first.msg;
      }
    }

    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }
  }

  const text = await res.text().catch(() => "");
  return text.trim() || `HTTP ${res.status}`;
}

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
    throw new Error(await readErrorMessage(res));
  }
  return (await res.json()) as T;
}
