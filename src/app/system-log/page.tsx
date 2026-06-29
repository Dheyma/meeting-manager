"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

interface SystemLog {
  id: string;
  person_id: string | null;
  person_name: string;
  action: string;
  entity_type: string | null;
  entity_description: string | null;
  created_at: string;
}

function rowColor(action: string) {
  if (action.startsWith("Logged in"))  return "border-l-4 border-green-400";
  if (action.startsWith("Logged out")) return "border-l-4 border-orange-400";
  if (action.startsWith("Added") || action.startsWith("Created") || action.startsWith("Uploaded"))
    return "border-l-4 border-blue-400";
  if (action.startsWith("Updated") || action.startsWith("Changed") || action.startsWith("Set"))
    return "border-l-4 border-yellow-400";
  if (action.startsWith("Deleted") || action.startsWith("Removed"))
    return "border-l-4 border-red-400";
  return "border-l-4 border-gray-200";
}

function formatRemark(action: string, desc: string | null): string {
  const d = desc ?? "";

  if (action === "Logged in")  return "Logged in to the system.";
  if (action === "Logged out") return "Logged out of the system.";

  if (action === "Created meeting")
    return `Created a new meeting: ${d}.`;

  if (action === "Updated meeting details")
    return `Edited details of ${d}.`;

  if (action === "Rescheduled meeting")
    return `Rescheduled ${d}.`;

  if (action === "Deleted meeting")
    return `Deleted ${d}.`;

  if (action === "Sent meeting records via email")
    return `Sent full meeting records via email for ${d}.`;

  if (action.startsWith("Changed meeting status to"))
    return `${action} — ${d}.`;

  if (action === "Added agenda item")
    return `Added a new agenda item — ${d}.`;
  if (action === "Updated agenda item")
    return `Edited an agenda item — ${d}.`;
  if (action === "Deleted agenda item")
    return `Deleted an agenda item — ${d}.`;

  if (action === "Added decision")
    return `Recorded a new decision — ${d}.`;
  if (action === "Updated decision")
    return `Edited an existing decision — ${d}.`;
  if (action === "Deleted decision")
    return `Deleted a decision — ${d}.`;

  if (action === "Added action item")
    return `Assigned a new action item — ${d}.`;
  if (action === "Updated action item")
    return `Edited an action item — ${d}.`;
  if (action === "Deleted action item")
    return `Deleted an action item — ${d}.`;

  if (action === "Uploaded background document")
    return `Uploaded a background document — ${d}.`;
  if (action === "Removed background document")
    return `Removed the background document — ${d}.`;
  if (action === "Uploaded agenda document")
    return `Uploaded an agenda document — ${d}.`;
  if (action === "Removed agenda document")
    return `Removed the agenda document — ${d}.`;

  if (action.startsWith("Uploaded additional"))
    return `Uploaded an additional ${action.includes("background") ? "background" : "agenda"} document — ${d}.`;
  if (action.startsWith("Deleted additional"))
    return `Deleted an additional document — ${d}.`;

  if (action === "Set transcribed by")
    return `Set the meeting transcriber — ${d}.`;

  if (action === "Added person")
    return `Added a new person to the system: ${d}.`;
  if (action === "Updated person details")
    return `Edited profile and details for: ${d}.`;
  if (action === "Deleted person")
    return `Removed a person from the system: ${d}.`;
  if (action === "Changed password")
    return `Changed the login password for: ${d}.`;

  return d ? `${action} — ${d}.` : `${action}.`;
}

const ACTION_CATEGORIES = [
  "Logged in", "Logged out",
  "Added", "Created", "Uploaded",
  "Updated", "Changed", "Set",
  "Deleted", "Removed",
];

export default function SystemLogPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filterUser, setFilterUser]     = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel("system-logs-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_logs" },
        (payload) => {
          const newLog = payload.new as SystemLog;
          setLogs((prev) => [newLog, ...prev]);
          setUsers((prev) =>
            prev.includes(newLog.person_name)
              ? prev
              : [...prev, newLog.person_name].sort()
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchLogs() {
    const { data } = await supabase
      .from("system_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (data) {
      setLogs(data);
      setUsers(
        (Array.from(new Set(data.map((l: SystemLog) => l.person_name))) as string[]).sort()
      );
    }
  }

  const filtered = logs.filter((l) => {
    if (filterUser   && l.person_name !== filterUser) return false;
    if (filterAction && !l.action.toLowerCase().startsWith(filterAction.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">System Log</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time audit trail of all user activity</p>
        </div>
        <span className="text-sm text-gray-400">{filtered.length} entries</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-400 inline-block" /> Login / Logout</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" /> Added / Created / Uploaded</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" /> Edited / Changed</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Deleted / Removed</span>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex gap-4 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">User:</label>
          <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="">All users</option>
            {users.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">Action type:</label>
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="">All actions</option>
            {ACTION_CATEGORIES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {(filterUser || filterAction) && (
          <button onClick={() => { setFilterUser(""); setFilterAction(""); }} className="text-sm text-blue-600 hover:underline">
            Clear filters
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-44">Date &amp; Time</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-40">User</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((log) => (
              <tr key={log.id} className={`hover:bg-gray-50 ${rowColor(log.action)}`}>
                <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
                </td>
                <td className="px-6 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                  {log.person_name}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {formatRemark(log.action, log.entity_description)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-400">
                  No log entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
