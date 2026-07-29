import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "词迹 · 随身单词卡",
    short_name: "词迹",
    description: "安静、离线、属于你自己的随身单词卡册。",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f0e7",
    theme_color: "#f4f0e7",
    lang: "zh-CN",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/ciji-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/ciji-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
