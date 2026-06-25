"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Person } from "@/lib/types";
import toast from "react-hot-toast";
import DateTimePicker, { buildISODate } from "@/components/DateTimePicker";

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
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);

  const departments = [
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
    "Others",
  ];

  useEffect(() => {
    async function fetchPeople() {
      const { data } = await supabase.from("people").select("*").order("name");
      setPeople(data || []);
    }
    fetchPeople();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const { data: meeting, error } = await supabase
      .from("meetings")
      .insert({
        title,
        description: description || null,
        date: buildISODate(day, month, year, hour, minute),
        location: location || null,
        department: department || null,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    if (selectedAttendees.length > 0) {
      const attendees = selectedAttendees.map((personId) => ({
        meeting_id: meeting.id,
        person_id: personId,
      }));
      await supabase.from("meeting_attendees").insert(attendees);
    }

    toast.success("Meeting created");
    router.push(`/meetings/${meeting.id}`);
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="e.g. Weekly Team Standup"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            rows={3}
            placeholder="Brief description of the meeting"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <DateTimePicker
            day={day} month={month} year={year} hour={hour} minute={minute}
            onDayChange={setDay} onMonthChange={setMonth} onYearChange={setYear}
            onHourChange={setHour} onMinuteChange={setMinute}
          />
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="e.g. Conference Room A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department / Organisation
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select department...</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attendees
          </label>
          {people.length === 0 ? (
            <p className="text-sm text-gray-500">
              No people added yet. Add people from the People page first.
            </p>
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
                  <span className="text-sm text-gray-900">{person.name}</span>
                  <span className="text-xs text-gray-500">{person.email}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Meeting
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
