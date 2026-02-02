"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { fetchAuthedJson } from "@/lib/fetch-json";
import { authFetch } from "@/lib/auth-client";
import { Badge, Button, Card, Input, Label, PageHeader, Select, Textarea } from "../_components/ui";

type Product = { id: string; name: string; slug: string; currentVersion: string | null; status: string };
type Tenant = { id: string; tradeName: string | null; contactEmail: string | null; status: string };

type LicenseRow = {
  id: string;
  key: string;
  type: "DEMO" | "FULL";
  planType: "SUBSCRIPTION" | "PERPETUAL";
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED" | "REVOKED";
  startsAt: string | null;
  expiresAt: string | null;
  maxDevices: number;
  maxActivations: number;
  offlineAllowed: boolean;
  revalidateDays: number | null;
  allowedVersionMin: string | null;
  allowedVersionMax: string | null;
  modules: any;
  features: any;
  notes: string | null;
  tenant: { tradeName: string | null };
  product: { id: string; name: string };
};

const LicenseFormSchema = z.object({
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  type: z.enum(["DEMO", "FULL"]).default("DEMO"),
  planType: z.enum(["SUBSCRIPTION", "PERPETUAL"]).default("SUBSCRIPTION"),
  status: z.enum(["ACTIVE", "SUSPENDED", "EXPIRED", "REVOKED"]).default("ACTIVE"),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  maxDevices: z.coerce.number().int().positive().max(1000).default(1),
  maxActivations: z.coerce.number().int().positive().max(10000).default(1),
  offlineAllowed: z.boolean().default(true),
  revalidateDays: z.union([z.coerce.number().int().positive().max(365), z.literal(""), z.undefined()]).optional(),
  allowedVersionMin: z.string().optional(),
  allowedVersionMax: z.string().optional(),
  modulesJson: z.string().default("{}"),
  featuresJson: z.string().default("{}"),
  notes: z.string().optional(),
});

type LicenseFormInput = z.infer<typeof LicenseFormSchema>;

function statusTone(status: LicenseRow["status"]) {
  if (status === "ACTIVE") return "green";
  if (status === "SUSPENDED") return "amber";
  if (status === "REVOKED") return "red";
  return "neutral";
}

function formatDateInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function LicensesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({ q: "", status: "", productId: "", tenantId: "" });

  const form = useForm<LicenseFormInput>({
    resolver: zodResolver(LicenseFormSchema as any),
    defaultValues: {
      tenantId: "",
      productId: "",
      type: "DEMO",
      planType: "SUBSCRIPTION",
      status: "ACTIVE",
      startsAt: "",
      expiresAt: "",
      maxDevices: 1,
      maxActivations: 2,
      offlineAllowed: true,
      revalidateDays: "",
      allowedVersionMin: "",
      allowedVersionMax: "",
      modulesJson: JSON.stringify({ core: true }, null, 2),
      featuresJson: JSON.stringify({ seats: 1 }, null, 2),
      notes: "",
    },
  });

  const canSubmit = form.watch("tenantId") && form.watch("productId");

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.q.trim()) p.set("q", filters.q.trim());
    if (filters.status) p.set("status", filters.status);
    if (filters.productId) p.set("productId", filters.productId);
    if (filters.tenantId) p.set("tenantId", filters.tenantId);
    p.set("limit", "200");
    return `?${p.toString()}`;
  }, [filters]);

  const load = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const [prod, ten, lic] = await Promise.all([
        fetchAuthedJson<Product[]>("/admin/products"),
        fetchAuthedJson<Tenant[]>("/admin/tenants"),
        fetchAuthedJson<LicenseRow[]>(`/admin/licenses${queryString}`),
      ]);
      setProducts(prod);
      setTenants(ten);
      setLicenses(lic);
      if (!form.getValues("tenantId") && ten[0]?.id) form.setValue("tenantId", ten[0].id);
      if (!form.getValues("productId") && prod[0]?.id) form.setValue("productId", prod[0].id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    setInfo(null);
    try {
      const modules = JSON.parse(values.modulesJson || "{}");
      const features = JSON.parse(values.featuresJson || "{}");

      const payload: any = {
        tenantId: values.tenantId,
        productId: values.productId,
        type: values.type,
        planType: values.planType,
        status: values.status,
        startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : null,
        expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
        maxDevices: values.maxDevices,
        maxActivations: values.maxActivations,
        offlineAllowed: values.offlineAllowed,
        revalidateDays: values.revalidateDays === "" ? null : Number(values.revalidateDays),
        allowedVersionMin: values.allowedVersionMin || null,
        allowedVersionMax: values.allowedVersionMax || null,
        modules,
        features,
        notes: values.notes || null,
      };

      const res = await authFetch("/admin/licenses", { method: "POST", body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as any)?.detail ?? "Error creando licencia");
      const created = (await res.json()) as LicenseRow;
      setLicenses((prev) => [created, ...prev]);
      setInfo("Licencia creada");
      form.reset({ ...form.getValues(), notes: "" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error creando licencia");
    }
  });

  const doAction = async (id: string, action: "suspend" | "revoke" | "renew") => {
    setError(null);
    setInfo(null);
    try {
      const body = action === "renew" ? { addDays: Number(prompt("¿Cuántos días agregar? (ej: 30)", "30") || 0) } : undefined;
      if (action === "renew" && (!body || !body.addDays || body.addDays <= 0)) return;
      const res = await authFetch(`/admin/licenses/${id}/${action}`, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as any)?.detail ?? "Error en acción");
      const updated = (await res.json()) as LicenseRow;
      setLicenses((prev) => prev.map((l) => (l.id === updated.id ? { ...(l as any), ...updated } : l)));
      setInfo("Actualizado");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error en acción");
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setInfo("Copiado");
    } catch {
      setInfo("No se pudo copiar");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Licencias" subtitle="Crea licencias online y prepáralas para offline (archivo firmado) con todos los campos necesarios." />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {info ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{info}</div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Crear licencia" subtitle="Completa los datos y guarda. La key se genera automáticamente.">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label>Tenant</Label>
              <Select {...form.register("tenantId")}>
                <option value="">Selecciona…</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tradeName ?? t.id}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Producto</Label>
              <Select {...form.register("productId")}>
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
                <Label>Tipo</Label>
                <Select {...form.register("type")}>
                  <option value="DEMO">DEMO</option>
                  <option value="FULL">FULL</option>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Plan</Label>
                <Select {...form.register("planType")}>
                  <option value="SUBSCRIPTION">SUBSCRIPTION</option>
                  <option value="PERPETUAL">PERPETUAL</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Estado</Label>
                <Select {...form.register("status")}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="REVOKED">REVOKED</option>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Revalidación (días)</Label>
                <Input placeholder="Ej: 7" {...form.register("revalidateDays")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Inicia</Label>
                <Input type="date" {...form.register("startsAt")} />
              </div>
              <div className="grid gap-2">
                <Label>Expira</Label>
                <Input type="date" {...form.register("expiresAt")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Max. dispositivos (activos)</Label>
                <Input type="number" {...form.register("maxDevices")} />
              </div>
              <div className="grid gap-2">
                <Label>Max. activaciones (histórico)</Label>
                <Input type="number" {...form.register("maxActivations")} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" checked={form.watch("offlineAllowed")} onChange={(e) => form.setValue("offlineAllowed", e.target.checked)} />
              <span className="text-sm text-zinc-700">Permitir offline</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Versión mín.</Label>
                <Input placeholder="1.0.0" {...form.register("allowedVersionMin")} />
              </div>
              <div className="grid gap-2">
                <Label>Versión máx.</Label>
                <Input placeholder="2.0.0" {...form.register("allowedVersionMax")} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Módulos (JSON)</Label>
              <Textarea rows={4} {...form.register("modulesJson")} />
            </div>

            <div className="grid gap-2">
              <Label>Features (JSON)</Label>
              <Textarea rows={4} {...form.register("featuresJson")} />
            </div>

            <div className="grid gap-2">
              <Label>Notas</Label>
              <Textarea rows={2} {...form.register("notes")} />
            </div>

            <Button type="submit" disabled={!canSubmit}>
              Crear licencia
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card title="Filtros" subtitle="Encuentra rápidamente una licencia.">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="grid gap-2">
                <Label>Búsqueda</Label>
                <Input value={filters.q} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))} placeholder="Key / notas" />
              </div>
              <div className="grid gap-2">
                <Label>Estado</Label>
                <Select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
                  <option value="">Todos</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="REVOKED">REVOKED</option>
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
              <div className="grid gap-2">
                <Label>Tenant</Label>
                <Select value={filters.tenantId} onChange={(e) => setFilters((p) => ({ ...p, tenantId: e.target.value }))}>
                  <option value="">Todos</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tradeName ?? t.id}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          <Card title={`Licencias (${licenses.length})`} subtitle={loading ? "Cargando…" : "Listado con acciones rápidas."}>
            <div className="overflow-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-xs text-zinc-500">
                  <tr>
                    <th className="py-2">Key</th>
                    <th className="py-2">Producto</th>
                    <th className="py-2">Tenant</th>
                    <th className="py-2">Estado</th>
                    <th className="py-2">Expira</th>
                    <th className="py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {licenses.map((l) => (
                    <tr key={l.id} className="border-t border-zinc-100">
                      <td className="py-3">
                        <div className="font-semibold text-zinc-900">{l.key}</div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                          <span>{l.type}</span>
                          <span>•</span>
                          <span>{l.planType}</span>
                        </div>
                      </td>
                      <td className="py-3">{l.product?.name}</td>
                      <td className="py-3">{l.tenant?.tradeName ?? "—"}</td>
                      <td className="py-3">
                        <Badge tone={statusTone(l.status) as any}>{l.status}</Badge>
                      </td>
                      <td className="py-3">{formatDateInput(l.expiresAt) || "—"}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" onClick={() => copy(l.key)}>
                            Copiar
                          </Button>
                          <Button variant="secondary" onClick={() => doAction(l.id, "renew")}>
                            Renovar
                          </Button>
                          <Button variant="ghost" onClick={() => doAction(l.id, "suspend")}>
                            Suspender
                          </Button>
                          <Button variant="danger" onClick={() => doAction(l.id, "revoke")}>
                            Revocar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {licenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-zinc-500">
                        Sin resultados.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
