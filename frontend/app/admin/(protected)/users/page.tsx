"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { fetchAuthedJson } from "@/lib/fetch-json";
import { Badge, Button, Card, Input, Label, PageHeader, Select } from "../_components/ui";

type Role = { id: string; name: string; description: string | null; permissions: string[] };
type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export default function UsersPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [form, setForm] = useState({ email: "", name: "", password: "", roleId: "" });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, u] = await Promise.all([fetchAuthedJson<Role[]>("/admin/roles"), fetchAuthedJson<UserRow[]>("/admin/users")]);
      setRoles(r);
      setUsers(u);
      setForm((p) => ({ ...p, roleId: p.roleId || r[0]?.id || "" }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createUser = async () => {
    setError(null);
    setInfo(null);
    try {
      const res = await authFetch("/admin/users", { method: "POST", body: JSON.stringify(form) });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as any)?.detail ?? "Error creando usuario");
      setInfo("Usuario creado");
      setForm((p) => ({ ...p, email: "", name: "", password: "" }));
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error creando usuario");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios" subtitle="Crea usuarios del backoffice (admin/ventas/soporte/lectura) y gestiona accesos." />
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {info ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{info}</div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Crear usuario" subtitle="Se crea en la base de datos con su rol.">
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="correo@empresa.com" />
            </div>
            <div className="grid gap-2">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nombre" />
            </div>
            <div className="grid gap-2">
              <Label>Contraseña</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Mínimo 8 caracteres" />
            </div>
            <div className="grid gap-2">
              <Label>Rol</Label>
              <Select value={form.roleId} onChange={(e) => setForm((p) => ({ ...p, roleId: e.target.value }))}>
                <option value="">Selecciona…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button onClick={createUser} disabled={!form.email.trim() || !form.name.trim() || form.password.length < 8 || !form.roleId}>
              Crear usuario
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card title={`Roles (${roles.length})`} subtitle={loading ? "Cargando…" : "Permisos por rol"}>
            <div className="space-y-2">
              {roles.map((r) => (
                <div key={r.id} className="rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm">
                  <p className="font-semibold text-zinc-900">{r.name}</p>
                  {r.description ? <p className="mt-1 text-xs text-zinc-500">{r.description}</p> : null}
                  <p className="mt-2 text-xs text-zinc-600">{r.permissions.join(", ")}</p>
                </div>
              ))}
              {roles.length === 0 ? <p className="text-sm text-zinc-500">Sin roles.</p> : null}
            </div>
          </Card>

          <Card title={`Usuarios (${users.length})`} subtitle={loading ? "Cargando…" : "Listado"}>
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900">{u.email}</p>
                    <p className="text-xs text-zinc-500">
                      {u.name ?? "—"} • {u.role} • último login: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}
                    </p>
                  </div>
                  <Badge tone={u.isActive ? "green" : "neutral"}>{u.isActive ? "Activo" : "Inactivo"}</Badge>
                </div>
              ))}
              {users.length === 0 ? <p className="text-sm text-zinc-500">Sin usuarios.</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

