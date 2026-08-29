import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

// Kept ASCII-only: next/og's bundled font has no glyph for ★/×/— and would fail.
const DOTS: { top: number; left: number; s: number; c: string; o?: number }[] = [
  { top: 70, left: 940, s: 14, c: "#e0b053" },
  { top: 150, left: 1080, s: 8, c: "#e0b053", o: 0.8 },
  { top: 250, left: 1150, s: 10, c: "#7c3aed", o: 0.5 },
  { top: 430, left: 90, s: 12, c: "#c4b5fd" },
  { top: 520, left: 250, s: 7, c: "#c4b5fd", o: 0.8 },
  { top: 300, left: 60, s: 9, c: "#e0b053", o: 0.7 },
  { top: 96, left: 560, s: 6, c: "#7c3aed", o: 0.4 },
  { top: 560, left: 900, s: 10, c: "#c4b5fd", o: 0.7 },
];

export async function renderOgCard(): Promise<ImageResponse> {
  const logo = await readFile(join(process.cwd(), "public/logo.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#f7f5fb",
          backgroundImage: "linear-gradient(135deg, #f6f4fc 0%, #ece6ff 100%)",
          color: "#171528",
          fontFamily: "sans-serif",
        }}
      >
        {/* soft glows */}
        <div
          style={{
            position: "absolute",
            top: -260,
            left: -220,
            width: 620,
            height: 620,
            borderRadius: 999,
            backgroundColor: "rgba(124,58,237,0.14)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -300,
            right: -200,
            width: 640,
            height: 640,
            borderRadius: 999,
            backgroundColor: "rgba(99,102,241,0.12)",
            display: "flex",
          }}
        />

        {/* planet ring + moon */}
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -140,
            width: 380,
            height: 380,
            borderRadius: 999,
            border: "2px solid rgba(124,58,237,0.18)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 60,
            right: 96,
            width: 120,
            height: 120,
            borderRadius: 999,
            backgroundColor: "#efe9ff",
            display: "flex",
          }}
        />
        {DOTS.map((d, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: d.top,
              left: d.left,
              width: d.s,
              height: d.s,
              borderRadius: 999,
              backgroundColor: d.c,
              opacity: d.o ?? 1,
              display: "flex",
            }}
          />
        ))}

        {/* brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={96} height={76} alt="" />
          <div style={{ display: "flex", fontSize: 58, fontWeight: 700, letterSpacing: -1 }}>
            AstroBid
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 6,
              fontWeight: 700,
              color: "#7c3aed",
            }}
          >
            THE LAUNCH-DAY AUCTION
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 80,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: -2,
              maxWidth: 950,
            }}
          >
            Bid for the best day to launch.
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#6c6880", maxWidth: 900 }}>
            Highest bid 24h before the day wins the spotlight, plus a launch page. Outbid = gone.
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 23, color: "#6c6880" }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 999,
                    backgroundColor: "#e0b053",
                    display: "flex",
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex" }}>
              best launch days, scored by the moon and your sign
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: "#7c3aed" }}>
            astrobid.lol
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
