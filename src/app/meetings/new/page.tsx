"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Person } from "@/lib/types";
import toast from "react-hot-toast";
import DateTimePicker, { buildISODate } from "@/components/DateTimePicker";
import { useDepartments } from "@/hooks/useDepartments";
import { logAction } from "@/lib/log";
import { Plus, Trash2, FileText, Upload, X } from "lucide-react";

interface DraftAgendaItem {
  title: string;
  description: string;
}

export default function NewMeetingPage() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [otherDepartment, setOtherDepartment] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const { allDepartments, addDepartment } = useDepartments();
  const [requestedBy, setRequestedBy] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);

  // Background document
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);

  // Agenda document
  const [agendaFile, setAgendaFile] = useState<File | null>(null);

  // Typed agenda items
  const [agendaItems, setAgendaItems] = useState<DraftAgendaItem[]>([]);
  const [agendaItemTitle, setAgendaItemTitle] = useState("");
  const [agendaItemDescription, setAgendaItemDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchPeople() {
      const { data } = await supabase.from("people").select("*").order("name");
      setPeople(data || []);
    }
    fetchPeople();

    const channel = supabase
      .channel("new-meeting-people")
      .on("postgres_changes", { event: "*", schema: "public", table: "people" }, () => {
        fetchPeople();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function addAgendaItem() {
    if (!agendaItemTitle.trim()) return;
    setAgendaItems((prev) => [...prev, { title: agendaItemTitle.trim(), description: agendaItemDescription.trim() }]);
    setAgendaItemTitle("");
    setAgendaItemDescription("");
  }

  function removeAgendaItem(index: number) {
    setAgendaItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadFile(file: File): Promise<{ url: string; name: string } | null> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/MMS/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Upload failed");
      return null;
    }
    return { url: data.url, name: data.name };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: meeting, error } = await supabase
        .from("meetings")
        .insert({
          title,
          description: description || null,
          date: buildISODate(day, month, year, hour, minute),
          location: location || null,
          department: department === "Others" ? (otherDepartment || "Others") :
                     department === "__add_new__" ? (newDeptName.trim() || null) :
                     (department || null),
          requested_by: requestedBy || null,
        })
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        return;
      }

      // Attendees
      if (selectedAttendees.length > 0) {
        await supabase.from("meeting_attendees").insert(
          selectedAttendees.map((personId) => ({ meeting_id: meeting.id, person_id: personId }))
        );
      }

      // Background document upload
      if (backgroundFile) {
        const result = await uploadFile(backgroundFile);
        if (result) {
          await supabase
            .from("meetings")
            .update({ background_document_url: result.url, background_document_name: result.name })
            .eq("id", meeting.id);
        }
      }

      // Agenda document upload
      if (agendaFile) {
        const result = await uploadFile(agendaFile);
        if (result) {
          await supabase
            .from("meetings")
            .update({ agenda_document_url: result.url, agenda_document_name: result.name })
            .eq("id", meeting.id);
        }
      }

      // Agenda items
      if (agendaItems.length > 0) {
        await supabase.from("agenda_items").insert(
          agendaItems.map((item, i) => ({
            meeting_id: meeting.id,
            title: item.title,
            description: item.description || null,
            sort_order: i,
          }))
        );
      }

      await logAction("Created meeting", "meeting", title);
      toast.success("Meeting created");
      router.push(`/meetings/${meeting.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleAttendee(personId: string) {
    setSelectedAttendees((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Meeting</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-lg p-6 space-y-6"
      >
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="e.g. Weekly Team Standup"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            rows={3}
            placeholder="Brief description of the meeting"
          />
        </div>

        {/* Date/Time + Location/Department */}
        <div className="grid grid-cols-2 gap-6">
          <DateTimePicker
            day={day} month={month} year={year} hour={hour} minute={minute}
            onDayChange={setDay} onMonthChange={setMonth} onYearChange={setYear}
            onHourChange={setHour} onMinuteChange={setMinute}
          />
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="e.g. Conference Room A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department / Organisation</label>
              <select
                value={department}
                onChange={(e) => { setDepartment(e.target.value); setNewDeptName(""); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select department...</option>
                {allDepartments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
                <option value="__add_new__">+ Add new Department</option>
              </select>
              {department === "Others" && (
                <input
                  type="text"
                  value={otherDepartment}
                  onChange={(e) => setOtherDepartment(e.target.value)}
                  placeholder="Please specify..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2"
                />
              )}
              {department === "__add_new__" && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="Enter new department name..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await addDepartment(newDeptName);
                      if (ok) {
                        setDepartment(newDeptName.trim());
                        setNewDeptName("");
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
          </div>
        </div>

        {/* Requested By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Requested By</label>
          <select
            value={requestedBy}
            onChange={(e) => setRequestedBy(e.target.value)}
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

        {/* Attendees */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Attendees</label>
          {people.length === 0 ? (
            <p className="text-sm text-gray-500">No people added yet. Add people from the People page first.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {people.map((person) => (
                <label
                  key={person.id}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedAttendees.includes(person.id)}
                    onChange={() => toggleAttendee(person.id)}
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

        {/* Background Document */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Background Document</label>
          {backgroundFile ? (
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <FileText size={16} className="text-blue-600 shrink-0" />
              <span className="text-sm text-gray-700 flex-1 truncate">{backgroundFile.name}</span>
              <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer hover:text-gray-700 border border-gray-300 rounded px-2 py-1 shrink-0">
                <Upload size={12} />
                Change
                <input type="file" className="hidden" onChange={(e) => setBackgroundFile(e.target.files?.[0] || null)} />
              </label>
              <button type="button" onClick={() => setBackgroundFile(null)} className="text-gray-400 hover:text-red-600 shrink-0">
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 w-fit cursor-pointer text-sm text-blue-600 hover:text-blue-800 border border-blue-300 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-2">
              <Upload size={15} />
              Upload Background Document
              <input type="file" className="hidden" onChange={(e) => setBackgroundFile(e.target.files?.[0] || null)} />
            </label>
          )}
        </div>

        {/* Agenda Document */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Agenda Document</label>
          {agendaFile ? (
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <FileText size={16} className="text-blue-600 shrink-0" />
              <span className="text-sm text-gray-700 flex-1 truncate">{agendaFile.name}</span>
              <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer hover:text-gray-700 border border-gray-300 rounded px-2 py-1 shrink-0">
                <Upload size={12} />
                Change
                <input type="file" className="hidden" onChange={(e) => setAgendaFile(e.target.files?.[0] || null)} />
              </label>
              <button type="button" onClick={() => setAgendaFile(null)} className="text-gray-400 hover:text-red-600 shrink-0">
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 w-fit cursor-pointer text-sm text-blue-600 hover:text-blue-800 border border-blue-300 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-2">
              <Upload size={15} />
              Upload Agenda Document
              <input type="file" className="hidden" onChange={(e) => setAgendaFile(e.target.files?.[0] || null)} />
            </label>
          )}
        </div>

        {/* Agenda Items */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Agenda Items</label>
          {agendaItems.length > 0 && (
            <div className="space-y-2 mb-3">
              {agendaItems.map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-400 mt-0.5 shrink-0">{index + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAgendaItem(index)}
                    className="text-gray-400 hover:text-red-600 shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={agendaItemTitle}
              onChange={(e) => setAgendaItemTitle(e.target.value)}
              placeholder="Agenda item title"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAgendaItem(); } }}
            />
            <input
              type="text"
              value={agendaItemDescription}
              onChange={(e) => setAgendaItemDescription(e.target.value)}
              placeholder="Description (optional)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAgendaItem(); } }}
            />
            <button
              type="button"
              onClick={addAgendaItem}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create Meeting"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
