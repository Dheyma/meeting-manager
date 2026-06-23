"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Person } from "@/lib/types";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");

  useEffect(() => {
    fetchPeople();

    const channel = supabase
      .channel("people-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "people" }, () => {
        fetchPeople();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchPeople() {
    const { data, error } = await supabase
      .from("people")
      .select("*")
      .order("name");
    if (error) {
      toast.error("Failed to load people");
      return;
    }
    setPeople(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase
      .from("people")
      .insert({ name, email, organization: organization || null });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Person added");
    setName("");
    setEmail("");
    setOrganization("");
    setShowForm(false);
    fetchPeople();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("people").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Person removed");
    fetchPeople();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">People</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Person
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-lg p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                Name
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                Email
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                Organization
              </th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {people.map((person) => (
              <tr key={person.id}>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {person.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {person.email}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {person.organization || "—"}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(person.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {people.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  No people added yet. Click &quot;Add Person&quot; to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
