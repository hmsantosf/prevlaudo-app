import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Impede o webpack de tentar fazer bundle dessas libs que precisam
  // rodar como módulos Node.js nativos (pdfjs legacy usa DOMMatrix polyfill próprio)
  // pdf-parse v1 precisa rodar como módulo Node.js nativo (usa fs internamente)
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
