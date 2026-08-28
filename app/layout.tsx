import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import NextTopLoader from 'nextjs-toploader';

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Smart Project Manager — Pilotage de projets bailleurs',
  description: 'Application web sécurisée de pilotage de projets de développement : budget multi-devise, EVM, passation des marchés et rapports institutionnels.',
  keywords: 'gestion de projet bailleur, EVM, budget multi-devise, Afrique francophone, BAD, USAID, Banque mondiale, développement',
  manifest: "/manifest.json",
  openGraph: {
    title: 'Smart Project Manager — Pilotage de projets bailleurs',
    description: 'Transformez vos matrices de projet en application web sécurisée.',
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
