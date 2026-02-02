"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/auth-client";
import { fetchAuthedJson } from "@/lib/fetch-json";
import { Badge, Button, Card, Input, Label, PageHeader, Select } from "../../_components/ui";

type Product = {
  id: string;
  name: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

type ProductAsset = {
  id: string;
  platform: string;
  version: string;
  url: string;
  sha256: string | null;
  fileSize: number | null;
  isDemo: boolean;
  createdAt: string;
};

function formatBytes(size?: number | null) {
  if (!size || size <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export default function ProductAssetsClient({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [assets, setAssets] = useState<ProductAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [form, setForm] = useState({
    platform: "windows-x64",
    version: "1.0.0",
    url: "",
    sha256: "",
    fileSize: "",
    isDemo: true,
  });

  const title = useMemo(() => (product ? `Descargas · ${product.name}` : "Descargas"), [product]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const products = await fetchAuthedJson<Product[]>("/admin/products");
      setProduct(products.find((p) => p.id === productId) ?? null);
      const assetItems = await fetchAuthedJson<ProductAsset[]>(`/admin/products/${productId}/assets`);
      setAssets(assetItems);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando descargas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const createAsset = async () => {
    setError(null);
    setInfo(null);
    try {
      const payload = {
        platform: form.platform.trim(),
        version: form.version.trim(),
        url: form.url.trim(),
        sha256: form.sha256.trim() ? form.sha256.trim() : null,
        fileSize: form.fileSize.trim() ? Number(form.fileSize) : null,
        isDemo: form.isDemo,
      };

      const res = await authFetch(`/admin/products/${productId}/assets`, { method: "POST", body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { detail?: string } | null)?.detail ?? "Error creando descarga");
      setInfo("Descarga agregada");
      setForm((p) => ({ ...p, url: "", sha256: "", fileSize: "" }));
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error creando descarga");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={product ? `Producto: ${product.slug} · Estado: ${product.status}` : loading ? "Cargando…" : "Producto no encontrado"}
        right={
          <Link href="/admin/products" className="text-sm font-semibold text-zinc-700 hover:text-zinc-900">
            Volver
          </Link>
        }
      />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {info ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{info}</div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Nueva descarga" subtitle="Se muestra en /products/[slug] si el producto está PUBLISHED.">
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label>Plataforma</Label>
              <Select value={form.platform} onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}>
                <option value="windows-x64">windows-x64</option>
                <option value="windows-x86">windows-x86</option>
                <option value="android">android</option>
                <option value="ios">ios</option>
                <option value="mac">mac</option>
                <option value="linux">linux</option>
                <option value="web">web</option>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Versión</Label>
              <Input value={form.version} onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))} />
            </div>

            <div className="grid gap-2">
              <Label>URL de descarga</Label>
              <Input value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://..." />
            </div>

            <div className="grid gap-2">
              <Label>SHA256 (opcional)</Label>
              <Input value={form.sha256} onChange={(e) => setForm((p) => ({ ...p, sha256: e.target.value }))} placeholder="64 chars" />
            </div>

            <div className="grid gap-2">
              <Label>Tamaño (bytes, opcional)</Label>
              <Input value={form.fileSize} onChange={(e) => setForm((p) => ({ ...p, fileSize: e.target.value }))} placeholder="12345678" />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" checked={form.isDemo} onChange={(e) => setForm((p) => ({ ...p, isDemo: e.target.checked }))} />
              <span className="text-sm text-zinc-700">Marcar como DEMO</span>
            </div>

            <Button onClick={createAsset} disabled={!form.url.trim() || !form.version.trim() || !form.platform.trim()}>
              Agregar
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card title={`Descargas (${assets.length})`} subtitle={loading ? "Cargando…" : assets.length ? "Listado" : "Sin descargas"}>
            <div className="space-y-2">
              {assets.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900">{a.platform}</p>
                    <p className="text-xs text-zinc-500">
                      v{a.version}
                      {a.fileSize ? ` • ${formatBytes(a.fileSize)}` : ""}
                    </p>
                    <p className="truncate text-xs text-zinc-500">{a.url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.isDemo ? <Badge tone="blue">DEMO</Badge> : <Badge tone="neutral">FULL</Badge>}
                  </div>
                </div>
              ))}
              {!loading && assets.length === 0 ? (
                <p className="text-sm text-zinc-500">Agrega una URL de descarga para mostrar el botón “Descargar” al público.</p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

