import type { Metadata, Viewport } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: {
    default: "词迹 · 雅思重启",
    template: "%s · 雅思重启",
  },
  description: "每天 120 分钟，完成词汇、听力、阅读、口语与写作的 30 天雅思重启训练。",
  applicationName: "雅思重启",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "雅思重启",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: `${basePath}/icons/icon-512.png`,
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: [
      {
        url: `${basePath}/icons/apple-touch-icon.png`,
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f0e7" },
    { media: "(prefers-color-scheme: dark)", color: "#171714" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
