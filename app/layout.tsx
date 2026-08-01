import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Archic Studio",
  description: "El sistema interno de Archic para crear, revisar y mantener sitios web.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
