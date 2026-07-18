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
      { url: "/papertree-app-icon.png", type: "image/png", sizes: "512x512" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
        <ServiceWorkerRegistration />
        <AppToaster />
      </body>
    </html>
  );
}
