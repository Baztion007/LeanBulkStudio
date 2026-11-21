import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lean Bulk Studio",
    short_name: "LeanBulk",
    description:
      "6-week home muscle-building tracker with workout logger, progression controller and nutrition targets.",
    start_url: "/",
    display: "standalone",
    background_color: "#070b0f",
    theme_color: "#070b0f",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
