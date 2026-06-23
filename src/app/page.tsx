import Link from "next/link";
import { CalendarDays, Users, ClipboardList, CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">
        Manage your meetings, track attendance, and follow up on action items.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
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
  );
}
