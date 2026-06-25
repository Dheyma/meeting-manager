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
      <body className="min-h-screen bg-blue-50">
        <Toaster position="top-right" />
        <nav className="bg-green-100 border-b border-green-200 pt-4 pb-2">
          <div className="flex items-center justify-between px-2">
            <Link href="/" className="flex items-center">
              <Image
                src="/dheyma-logo.png"
                alt="Dheyma Logo"
                width={360}
                height={360}
                className="rounded"
              />
              <div className="flex flex-col -ml-8">
                <span className="text-4xl font-bold text-gray-900">
                  Dheyma Global Ventures Pvt. Ltd.
                </span>
                <span className="text-xl text-gray-500">
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
