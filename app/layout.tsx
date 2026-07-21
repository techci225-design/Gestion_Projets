import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'ProjetPilote — Pilotage de projets bailleurs',
  description: 'Plateforme de gestion de projets de développement financés par des bailleurs de fonds. Moteur EVM, suivi budgétaire, rapport institutionnel.',
  keywords: 'gestion projet, bailleur, EVM, FCFA, Afrique, consultant',
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} min-h-screen antialiased bg-background-main text-on-surface flex flex-col`}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
