"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Meeting } from "@/lib/types";
import Link from "next/link";
import { Plus, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);

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
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .order("date", { ascending: false });
    if (error) {
      toast.error("Failed to load meetings");
      return;
    }
    setMeetings(data || []);
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

      <div className="space-y-4">
        {meetings.map((meeting) => (
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
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[meeting.status]}`}
              >
                {meeting.status.replace("_", " ")}
              </span>
            </div>
          </Link>
        ))}
        {meetings.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No meetings yet. Create your first meeting to get started.
          </div>
        )}
      </div>
    </div>
  );
}
