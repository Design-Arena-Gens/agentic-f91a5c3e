import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Antech O&M | Vídeo Comercial",
  description:
    "Crie e baixe um vídeo comercial dinâmico destacando os serviços de lavagem e roçagem de usinas solares da Antech O&M.",
  robots: {
    index: true,
    follow: true
  },
  openGraph: {
    title: "Antech O&M | Vídeo Comercial",
    description:
      "Gere um vídeo publicitário destacando a expertise da Antech O&M em lavagem e roçagem de usinas solares.",
    url: "https://agentic-f91a5c3e.vercel.app",
    siteName: "Antech O&M Vídeo",
    locale: "pt_BR",
    type: "website"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
