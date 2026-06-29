import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "Meeting Manager",
  description: "Track meetings, attendees, decisions, and action items",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-blue-50">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
