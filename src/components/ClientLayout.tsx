"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getStoredUser, clearStoredUser, AuthUser } from "@/lib/auth";
import { logActionAs } from "@/lib/log";
import Link from "next/link";
import Image from "next/image";
import { Toaster } from "react-hot-toast";
import { CalendarDays, Users, Home, LogOut, ClipboardList } from "lucide-react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored && pathname !== "/login") {
      router.replace("/login");
      return;
    }
    setUser(stored);
    setReady(true);
  }, [pathname, router]);

  async function logout() {
    if (user) {
      await logActionAs(user.personId, user.name, "Logged out", "auth");
    }
    clearStoredUser();
    setUser(null);
    router.replace("/login");
  }

  if (!ready && pathname !== "/login") return null;

  if (pathname === "/login") {
    return (
      <>
        <Toaster position="top-right" />
        {children}
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <nav className="bg-blue-100 border-b border-blue-200 pt-3 -mb-4 pb-3">
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center">
            <Image src="/dheyma-logo.png" alt="Dheyma Logo" width={130} height={130} className="bg-blue-100" unoptimized />
            <div className="flex flex-col ml-3">
              <span className="text-4xl font-bold" style={{ color: "#bea064" }}>
                Dheyma Global Ventures Pvt. Ltd.
              </span>
              <span className="text-xl font-semibold" style={{ color: "#bea064" }}>
                Meeting Management System
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-6 mr-8">
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <Home size={18} />
              Dashboard
            </Link>
            <Link href="/meetings" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <CalendarDays size={18} />
              Meetings
            </Link>
            <Link href="/people" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <Users size={18} />
              People
            </Link>
            <Link href="/system-log" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ClipboardList size={18} />
              System Log
            </Link>
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-blue-300">
              <span className="text-sm font-medium text-gray-700">{user?.name}</span>
              <button
                onClick={logout}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </>
  );
}
