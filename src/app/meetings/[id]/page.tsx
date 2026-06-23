"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import {
  Meeting,
  MeetingAttendee,
  AgendaItem,
  Decision,
  ActionItem,
  Person,
} from "@/lib/types";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  Calendar,
  MapPin,
  Upload,
  FileText,
  Plus,
  Send,
  CheckCircle,
  Circle,
  Trash2,
} from "lucide-react";

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [attendees, setAttendees] = useState<MeetingAttendee[]>([]);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  const [newAgendaTitle, setNewAgendaTitle] = useState("");
  const [newAgendaDescription, setNewAgendaDescription] = useState("");
  const [newDecision, setNewDecision] = useState("");
  const [newActionDescription, setNewActionDescription] = useState("");
  const [newActionAssignee, setNewActionAssignee] = useState("");
  const [newActionDueDate, setNewActionDueDate] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [id]);

  async function fetchAll() {
    const [meetingRes, attendeesRes, agendaRes, decisionsRes, actionsRes, peopleRes] =
      await Promise.all([
        supabase.from("meetings").select("*").eq("id", id).single(),
        supabase
          .from("meeting_attendees")
          .select("*, person:people(*)")
          .eq("meeting_id", id),
        supabase
          .from("agenda_items")
          .select("*")
          .eq("meeting_id", id)
          .order("sort_order"),
        supabase.from("decisions").select("*").eq("meeting_id", id),
        supabase
          .from("action_items")
          .select("*, person:people(*)")
          .eq("meeting_id", id),
        supabase.from("people").select("*").order("name"),
      ]);

    if (meetingRes.data) setMeeting(meetingRes.data);
    if (attendeesRes.data) setAttendees(attendeesRes.data);
    if (agendaRes.data) setAgendaItems(agendaRes.data);
    if (decisionsRes.data) setDecisions(decisionsRes.data);
    if (actionsRes.data) setActionItems(actionsRes.data);
    if (peopleRes.data) setPeople(peopleRes.data);
  }

  async function toggleAttendance(attendeeId: string, current: boolean) {
    await supabase
      .from("meeting_attendees")
      .update({ attended: !current })
      .eq("id", attendeeId);
    fetchAll();
  }

  async function updateStatus(status: Meeting["status"]) {
    await supabase.from("meetings").update({ status }).eq("id", id);
    fetchAll();
    toast.success(`Meeting marked as ${status.replace("_", " ")}`);
  }

  async function addAgendaItem(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("agenda_items").insert({
      meeting_id: id,
      title: newAgendaTitle,
      description: newAgendaDescription || null,
      sort_order: agendaItems.length,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewAgendaTitle("");
    setNewAgendaDescription("");
    fetchAll();
  }

  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    agendaItemId: string
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Upload failed");
        return;
      }

      await supabase
        .from("agenda_items")
        .update({ document_url: data.url, document_name: data.name })
        .eq("id", agendaItemId);

      toast.success("Document uploaded");
      fetchAll();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function addDecision(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("decisions").insert({
      meeting_id: id,
      description: newDecision,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewDecision("");
    fetchAll();
  }

  async function addActionItem(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("action_items").insert({
      meeting_id: id,
      description: newActionDescription,
      assigned_to: newActionAssignee || null,
      due_date: newActionDueDate || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewActionDescription("");
    setNewActionAssignee("");
    setNewActionDueDate("");
    fetchAll();
  }

  async function sendEmailNotification(action: ActionItem) {
    if (!action.person) {
      toast.error("No assignee for this action");
      return;
    }

    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: action.person.email,
          subject: `Action Item: ${action.description.substring(0, 50)}`,
          meetingTitle: meeting?.title,
          actionDescription: action.description,
          dueDate: action.due_date,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send email");
        return;
      }

      await supabase
        .from("action_items")
        .update({ email_sent: true })
        .eq("id", action.id);

      toast.success(`Email sent to ${action.person.name}`);
      fetchAll();
    } catch {
      toast.error("Failed to send email");
    }
  }

  async function toggleActionStatus(actionId: string, current: string) {
    const newStatus = current === "completed" ? "pending" : "completed";
    await supabase
      .from("action_items")
      .update({ status: newStatus })
      .eq("id", actionId);
    fetchAll();
  }

  async function deleteAgendaItem(agendaId: string) {
    await supabase.from("agenda_items").delete().eq("id", agendaId);
    fetchAll();
  }

  async function deleteDecision(decisionId: string) {
    await supabase.from("decisions").delete().eq("id", decisionId);
    fetchAll();
  }

  async function deleteActionItem(actionId: string) {
    await supabase.from("action_items").delete().eq("id", actionId);
    fetchAll();
  }

  if (!meeting) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Meeting Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {meeting.title}
            </h1>
            {meeting.description && (
              <p className="text-gray-600 mt-1">{meeting.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {format(new Date(meeting.date), "PPp")}
              </span>
              {meeting.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {meeting.location}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {meeting.status !== "completed" && (
              <button
                onClick={() => updateStatus("completed")}
                className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700"
              >
                Mark Complete
              </button>
            )}
            {meeting.status === "scheduled" && (
              <button
                onClick={() => updateStatus("in_progress")}
                className="bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-yellow-600"
              >
                Start Meeting
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Attendees */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Attendees ({attendees.filter((a) => a.attended).length}/
          {attendees.length})
        </h2>
        {attendees.length === 0 ? (
          <p className="text-sm text-gray-500">No attendees added.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {attendees.map((attendee) => (
              <label
                key={attendee.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={attendee.attended}
                  onChange={() =>
                    toggleAttendance(attendee.id, attendee.attended)
                  }
                  className="rounded border-gray-300"
                />
                <span
                  className={`text-sm ${attendee.attended ? "text-gray-900" : "text-gray-500"}`}
                >
                  {attendee.person?.name}
                </span>
                <span className="text-xs text-gray-400">
                  {attendee.person?.email}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Agenda */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Agenda</h2>

        <div className="space-y-3 mb-4">
          {agendaItems.map((item, index) => (
            <div
              key={item.id}
              className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">
                    {index + 1}.
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {item.title}
                  </span>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-600 mt-1 ml-6">
                    {item.description}
                  </p>
                )}
                {item.document_url && (
                  <a
                    href={item.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-1 ml-6"
                  >
                    <FileText size={14} />
                    {item.document_name}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer text-gray-400 hover:text-blue-600">
                  <Upload size={16} />
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, item.id)}
                    disabled={uploading}
                  />
                </label>
                <button
                  onClick={() => deleteAgendaItem(item.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={addAgendaItem} className="flex gap-2">
          <input
            type="text"
            value={newAgendaTitle}
            onChange={(e) => setNewAgendaTitle(e.target.value)}
            placeholder="Agenda item title"
            required
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={newAgendaDescription}
            onChange={(e) => setNewAgendaDescription(e.target.value)}
            placeholder="Description (optional)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
          </button>
        </form>
      </div>

      {/* Decisions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Decisions</h2>

        <div className="space-y-2 mb-4">
          {decisions.map((decision) => (
            <div
              key={decision.id}
              className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
            >
              <span className="text-sm text-gray-900">
                {decision.description}
              </span>
              <button
                onClick={() => deleteDecision(decision.id)}
                className="text-gray-400 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {decisions.length === 0 && (
            <p className="text-sm text-gray-500">No decisions recorded yet.</p>
          )}
        </div>

        <form onSubmit={addDecision} className="flex gap-2">
          <input
            type="text"
            value={newDecision}
            onChange={(e) => setNewDecision(e.target.value)}
            placeholder="Record a decision..."
            required
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700"
          >
            <Plus size={18} />
          </button>
        </form>
      </div>

      {/* Action Items */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Action Items
        </h2>

        <div className="space-y-3 mb-4">
          {actionItems.map((action) => (
            <div
              key={action.id}
              className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1">
                <button
                  onClick={() => toggleActionStatus(action.id, action.status)}
                >
                  {action.status === "completed" ? (
                    <CheckCircle size={20} className="text-green-600" />
                  ) : (
                    <Circle size={20} className="text-gray-400" />
                  )}
                </button>
                <div>
                  <p
                    className={`text-sm ${action.status === "completed" ? "line-through text-gray-500" : "text-gray-900"}`}
                  >
                    {action.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    {action.person && (
                      <span className="text-xs text-gray-500">
                        Assigned to: {action.person.name}
                      </span>
                    )}
                    {action.due_date && (
                      <span className="text-xs text-gray-500">
                        Due: {format(new Date(action.due_date), "PP")}
                      </span>
                    )}
                    {action.email_sent && (
                      <span className="text-xs text-green-600">
                        Email sent
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {action.person && !action.email_sent && (
                  <button
                    onClick={() => sendEmailNotification(action)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
                    title="Send email notification"
                  >
                    <Send size={14} />
                    Notify
                  </button>
                )}
                <button
                  onClick={() => deleteActionItem(action.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {actionItems.length === 0 && (
            <p className="text-sm text-gray-500">
              No action items yet.
            </p>
          )}
        </div>

        <form onSubmit={addActionItem} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newActionDescription}
              onChange={(e) => setNewActionDescription(e.target.value)}
              placeholder="Describe the action item..."
              required
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={newActionAssignee}
              onChange={(e) => setNewActionAssignee(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Assign to...</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} ({person.email})
                </option>
              ))}
            </select>
            <input
              type="date"
              value={newActionDueDate}
              onChange={(e) => setNewActionDueDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm"
            >
              Add Action
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
