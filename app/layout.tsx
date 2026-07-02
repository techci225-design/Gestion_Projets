import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProjetPilote",
  description: "Pilotage de vos projets bailleurs",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className="h-full"
    >
      <body className={`${inter.className} h-full antialiased bg-background-main text-on-surface flex flex-col`}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
