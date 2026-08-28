import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AstroBid",
    short_name: "AstroBid",
    description: "Bid for the best day to launch.",
    start_url: "/",
    display: "standalone",
    background_color: "#05030f",
    theme_color: "#05030f",
    icons: [{ src: "/logo.png", sizes: "328x258", type: "image/png", purpose: "any" }],
  };
}
