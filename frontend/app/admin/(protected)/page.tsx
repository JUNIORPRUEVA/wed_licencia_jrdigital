"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAuthedJson } from "@/lib/fetch-json";
import { Card, PageHeader, Badge } from "./_components/ui";

type DashboardStats = {
  paidOrders: number;
  activeLicenses: number;
  expiringSoon: number;
  activationsToday: number;
  demoLicenses: number;
  fullLicenses: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuthedJson<DashboardStats>("/admin/dashboard")
      .then(setStats)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error cargando dashboard"));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Resumen rápido del estado de licencias, activaciones y órdenes."
        right={
          <div className="flex items-center gap-2">
            <Link className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50" href="/admin/licenses">
              Crear / ver licencias
            </Link>
            <Link className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800" href="/admin/offline">
              Offline
            </Link>
          </div>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Licencias activas" subtitle="En estado ACTIVE">
          <div className="flex items-end justify-between">
            <p className="text-3xl font-semibold text-zinc-900">{stats?.activeLicenses ?? "—"}</p>
            <Badge tone="green">OK</Badge>
          </div>
        </Card>
        <Card title="Expiran pronto" subtitle="Próximos 30 días">
          <div className="flex items-end justify-between">
            <p className="text-3xl font-semibold text-zinc-900">{stats?.expiringSoon ?? "—"}</p>
            <Badge tone="amber">Revisar</Badge>
          </div>
        </Card>
        <Card title="Activaciones hoy" subtitle="Device activations">
          <div className="flex items-end justify-between">
            <p className="text-3xl font-semibold text-zinc-900">{stats?.activationsToday ?? "—"}</p>
            <Badge tone="blue">Live</Badge>
          </div>
        </Card>
        <Card title="Órdenes pagadas" subtitle="Fase manual (por ahora)">
          <p className="text-3xl font-semibold text-zinc-900">{stats?.paidOrders ?? "—"}</p>
        </Card>
        <Card title="Licencias demo" subtitle="Total">
          <p className="text-3xl font-semibold text-zinc-900">{stats?.demoLicenses ?? "—"}</p>
        </Card>
        <Card title="Licencias full" subtitle="Total">
          <p className="text-3xl font-semibold text-zinc-900">{stats?.fullLicenses ?? "—"}</p>
        </Card>
      </div>
    </div>
  );
}

