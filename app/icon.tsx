import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";
export const dynamic = "force-static";

export default function Icon() {
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
          fontSize: 244,
          fontWeight: 700,
          letterSpacing: "-0.08em",
          paddingRight: 24,
        }}
      >
        词
      </div>
    ),
    size,
  );
}
