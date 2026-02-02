export type PublicProductAsset = {
  id: string;
  platform: string;
  version: string;
  url: string;
  sha256?: string | null;
  fileSize?: number | null;
  isDemo?: boolean;
  createdAt?: string;
};

export type PublicProductFaqItem = { q: string; a: string };

export type PublicProduct = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  features: string[];
  priceCents: number;
  currency: string;
  licenseModel: string;
  demoAvailable: boolean;
  demoDays?: number | null;
  currentVersion: string;
  images: string[];
  publicOrder?: number | null;
  promoVideoUrl?: string | null;
  manualFileUrl?: string | null;
  faq?: PublicProductFaqItem[] | null;
  updatedAt?: string;
  assets: PublicProductAsset[];
};

export type PublicDemoDownload = {
  id: string;
  product: { id: string; name: string; slug: string };
  platform: string;
  version: string;
  url: string;
  sha256?: string | null;
  fileSize?: number | null;
};

function apiUrl(path: string) {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? "/api").trim();
  const base = configured.replace(/\/$/, "");

  // When NEXT_PUBLIC_API_URL is relative (e.g. /api), SSR/SSG during build cannot rely on a running Next server.
  // Use a server-side absolute target if available.
  const serverTarget = (process.env.API_PROXY_TARGET || "http://localhost:4000").replace(/\/$/, "");
  const effectiveBase = typeof window === "undefined" && base.startsWith("/") ? serverTarget : base;

  if (!effectiveBase) return path.startsWith("/") ? path : `/${path}`;
  return `${effectiveBase}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 7000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal } as any);
  } finally {
    clearTimeout(id);
  }
}

export async function fetchPublicProducts(): Promise<PublicProduct[]> {
  try {
    const res = await fetchWithTimeout(apiUrl("/public/products"), { next: { revalidate: 60 } as any });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as PublicProduct[]) : [];
  } catch {
    return [];
  }
}

export async function fetchPublicProduct(slug: string): Promise<PublicProduct | null> {
  try {
    const res = await fetchWithTimeout(apiUrl(`/public/products/${encodeURIComponent(slug)}`), { next: { revalidate: 60 } as any });
    if (!res.ok) return null;
    return (await res.json()) as PublicProduct;
  } catch {
    return null;
  }
}

export async function fetchPublicDemoDownloads(): Promise<PublicDemoDownload[]> {
  try {
    const res = await fetchWithTimeout(apiUrl("/public/downloads"), { next: { revalidate: 60 } as any });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as PublicDemoDownload[]) : [];
  } catch {
    return [];
  }
}
