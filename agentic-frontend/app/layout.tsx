import type { Metadata } from "next";
import { Inter } from "next/font/google";
import 'leaflet/dist/leaflet.css';
import "./globals.css";
import MatrixRain from "./components/UI/MatrixRain";
import NeuralLoader from "./components/UI/NeuralLoader";
import NeuralMesh from "./components/UI/NeuralMesh"; 
import Header from "./components/UI/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Guardian Command Center",
  description: "Agentic Supply Chain Intelligence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-950 text-slate-200 min-h-screen relative overflow-x-hidden`}>
        <MatrixRain />

        <NeuralMesh />
        
        <NeuralLoader />

        <Header />
        
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}