import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "MinAtlas: map-first Australian mining intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INSTRUMENT_SERIF_TTF =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentserif/InstrumentSerif-Regular.ttf";
const GEIST_SANS_TTF =
  "https://raw.githubusercontent.com/vercel/geist-font/main/packages/next/dist/fonts/geist-sans/Geist-Regular.ttf";

const BG = "#fffdfa";
const INK = "#1a1814";
const MUTED = "rgba(26, 24, 20, 0.52)";
const ACCENT = "#b87d45";
const MAP_PANEL = "#d8e8f0";

const DOTS: { x: number; y: number; r: number }[] = [
  { x: 42, y: 58, r: 7 },
  { x: 118, y: 44, r: 5 },
  { x: 168, y: 92, r: 6 },
  { x: 88, y: 128, r: 4 },
  { x: 198, y: 138, r: 8 },
  { x: 52, y: 188, r: 5 },
  { x: 132, y: 198, r: 6 },
  { x: 218, y: 72, r: 4 },
  { x: 228, y: 198, r: 5 },
  { x: 158, y: 228, r: 7 },
  { x: 78, y: 232, r: 4 },
];

export default async function Image() {
  const [instrumentData, geistData] = await Promise.all([
    fetch(INSTRUMENT_SERIF_TTF).then((res) => res.arrayBuffer()),
    fetch(GEIST_SANS_TTF).then((res) => res.arrayBuffer()),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: BG,
          padding: 52,
          paddingBottom: 48,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 40,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 20,
              flex: 1,
              maxWidth: 680,
              paddingTop: 8,
            }}
          >
            <div
              style={{
                fontSize: 108,
                fontFamily: "Instrument Serif",
                color: INK,
                lineHeight: 0.98,
                letterSpacing: -1,
              }}
            >
              MinAtlas
            </div>
            <div
              style={{
                fontSize: 30,
                fontFamily: "Geist",
                color: MUTED,
                lineHeight: 1.35,
                fontWeight: 400,
              }}
            >
              {`Map-first intelligence for Australia\u2019s mining sector: mine sites, tenements, operators and commodities.`}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 12,
            }}
          >
            <div
              style={{
                width: 300,
                height: 300,
                borderRadius: 28,
                backgroundColor: MAP_PANEL,
                border: "1px solid rgba(26, 24, 20, 0.08)",
                position: "relative",
                display: "flex",
              }}
            >
              {DOTS.map((d, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: d.x,
                    top: d.y,
                    width: d.r * 2,
                    height: d.r * 2,
                    borderRadius: d.r,
                    backgroundColor: ACCENT,
                    opacity: 0.92,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ height: 3, width: 120, backgroundColor: ACCENT, borderRadius: 2 }} />
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontFamily: "Geist",
                color: MUTED,
                letterSpacing: 0.12,
                textTransform: "uppercase" as const,
              }}
            >
              minatlas.app
            </div>
            <div
              style={{
                fontSize: 22,
                fontFamily: "Instrument Serif",
                color: INK,
                opacity: 0.78,
              }}
            >
              Australian mining intelligence
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Instrument Serif", data: instrumentData, style: "normal", weight: 400 },
        { name: "Geist", data: geistData, style: "normal", weight: 400 },
      ],
    },
  );
}
