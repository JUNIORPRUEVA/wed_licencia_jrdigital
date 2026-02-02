import { nanoid } from "nanoid";

export function generateLicenseKey(productSlug: string, type: "DEMO" | "FULL") {
  const part = nanoid(10).toUpperCase().replace(/[^A-Z0-9]/g, "A");
  return `${productSlug.toUpperCase()}-${type}-${part.slice(0, 5)}-${part.slice(5, 10)}`;
}
