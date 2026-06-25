"use client";

import { useMemo } from "react";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function daysInMonth(month: number, year: number) {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
}

interface DateTimePickerProps {
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
  onDayChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
  onHourChange: (v: string) => void;
  onMinuteChange: (v: string) => void;
}

export default function DateTimePicker({
  day, month, year, hour, minute,
  onDayChange, onMonthChange, onYearChange, onHourChange, onMinuteChange,
}: DateTimePickerProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 2 + i);
  const maxDays = daysInMonth(Number(month), Number(year));
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);

  const dayOfWeek = useMemo(() => {
    if (day && month && year) {
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      if (!isNaN(d.getTime())) return dayNames[d.getDay()];
    }
    return "";
  }, [day, month, year]);

  const sel = "border border-gray-300 rounded-lg px-2 py-2 text-sm";

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
        <div className="flex items-center gap-2">
          <select value={day} onChange={(e) => onDayChange(e.target.value)} className={sel} required>
            <option value="">Day</option>
            {days.map((d) => (
              <option key={d} value={String(d)}>{d}</option>
            ))}
          </select>
          <select value={month} onChange={(e) => onMonthChange(e.target.value)} className={sel} required>
            <option value="">Month</option>
            {months.map((m, i) => (
              <option key={m} value={String(i + 1)}>{m}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => onYearChange(e.target.value)} className={sel} required>
            <option value="">Year</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
          {dayOfWeek && (
            <span className="text-sm font-semibold text-blue-600 ml-1">{dayOfWeek}</span>
          )}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
        <div className="flex items-center gap-2">
          <select value={hour} onChange={(e) => onHourChange(e.target.value)} className={sel}>
            <option value="">Hour</option>
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={String(i).padStart(2, "0")}>
                {String(i).padStart(2, "0")}
              </option>
            ))}
          </select>
          <span className="text-gray-500 font-bold">:</span>
          <select value={minute} onChange={(e) => onMinuteChange(e.target.value)} className={sel}>
            <option value="">Min</option>
            {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
              <option key={m} value={String(m).padStart(2, "0")}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export function buildISODate(day: string, month: string, year: string, hour: string, minute: string): string {
  const m = month.padStart(2, "0");
  const d = day.padStart(2, "0");
  const h = hour || "00";
  const min = minute || "00";
  return new Date(`${year}-${m}-${d}T${h}:${min}`).toISOString();
}

export function parseDateParts(isoDate: string) {
  const dt = new Date(isoDate);
  const offset = dt.getTimezoneOffset();
  const local = new Date(dt.getTime() - offset * 60000);
  const iso = local.toISOString();
  return {
    day: String(local.getDate()),
    month: String(local.getMonth() + 1),
    year: String(local.getFullYear()),
    hour: iso.slice(11, 13),
    minute: iso.slice(14, 16),
  };
}
