"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { fetchAuthedJson } from "@/lib/fetch-json";
import { Badge, Button, Card, Input, Label, PageHeader, Select, Textarea } from "../_components/ui";

type Product = { id: string; name: string; slug: string };
type Voucher = {
  id: string;
  code: string;
  status: "UNUSED" | "USED" | "CANCELLED" | "EXPIRED";
  batchName: string | null;
  createdAt: string;
  usedAt: string | null;
  usedByEmail: string | null;
  product: Product;
  tenant: any;
  license: any;
};

function toCsv(codes: string[]) {
  return ["code", ...codes].join("\n");
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function VouchersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [createdCodes, setCreatedCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [filters, setFilters] = useState({ q: "", status: "", productId: "" });

  const [batch, setBatch] = useState({
    productId: "",
    count: 25,
    batchName: "Lote-001",
    licenseType: "FULL",
    planType: "SUBSCRIPTION",
    licenseDurationDays: 30,
    maxDevices: 1,
    maxActivations: 3,
    offlineAllowed: true,
    revalidateDays: 7,
    allowedVersionMin: "",
    allowedVersionMax: "",
    modulesJson: JSON.stringify({ core: true }, null, 2),
    featuresJson: JSON.stringify({ seats: 1 }, null, 2),
    notes: "",
  });

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.q.trim()) p.set("q", filters.q.trim());
    if (filters.status) p.set("status", filters.status);
    if (filters.productId) p.set("productId", filters.productId);
    p.set("limit", "200");
    return `?${p.toString()}`;
  }, [filters]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prod, list] = await Promise.all([
        fetchAuthedJson<Product[]>("/admin/products"),
        fetchAuthedJson<Voucher[]>(`/admin/vouchers${queryString}`),
      ]);
      setProducts(prod);
      setVouchers(list);
      setBatch((p) => ({ ...p, productId: p.productId || prod[0]?.id || "" }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando vouchers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  const createBatch = async () => {
    setError(null);
    setInfo(null);
    setCreatedCodes([]);
    try {
      const modules = JSON.parse(batch.modulesJson || "{}");
      const features = JSON.parse(batch.featuresJson || "{}");
      const payload: any = {
        productId: batch.productId,
        count: Number(batch.count) || 1,
        batchName: batch.batchName || null,
        licenseType: batch.licenseType,
        planType: batch.planType,
        licenseDurationDays: batch.planType === "PERPETUAL" ? null : Number(batch.licenseDurationDays) || null,
        maxDevices: Number(batch.maxDevices) || 1,
        maxActivations: Number(batch.maxActivations) || 1,
        offlineAllowed: Boolean(batch.offlineAllowed),
        revalidateDays: Number(batch.revalidateDays) || null,
        allowedVersionMin: batch.allowedVersionMin || null,
        allowedVersionMax: batch.allowedVersionMax || null,
        modules,
        features,
        notes: batch.notes || null,
      };

      const res = await authFetch("/admin/vouchers/batch", { method: "POST", body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as any)?.detail ?? "Error creando lote");
      const data = await res.json();
      const codes = Array.isArray(data?.vouchers) ? data.vouchers.map((v: any) => String(v.code)) : [];
      setCreatedCodes(codes);
      setInfo(`Lote creado: ${codes.length} códigos`);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error creando lote");
    }
  };

  const cancelVoucher = async (id: string) => {
    setError(null);
    setInfo(null);
    try {
      const res = await authFetch(`/admin/vouchers/${id}/cancel`, { method: "POST" });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as any)?.detail ?? "No se pudo cancelar");
      setInfo("Voucher cancelado");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cancelando");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Vouchers" subtitle="Licencia física: genera códigos para imprimir (QR) y canjear sin login." />
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {info ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{info}</div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Crear lote" subtitle="Genera códigos tipo FT-XXXX-XXXX-XXXX.">
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label>Producto</Label>
              <Select value={batch.productId} onChange={(e) => setBatch((p) => ({ ...p, productId: e.target.value }))}>
                <option value="">Selecciona…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Cantidad</Label>
                <Input type="number" value={String(batch.count)} onChange={(e) => setBatch((p) => ({ ...p, count: Number(e.target.value) }))} />
              </div>
              <div className="grid gap-2">
                <Label>Nombre del lote</Label>
                <Input value={batch.batchName} onChange={(e) => setBatch((p) => ({ ...p, batchName: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={batch.licenseType} onChange={(e) => setBatch((p) => ({ ...p, licenseType: e.target.value }))}>
                  <option value="FULL">FULL</option>
                  <option value="DEMO">DEMO</option>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Plan</Label>
                <Select value={batch.planType} onChange={(e) => setBatch((p) => ({ ...p, planType: e.target.value }))}>
                  <option value="SUBSCRIPTION">SUBSCRIPTION</option>
                  <option value="PERPETUAL">PERPETUAL</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Duración (días) - solo SUBSCRIPTION</Label>
              <Input type="number" value={String(batch.licenseDurationDays)} onChange={(e) => setBatch((p) => ({ ...p, licenseDurationDays: Number(e.target.value) }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Max. dispositivos</Label>
                <Input type="number" value={String(batch.maxDevices)} onChange={(e) => setBatch((p) => ({ ...p, maxDevices: Number(e.target.value) }))} />
              </div>
              <div className="grid gap-2">
                <Label>Max. activaciones</Label>
                <Input type="number" value={String(batch.maxActivations)} onChange={(e) => setBatch((p) => ({ ...p, maxActivations: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" checked={batch.offlineAllowed} onChange={(e) => setBatch((p) => ({ ...p, offlineAllowed: e.target.checked }))} />
              <span className="text-sm text-zinc-700">Permitir offline</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Versión mín.</Label>
                <Input value={batch.allowedVersionMin} onChange={(e) => setBatch((p) => ({ ...p, allowedVersionMin: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Versión máx.</Label>
                <Input value={batch.allowedVersionMax} onChange={(e) => setBatch((p) => ({ ...p, allowedVersionMax: e.target.value }))} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Módulos (JSON)</Label>
              <Textarea rows={3} value={batch.modulesJson} onChange={(e) => setBatch((p) => ({ ...p, modulesJson: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Features (JSON)</Label>
              <Textarea rows={3} value={batch.featuresJson} onChange={(e) => setBatch((p) => ({ ...p, featuresJson: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Notas</Label>
              <Textarea rows={2} value={batch.notes} onChange={(e) => setBatch((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            <Button onClick={createBatch} disabled={!batch.productId || Number(batch.count) <= 0}>
              Crear lote
            </Button>

            {createdCodes.length ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-semibold text-zinc-700">Códigos creados</p>
                <p className="mt-1 text-xs text-zinc-500">Descárgalos e imprímelos como QR apuntando a `/redeem`.</p>
                <div className="mt-2 flex gap-2">
                  <Button variant="secondary" onClick={() => downloadText(`vouchers-${Date.now()}.csv`, toCsv(createdCodes))}>
                    Descargar CSV
                  </Button>
                  <Button variant="ghost" onClick={() => downloadText(`vouchers-${Date.now()}.txt`, createdCodes.join("\n"))}>
                    TXT
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card title="Filtros" subtitle="Busca por código, lote o email usado.">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Búsqueda</Label>
                <Input value={filters.q} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))} placeholder="FT-XXXX… / email / lote" />
              </div>
              <div className="grid gap-2">
                <Label>Estado</Label>
                <Select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
                  <option value="">Todos</option>
                  <option value="UNUSED">UNUSED</option>
                  <option value="USED">USED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="EXPIRED">EXPIRED</option>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Producto</Label>
                <Select value={filters.productId} onChange={(e) => setFilters((p) => ({ ...p, productId: e.target.value }))}>
                  <option value="">Todos</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          <Card title={`Vouchers (${vouchers.length})`} subtitle={loading ? "Cargando…" : "Listado"}>
            <div className="space-y-2">
              {vouchers.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900">{v.code}</p>
                    <p className="text-xs text-zinc-500">
                      {v.product?.name ?? "Producto"} • {v.batchName ?? "Sin lote"} • {new Date(v.createdAt).toLocaleString()}
                      {v.usedByEmail ? ` • usado por ${v.usedByEmail}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={v.status === "USED" ? "green" : v.status === "UNUSED" ? "blue" : v.status === "CANCELLED" ? "red" : "amber"}>
                      {v.status}
                    </Badge>
                    {v.status === "UNUSED" ? (
                      <Button variant="danger" onClick={() => cancelVoucher(v.id)}>
                        Cancelar
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
              {vouchers.length === 0 ? <p className="text-sm text-zinc-500">Sin vouchers.</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

