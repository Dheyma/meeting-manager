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
import DateTimePicker, { buildISODate, parseDateParts } from "@/components/DateTimePicker";
import { useDepartments } from "@/hooks/useDepartments";
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
  Pencil,
  X,
  Building2,
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

  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
  const [editingAgendaTitle, setEditingAgendaTitle] = useState("");
  const [editingAgendaDescription, setEditingAgendaDescription] = useState("");

  const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
  const [editingDecisionText, setEditingDecisionText] = useState("");

  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editingActionDescription, setEditingActionDescription] = useState("");
  const [editingActionAssignee, setEditingActionAssignee] = useState("");
  const [editingActionDueDate, setEditingActionDueDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDay, setEditDay] = useState("");
  const [editMonth, setEditMonth] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editHour, setEditHour] = useState("");
  const [editMinute, setEditMinute] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editStatus, setEditStatus] = useState<Meeting["status"]>("scheduled");
  const [editDepartment, setEditDepartment] = useState("");
  const [editOtherDepartment, setEditOtherDepartment] = useState("");
  const [editNewDeptName, setEditNewDeptName] = useState("");
  const { allDepartments, addDepartment } = useDepartments();
  const [editRequestedBy, setEditRequestedBy] = useState("");
  const [editAttendees, setEditAttendees] = useState<string[]>([]);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel(`meeting-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings", filter: `id=eq.${id}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "meeting_attendees", filter: `meeting_id=eq.${id}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "agenda_items", filter: `meeting_id=eq.${id}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "decisions", filter: `meeting_id=eq.${id}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "action_items", filter: `meeting_id=eq.${id}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "people" }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  async function handleBackgroundDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
        .from("meetings")
        .update({ background_document_url: data.url, background_document_name: data.name })
        .eq("id", id);

      toast.success("Background document uploaded");
      fetchAll();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removeBackgroundDoc() {
    await supabase
      .from("meetings")
      .update({ background_document_url: null, background_document_name: null })
      .eq("id", id);
    toast.success("Background document removed");
    fetchAll();
  }

  async function handleAgendaDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
        .from("meetings")
        .update({ agenda_document_url: data.url, agenda_document_name: data.name })
        .eq("id", id);

      toast.success("Agenda document uploaded");
      fetchAll();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removeAgendaDoc() {
    await supabase
      .from("meetings")
      .update({ agenda_document_url: null, agenda_document_name: null })
      .eq("id", id);
    toast.success("Agenda document removed");
    fetchAll();
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

  function openEdit() {
    if (!meeting) return;
    setEditTitle(meeting.title);
    setEditDescription(meeting.description || "");
    const parts = parseDateParts(meeting.date);
    setEditDay(parts.day);
    setEditMonth(parts.month);
    setEditYear(parts.year);
    setEditHour(parts.hour);
    setEditMinute(parts.minute);
    setEditLocation(meeting.location || "");
    const dept = meeting.department || "";
    if (dept && !allDepartments.includes(dept)) {
      setEditDepartment("Others");
      setEditOtherDepartment(dept);
    } else {
      setEditDepartment(dept);
      setEditOtherDepartment("");
    }
    setEditStatus(meeting.status);
    setEditRequestedBy(meeting.requested_by || "");
    setEditAttendees(attendees.map((a) => a.person_id));
    setEditing(true);
  }

  function toggleEditAttendee(personId: string) {
    setEditAttendees((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
    );
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase
      .from("meetings")
      .update({
        title: editTitle,
        description: editDescription || null,
        date: buildISODate(editDay, editMonth, editYear, editHour, editMinute),
        location: editLocation || null,
        department: editDepartment === "Others" ? (editOtherDepartment || "Others") :
                   editDepartment === "__add_new__" ? (editNewDeptName.trim() || null) :
                   (editDepartment || null),
        requested_by: editRequestedBy || null,
        status: editStatus,
      })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    const currentAttendeeIds = attendees.map((a) => a.person_id);
    const toAdd = editAttendees.filter((pid) => !currentAttendeeIds.includes(pid));
    const toRemove = currentAttendeeIds.filter((pid) => !editAttendees.includes(pid));

    if (toRemove.length > 0) {
      await supabase
        .from("meeting_attendees")
        .delete()
        .eq("meeting_id", id)
        .in("person_id", toRemove);
    }
    if (toAdd.length > 0) {
      await supabase.from("meeting_attendees").insert(
        toAdd.map((personId) => ({ meeting_id: id, person_id: personId }))
      );
    }

    setEditing(false);
    toast.success("Meeting updated");
    fetchAll();
  }

  async function deleteAgendaItem(agendaId: string) {
    await supabase.from("agenda_items").delete().eq("id", agendaId);
    fetchAll();
  }

  function startEditAgenda(item: AgendaItem) {
    setEditingAgendaId(item.id);
    setEditingAgendaTitle(item.title);
    setEditingAgendaDescription(item.description || "");
  }

  async function saveEditAgenda(agendaId: string) {
    if (!editingAgendaTitle.trim()) return;
    const { error } = await supabase
      .from("agenda_items")
      .update({ title: editingAgendaTitle.trim(), description: editingAgendaDescription.trim() || null })
      .eq("id", agendaId);
    if (error) { toast.error(error.message); return; }
    setEditingAgendaId(null);
    toast.success("Agenda item updated");
    fetchAll();
  }

  async function deleteDecision(decisionId: string) {
    await supabase.from("decisions").delete().eq("id", decisionId);
    fetchAll();
  }

  function startEditDecision(decision: Decision) {
    setEditingDecisionId(decision.id);
    setEditingDecisionText(decision.description);
  }

  async function saveEditDecision(decisionId: string) {
    if (!editingDecisionText.trim()) return;
    const { error } = await supabase
      .from("decisions")
      .update({ description: editingDecisionText.trim() })
      .eq("id", decisionId);
    if (error) { toast.error(error.message); return; }
    setEditingDecisionId(null);
    toast.success("Decision updated");
    fetchAll();
  }

  async function deleteActionItem(actionId: string) {
    await supabase.from("action_items").delete().eq("id", actionId);
    fetchAll();
  }

  function startEditAction(action: ActionItem) {
    setEditingActionId(action.id);
    setEditingActionDescription(action.description);
    setEditingActionAssignee(action.assigned_to || "");
    setEditingActionDueDate(action.due_date || "");
  }

  async function saveEditAction(actionId: string) {
    if (!editingActionDescription.trim()) return;
    const { error } = await supabase
      .from("action_items")
      .update({
        description: editingActionDescription.trim(),
        assigned_to: editingActionAssignee || null,
        due_date: editingActionDueDate || null,
      })
      .eq("id", actionId);
    if (error) { toast.error(error.message); return; }
    setEditingActionId(null);
    toast.success("Action item updated");
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
            {meeting.requested_by && (() => {
              const requester = people.find((p) => p.id === meeting.requested_by);
              return requester ? (
                <p className="text-sm text-gray-500 mt-2">
                  Requested by: <span className="font-medium text-gray-700">{requester.name}{requester.organization ? `, ${requester.organization}` : ""}</span>
                </p>
              ) : null;
            })()}
          </div>
          <div className="flex gap-2">
            <button
              onClick={openEdit}
              className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-200"
            >
              <Pencil size={14} />
              Edit
            </button>
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

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Meeting</h2>
              <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>
              <DateTimePicker
                day={editDay} month={editMonth} year={editYear} hour={editHour} minute={editMinute}
                onDayChange={setEditDay} onMonthChange={setEditMonth} onYearChange={setEditYear}
                onHourChange={setEditHour} onMinuteChange={setEditMinute}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Meeting["status"])}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department / Organisation</label>
                <select
                  value={editDepartment}
                  onChange={(e) => { setEditDepartment(e.target.value); setEditNewDeptName(""); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select department...</option>
                  {allDepartments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                  <option value="__add_new__">+ Add new Department</option>
                </select>
                {editDepartment === "Others" && (
                  <input
                    type="text"
                    value={editOtherDepartment}
                    onChange={(e) => setEditOtherDepartment(e.target.value)}
                    placeholder="Please specify..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2"
                  />
                )}
                {editDepartment === "__add_new__" && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={editNewDeptName}
                      onChange={(e) => setEditNewDeptName(e.target.value)}
                      placeholder="Enter new department name..."
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await addDepartment(editNewDeptName);
                        if (ok) {
                          setEditDepartment(editNewDeptName.trim());
                          setEditNewDeptName("");
                          toast.success("Department added");
                        } else {
                          toast.error("Could not save department");
                        }
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm shrink-0"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Requested By</label>
                <select
                  value={editRequestedBy}
                  onChange={(e) => setEditRequestedBy(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select person...</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}{person.organization ? `, ${person.organization}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attendees</label>
                {people.length === 0 ? (
                  <p className="text-sm text-gray-500">No people added yet.</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {people.map((person) => (
                      <label
                        key={person.id}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={editAttendees.includes(person.id)}
                          onChange={() => toggleEditAttendee(person.id)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-900">
                          {person.name}{person.organization ? `, ${person.organization}` : ""}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendees */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Attendees
        </h2>
        {attendees.length === 0 ? (
          <p className="text-sm text-gray-500">No attendees added.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {attendees.map((attendee, index) => (
              <div
                key={attendee.id}
                className="flex items-center gap-3 p-2 rounded"
              >
                <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
                <span className="text-sm text-gray-900">
                  {attendee.person?.name}{attendee.person?.organization ? `, ${attendee.person.organization}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Background Document */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Background Document</h2>
        {meeting.background_document_url ? (
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-blue-600 shrink-0" />
            <a
              href={meeting.background_document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex-1 truncate"
            >
              {meeting.background_document_name || "Background Document"}
            </a>
            <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer hover:text-gray-700 border border-gray-300 rounded px-2 py-1">
              <Upload size={13} />
              Replace
              <input type="file" className="hidden" onChange={handleBackgroundDocUpload} disabled={uploading} />
            </label>
            <button
              onClick={removeBackgroundDoc}
              className="text-gray-400 hover:text-red-600"
              title="Remove document"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded-lg px-4 py-3 w-fit">
            <Upload size={16} />
            Upload background document
            <input type="file" className="hidden" onChange={handleBackgroundDocUpload} disabled={uploading} />
          </label>
        )}
      </div>

      {/* Agenda */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Agenda</h2>

        <div className="mb-4">
          {meeting.agenda_document_url ? (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileText size={18} className="text-blue-600 shrink-0" />
              <a
                href={meeting.agenda_document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex-1 truncate"
              >
                {meeting.agenda_document_name || "Agenda Document"}
              </a>
              <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer hover:text-gray-700 border border-gray-300 rounded px-2 py-1">
                <Upload size={13} />
                Replace
                <input type="file" className="hidden" onChange={handleAgendaDocUpload} disabled={uploading} />
              </label>
              <button onClick={removeAgendaDoc} className="text-gray-400 hover:text-red-600" title="Remove">
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded-lg px-4 py-3 w-fit">
              <Upload size={16} />
              Upload agenda document
              <input type="file" className="hidden" onChange={handleAgendaDocUpload} disabled={uploading} />
            </label>
          )}
        </div>

        <div className="space-y-3 mb-4">
          {agendaItems.map((item, index) => (
            <div
              key={item.id}
              className="p-3 bg-gray-50 rounded-lg"
            >
              {editingAgendaId === item.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editingAgendaTitle}
                    onChange={(e) => setEditingAgendaTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={editingAgendaDescription}
                    onChange={(e) => setEditingAgendaDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEditAgenda(item.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingAgendaId(null)}
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">{index + 1}.</span>
                      <span className="text-sm font-medium text-gray-900">{item.title}</span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1 ml-6">{item.description}</p>
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
                    <button
                      onClick={() => startEditAgenda(item)}
                      className="text-gray-400 hover:text-blue-600"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => deleteAgendaItem(item.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
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
          {decisions.map((decision, index) => (
            <div
              key={decision.id}
              className="p-3 bg-green-50 rounded-lg"
            >
              {editingDecisionId === decision.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editingDecisionText}
                    onChange={(e) => setEditingDecisionText(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEditDecision(decision.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingDecisionId(null)}
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-medium text-gray-500">{index + 1}.</span>
                    <span className="text-sm text-gray-900">{decision.description}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditDecision(decision)}
                      className="text-gray-400 hover:text-blue-600"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => deleteDecision(decision.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
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
      <div className="bg-white border border-gray-200 rounded-lg p-6 pb-72">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Action Items
        </h2>

        <div className="space-y-3 mb-4">
          {actionItems.map((action, index) => (
            <div
              key={action.id}
              className="p-3 bg-orange-50 rounded-lg"
            >
              {editingActionId === action.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editingActionDescription}
                    onChange={(e) => setEditingActionDescription(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <select
                      value={editingActionAssignee}
                      onChange={(e) => setEditingActionAssignee(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    >
                      <option value="">Assign to...</option>
                      {people.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}{person.organization ? `, ${person.organization}` : ""}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-600 whitespace-nowrap">Due</span>
                      <input
                        type="date"
                        value={editingActionDueDate}
                        onChange={(e) => setEditingActionDueDate(e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEditAction(action.id)}
                      className="bg-orange-600 text-white px-3 py-1 rounded text-xs hover:bg-orange-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingActionId(null)}
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-sm font-medium text-gray-500">{index + 1}.</span>
                    <button onClick={() => toggleActionStatus(action.id, action.status)}>
                      {action.status === "completed" ? (
                        <CheckCircle size={20} className="text-green-600" />
                      ) : (
                        <Circle size={20} className="text-gray-400" />
                      )}
                    </button>
                    <div>
                      <p className={`text-sm ${action.status === "completed" ? "line-through text-gray-500" : "text-gray-900"}`}>
                        {action.description}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {action.person && (
                          <span className="text-xs text-gray-500">
                            Assigned to: {action.person.name}{action.person.organization ? `, ${action.person.organization}` : ""}
                          </span>
                        )}
                        {action.due_date && (
                          <span className="text-xs text-gray-500">
                            Due: {format(new Date(action.due_date), "dd/MM/yyyy")}
                          </span>
                        )}
                        {action.email_sent && (
                          <span className="text-xs text-green-600">Email sent</span>
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
                      onClick={() => startEditAction(action)}
                      className="text-gray-400 hover:text-blue-600"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => deleteActionItem(action.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {actionItems.length === 0 && (
            <p className="text-sm text-gray-500">No action items yet.</p>
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
                  {person.name}{person.organization ? `, ${person.organization}` : ""}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-gray-600 whitespace-nowrap">To be completed by</span>
              <input
                type="date"
                value={newActionDueDate}
                onChange={(e) => setNewActionDueDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </label>
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
