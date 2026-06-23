"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Meeting } from "@/lib/types";
import { CalendarDays, Users, ClipboardList, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";

export default function Home() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    fetchMeetings();

    const channel = supabase
      .channel("dashboard-meetings")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, () => {
        fetchMeetings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchMeetings() {
    const { data } = await supabase
      .from("meetings")
      .select("*")
      .order("date", { ascending: false });
    setMeetings(data || []);
  }

  function getMeetingsForDay(day: Date) {
    return meetings.filter((m) => isSameDay(new Date(m.date), day));
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">
        Manage your meetings, track attendance, and follow up on action items.
      </p>

      <div className="flex gap-8">
        {/* Calendar */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 w-96 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayMeetings = getMeetingsForDay(day);
              const hasScheduled = dayMeetings.some((m) => m.status === "scheduled" || m.status === "in_progress");
              const hasCompleted = dayMeetings.some((m) => m.status === "completed");
              const hasCancelled = dayMeetings.some((m) => m.status === "cancelled");

              let bgColor = "";
              if (hasCompleted && hasScheduled) bgColor = "bg-gradient-to-br from-green-200 to-blue-200";
              else if (hasCompleted) bgColor = "bg-green-200";
              else if (hasScheduled) bgColor = "bg-blue-200";
              else if (hasCancelled) bgColor = "bg-red-100";

              return (
                <div
                  key={day.toISOString()}
                  className={`
                    relative text-center py-2 text-sm rounded-lg cursor-default
                    ${!isSameMonth(day, currentMonth) ? "text-gray-300" : "text-gray-700"}
                    ${isToday(day) ? "ring-2 ring-blue-500 font-bold" : ""}
                    ${bgColor}
                  `}
                  title={
                    dayMeetings.length > 0
                      ? dayMeetings.map((m) => `${m.title} (${m.status})`).join(", ")
                      : undefined
                  }
                >
                  {format(day, "d")}
                  {dayMeetings.length > 0 && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayMeetings.slice(0, 3).map((m) => (
                        <span
                          key={m.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            m.status === "completed"
                              ? "bg-green-600"
                              : m.status === "cancelled"
                                ? "bg-red-500"
                                : "bg-blue-600"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-200" />
              Scheduled
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-200" />
              Completed
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-100" />
              Cancelled
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/meetings/new"
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <CalendarDays className="text-blue-600 mb-3" size={32} />
              <h3 className="font-semibold text-gray-900">New Meeting</h3>
              <p className="text-sm text-gray-500 mt-1">
                Schedule and set up a new meeting
              </p>
            </Link>

            <Link
              href="/meetings"
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <ClipboardList className="text-green-600 mb-3" size={32} />
              <h3 className="font-semibold text-gray-900">All Meetings</h3>
              <p className="text-sm text-gray-500 mt-1">
                View and manage all meetings
              </p>
            </Link>

            <Link
              href="/people"
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <Users className="text-purple-600 mb-3" size={32} />
              <h3 className="font-semibold text-gray-900">People</h3>
              <p className="text-sm text-gray-500 mt-1">
                Manage contacts and attendees
              </p>
            </Link>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <CheckCircle className="text-orange-600 mb-3" size={32} />
              <h3 className="font-semibold text-gray-900">Action Items</h3>
              <p className="text-sm text-gray-500 mt-1">
                Track follow-ups and decisions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
