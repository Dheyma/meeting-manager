import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Link from "next/link";
import { CalendarDays, Users, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Meeting Manager",
  description: "Track meetings, attendees, decisions, and action items",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        <nav className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/dheyma-logo.jpeg"
                alt="Dheyma Logo"
                width={240}
                height={240}
                className="rounded"
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-gray-900">
                  Dheyma Global Ventures Pvt. Ltd.
                </span>
                <span className="text-sm text-gray-500">
                  Meeting Management System
                </span>
              </div>
            </Link>
            <div className="flex gap-6">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <Home size={18} />
                Dashboard
              </Link>
              <Link
                href="/meetings"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <CalendarDays size={18} />
                Meetings
              </Link>
              <Link
                href="/people"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <Users size={18} />
                People
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
