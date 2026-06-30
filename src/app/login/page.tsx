"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { setStoredUser, getStoredUser } from "@/lib/auth";
import { logActionAs } from "@/lib/log";
import Image from "next/image";
import toast from "react-hot-toast";

interface PersonOption {
  id: string;
  name: string;
  organization?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getStoredUser()) {
      router.replace("/");
      return;
    }
    supabase
      .from("people")
      .select("id, name, organization")
      .eq("can_login", true)
      .order("name")
      .then(({ data }) => {
        if (data) setPeople(data as PersonOption[]);
      });
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) { toast.error("Please select your name"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("people")
        .select("id, name, password")
        .eq("id", selectedId)
        .single();

      if (error || !data) { toast.error("Login failed"); return; }
      if (data.password !== password) { toast.error("Incorrect password"); return; }

      await logActionAs(data.id, data.name, "Logged in", "auth");
      setStoredUser({ personId: data.id, name: data.name });
      router.replace("/meetings");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center px-4">
      <div className="mb-6 flex flex-col items-center text-center">
        <Image src="/dheyma-logo.png" alt="Dheyma Logo" width={120} height={120} className="rounded w-24 h-24 md:w-40 md:h-40" unoptimized />
        <h1 className="text-xl md:text-2xl font-bold mt-2" style={{ color: "#B8860B" }}>
          Dheyma Global Ventures Pvt. Ltd.
        </h1>
        <p className="text-gray-600 text-sm mt-1">Meeting Management System</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8 w-full max-w-sm shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Sign In</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select your name...</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.organization ? ` (${p.organization})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
