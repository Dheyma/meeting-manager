"use client";

import { useEffect, useRef, useState } from "react";
import { Person } from "@/lib/types";

interface PersonComboboxProps {
  people: Person[];
  value: string;
  onChange: (personId: string) => void;
  placeholder?: string;
  className?: string;
}

export default function PersonCombobox({ people, value, onChange, placeholder, className }: PersonComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedPerson = people.find((p) => p.id === value);
  const selectedLabel = selectedPerson
    ? `${selectedPerson.name}${selectedPerson.organization ? `, ${selectedPerson.organization}` : ""}`
    : "";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query
    ? people.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.organization || "").toLowerCase().includes(query.toLowerCase())
      )
    : people;

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        value={open ? query : selectedLabel}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        placeholder={placeholder || "Type a name..."}
        className={className || "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          <div
            onClick={() => {
              onChange("");
              setQuery("");
              setOpen(false);
            }}
            className="px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
          >
            Unassigned
          </div>
          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                onChange(p.id);
                setQuery("");
                setOpen(false);
              }}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${p.id === value ? "bg-blue-50 font-medium" : ""}`}
            >
              {p.name}
              {p.organization ? `, ${p.organization}` : ""}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
          )}
        </div>
      )}
    </div>
  );
}
