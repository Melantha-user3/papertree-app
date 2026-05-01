import type { Metadata } from "next";
import { AppToaster } from "@/components/layout/app-toaster";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PaperTree",
    template: "%s | PaperTree",
  },
  description: "AI-powered literature graph workspace for structured research intelligence.",
  applicationName: "PaperTree",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PaperTree",
  },
  icons: {
    icon: [
      { url: "/icon", type: "image/png", sizes: "192x192" },
      { url: "/papertree-icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-slate-800 antialiased">
        {children}
        <ServiceWorkerRegistration />
        <AppToaster />
      </body>
    </html>
  );
}
