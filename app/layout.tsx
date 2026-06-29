import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Observatori d'Habitatge — PAHC Bages",
  description:
    "Visualització 3D de dades d'habitatge a Manresa i Catalunya: preocupacions, vot, desnonaments, concentració de la propietat i grans tenidors.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ca" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
