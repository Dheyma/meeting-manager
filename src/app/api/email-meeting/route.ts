import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

interface AttendeeInfo {
  name: string;
  email: string | null;
  organization?: string | null;
}

interface AgendaItemInfo {
  title: string;
  description?: string | null;
}

interface DecisionInfo {
  description: string;
}

interface ActionItemInfo {
  description: string;
  personName?: string | null;
  dueDate?: string | null;
  status: string;
}

interface MeetingInfo {
  title: string;
  date: string;
  location?: string | null;
  department?: string | null;
  description?: string | null;
  status: string;
  requestedByName?: string | null;
  transcribedByName?: string | null;
}

function buildEmailHtml(
  meeting: MeetingInfo,
  attendees: AttendeeInfo[],
  agendaItems: AgendaItemInfo[],
  decisions: DecisionInfo[],
  actionItems: ActionItemInfo[]
): string {
  const dateStr = new Date(meeting.date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const metaRows = [
    ["Date &amp; Time", dateStr],
    meeting.location ? ["Location", meeting.location] : null,
    meeting.department ? ["Department", meeting.department] : null,
    meeting.requestedByName ? ["Requested By", meeting.requestedByName] : null,
    meeting.transcribedByName ? ["Transcribed By", meeting.transcribedByName] : null,
    ["Status", meeting.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())],
  ]
    .filter(Boolean)
    .map(
      (r) =>
        `<tr>
          <td style="padding:4px 16px 4px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;">${r![0]}</td>
          <td style="padding:4px 0;font-size:13px;">${r![1]}</td>
        </tr>`
    )
    .join("");

  const attendeeList =
    attendees.length > 0
      ? `<ol style="margin:0;padding-left:20px;">
          ${attendees
            .map(
              (a) =>
                `<li style="font-size:13px;padding:3px 0;">${a.name}${a.organization ? `, <span style="color:#6b7280;">${a.organization}</span>` : ""}</li>`
            )
            .join("")}
        </ol>`
      : `<p style="color:#9ca3af;font-size:13px;margin:0;">No attendees recorded.</p>`;

  const agendaSection =
    agendaItems.length > 0
      ? `<div style="padding:20px 32px;background:#fff;border:1px solid #e2e8f0;border-top:none;">
          <h3 style="margin:0 0 10px;color:#1e3a5f;font-size:14px;font-weight:700;border-bottom:1px solid #f1f5f9;padding-bottom:8px;">Agenda</h3>
          <ol style="margin:0;padding-left:20px;">
            ${agendaItems
              .map(
                (item) =>
                  `<li style="font-size:13px;padding:5px 0;">
                    <strong>${item.title}</strong>
                    ${item.description ? `<br><span style="color:#6b7280;">${item.description}</span>` : ""}
                  </li>`
              )
              .join("")}
          </ol>
        </div>`
      : "";

  const decisionsSection =
    decisions.length > 0
      ? `<div style="padding:20px 32px;background:#fff;border:1px solid #e2e8f0;border-top:none;">
          <h3 style="margin:0 0 10px;color:#166534;font-size:14px;font-weight:700;border-bottom:1px solid #f1f5f9;padding-bottom:8px;">Decisions Made</h3>
          <ol style="margin:0;padding-left:20px;">
            ${decisions
              .map(
                (d) =>
                  `<li style="font-size:13px;padding:4px 0;">${d.description}</li>`
              )
              .join("")}
          </ol>
        </div>`
      : "";

  const actionSection =
    actionItems.length > 0
      ? `<div style="padding:20px 32px;background:#fff;border:1px solid #e2e8f0;border-top:none;">
          <h3 style="margin:0 0 10px;color:#92400e;font-size:14px;font-weight:700;border-bottom:1px solid #f1f5f9;padding-bottom:8px;">Action Items</h3>
          <ol style="margin:0;padding-left:20px;">
            ${actionItems
              .map(
                (a) =>
                  `<li style="font-size:13px;padding:5px 0;">
                    <span${a.status === "completed" ? ' style="text-decoration:line-through;color:#9ca3af;"' : ""}>${a.description}</span>
                    <div style="color:#6b7280;font-size:12px;margin-top:2px;">
                      ${[
                        a.personName ? `Assigned to: <strong>${a.personName}</strong>` : "",
                        a.dueDate ? `Due: ${new Date(a.dueDate).toLocaleDateString("en-GB")}` : "",
                        a.status === "completed" ? '<span style="color:#16a34a;">&#10003; Completed</span>' : "",
                      ]
                        .filter(Boolean)
                        .join(" &bull; ")}
                    </div>
                  </li>`
              )
              .join("")}
          </ol>
        </div>`
      : "";

  return `
<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#1a1a1a;">
  <div style="background:#bfdbfe;padding:24px 32px;border-radius:8px 8px 0 0;">
    <p style="margin:0 0 4px;color:#1e40af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Meeting Records</p>
    <h1 style="margin:0;color:#1e3a5f;font-size:22px;font-weight:700;">${meeting.title}</h1>
  </div>

  <div style="padding:20px 32px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;">
    <table style="border-collapse:collapse;">${metaRows}</table>
    ${meeting.description ? `<p style="margin:12px 0 0;font-size:13px;color:#374151;font-style:italic;">${meeting.description}</p>` : ""}
  </div>

  <div style="padding:20px 32px;background:#fff;border:1px solid #e2e8f0;border-top:none;">
    <h3 style="margin:0 0 10px;color:#1e3a5f;font-size:14px;font-weight:700;border-bottom:1px solid #f1f5f9;padding-bottom:8px;">Attendees</h3>
    ${attendeeList}
  </div>

  ${agendaSection}
  ${decisionsSection}
  ${actionSection}

  <div style="padding:14px 32px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
    <p style="margin:0;color:#9ca3af;font-size:11px;">This is an automated email from the Dheyma Global Ventures Meeting Management System.</p>
  </div>
</div>`;
}

export async function POST(request: NextRequest) {
  const { meeting, attendees, agendaItems, decisions, actionItems } =
    await request.json();

  const recipients = (attendees as AttendeeInfo[]).filter(
    (a) => a.email && a.email.trim() !== ""
  );

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "None of the attendees have an email address on record." },
      { status: 400 }
    );
  }

  const html = buildEmailHtml(meeting, attendees, agendaItems, decisions, actionItems);

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "Meeting Manager <noreply@dheymabhutan.com>",
      to: recipients.map((r) => r.email as string),
      subject: `Meeting Records: ${meeting.title}`,
      html,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      sent: recipients.length,
      skipped: (attendees as AttendeeInfo[]).length - recipients.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
