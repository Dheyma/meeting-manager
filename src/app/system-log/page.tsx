"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { LogIn, LogOut, Plus, Pencil, Trash2, FileText, User, Shield } from "lucide-react";

interface SystemLog {
  id: string;
  person_id: string | null;
  person_name: string;
  action: string;
  entity_type: string | null;
  entity_description: string | null;
  created_at: string;
}

const entityIcons: Record<string, React.ReactNode> = {
  auth: <Shield size={14} />,
  meeting: <FileText size={14} />,
  agenda_item: <FileText size={14} />,
  decision: <FileText size={14} />,
  action_item: <FileText size={14} />,
  document: <FileText size={14} />,
  person: <User size={14} />,
};

function actionIcon(action: string) {
  if (action.startsWith("Logged in")) return <LogIn size={14} className="text-green-600" />;
  if (action.startsWith("Logged out")) return <LogOut size={14} className="text-orange-500" />;
  if (action.startsWith("Added") || action.startsWith("Created") || action.startsWith("Uploaded")) return <Plus size={14} className="text-blue-600" />;
  if (action.startsWith("Updated") || action.startsWith("Changed") || action.startsWith("Set")) return <Pencil size={14} className="text-yellow-600" />;
  if (action.startsWith("Deleted") || action.startsWith("Removed")) return <Trash2 size={14} className="text-red-500" />;
  return entityIcons[action] ?? <FileText size={14} className="text-gray-400" />;
}

function actionBadge(action: string) {
  if (action.startsWith("Logged in")) return "bg-green-100 text-green-800";
  if (action.startsWith("Logged out")) return "bg-orange-100 text-orange-800";
  if (action.startsWith("Added") || action.startsWith("Created") || action.startsWith("Uploaded")) return "bg-blue-100 text-blue-800";
  if (action.startsWith("Updated") || action.startsWith("Changed") || action.startsWith("Set")) return "bg-yellow-100 text-yellow-800";
  if (action.startsWith("Deleted") || action.startsWith("Removed")) return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
}

export default function SystemLogPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filterUser, setFilterUser] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel("system-logs-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "system_logs" }, () => fetchLogs())
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
      const names = Array.from(new Set(data.map((l: SystemLog) => l.person_name))).sort() as string[];
      setUsers(names);
    }
  }

  const filtered = logs.filter((l) => {
    if (filterUser && l.person_name !== filterUser) return false;
    if (filterAction && !l.action.toLowerCase().startsWith(filterAction.toLowerCase())) return false;
    return true;
  });

  const actionCategories = ["Logged in", "Logged out", "Added", "Created", "Updated", "Changed", "Set", "Deleted", "Removed", "Uploaded"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Log</h1>
        <span className="text-sm text-gray-500">{filtered.length} entries</span>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">Filter by user:</label>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">All users</option>
            {users.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">Filter by action:</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">All actions</option>
            {actionCategories.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {(filterUser || filterAction) && (
          <button
            onClick={() => { setFilterUser(""); setFilterAction(""); }}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date &amp; Time</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">User</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Action</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
                </td>
                <td className="px-6 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                  {log.person_name}
                </td>
                <td className="px-6 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${actionBadge(log.action)}`}>
                    {actionIcon(log.action)}
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600 max-w-sm truncate">
                  {log.entity_description ?? "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-400">
                  No log entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
