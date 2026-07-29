import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";
export const dynamic = "force-static";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#234a70",
          color: "#fffaf0",
          fontSize: 86,
          fontWeight: 700,
          letterSpacing: "-0.08em",
          paddingRight: 8,
        }}
      >
        词
      </div>
    ),
    size,
  );
}
