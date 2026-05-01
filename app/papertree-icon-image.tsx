import { ImageResponse } from "next/og";

export function createPaperTreeIcon(size: { height: number; width: number }) {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #0f766e 100%)",
          borderRadius: Math.round(size.width * 0.22),
          color: "white",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#67e8f9",
            border: `${Math.round(size.width * 0.042)}px solid white`,
            borderRadius: 999,
            height: size.width * 0.198,
            position: "absolute",
            right: size.width * 0.146,
            top: size.height * 0.13,
            width: size.width * 0.198,
          }}
        />
        <div
          style={{
            background: "rgba(255,255,255,0.94)",
            border: `${Math.round(size.width * 0.042)}px solid white`,
            borderRadius: Math.round(size.width * 0.115),
            height: size.height * 0.479,
            left: size.width * 0.193,
            position: "absolute",
            top: size.height * 0.323,
            width: size.width * 0.604,
          }}
        />
        <div
          style={{
            background: "#14b8a6",
            border: `${Math.round(size.width * 0.042)}px solid white`,
            borderRadius: 999,
            bottom: size.height * 0.224,
            height: size.width * 0.177,
            left: size.width * 0.182,
            position: "absolute",
            width: size.width * 0.177,
          }}
        />
        <div
          style={{
            background: "#0f766e",
            borderRadius: 999,
            height: size.height * 0.036,
            left: size.width * 0.292,
            position: "absolute",
            top: size.height * 0.458,
            width: size.width * 0.302,
          }}
        />
        <div
          style={{
            background: "#0f766e",
            borderRadius: 999,
            height: size.height * 0.036,
            left: size.width * 0.292,
            position: "absolute",
            top: size.height * 0.568,
            width: size.width * 0.245,
          }}
        />
        <div
          style={{
            background: "#0f766e",
            borderRadius: 999,
            height: size.height * 0.036,
            left: size.width * 0.292,
            position: "absolute",
            top: size.height * 0.677,
            width: size.width * 0.177,
          }}
        />
      </div>
    ),
    size,
  );
}
