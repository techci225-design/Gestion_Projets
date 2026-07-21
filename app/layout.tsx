import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import NextTopLoader from 'nextjs-toploader';

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'ProjetPilote — Pilotage de projets bailleurs en Afrique',
  description: 'Application web de gestion de projets de développement financés par des bailleurs de fonds. Moteur EVM, suivi budgétaire FCFA, rapport institutionnel. Conforme Banque Mondiale et BID.',
  keywords: 'gestion projet bailleur, EVM, FCFA, Afrique francophone, BAD, USAID, BM, consultant développement',
  manifest: "/manifest.json",
  openGraph: {
    title: 'ProjetPilote — Pilotage de projets bailleurs',
    description: 'Transformez votre matrice Excel en application web sécurisée.',
    url: 'https://gestion-projets-e3uj.vercel.app',
    siteName: 'ProjetPilote',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} min-h-screen antialiased bg-background-main text-on-surface flex flex-col`}>
        <NextTopLoader color="#0a2a4a" showSpinner={false} />
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
