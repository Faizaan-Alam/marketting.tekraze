import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const alt = "Tekraze Studio: five ways we help you grow";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: 72,
        background: "radial-gradient(circle at 78% 30%, rgba(242,36,58,0.45), #000 60%)",
        color: "#eee8e1",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: "#aaa1a8" }}
      >
        <div style={{ width: 18, height: 18, borderRadius: 9, background: "#f2243a" }} />
        Now streaming on services.tekraze.com
      </div>
      <div
        style={{
          fontSize: 118,
          fontWeight: 800,
          lineHeight: 0.95,
          marginTop: 20,
          letterSpacing: -2,
        }}
      >
        {site.headline}
      </div>
      <div style={{ fontSize: 34, marginTop: 28, color: "#f2243a", fontWeight: 700 }}>TEKRAZE</div>
    </div>,
    size,
  );
}
