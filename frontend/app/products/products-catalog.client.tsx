"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PublicProduct } from "@/lib/public-api";

function platformLabel(platform: string) {
  const p = platform.trim().toLowerCase();
  if (p.includes("windows")) return "Windows";
  if (p.includes("android")) return "Android";
  if (p.includes("ios")) return "iOS";
  if (p.includes("mac")) return "Mac";
  if (p.includes("linux")) return "Linux";
  if (p.includes("web")) return "Web";
  return platform;
}

function getPlatforms(p: PublicProduct) {
  const raw = (p.assets ?? []).map((a) => a.platform).filter(Boolean);
  const normalized = raw.map(platformLabel);
  return Array.from(new Set(normalized)).sort((a, b) => a.localeCompare(b));
}

function money(priceCents: number | undefined, currency: string | undefined) {
  if (!priceCents) return "Precio a medida";
  return `${(priceCents / 100).toFixed(2)} ${currency ?? "USD"}`;
}

export default function ProductsCatalogClient({ products }: { products: PublicProduct[] }) {
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState<string>("all");
  const [sort, setSort] = useState<"recent" | "alpha">("recent");

  const platformOptions = useMemo(() => {
    const all = products.flatMap(getPlatforms);
    return Array.from(new Set(all)).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = products.filter((p) => {
      if (query) {
        const hay = `${p.name} ${p.shortDescription ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (platform !== "all") {
        const plats = getPlatforms(p);
        if (!plats.includes(platform)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sort === "alpha") return a.name.localeCompare(b.name);
      const ad = a.updatedAt ?? "";
      const bd = b.updatedAt ?? "";
      return bd.localeCompare(ad);
    });
    return list;
  }, [products, platform, q, sort]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-xl sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">Catálogo de productos</h1>
            <p className="mt-1 text-sm text-[#111827]/70">
              Solo se muestran productos publicados. Haz click en “Ver detalles” para ver manuales y descargas.
            </p>
          </div>
          <Link
            href="/#contacto"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#1E88E5] px-5 text-sm font-semibold text-white transition hover:bg-[#1976D2]"
          >
            Solicitar demo / cotización
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#111827]/60">Buscar</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ej: FULLPOS, facturación…"
              className="h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-black/30"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#111827]/60">Plataforma</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-black/30"
            >
              <option value="all">Todas</option>
              {platformOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#111827]/60">Orden</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "recent" | "alpha")}
              className="h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-black/30"
            >
              <option value="recent">Más recientes</option>
              <option value="alpha">Alfabético</option>
            </select>
          </label>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-3xl border border-black/10 bg-white p-8 text-center shadow-xl">
          <h2 className="text-lg font-semibold text-[#111827]">No hay productos publicados aún</h2>
          <p className="mt-2 text-sm text-[#111827]/70">Publica un producto con estado PUBLISHED desde el panel admin.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-black/10 bg-white p-8 text-center shadow-xl">
          <h2 className="text-lg font-semibold text-[#111827]">Sin resultados</h2>
          <p className="mt-2 text-sm text-[#111827]/70">Prueba ajustando la búsqueda o el filtro de plataforma.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const platforms = getPlatforms(p).slice(0, 4);
            const hero = p.images?.[0] ?? null;
            return (
              <div key={p.id} className="group overflow-hidden rounded-3xl border border-black/10 bg-white shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl">
                <div className="aspect-[16/9] w-full bg-[#F7F7F7]">
                  {hero ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hero} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#111827]/50">Sin imagen</div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-[#111827]">{p.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-[#111827]/70">{p.shortDescription}</p>
                    </div>
                    {p.demoAvailable ? (
                      <span className="shrink-0 rounded-full bg-[#F39C12]/15 px-2.5 py-1 text-xs font-semibold text-[#B45309] ring-1 ring-[#F39C12]/25">
                        DEMO
                      </span>
                    ) : null}
                  </div>

                  {platforms.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {platforms.map((pl) => (
                        <span key={pl} className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[#111827]/80">
                          {pl}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <span className="font-semibold text-[#111827]">{money(p.priceCents, p.currency)}</span>
                      <span className="ml-2 rounded-full bg-black/5 px-2.5 py-1 text-xs font-semibold text-[#111827]/70">
                        v{p.currentVersion ?? "1.0.0"}
                      </span>
                    </div>
                    <Link
                      href={`/products/${p.slug}`}
                      className="inline-flex h-10 items-center justify-center rounded-full bg-[#1E88E5] px-4 text-sm font-semibold text-white transition hover:bg-[#1976D2]"
                    >
                      Ver detalles
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
