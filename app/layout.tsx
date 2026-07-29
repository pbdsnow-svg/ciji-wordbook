import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "词迹",
    template: "%s · 词迹",
  },
  description: "安静、离线、属于你自己的随身单词卡册。",
  applicationName: "词迹",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "词迹",
  },
  formatDetection: {
    telephone: false,
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
