import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { to, attendeeName, meeting, agendaItems } = await request.json();

  if (!to || !meeting?.title) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const dateStr = new Date(meeting.date).toLocaleString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const metaRows = [
    ["Date &amp; Time", dateStr],
    meeting.location ? ["Location", meeting.location] : null,
    meeting.department ? ["Department / Organisation", meeting.department] : null,
    meeting.requestedByName ? ["Requested By", meeting.requestedByName] : null,
  ]
    .filter(Boolean)
    .map(
      (r) =>
        `<tr>
          <td style="padding:5px 20px 5px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;">${r![0]}</td>
          <td style="padding:5px 0;font-size:13px;font-weight:600;">${r![1]}</td>
        </tr>`
    )
    .join("");

  const agendaSection =
    agendaItems?.length > 0
      ? `<div style="padding:18px 32px;background:#fff;border:1px solid #e2e8f0;border-top:none;">
          <h3 style="margin:0 0 10px;color:#1e3a5f;font-size:14px;font-weight:700;border-bottom:1px solid #f1f5f9;padding-bottom:8px;">Agenda</h3>
          <ol style="margin:0;padding-left:20px;">
            ${agendaItems
              .map(
                (item: { title: string; description?: string | null }) =>
                  `<li style="font-size:13px;padding:5px 0;">
                    <strong>${item.title}</strong>
                    ${item.description ? `<br><span style="color:#6b7280;">${item.description}</span>` : ""}
                  </li>`
              )
              .join("")}
          </ol>
        </div>`
      : "";

  const html = `
<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#1a1a1a;">
  <div style="background:#bfdbfe;padding:24px 32px;border-radius:8px 8px 0 0;">
    <p style="margin:0 0 4px;color:#1e40af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Meeting Invitation</p>
    <h1 style="margin:0;color:#1e3a5f;font-size:22px;font-weight:700;">${meeting.title}</h1>
  </div>

  <div style="padding:20px 32px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;">
    <p style="margin:0 0 14px;font-size:14px;">Dear <strong>${attendeeName}</strong>,</p>
    <p style="margin:0 0 14px;font-size:14px;">You are invited to attend the following meeting:</p>
    <table style="border-collapse:collapse;">${metaRows}</table>
    ${meeting.description ? `<p style="margin:12px 0 0;font-size:13px;color:#374151;font-style:italic;">${meeting.description}</p>` : ""}
  </div>

  ${agendaSection}

  <div style="padding:14px 32px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
    <p style="margin:0;color:#9ca3af;font-size:11px;">This is an automated invitation from the Dheyma Global Ventures Meeting Management System.</p>
  </div>
</div>`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "Meeting Manager <noreply@dheymabhutan.com>",
      to: [to],
      subject: `Meeting Invitation: ${meeting.title}`,
      html,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
