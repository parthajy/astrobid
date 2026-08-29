import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AstroBid",
    short_name: "AstroBid",
    description: "Bid for the best day to launch.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5fb",
    theme_color: "#7c3aed",
    icons: [{ src: "/logo.png", sizes: "328x258", type: "image/png", purpose: "any" }],
  };
}
