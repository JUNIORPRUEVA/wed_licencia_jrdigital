
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const WHATSAPP_LINK = `https://wa.me/18295344286?text=${encodeURIComponent(
  "Hola, quiero información sobre licencias y descargas."
)}`;

export default function PublicHeader({ active }: { active?: "home" | "products" }) {
  const [open, setOpen] = useState(false);

  const items = useMemo(
    () => [
      { href: "/", label: "Inicio", key: "home" as const },
      { href: "/products", label: "Productos", key: "products" as const },
      { href: "/demo-download", label: "Descargas", key: "downloads" as const },
      { href: "/redeem", label: "Canjear", key: "redeem" as const },
      { href: "/#contacto", label: "Contacto", key: "contact" as const },
    ],
    []
  );

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-gradient-to-r from-[#1E88E5] via-[#1976D2] to-[#1E88E5] text-white shadow-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="h-11 w-11 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15 sm:h-12 sm:w-12">
            <Image src="/logo3.png" alt="Jr Digital" width={96} height={96} className="h-full w-full object-contain" priority />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.25em] text-white/70">Jr Digital</p>
            <p className="truncate text-sm font-semibold leading-snug text-white sm:text-base">Licencias y descargas</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-xs font-semibold uppercase tracking-[0.15em] text-white/75 md:flex">
          <Link href="/" className={active === "home" ? "text-white" : "transition hover:text-white"}>
            Inicio
          </Link>
          <Link href="/products" className={active === "products" ? "text-white" : "transition hover:text-white"}>
            Productos
          </Link>
          <Link href="/demo-download" className="transition hover:text-white">
            Descargas
          </Link>
          <Link href="/redeem" className="transition hover:text-white">
            Canjear
          </Link>
          <Link href="/#contacto" className="transition hover:text-white">
            Contacto
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-[#F39C12] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#F1C40F]"
          >
            WhatsApp
          </a>

          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white md:hidden"
            aria-label="Abrir menú"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-white p-4 text-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200">
                  <Image src="/logo3.png" alt="Jr Digital" width={96} height={96} className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Jr Digital</p>
                  <p className="text-sm font-semibold text-zinc-900">Menú</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900"
                aria-label="Cerrar menú"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-1">
              {items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
                >
                  {it.label}
                </Link>
              ))}
            </div>

            <div className="mt-6 border-t border-zinc-200 pt-4">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white"
              >
                Soporte por WhatsApp
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
