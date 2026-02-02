"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { fetchAuthedJson } from "@/lib/fetch-json";
import { Badge, Button, Card, Input, Label, PageHeader, Select } from "../_components/ui";

type Product = { id: string; name: string; slug: string };
type LicenseRow = { id: string; key: string; offlineAllowed: boolean; product: { id: string; name: string } };
type OfflineRequest = { id: string; nonce: string; status: string; createdAt: string; product: Product; tenant: any; license: any };
type OfflineFile = { id: string; fileName: string; createdAt: string; license: any; offlineRequest: any };

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) out[k] = sortKeys(obj[k]);
    return out;
  }
  return value;
}

async function sha256Hex(str: string) {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function OfflinePage() {
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [requests, setRequests] = useState<OfflineRequest[]>([]);
  const [files, setFiles] = useState<OfflineFile[]>([]);
  const [offlinePubKey, setOfflinePubKey] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [form, setForm] = useState({
    licenseId: "",
    productId: "",
    deviceFingerprint: "",
    appVersion: "1.0.0",
    nonce: "",
  });

  const selectedLicense = useMemo(() => licenses.find((l) => l.id === form.licenseId) ?? null, [licenses, form.licenseId]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [lic, reqs, fls, pub] = await Promise.all([
        fetchAuthedJson<LicenseRow[]>("/admin/licenses?limit=200"),
        fetchAuthedJson<OfflineRequest[]>("/admin/offline/requests?limit=100"),
        fetchAuthedJson<OfflineFile[]>("/admin/offline/files?limit=100"),
        fetchAuthedJson<{ publicKeyEd25519: string }>("/admin/crypto/offline-public-key").catch(() => ({ publicKeyEd25519: "" })),
      ]);
      setLicenses(lic);
      setRequests(reqs);
      setFiles(fls);
      setOfflinePubKey(pub.publicKeyEd25519);
      setForm((p) => ({
        ...p,
        licenseId: p.licenseId || lic[0]?.id || "",
        productId: p.productId || lic[0]?.product?.id || "",
        nonce: p.nonce || randomNonce(),
      }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando offline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedLicense?.product?.id) {
      setForm((p) => ({ ...p, productId: selectedLicense.product.id }));
    }
  }, [selectedLicense?.product?.id]);

  const generateOffline = async () => {
    setError(null);
    setInfo(null);
    if (!form.licenseId || !form.productId || !form.deviceFingerprint || !form.nonce) {
      setError("Completa licencia, device fingerprint y nonce");
      return;
    }
    try {
      const payload = {
        productId: form.productId,
        appVersion: form.appVersion,
        deviceFingerprint: form.deviceFingerprint,
        tenantName: "",
        timestamp: Date.now(),
        nonce: form.nonce,
      };
      const payloadStr = stableStringify(payload);
      const checksumSha256 = await sha256Hex(payloadStr);
      const body = {
        requestFile: {
          payload,
          checksumSha256,
          signatureEd25519: null,
        },
        licenseId: form.licenseId,
      };

      const res = await authFetch("/admin/offline/license/generate", { method: "POST", body: JSON.stringify(body) });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as any)?.detail ?? "Error al generar archivo offline");
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.fileName ?? `license-${form.licenseId}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setInfo("Archivo offline generado y descargado");
      setForm((p) => ({ ...p, nonce: randomNonce() }));
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al generar offline");
    }
  };

  const downloadOfflineFile = async (id: string, fileName: string) => {
    setError(null);
    setInfo(null);
    try {
      const res = await authFetch(`/admin/offline/files/${id}/download`);
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as any)?.detail ?? "No se pudo descargar");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || `offline-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error descargando");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Offline" subtitle="Genera archivos offline firmados (Ed25519) y revisa requests/archivos generados." />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {info ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{info}</div> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Generar archivo offline" subtitle="Esto es para máquinas sin internet. El archivo queda amarrado al device fingerprint.">
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Licencia</Label>
              <Select value={form.licenseId} onChange={(e) => setForm((p) => ({ ...p, licenseId: e.target.value }))}>
                <option value="">Selecciona…</option>
                {licenses.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.key} {l.offlineAllowed ? "" : "(offline NO)"}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Producto</Label>
              <Select value={form.productId} onChange={(e) => setForm((p) => ({ ...p, productId: e.target.value }))}>
                <option value="">Selecciona…</option>
                {licenses.map((l) => (
                  <option key={l.product.id} value={l.product.id}>
                    {l.product.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>App version</Label>
                <Input value={form.appVersion} onChange={(e) => setForm((p) => ({ ...p, appVersion: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Nonce</Label>
                <Input value={form.nonce} onChange={(e) => setForm((p) => ({ ...p, nonce: e.target.value }))} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Device fingerprint</Label>
              <Input value={form.deviceFingerprint} onChange={(e) => setForm((p) => ({ ...p, deviceFingerprint: e.target.value }))} placeholder="Debe ser estable y único por equipo" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={generateOffline} disabled={loading}>
                Generar y descargar JSON
              </Button>
              <Button type="button" variant="secondary" onClick={() => setForm((p) => ({ ...p, nonce: randomNonce() }))}>
                Nuevo nonce
              </Button>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
              <p className="font-semibold">Public key (Ed25519)</p>
              <p className="mt-1 break-all">{offlinePubKey || "—"}</p>
            </div>
          </div>
        </Card>

        <Card title="Últimos archivos offline" subtitle={loading ? "Cargando…" : "Historial reciente."}>
          <div className="space-y-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-900">{f.fileName}</p>
                  <p className="text-xs text-zinc-500">{new Date(f.createdAt).toLocaleString()}</p>
                </div>
                <Button variant="secondary" onClick={() => downloadOfflineFile(f.id, f.fileName)}>
                  Descargar
                </Button>
              </div>
            ))}
            {files.length === 0 ? <p className="text-sm text-zinc-500">Sin archivos.</p> : null}
          </div>
        </Card>

        <Card title="Requests offline" subtitle="Nonces recibidos/consumidos para control.">
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-900">{r.product?.name ?? "Producto"}</p>
                  <p className="text-xs text-zinc-500">Nonce: {r.nonce}</p>
                </div>
                <Badge tone={r.status === "USED" ? "green" : r.status === "REJECTED" ? "red" : "amber"}>{r.status}</Badge>
              </div>
            ))}
            {requests.length === 0 ? <p className="text-sm text-zinc-500">Sin requests.</p> : null}
          </div>
        </Card>

        <Card title="Estado" subtitle="Tips rápidos.">
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
            <li>El archivo offline queda amarrado al hash del device fingerprint.</li>
            <li>Usa un nonce único por request para evitar reutilización.</li>
            <li>El cliente debe verificar la firma Ed25519 con el public key.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

