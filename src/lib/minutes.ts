import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ImageRun,
  BorderStyle,
  ShadingType,
  Footer,
  PageNumber,
  IParagraphOptions,
  IRunOptions,
} from "docx";
import { Meeting, MeetingAttendee, AgendaItem, Decision, ActionItem, Person } from "@/lib/types";

// Minutes of Meeting (MoM) Word template — format approved 2026-10-06.
// Header: logo, company, title · details table · Attendees · Agenda & Discussion
// · Decisions · Action Items · Recorded/Approved by · footer with "Page X of Y".

const GOLD = "B8860B";
const DARK = "1F2937";
const GREY = "6B7280";
const SHADE = "F5EFE0";
const FONT = "Calibri";

export interface MinutesInput {
  meeting: Meeting;
  attendees: MeetingAttendee[];
  agendaItems: AgendaItem[];
  decisions: Decision[];
  actionItems: ActionItem[];
  people: Person[];
  logoUrl: string;
}

// Meetings are stored in UTC; minutes are written in Bhutan time (UTC+6).
function toBhutan(iso: string) {
  return new Date(new Date(iso).getTime() + 6 * 3600e3);
}

function onlineLabel(link: string, hasVenue: boolean) {
  const host = link.toLowerCase();
  const name = host.includes("zoom") ? "Zoom" : host.includes("meet.google") ? "Google Meet" : host.includes("teams") ? "Microsoft Teams" : "Online";
  return hasVenue ? `${name} (hybrid)` : name;
}

const t = (text: string, o: Partial<IRunOptions> = {}) => new TextRun({ text, font: FONT, size: 22, ...o });
const p = (children: TextRun[], o: Partial<IParagraphOptions> = {}) =>
  new Paragraph({ children, spacing: { after: 80 }, ...o });

const heading = (text: string) =>
  new Paragraph({
    children: [t(text.toUpperCase(), { bold: true, size: 24, color: GOLD })],
    spacing: { before: 280, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 2 } },
  });

function cell(text: string, { label = false, header = false, width }: { label?: boolean; header?: boolean; width?: number } = {}) {
  return new TableCell({
    children: [p([t(text, { bold: label || header, color: header ? "FFFFFF" : DARK, size: 20 })], { spacing: { after: 0 } })],
    shading: header
      ? { type: ShadingType.CLEAR, fill: GOLD, color: "auto" }
      : label
        ? { type: ShadingType.CLEAR, fill: SHADE, color: "auto" }
        : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
  });
}

const table = (rows: TableRow[]) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

export function minutesFileName(meeting: Meeting) {
  const d = toBhutan(meeting.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  const title = meeting.title.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ");
  return `MoM - ${title} - ${d}.docx`;
}

export async function buildMinutesDocx({ meeting, attendees, agendaItems, decisions, actionItems, people, logoUrl }: MinutesInput) {
  const logo = await fetch(logoUrl).then((r) => r.arrayBuffer());
  const personById = (id?: string) => people.find((x) => x.id === id);
  const requester = personById(meeting.requested_by);
  const recorder = personById(meeting.transcribed_by);

  const when = toBhutan(meeting.date);
  const dateStr = when.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const timeStr = when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  const fmtDue = (s?: string) =>
    s ? new Date(s.slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "—";

  const details: [string, string][] = [
    ["Meeting", meeting.title.trim()],
    ["Purpose", meeting.description?.trim() || "—"],
    ["Date", dateStr],
    ["Time", `${timeStr} (BTT)`],
    ["Venue", meeting.location || "—"],
    ["Online link", meeting.remote_link ? onlineLabel(meeting.remote_link, !!meeting.location) : "—"],
    ["Department / Project", meeting.department || "—"],
    ["Requested by", requester?.name ?? "—"],
  ];

  const agenda = [...agendaItems].sort((a, b) => a.sort_order - b.sort_order);
  const agendaBlocks = agenda.flatMap((a, i) => [
    p([t(`${i + 1}.  ${a.title}`, { bold: true })], { spacing: { before: 120, after: 40 } }),
    ...(a.description ? [p([t(a.description, { italics: true, color: GREY })], { indent: { left: 360 } })] : []),
    ...decisions
      .filter((d) => d.agenda_item_id === a.id)
      .map((d) => p([t("Decision: ", { bold: true }), t(d.description)], { indent: { left: 360 } })),
  ]);
  const generalDecisions = decisions
    .filter((d) => !d.agenda_item_id || !agenda.some((a) => a.id === d.agenda_item_id))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const actions = [...actionItems].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const footerRun = (o: Partial<IRunOptions>) => new TextRun({ font: FONT, size: 16, color: GREY, ...o });

  const doc = new Document({
    creator: "Dheyma MMS",
    title: `Minutes of Meeting – ${meeting.title.trim()}`,
    sections: [
      {
        properties: { page: { margin: { top: 900, bottom: 900, left: 1100, right: 1100 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 6 } },
                children: [
                  footerRun({ text: "Dheyma Global Ventures Pvt. Ltd.  •  Minutes of Meeting  •  Page " }),
                  footerRun({ children: [PageNumber.CURRENT] }),
                  footerRun({ text: " of " }),
                  footerRun({ children: [PageNumber.TOTAL_PAGES] }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({ type: "png", data: logo, transformation: { width: 90, height: 90 } })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
            children: [t("Dheyma Global Ventures Pvt. Ltd.", { bold: true, size: 30, color: DARK })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [t("MINUTES OF MEETING", { bold: true, size: 26, color: GOLD, characterSpacing: 40 })],
          }),

          table(details.map(([k, v]) => new TableRow({ children: [cell(k, { label: true, width: 28 }), cell(v, { width: 72 })] }))),

          heading("Attendees"),
          table([
            new TableRow({ tableHeader: true, children: ["#", "Name", "Designation", "Organisation"].map((h) => cell(h, { header: true })) }),
            ...attendees.map(
              (a, i) =>
                new TableRow({
                  children: [cell(String(i + 1)), cell(a.person?.name ?? "—"), cell(a.person?.designation || "—"), cell(a.person?.organization || "—")],
                })
            ),
          ]),

          ...(agendaBlocks.length ? [heading("Agenda & Discussion"), ...agendaBlocks] : []),

          ...(generalDecisions.length
            ? [
                heading("Decisions"),
                ...generalDecisions.map((d, i) =>
                  p([t(`${i + 1}.  `, { bold: true }), t(d.description)], { indent: { left: 360, hanging: 360 } })
                ),
              ]
            : []),

          ...(actions.length
            ? [
                heading("Action Items"),
                table([
                  new TableRow({ tableHeader: true, children: ["#", "Action", "Responsible", "Due date"].map((h) => cell(h, { header: true })) }),
                  ...actions.map(
                    (a, i) =>
                      new TableRow({
                        children: [
                          cell(String(i + 1), { width: 5 }),
                          cell(a.description.trim(), { width: 55 }),
                          cell(a.person?.name ?? "Unassigned", { width: 25 }),
                          cell(fmtDue(a.due_date), { width: 15 }),
                        ],
                      })
                  ),
                ]),
              ]
            : []),

          new Paragraph({ spacing: { before: 600 }, children: [] }),
          table([
            new TableRow({
              children: [
                new TableCell({
                  borders: noBorders,
                  children: [
                    p([t("Recorded by", { bold: true, color: GOLD })]),
                    p([t(recorder?.name ?? "")]),
                    p([t(recorder?.designation ?? "", { color: GREY })]),
                  ],
                }),
                new TableCell({
                  borders: noBorders,
                  children: [
                    p([t("Approved by", { bold: true, color: GOLD })]),
                    p([t("______________________________")]),
                    p([t("Name / Signature / Date", { color: GREY })]),
                  ],
                }),
              ],
            }),
          ]),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Minimal typings for the File System Access API (Chrome/Edge desktop only).
interface WritableFile { write: (b: Blob) => Promise<void>; close: () => Promise<void> }
interface FileHandle { createWritable: () => Promise<WritableFile> }
interface DirHandle {
  name: string;
  getFileHandle: (name: string, o?: { create?: boolean }) => Promise<FileHandle>;
  queryPermission: (o: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission: (o: { mode: "readwrite" }) => Promise<PermissionState>;
}
type DirPicker = (o?: { id?: string; mode?: "readwrite" }) => Promise<DirHandle>;

const pickDir = () => (window as unknown as { showDirectoryPicker?: DirPicker }).showDirectoryPicker;
export const canPickFolder = () => typeof window !== "undefined" && !!pickDir();

// Phones/tablets get the share sheet (WhatsApp); desktops save a file. iPadOS reports a Mac user agent.
export const isMobileDevice = () =>
  typeof navigator !== "undefined" &&
  (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

export const isSafari = () =>
  typeof navigator !== "undefined" && /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edg|CriOS|FxiOS/.test(navigator.userAgent);

// The chosen folder is remembered per browser in IndexedDB (handles can't go in localStorage).
const DB = "mms-minutes", STORE = "kv", KEY = "folder";
function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  return new Promise((resolve) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => resolve(undefined);
    open.onsuccess = () => {
      const req = fn(open.result.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => resolve(undefined);
    };
  });
}
export async function getSavedFolder(): Promise<DirHandle | undefined> {
  try { return await idb<DirHandle>("readonly", (s) => s.get(KEY)); } catch { return undefined; }
}

// Ask the user to choose the folder minutes are saved into. Returns the folder name, or null if cancelled.
export async function chooseFolder(): Promise<DirHandle | null> {
  const picker = pickDir();
  if (!picker) return null;
  try {
    const dir = await picker({ id: "mms-minutes", mode: "readwrite" });
    await idb("readwrite", (s) => s.put(dir, KEY));
    return dir;
  } catch (err) {
    if ((err as Error).name === "AbortError") return null;
    throw err;
  }
}

async function uniqueName(dir: DirHandle, fileName: string) {
  const dot = fileName.lastIndexOf(".");
  const base = fileName.slice(0, dot), ext = fileName.slice(dot);
  for (let n = 1; ; n++) {
    const name = n === 1 ? fileName : `${base} (${n})${ext}`;
    try { await dir.getFileHandle(name); } catch { return name; }
  }
}

export type SaveResult =
  | { kind: "saved"; folder: string; fileName: string }
  | { kind: "shared" | "downloaded" | "cancelled" };

// Desktop Chrome/Edge: save into the user's chosen folder (asked the first time).
// Phones: the share sheet (WhatsApp etc.). Otherwise: a normal download to Downloads.
export async function saveMinutes(blob: Blob, fileName: string): Promise<SaveResult> {
  if (canPickFolder() && !isMobileDevice()) {
    let dir = await getSavedFolder();
    if (dir && (await dir.queryPermission({ mode: "readwrite" })) !== "granted" &&
        (await dir.requestPermission({ mode: "readwrite" })) !== "granted") dir = undefined;
    if (!dir) dir = (await chooseFolder()) ?? undefined;
    if (!dir) return { kind: "cancelled" };
    const name = await uniqueName(dir, fileName);
    const writable = await (await dir.getFileHandle(name, { create: true })).createWritable();
    await writable.write(blob);
    await writable.close();
    return { kind: "saved", folder: dir.name, fileName: name };
  }
  const file = new File([blob], fileName, { type: DOCX_MIME });
  if (isMobileDevice() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return { kind: "shared" };
    } catch (err) {
      if ((err as Error).name === "AbortError") return { kind: "cancelled" };
      throw err;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { kind: "downloaded" };
}
