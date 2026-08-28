import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AstroBid — bid for the best day to launch",
  description:
    "A cosmic launch calendar. Outbid everyone for the day you ship. Winner 48h before launch takes the spotlight — like a leaderboard for the future.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    title: "AstroBid — bid for the best day to launch",
    description: "Outbid everyone for the day you ship. Cosmic launch calendar.",
    images: ["/logo.png"],
  },
  icons: { icon: "/logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#05030f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="starfield">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
