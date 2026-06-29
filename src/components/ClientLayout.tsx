"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getStoredUser, clearStoredUser, AuthUser } from "@/lib/auth";
import { logActionAs } from "@/lib/log";
import Link from "next/link";
import Image from "next/image";
import { Toaster } from "react-hot-toast";
import { CalendarDays, Users, Home, LogOut, ClipboardList, Menu, X } from "lucide-react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored && pathname !== "/login") {
      router.replace("/login");
      return;
    }
    setUser(stored);
    setReady(true);
  }, [pathname, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

  const navLinks = [
    { href: "/", icon: <Home size={18} />, label: "Dashboard" },
    { href: "/meetings", icon: <CalendarDays size={18} />, label: "Meetings" },
    { href: "/people", icon: <Users size={18} />, label: "People" },
    { href: "/system-log", icon: <ClipboardList size={18} />, label: "System Log" },
  ];

  return (
    <>
      <Toaster position="top-right" />
      <nav className="bg-blue-200 border-b border-blue-300 md:-mb-4">
        {/* Main navbar row */}
        <div className="flex items-center justify-between px-3 py-3 md:px-2 md:pt-6 md:pb-6">
          <Link href="/" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
            <Image
              src="/dheyma-logo.png"
              alt="Dheyma Logo"
              width={130}
              height={130}
              className="bg-blue-200 w-14 h-14 md:w-[130px] md:h-[130px]"
              unoptimized
            />
            <div className="flex flex-col ml-2 md:ml-3">
              <span className="text-base md:text-4xl font-bold leading-tight text-gray-900">
                <span className="md:hidden">Dheyma Global Ventures</span>
                <span className="hidden md:inline">Dheyma Global Ventures Pvt. Ltd.</span>
              </span>
              <span className="text-xs md:text-xl font-semibold text-gray-900">
                Meeting Management System
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 mr-8">
            {navLinks.map(({ href, icon, label }) => (
              <Link key={href} href={href} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                {icon}
                {label}
              </Link>
            ))}
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-blue-400">
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

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-blue-300 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-blue-300 bg-blue-100 px-4 py-3 space-y-1">
            {navLinks.map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-blue-200 text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                {icon}
                {label}
              </Link>
            ))}
            <div className="border-t border-blue-300 mt-2 pt-2 flex items-center justify-between px-3">
              <span className="text-sm font-medium text-gray-700">{user?.name}</span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-8">{children}</main>
    </>
  );
}
