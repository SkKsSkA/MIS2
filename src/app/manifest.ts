import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Let's meet!",
    short_name: "Let's meet!",
    description: "Создай страницу встречи за минуту. Гости отвечают одним кликом.",
    start_url: "/",
    display: "standalone",
    background_color: "#F3EEFF",
    theme_color: "#F3EEFF",
    lang: "ru",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
