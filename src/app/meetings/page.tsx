"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Meeting } from "@/lib/types";
import Link from "next/link";
import { Plus, Calendar, MapPin, Building2, Search, X, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface MeetingAttendeeWithPerson {
  meeting_id: string;
  person: { name: string } | null;
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendeeMap, setAttendeeMap] = useState<Record<string, string[]>>({});
  const [agendaMap, setAgendaMap] = useState<Record<string, string>>({});
  const [decisionMap, setDecisionMap] = useState<Record<string, string>>({});
  const [actionMap, setActionMap] = useState<Record<string, string>>({});
  const [peopleMap, setPeopleMap] = useState<Record<string, string>>({});
  const [searchField, setSearchField] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [sortField, setSortField] = useState<"date" | "title" | "department">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchMeetings();

    const channel = supabase
      .channel("meetings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, () => {
        fetchMeetings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchMeetings() {
    const [meetingsRes, attendeesRes, agendaRes, decisionsRes, actionsRes, peopleRes] = await Promise.all([
      supabase.from("meetings").select("*").order("date", { ascending: false }),
      supabase.from("meeting_attendees").select("meeting_id, person:people(name)"),
      supabase.from("agenda_items").select("meeting_id, title, description"),
      supabase.from("decisions").select("meeting_id, description"),
      supabase.from("action_items").select("meeting_id, description"),
      supabase.from("people").select("id, name, organization"),
    ]);
    if (meetingsRes.error) {
      toast.error("Failed to load meetings");
      return;
    }
    setMeetings(meetingsRes.data || []);

    const map: Record<string, string[]> = {};
    if (attendeesRes.data) {
      for (const a of attendeesRes.data as unknown as MeetingAttendeeWithPerson[]) {
        if (!map[a.meeting_id]) map[a.meeting_id] = [];
        if (a.person?.name) map[a.meeting_id].push(a.person.name);
      }
    }
    setAttendeeMap(map);

    const aMap: Record<string, string> = {};
    for (const r of (agendaRes.data || []) as { meeting_id: string; title: string; description?: string }[]) {
      aMap[r.meeting_id] = (aMap[r.meeting_id] || "") + " " + (r.title || "") + " " + (r.description || "");
    }
    setAgendaMap(aMap);

    const dMap: Record<string, string> = {};
    for (const r of (decisionsRes.data || []) as { meeting_id: string; description: string }[]) {
      dMap[r.meeting_id] = (dMap[r.meeting_id] || "") + " " + r.description;
    }
    setDecisionMap(dMap);

    const acMap: Record<string, string> = {};
    for (const r of (actionsRes.data || []) as { meeting_id: string; description: string }[]) {
      acMap[r.meeting_id] = (acMap[r.meeting_id] || "") + " " + r.description;
    }
    setActionMap(acMap);

    const pMap: Record<string, string> = {};
    for (const p of (peopleRes.data || []) as { id: string; name: string; organization?: string }[]) {
      pMap[p.id] = p.name + (p.organization ? `, ${p.organization}` : "");
    }
    setPeopleMap(pMap);
  }

  const searchOptions = useMemo(() => {
    if (!searchField) return [];
    const opts = new Set<string>();
    for (const m of meetings) {
      if (searchField === "date") {
        opts.add(format(new Date(m.date), "dd/MM/yyyy"));
      } else if (searchField === "title" && m.title) {
        opts.add(m.title);
      } else if (searchField === "description" && m.description) {
        opts.add(m.description);
      } else if (searchField === "location" && m.location) {
        opts.add(m.location);
      } else if (searchField === "department" && m.department) {
        opts.add(m.department);
      } else if (searchField === "attendees") {
        const names = attendeeMap[m.id] || [];
        for (const n of names) opts.add(n);
      } else if (searchField === "transcribed_by" && m.transcribed_by) {
        const name = peopleMap[m.transcribed_by];
        if (name) opts.add(name);
      }
    }
    return Array.from(opts).sort();
  }, [searchField, meetings, attendeeMap, peopleMap]);

  const filteredMeetings = useMemo(() => {
    if (!searchField || !searchValue) return meetings;
    return meetings.filter((m) => {
      if (searchField === "date") {
        return format(new Date(m.date), "dd/MM/yyyy") === searchValue;
      } else if (searchField === "title") {
        return m.title === searchValue;
      } else if (searchField === "description") {
        return m.description === searchValue;
      } else if (searchField === "location") {
        return m.location === searchValue;
      } else if (searchField === "department") {
        return m.department === searchValue;
      } else if (searchField === "attendees") {
        return (attendeeMap[m.id] || []).includes(searchValue);
      } else if (searchField === "transcribed_by") {
        return m.transcribed_by ? peopleMap[m.transcribed_by] === searchValue : false;
      } else if (searchField === "keyword") {
        const kw = searchValue.toLowerCase();
        const attendeeNames = (attendeeMap[m.id] || []).join(" ").toLowerCase();
        return (
          m.title?.toLowerCase().includes(kw) ||
          m.description?.toLowerCase().includes(kw) ||
          m.location?.toLowerCase().includes(kw) ||
          m.department?.toLowerCase().includes(kw) ||
          attendeeNames.includes(kw) ||
          (agendaMap[m.id] || "").toLowerCase().includes(kw) ||
          (decisionMap[m.id] || "").toLowerCase().includes(kw) ||
          (actionMap[m.id] || "").toLowerCase().includes(kw)
        );
      }
      return true;
    });
  }, [searchField, searchValue, meetings, attendeeMap, agendaMap, decisionMap, actionMap, peopleMap]);

  const sortedMeetings = useMemo(() => {
    return [...filteredMeetings].sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === "title") {
        cmp = a.title.localeCompare(b.title);
      } else if (sortField === "department") {
        cmp = (a.department || "").localeCompare(b.department || "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredMeetings, sortField, sortDir]);

  function toggleSort(field: "date" | "title" | "department") {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "date" ? "desc" : "asc");
    }
  }

  function clearSearch() {
    setSearchField("");
    setSearchValue("");
  }

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
        <Link
          href="/meetings/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          New Meeting
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <Search size={18} className="text-gray-400" />
          <select
            value={searchField}
            onChange={(e) => { setSearchField(e.target.value); setSearchValue(""); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Search by...</option>
            <option value="keyword">Keyword</option>
            <option value="date">Date</option>
            <option value="title">Title</option>
            <option value="description">Description</option>
            <option value="location">Location</option>
            <option value="department">Department</option>
            <option value="attendees">Attendees</option>
            <option value="transcribed_by">Transcribed By</option>
          </select>
          {searchField === "keyword" ? (
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Type a keyword to search..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              autoFocus
            />
          ) : searchField && (
            <select
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select {searchField}...</option>
              {searchOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
          {(searchField || searchValue) && (
            <button
              onClick={clearSearch}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {searchValue && (
          <p className="text-xs text-gray-500 mt-2">
            Showing {filteredMeetings.length} meeting{filteredMeetings.length !== 1 ? "s" : ""} matching {searchField}: &quot;{searchValue}&quot;
          </p>
        )}
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500 mr-2">Sort by</span>
          {(["date", "title", "department"] as const).map((field) => {
            const active = sortField === field;
            return (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                }`}
              >
                {field.charAt(0).toUpperCase() + field.slice(1)}
                {active && (sortDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {sortedMeetings.map((meeting) => (
          <Link
            key={meeting.id}
            href={`/meetings/${meeting.id}`}
            className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {meeting.title}
                </h3>
                {meeting.description && (
                  <p className="text-gray-600 mt-1">{meeting.description}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {format(new Date(meeting.date), "dd/MM/yyyy HH:mm")}
                  </span>
                  {meeting.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {meeting.location}
                    </span>
                  )}
                  {meeting.department && (
                    <span className="flex items-center gap-1">
                      <Building2 size={14} />
                      {meeting.department}
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[meeting.status]}`}
              >
                {meeting.status.replace("_", " ")}
              </span>
            </div>
          </Link>
        ))}
        {sortedMeetings.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchValue ? "No meetings match your search." : "No meetings yet. Create your first meeting to get started."}
          </div>
        )}
      </div>
    </div>
  );
}
