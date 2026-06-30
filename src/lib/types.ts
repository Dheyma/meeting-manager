export interface Person {
  id: string;
  name: string;
  designation?: string;
  email: string;
  phone?: string;
  organization?: string;
  password?: string;
  can_login: boolean;
  created_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  department?: string;
  requested_by?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  agenda_document_url?: string;
  agenda_document_name?: string;
  background_document_url?: string;
  background_document_name?: string;
  transcribed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingAttendee {
  id: string;
  meeting_id: string;
  person_id: string;
  attended: boolean;
  person?: Person;
}

export interface AgendaItem {
  id: string;
  meeting_id: string;
  title: string;
  description?: string;
  document_url?: string;
  document_name?: string;
  sort_order: number;
  created_at: string;
}

export interface Decision {
  id: string;
  meeting_id: string;
  agenda_item_id?: string;
  description: string;
  created_at: string;
}

export interface MeetingDocument {
  id: string;
  meeting_id: string;
  type: "background" | "agenda";
  document_url: string;
  document_name: string;
  created_at: string;
}

export interface ActionItem {
  id: string;
  meeting_id: string;
  decision_id?: string;
  description: string;
  assigned_to?: string;
  due_date?: string;
  status: "pending" | "in_progress" | "completed";
  email_sent: boolean;
  created_at: string;
  updated_at: string;
  person?: Person;
}
