import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const BASE_DEPARTMENTS = [
  "Agriculture",
  "Tourism",
  "Trading",
  "Logistics",
  "Strategic",
  "Dheyma Harvest",
  "Accounts",
  "Procurement",
  "Agarwood",
  "Cannabis",
  "Wangsisina",
  "GMC capsule project",
  "Sukti",
  "Communications",
  "Construction",
  "Asanga",
  "Human Resource",
  "Others",
];

export function useDepartments() {
  const [customDepts, setCustomDepts] = useState<string[]>([]);

  useEffect(() => {
    fetchCustomDepts();
  }, []);

  async function fetchCustomDepts() {
    const { data } = await supabase
      .from("departments")
      .select("name")
      .order("name");
    if (data) {
      const names = (data as { name: string }[]).map((d) => d.name);
      setCustomDepts(names.filter((n) => !BASE_DEPARTMENTS.includes(n)));
    }
  }

  async function addDepartment(name: string): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const { error } = await supabase.from("departments").insert({ name: trimmed });
    if (!error) {
      setCustomDepts((prev) => [...prev, trimmed].sort());
      return true;
    }
    return false;
  }

  // Base list without "Others", then custom ones, then "Others" at end
  const allDepartments = [
    ...BASE_DEPARTMENTS.filter((d) => d !== "Others"),
    ...customDepts,
    "Others",
  ];

  return { allDepartments, addDepartment };
}
