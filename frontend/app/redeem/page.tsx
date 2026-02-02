"use client";

import { useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export default function RedeemPage() {
  const [code, setCode] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/public/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          tradeName,
          contactEmail: contactEmail || null,
          contactPhone: contactPhone || null,
        }),
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => null))?.detail ?? "No se pudo canjear";
        throw new Error(msg);
      }
      const data = await res.json();
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error canjeando");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] px-4 py-12 text-[#2E2E2E]">
      <div className="mx-auto max-w-xl">
        <div className="mb-6">
          <Link href="/" className="text-sm font-semibold text-[#1E88E5]">
            Volver
          </Link>
          <h1 className="mt-3 text-3xl font-bold">Canjear licencia</h1>
          <p className="mt-2 text-sm text-[#2E2E2E]/70">
            Si compraste una licencia física (tarjeta/QR), escribe el código aquí para generar tu licencia.
          </p>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-xl">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-sm font-semibold">Código</label>
              <input
                className="mt-1 h-12 w-full rounded-2xl border border-black/10 px-4 text-sm outline-none focus:border-black/30"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="FT-AB12-CD34-EF56"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Nombre del negocio</label>
              <input
                className="mt-1 h-12 w-full rounded-2xl border border-black/10 px-4 text-sm outline-none focus:border-black/30"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="Mi Empresa SRL"
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">Email (opcional)</label>
                <input
                  className="mt-1 h-12 w-full rounded-2xl border border-black/10 px-4 text-sm outline-none focus:border-black/30"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="correo@empresa.com"
                  type="email"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Teléfono (opcional)</label>
                <input
                  className="mt-1 h-12 w-full rounded-2xl border border-black/10 px-4 text-sm outline-none focus:border-black/30"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="809..."
                />
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}

            <button
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#1E88E5] text-sm font-semibold text-white transition hover:bg-[#1976D2] disabled:opacity-60"
              type="submit"
            >
              {loading ? "Canjeando…" : "Canjear"}
            </button>
          </form>

          {result?.license?.key ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">Licencia generada</p>
              <p className="mt-1 break-all font-mono text-sm text-emerald-900">{result.license.key}</p>
              <p className="mt-2 text-xs text-emerald-900/80">
                Guarda este código. Tu software lo usará para activación online.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
