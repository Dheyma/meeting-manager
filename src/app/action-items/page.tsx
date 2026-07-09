"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { ActionItem } from "@/lib/types";
import Link from "next/link";
import { Calendar, Building2, User, Search, X, ArrowUp, ArrowDown, CheckCircle, Circle, Clock } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { getStoredUser, isAdmin } from "@/lib/auth";

interface ActionItemWithMeeting extends ActionItem {
  meeting?: { id: string; title: string; department?: string } | null;
}

interface MeetingAttendeeRow {
  meeting_id: string;
  person_id: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Circle size={14} />,
  in_progress: <Clock size={14} />,
  completed: <CheckCircle size={14} />,
};

export default function ActionItemsPage() {
  const [actionItems, setActionItems] = useState<ActionItemWithMeeting[]>([]);
  const [searchField, setSearchField] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [sortField, setSortField] = useState<"due_date" | "assigned_to" | "status" | "meeting">("due_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    fetchActionItems();

    const channel = supabase
      .channel("action-items-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "action_items" }, () => {
        fetchActionItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchActionItems() {
    const [actionsRes, attendeesRes, peopleRes] = await Promise.all([
      supabase
        .from("action_items")
        .select("*, person:people(*), meeting:meetings(id, title, department)")
        .order("due_date", { ascending: true }),
      supabase.from("meeting_attendees").select("meeting_id, person_id"),
      supabase.from("people").select("id, access_all_meetings"),
    ]);

    if (actionsRes.error) {
      toast.error("Failed to load action items");
      return;
    }

    let visibleItems = (actionsRes.data || []) as unknown as ActionItemWithMeeting[];

    const user = getStoredUser();
    if (user && !isAdmin(user)) {
      const me = (peopleRes.data || []).find((p) => p.id === user.personId) as { access_all_meetings?: boolean } | undefined;
      if (!me?.access_all_meetings) {
        const allowedMeetingIds = new Set(
          ((attendeesRes.data || []) as MeetingAttendeeRow[])
            .filter((a) => a.person_id === user.personId)
            .map((a) => a.meeting_id)
        );
        visibleItems = visibleItems.filter((a) => allowedMeetingIds.has(a.meeting_id));
      }
    }

    setActionItems(visibleItems);
  }

  const searchOptions = useMemo(() => {
    if (!searchField) return [];
    const opts = new Set<string>();
    for (const a of actionItems) {
      if (searchField === "assigned_to" && a.person?.name) {
        opts.add(a.person.name);
      } else if (searchField === "department" && a.meeting?.department) {
        opts.add(a.meeting.department);
      } else if (searchField === "status") {
        opts.add(a.status);
      } else if (searchField === "due_date" && a.due_date) {
        opts.add(format(new Date(a.due_date), "dd/MM/yyyy"));
      } else if (searchField === "meeting" && a.meeting?.title) {
        opts.add(a.meeting.title);
      }
    }
    return Array.from(opts).sort();
  }, [searchField, actionItems]);

  const filteredItems = useMemo(() => {
    if (!searchField || !searchValue) return actionItems;
    return actionItems.filter((a) => {
      if (searchField === "assigned_to") {
        return a.person?.name === searchValue;
      } else if (searchField === "department") {
        return a.meeting?.department === searchValue;
      } else if (searchField === "status") {
        return a.status === searchValue;
      } else if (searchField === "due_date") {
        return a.due_date ? format(new Date(a.due_date), "dd/MM/yyyy") === searchValue : false;
      } else if (searchField === "meeting") {
        return a.meeting?.title === searchValue;
      } else if (searchField === "keyword") {
        const kw = searchValue.toLowerCase();
        return (
          a.description?.toLowerCase().includes(kw) ||
          a.person?.name?.toLowerCase().includes(kw) ||
          a.meeting?.title?.toLowerCase().includes(kw) ||
          a.meeting?.department?.toLowerCase().includes(kw)
        );
      }
      return true;
    });
  }, [searchField, searchValue, actionItems]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let cmp = 0;
      if (sortField === "due_date") {
        const aTime = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const bTime = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        cmp = aTime - bTime;
      } else if (sortField === "assigned_to") {
        cmp = (a.person?.name || "").localeCompare(b.person?.name || "");
      } else if (sortField === "status") {
        cmp = a.status.localeCompare(b.status);
      } else if (sortField === "meeting") {
        cmp = (a.meeting?.title || "").localeCompare(b.meeting?.title || "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredItems, sortField, sortDir]);

  function toggleSort(field: "due_date" | "assigned_to" | "status" | "meeting") {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function clearSearch() {
    setSearchField("");
    setSearchValue("");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Action Items</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Search size={18} className="text-gray-400" />
          <select
            value={searchField}
            onChange={(e) => { setSearchField(e.target.value); setSearchValue(""); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Search by...</option>
            <option value="keyword">Keyword</option>
            <option value="assigned_to">Assigned To</option>
            <option value="department">Department</option>
            <option value="due_date">Due Date</option>
            <option value="status">Status</option>
            <option value="meeting">Meeting</option>
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
              <option value="">Select {searchField.replace("_", " ")}...</option>
              {searchOptions.map((opt) => (
                <option key={opt} value={opt}>{opt.replace("_", " ")}</option>
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
            Showing {filteredItems.length} action item{filteredItems.length !== 1 ? "s" : ""} matching {searchField.replace("_", " ")}: &quot;{searchValue}&quot;
          </p>
        )}
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500 mr-2">Sort by</span>
          {([
            ["due_date", "Due Date"],
            ["assigned_to", "Assigned To"],
            ["status", "Status"],
            ["meeting", "Meeting"],
          ] as [typeof sortField, string][]).map(([field, label]) => {
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
                {label}
                {active && (sortDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {sortedItems.map((action) => (
          <Link
            key={action.id}
            href={action.meeting ? `/meetings/${action.meeting.id}` : "#"}
            className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className={`text-sm font-medium ${action.status === "completed" ? "line-through text-gray-500" : "text-gray-900"}`}>
                  {action.description}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                  {action.person && (
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      {action.person.name}{action.person.organization ? `, ${action.person.organization}` : ""}
                    </span>
                  )}
                  {action.due_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      Due: {format(new Date(action.due_date), "dd/MM/yyyy")}
                    </span>
                  )}
                  {action.meeting?.department && (
                    <span className="flex items-center gap-1">
                      <Building2 size={14} />
                      {action.meeting.department}
                    </span>
                  )}
                  {action.meeting && (
                    <span className="text-blue-600">{action.meeting.title}</span>
                  )}
                </div>
              </div>
              <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium shrink-0 ${statusColors[action.status]}`}>
                {statusIcons[action.status]}
                {action.status.replace("_", " ")}
              </span>
            </div>
          </Link>
        ))}
        {sortedItems.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchValue ? "No action items match your search." : "No action items yet."}
          </div>
        )}
      </div>
    </div>
  );
}
