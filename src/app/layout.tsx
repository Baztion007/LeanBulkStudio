import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lean Bulk Studio — 6-Week Lean Bulk Tracker",
  description:
    "An interactive 6-week home muscle-building tracker for a 50kg lifter: workout logger, double progression controller, calorie & macro calculator, and dumbbell plate inventory.",
  keywords: [
    "lean bulk",
    "workout tracker",
    "double progression",
    "dumbbell",
    "fitness PWA",
  ],
  authors: [{ name: "Lean Bulk Studio" }],
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Lean Bulk Studio",
    description:
      "Track your 6-week lean bulk: workouts, progression, nutrition targets and plate inventory.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070b0f" },
    { media: "(prefers-color-scheme: light)", color: "#f4f7fa" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
