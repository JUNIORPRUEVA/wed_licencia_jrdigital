"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/auth-client";
import { fetchAuthedJson } from "@/lib/fetch-json";
import { Badge, Button, Card, Input, Label, PageHeader, Select, Textarea } from "../_components/ui";

type Product = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  currency: string;
  licenseModel: string;
  demoAvailable: boolean;
  demoDays: number | null;
  currentVersion: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  offlineRequestVerifyKey: string | null;
  createdAt: string;
};

function parseCsv(value: string) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseFaqJson(value: string): Array<{ q: string; a: string }> | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return null;
    const items = parsed
      .map((i) => ({ q: String(i?.q ?? "").trim(), a: String(i?.a ?? "").trim() }))
      .filter((i) => i.q.length >= 2 && i.a.length >= 2);
    return items.length ? items : null;
  } catch {
    return null;
  }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    shortDescription: "",
    longDescription: "",
    features: "",
    priceCents: 9900,
    currency: "USD",
    licenseModel: "SUBSCRIPTION",
    demoAvailable: true,
    demoDays: 14,
    currentVersion: "1.0.0",
    images: "",
    publicOrder: 0,
    promoVideoUrl: "",
    manualFileUrl: "",
    faqJson: "",
    status: "PUBLISHED" as const,
    offlineRequestVerifyKey: "",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuthedJson<Product[]>("/admin/products");
      setProducts(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando productos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createProduct = async () => {
    setError(null);
    setInfo(null);
    try {
      const payload: any = {
        name: form.name,
        slug: form.slug,
        shortDescription: form.shortDescription,
        longDescription: form.longDescription,
        features: parseCsv(form.features),
        priceCents: Number(form.priceCents) || 0,
        currency: form.currency,
        licenseModel: form.licenseModel,
        demoAvailable: form.demoAvailable,
        demoDays: form.demoAvailable ? Number(form.demoDays) || null : null,
        currentVersion: form.currentVersion,
        images: parseCsv(form.images),
        publicOrder: Number.isFinite(Number(form.publicOrder)) ? Number(form.publicOrder) : null,
        promoVideoUrl: form.promoVideoUrl.trim() ? form.promoVideoUrl.trim() : null,
        manualFileUrl: form.manualFileUrl.trim() ? form.manualFileUrl.trim() : null,
        faq: parseFaqJson(form.faqJson),
        status: form.status,
        offlineRequestVerifyKey: form.offlineRequestVerifyKey ? form.offlineRequestVerifyKey : null,
      };

      const res = await authFetch("/admin/products", { method: "POST", body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as any)?.detail ?? "Error creando producto");
      setInfo("Producto creado");
      setForm((p) => ({ ...p, name: "", slug: "", shortDescription: "", longDescription: "" }));
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error creando producto");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Productos" subtitle="Catálogo y configuración de apps." />
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {info ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{info}</div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Nuevo producto" subtitle="Se publica en la web pública si está PUBLISHED.">
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="fullpos" />
            </div>
            <div className="grid gap-2">
              <Label>Descripción corta</Label>
              <Input value={form.shortDescription} onChange={(e) => setForm((p) => ({ ...p, shortDescription: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Descripción larga</Label>
              <Textarea rows={3} value={form.longDescription} onChange={(e) => setForm((p) => ({ ...p, longDescription: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Features (CSV)</Label>
              <Input value={form.features} onChange={(e) => setForm((p) => ({ ...p, features: e.target.value }))} placeholder="POS rápido, Reportes, Inventario" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Precio (cents)</Label>
                <Input type="number" value={String(form.priceCents)} onChange={(e) => setForm((p) => ({ ...p, priceCents: Number(e.target.value) }))} />
              </div>
              <div className="grid gap-2">
                <Label>Moneda</Label>
                <Input value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Modelo</Label>
                <Select value={form.licenseModel} onChange={(e) => setForm((p) => ({ ...p, licenseModel: e.target.value }))}>
                  <option value="SUBSCRIPTION">SUBSCRIPTION</option>
                  <option value="PERPETUAL">PERPETUAL</option>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Estado</Label>
                <Select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as any }))}>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4" checked={form.demoAvailable} onChange={(e) => setForm((p) => ({ ...p, demoAvailable: e.target.checked }))} />
                <span className="text-sm text-zinc-700">Demo disponible</span>
              </div>
              <div className="grid gap-2">
                <Label>Días demo</Label>
                <Input type="number" value={String(form.demoDays)} onChange={(e) => setForm((p) => ({ ...p, demoDays: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Versión actual</Label>
              <Input value={form.currentVersion} onChange={(e) => setForm((p) => ({ ...p, currentVersion: e.target.value }))} />
            </div>

            <div className="grid gap-2">
              <Label>Imágenes (URLs CSV)</Label>
              <Textarea rows={2} value={form.images} onChange={(e) => setForm((p) => ({ ...p, images: e.target.value }))} placeholder="https://.../1.png, https://.../2.png" />
            </div>

            <div className="grid gap-2">
              <Label>Orden público (opcional)</Label>
              <Input type="number" value={String(form.publicOrder)} onChange={(e) => setForm((p) => ({ ...p, publicOrder: Number(e.target.value) }))} />
            </div>

            <div className="grid gap-2">
              <Label>Video promo (URL)</Label>
              <Input value={form.promoVideoUrl} onChange={(e) => setForm((p) => ({ ...p, promoVideoUrl: e.target.value }))} placeholder="https://youtube.com/..." />
            </div>

            <div className="grid gap-2">
              <Label>Manual (PDF URL)</Label>
              <Input value={form.manualFileUrl} onChange={(e) => setForm((p) => ({ ...p, manualFileUrl: e.target.value }))} placeholder="https://.../manual.pdf" />
            </div>

            <div className="grid gap-2">
              <Label>FAQ (JSON)</Label>
              <Textarea
                rows={4}
                value={form.faqJson}
                onChange={(e) => setForm((p) => ({ ...p, faqJson: e.target.value }))}
                placeholder='[{"q":"Pregunta","a":"Respuesta"}]'
              />
            </div>

            <div className="grid gap-2">
              <Label>Offline request verify key (Ed25519, base64)</Label>
              <Textarea rows={2} value={form.offlineRequestVerifyKey} onChange={(e) => setForm((p) => ({ ...p, offlineRequestVerifyKey: e.target.value }))} placeholder="opcional: para firmar requests offline del cliente" />
            </div>

            <Button onClick={createProduct} disabled={!form.name.trim() || !form.slug.trim()}>
              Crear producto
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card title={`Productos (${products.length})`} subtitle={loading ? "Cargando…" : "Listado"}>
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900">
                      {p.name} <span className="text-xs font-normal text-zinc-500">({p.slug})</span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      {p.licenseModel} • v{p.currentVersion} • {(p.priceCents / 100).toFixed(2)} {p.currency}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={p.status === "PUBLISHED" ? "green" : p.status === "DRAFT" ? "amber" : "neutral"}>{p.status}</Badge>
                    {p.demoAvailable ? <Badge tone="blue">DEMO</Badge> : null}
                    <Link href={`/admin/products/${p.id}`} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50">
                      Descargas
                    </Link>
                  </div>
                </div>
              ))}
              {products.length === 0 ? <p className="text-sm text-zinc-500">Sin productos.</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
