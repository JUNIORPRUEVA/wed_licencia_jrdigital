"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { fetchAuthedJson } from "@/lib/fetch-json";
import { Badge, Button, Card, Input, Label, PageHeader, Select } from "../_components/ui";

type Tenant = {
  id: string;
  tradeName: string | null;
  contactEmail: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [form, setForm] = useState({ tradeName: "", contactEmail: "", status: "ACTIVE" as const });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuthedJson<Tenant[]>("/admin/tenants");
      setTenants(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando tenants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createTenant = async () => {
    setError(null);
    setInfo(null);
    try {
      const res = await authFetch("/admin/tenants", { method: "POST", body: JSON.stringify(form) });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as any)?.detail ?? "Error creando tenant");
      setInfo("Tenant creado");
      setForm({ tradeName: "", contactEmail: "", status: "ACTIVE" });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error creando tenant");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tenants" subtitle="Clientes/empresas para asociar licencias." />
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {info ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{info}</div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Crear tenant" subtitle="Datos básicos">
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label>Nombre comercial</Label>
              <Input value={form.tradeName} onChange={(e) => setForm((p) => ({ ...p, tradeName: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as any }))}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </Select>
            </div>
            <Button onClick={createTenant} disabled={!form.tradeName.trim()}>
              Crear
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card title={`Tenants (${tenants.length})`} subtitle={loading ? "Cargando…" : "Listado"}>
            <div className="space-y-2">
              {tenants.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900">{t.tradeName ?? t.id}</p>
                    <p className="text-xs text-zinc-500">{t.contactEmail ?? "—"}</p>
                  </div>
                  <Badge tone={t.status === "ACTIVE" ? "green" : "neutral"}>{t.status}</Badge>
                </div>
              ))}
              {tenants.length === 0 ? <p className="text-sm text-zinc-500">Sin tenants.</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

