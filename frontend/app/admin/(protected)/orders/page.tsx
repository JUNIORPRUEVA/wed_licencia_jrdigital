"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { fetchAuthedJson } from "@/lib/fetch-json";
import { Badge, Button, Card, PageHeader } from "../_components/ui";

type Order = {
  id: string;
  status: "DRAFT" | "PENDING_PAYMENT" | "PAID" | "CANCELLED" | "REFUNDED";
  totalCents: number;
  createdAt: string;
  tenant: { tradeName: string | null };
  items: Array<{ id: string; quantity: number; unitPriceCents: number; licenseType: string; product: { name: string } }>;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuthedJson<Order[]>("/admin/orders");
      setOrders(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando órdenes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markPaid = async (id: string) => {
    setError(null);
    setInfo(null);
    try {
      const res = await authFetch(`/admin/orders/${id}/mark-paid`, { method: "POST" });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as any)?.detail ?? "No se pudo marcar");
      await load();
      setInfo("Orden marcada como pagada");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error actualizando orden");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Órdenes" subtitle="Fase manual: crear/gestionar pagos después (Stripe/PayPal)." />
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {info ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{info}</div> : null}

      <Card title={`Órdenes (${orders.length})`} subtitle={loading ? "Cargando…" : "Listado"}>
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold text-zinc-900">
                  {o.tenant?.tradeName ?? "Tenant"} • {o.id.slice(0, 8)}…
                </p>
                <p className="text-xs text-zinc-500">
                  Total: {(o.totalCents / 100).toFixed(2)} USD • Ítems: {o.items.length} • {new Date(o.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={o.status === "PAID" ? "green" : o.status === "PENDING_PAYMENT" ? "amber" : "neutral"}>{o.status}</Badge>
                {o.status !== "PAID" ? (
                  <Button variant="secondary" onClick={() => markPaid(o.id)}>
                    Marcar pagada
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {orders.length === 0 ? <p className="text-sm text-zinc-500">Sin órdenes.</p> : null}
        </div>
      </Card>
    </div>
  );
}

