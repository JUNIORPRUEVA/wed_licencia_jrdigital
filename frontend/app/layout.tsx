import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteFooter from "./site-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jr Digital",
  description: "Software empresarial a la medida: POS, préstamos y contabilidad.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo3.png",
    apple: "/logo3.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E88E5",
};

const WHATSAPP_NUMBER_DISPLAY = "829 534 4286";
const WHATSAPP_NUMBER_E164 = "18295344286";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER_E164}?text=${encodeURIComponent(
  "Hola, quiero solicitar la app y recibir información de licencias."
)}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-dvh flex flex-col">
          <div className="flex-1">{children}</div>
          <SiteFooter
            whatsappDisplay={WHATSAPP_NUMBER_DISPLAY}
            whatsappLink={WHATSAPP_LINK}
          />
        </div>
      </body>
    </html>
  );
}
