"use client";

import { useState } from "react";
import { Person } from "@/lib/types";
import { Search } from "lucide-react";

interface AttendeePickerProps {
  people: Person[];
  selected: string[];
  onToggle: (personId: string) => void;
}

export default function AttendeePicker({ people, selected, onToggle }: AttendeePickerProps) {
  const [query, setQuery] = useState("");

  const filtered = query
    ? people.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.organization || "").toLowerCase().includes(query.toLowerCase())
      )
    : people;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a name to filter..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.map((person) => (
          <label
            key={person.id}
            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(person.id)}
              onChange={() => onToggle(person.id)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-900">
              {person.name}
              {person.organization ? `, ${person.organization}` : ""}
            </span>
          </label>
        ))}
        {filtered.length === 0 && (
          <p className="px-4 py-3 text-sm text-gray-400">No matching people.</p>
        )}
      </div>
    </div>
  );
}
