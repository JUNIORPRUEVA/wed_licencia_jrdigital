"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Package, Users, KeyRound, Shield, ShoppingCart, Ticket, LogOut, Menu, X } from "lucide-react";
import clsx from "clsx";
import { getStoredAuth, logout } from "@/lib/auth-client";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/tenants", label: "Tenants", icon: Users },
  { href: "/admin/licenses", label: "Licencias", icon: KeyRound },
  { href: "/admin/offline", label: "Offline", icon: Shield },
  { href: "/admin/orders", label: "Órdenes", icon: ShoppingCart },
  { href: "/admin/vouchers", label: "Vouchers", icon: Ticket },
  { href: "/admin/users", label: "Usuarios", icon: Users },
] as const;

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { accessToken, user } = getStoredAuth();
  if (!accessToken) {
    router.replace("/admin/login");
    return null;
  }

  const onLogout = async () => {
    await logout();
    router.push("/admin/login");
  };

  const navItems = useMemo(
    () =>
      nav.map((item) => {
        const active = pathname === item.href;
        return { ...item, active };
      }),
    [pathname]
  );

  const SideNav = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition",
              item.active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
            )}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px]">
        <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-zinc-200 bg-white p-4 md:flex">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">FULLTECH</p>
              <p className="text-base font-semibold text-zinc-900">Licensing Admin</p>
            </div>
          </div>

          <div className="mt-6">
            <SideNav />
          </div>

          <div className="mt-auto space-y-3 pt-6">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-semibold text-zinc-700">{user?.email ?? "—"}</p>
              <p className="text-xs text-zinc-500">{user?.role ?? ""}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              <LogOut size={16} />
              Salir
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur md:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => setDrawerOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900"
                aria-label="Abrir menú"
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0 text-center">
                <p className="truncate text-sm font-semibold text-zinc-900">Licensing Admin</p>
                <p className="truncate text-xs text-zinc-500">{user?.email ?? "—"}</p>
              </div>
              <button
                onClick={onLogout}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900"
              >
                Salir
              </button>
            </div>
          </header>

          {drawerOpen ? (
            <div className="fixed inset-0 z-50 md:hidden">
              <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
              <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs bg-white p-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">FULLTECH</p>
                    <p className="text-base font-semibold text-zinc-900">Licensing Admin</p>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900"
                    aria-label="Cerrar menú"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-6">
                  <SideNav onNavigate={() => setDrawerOpen(false)} />
                </div>

                <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-xs font-semibold text-zinc-700">{user?.email ?? "—"}</p>
                  <p className="text-xs text-zinc-500">{user?.role ?? ""}</p>
                </div>
              </div>
            </div>
          ) : null}

          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
