/**
 * Silo DOCX export — UAE Ministry template layout
 * Uses the docx package to build professional meeting minutes
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, HeadingLevel, ShadingType,
  PageBreak, Header, Footer, PageNumber, NumberFormat,
  convertInchesToTwip, UnderlineType, VerticalAlign,
} from "docx";

const COLORS = {
  gold: "B8860B",
  darkGold: "8B6914",
  navy: "1B2A4A",
  lightGray: "F5F5F5",
  midGray: "E0E0E0",
  darkGray: "666666",
  white: "FFFFFF",
  black: "000000",
  accent: "2C5282",
};

function borderDef(color = COLORS.midGray, size = 4) {
  return { style: BorderStyle.SINGLE, size, color };
}

function noBorder() {
  return { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
}

function cell(text, opts = {}) {
  const {
    bold = false, color = COLORS.black, bgColor, colSpan = 1, rowSpan = 1,
    align = AlignmentType.LEFT, fontSize = 20, width, italic = false,
  } = opts;
  return new TableCell({
    columnSpan: colSpan,
    rowSpan,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: bgColor ? { type: ShadingType.CLEAR, fill: bgColor } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    borders: {
      top: borderDef(COLORS.midGray, 4),
      bottom: borderDef(COLORS.midGray, 4),
      left: borderDef(COLORS.midGray, 4),
      right: borderDef(COLORS.midGray, 4),
    },
    children: [new Paragraph({
      alignment: align,
      spacing: { before: 60, after: 60 },
      children: [new TextRun({ text: String(text || ""), bold, color, size: fontSize, italics: italic, font: "Calibri" })],
    })],
  });
}

function headerCell(text, opts = {}) {
  return cell(text, { bold: true, bgColor: COLORS.navy, color: COLORS.white, fontSize: 20, ...opts });
}

function sectionHeading(text, level = 1) {
  const sizes = { 1: 32, 2: 26, 3: 24 };
  return new Paragraph({
    spacing: { before: 300, after: 120 },
    children: [new TextRun({
      text,
      bold: true,
      size: sizes[level] || 24,
      color: COLORS.navy,
      font: "Calibri",
      underline: level === 1 ? { type: UnderlineType.SINGLE, color: COLORS.gold } : undefined,
    })],
  });
}

function bodyParagraph(text, opts = {}) {
  const { bold = false, indent = false, bullet = false } = opts;
  return new Paragraph({
    indent: indent ? { left: convertInchesToTwip(0.3) } : undefined,
    spacing: { before: 60, after: 60 },
    bullet: bullet ? { level: 0 } : undefined,
    children: [new TextRun({ text: String(text || ""), bold, size: 20, font: "Calibri", color: COLORS.black })],
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.gold } },
    children: [],
  });
}

function emptyLine(count = 1) {
  return Array.from({ length: count }, () => new Paragraph({ children: [new TextRun("")] }));
}

export async function generateSiloDocx({ report, folderName, sessions, generatedAt }) {
  const dateStr = generatedAt ? new Date(generatedAt).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Derive venue/location from sessions if available
  const location = sessions?.find(s => s.calendar_event_location)?.calendar_event_location || "Silo AI — Meeting Intelligence";

  // ─── Cover / Title Block ───────────────────────────────────────────────
  const titleBlock = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [new TextRun({ text: "SILO AI — MEETING INTELLIGENCE", bold: true, size: 20, color: COLORS.darkGray, font: "Calibri" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 180 },
      children: [new TextRun({ text: "", size: 6, font: "Calibri" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [new TextRun({ text: "SESSION MINUTES", bold: true, size: 52, color: COLORS.navy, font: "Calibri" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [new TextRun({ text: folderName, bold: true, size: 36, color: COLORS.gold, font: "Calibri" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [new TextRun({ text: report.overall_objective || "", size: 22, italics: true, color: COLORS.darkGray, font: "Calibri" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 240 },
      children: [new TextRun({ text: `${location}  |  ${dateStr}`, size: 20, color: COLORS.darkGray, font: "Calibri" })],
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.gold } },
      spacing: { before: 0, after: 240 },
      children: [],
    }),
  ];

  // ─── 1. Meeting Details Table ──────────────────────────────────────────
  const sessionTitles = (sessions || []).map(s => s.title || "Untitled").join("; ");
  const detailRows = [
    ["SESSION TITLE", folderName],
    ["DATE", dateStr],
    ["SESSIONS COVERED", `${(sessions || []).length} session(s): ${sessionTitles}`],
    ["VENUE / PLATFORM", location],
    ["ORGANISED BY", "Silo AI — Meeting Intelligence Platform"],
    ["SESSION FORMAT", report.session_format || `${(sessions || []).length} recorded session(s) consolidated into a unified report`],
    ["PREPARED BY", "Silo AI"],
    ["STATUS", "AI GENERATED — FOR REVIEW"],
    ["CLASSIFICATION", "CONFIDENTIAL"],
  ];

  const detailsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: detailRows.map(([label, value]) =>
      new TableRow({
        children: [
          cell(label, { bold: true, bgColor: COLORS.lightGray, width: 3200, fontSize: 20 }),
          cell(value, { width: 7200, fontSize: 20 }),
        ],
      })
    ),
  });

  // ─── 2. Attendees (from calendar data or sessions) ─────────────────────
  const attendees = [...new Set((sessions || []).flatMap(s => s.calendar_attendees || []))];
  const attendeeBlock = [];
  if (attendees.length > 0) {
    attendeeBlock.push(sectionHeading("2.  Attendees", 2));
    attendees.forEach(a => attendeeBlock.push(bodyParagraph(a, { bullet: true })));
  }

  // ─── 3. Executive Summary ──────────────────────────────────────────────
  const execBlock = [
    sectionHeading("3.  Executive Summary", 2),
    bodyParagraph(report.executive_summary || ""),
    ...emptyLine(1),
  ];
  if (report.overall_objective) {
    execBlock.push(bodyParagraph(`Objective: ${report.overall_objective}`, { bold: true }));
  }

  // ─── 4. Session Agenda ─────────────────────────────────────────────────
  const agendaBlock = [sectionHeading("4.  Session Agenda", 2)];
  if (report.agenda && report.agenda.length > 0) {
    const agendaTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell("Session", { width: 2000 }),
            headerCell("Date / Time", { width: 2500 }),
            headerCell("Topic", { width: 3500 }),
            headerCell("Duration", { width: 1500 }),
          ],
        }),
        ...report.agenda.map(a => new TableRow({
          children: [
            cell(a.session || "", { width: 2000 }),
            cell(a.time || "", { width: 2500 }),
            cell(a.topic || "", { width: 3500 }),
            cell(a.duration || "", { width: 1500 }),
          ],
        })),
      ],
    });
    agendaBlock.push(agendaTable);
  } else {
    // Build from sessions
    const sessionAgendaTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell("#", { width: 800 }),
            headerCell("Session Title", { width: 5000 }),
            headerCell("Date", { width: 2500 }),
            headerCell("Duration", { width: 1500 }),
          ],
        }),
        ...(sessions || []).map((s, i) => new TableRow({
          children: [
            cell(String(i + 1), { width: 800, align: AlignmentType.CENTER }),
            cell(s.title || `Session ${i + 1}`, { width: 5000 }),
            cell(s.created_date ? new Date(s.created_date).toLocaleDateString() : "", { width: 2500 }),
            cell(s.duration ? `${Math.round(s.duration / 60)} min` : "", { width: 1500 }),
          ],
        })),
      ],
    });
    agendaBlock.push(sessionAgendaTable);
  }
  agendaBlock.push(...emptyLine(1));

  // ─── 5. Key Discussions ────────────────────────────────────────────────
  const discussionBlock = [sectionHeading("5.  Key Discussions", 2)];
  (report.discussion_topics || []).forEach((t, i) => {
    discussionBlock.push(
      new Paragraph({
        spacing: { before: 180, after: 80 },
        children: [new TextRun({ text: `Discussion Topic ${i + 1}: ${t.topic}`, bold: true, size: 24, color: COLORS.accent, font: "Calibri" })],
      }),
      bodyParagraph(t.description || ""),
    );
    if (t.key_points && t.key_points.length > 0) {
      t.key_points.forEach(kp => discussionBlock.push(bodyParagraph(kp, { bullet: true, indent: true })));
    }
    if (t.speakers_involved && t.speakers_involved.length > 0) {
      discussionBlock.push(bodyParagraph(`Participants: ${t.speakers_involved.join(", ")}`, { italic: true }));
    }
  });

  // ─── 6. Decisions & Agreements ────────────────────────────────────────
  const decisionsBlock = [divider(), sectionHeading("6.  Decisions & Agreements", 2)];
  if ((report.decisions || []).length > 0) {
    const decTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell("#", { width: 800 }),
            headerCell("Decision / Agreement", { width: 7000 }),
            headerCell("Status", { width: 2000 }),
          ],
        }),
        ...(report.decisions || []).map((d, i) => new TableRow({
          children: [
            cell(String(i + 1), { width: 800, align: AlignmentType.CENTER }),
            cell(d, { width: 7000 }),
            cell("Agreed", { width: 2000, color: "1A6B2A" }),
          ],
        })),
      ],
    });
    decisionsBlock.push(decTable);
  }
  decisionsBlock.push(...emptyLine(1));

  // ─── 7. Action Items ──────────────────────────────────────────────────
  const actionsBlock = [divider(), sectionHeading("7.  Action Items & Next Steps", 2)];
  if ((report.action_items || []).length > 0) {
    const actionTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell("#", { width: 600 }),
            headerCell("Action Item", { width: 5000 }),
            headerCell("Owner / Responsible", { width: 2500 }),
            headerCell("Target Date", { width: 1700 }),
          ],
        }),
        ...(report.action_items || []).map((a, i) => new TableRow({
          children: [
            cell(String(i + 1), { width: 600, align: AlignmentType.CENTER }),
            cell(a.task || "", { width: 5000 }),
            cell(a.owner || "TBD", { width: 2500 }),
            cell(a.due || "TBD", { width: 1700 }),
          ],
        })),
      ],
    });
    actionsBlock.push(actionTable);
  }
  actionsBlock.push(...emptyLine(1));

  // ─── 8. Key Outcomes ──────────────────────────────────────────────────
  const outcomesBlock = [divider(), sectionHeading("8.  Key Outcomes", 2)];
  (report.key_outcomes || []).forEach(o => outcomesBlock.push(bodyParagraph(o, { bullet: true })));
  outcomesBlock.push(...emptyLine(1));

  // ─── 9. Full Minutes per Session ──────────────────────────────────────
  const minutesBlock = [divider(), sectionHeading("9.  Full Meeting Minutes", 2)];
  (report.minutes || []).forEach((m, i) => {
    minutesBlock.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: m.session_label || `Session ${i + 1}`, bold: true, size: 24, color: COLORS.navy, font: "Calibri" })],
      }),
    );
    (m.highlights || []).forEach(h => minutesBlock.push(bodyParagraph(h, { bullet: true })));
    minutesBlock.push(...emptyLine(1));
  });

  // ─── 10. Closing ──────────────────────────────────────────────────────
  const closingBlock = [
    divider(),
    sectionHeading("10.  Closing", 2),
    bodyParagraph(report.closing_remarks || "This report was automatically generated by Silo AI based on the recorded session transcripts. Please review and verify all details before distribution."),
    ...emptyLine(2),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "— End of Report —", italics: true, size: 20, color: COLORS.darkGray, font: "Calibri" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60 },
      children: [new TextRun({ text: `Generated by Silo AI  |  ${new Date().toLocaleString()}`, size: 18, color: COLORS.darkGray, font: "Calibri" })],
    }),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 20 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.25),
            right: convertInchesToTwip(1),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.gold } },
              children: [
                new TextRun({ text: "Silo AI  —  Session Minutes  |  ", size: 16, color: COLORS.darkGray, font: "Calibri" }),
                new TextRun({ text: folderName, size: 16, bold: true, color: COLORS.navy, font: "Calibri" }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.gold } },
              children: [
                new TextRun({ text: "CONFIDENTIAL — ", size: 16, color: COLORS.darkGray, font: "Calibri", bold: true }),
                new TextRun({ text: "Generated by Silo AI  |  Page ", size: 16, color: COLORS.darkGray, font: "Calibri" }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Calibri" }),
                new TextRun({ text: " of ", size: 16, font: "Calibri" }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: "Calibri" }),
              ],
            }),
          ],
        }),
      },
      children: [
        ...titleBlock,
        ...emptyLine(1),
        sectionHeading("1.  Meeting Details", 2),
        detailsTable,
        ...emptyLine(1),
        ...attendeeBlock,
        ...(attendeeBlock.length > 0 ? emptyLine(1) : []),
        ...execBlock,
        ...agendaBlock,
        ...discussionBlock,
        ...decisionsBlock,
        ...actionsBlock,
        ...outcomesBlock,
        ...minutesBlock,
        ...closingBlock,
      ],
    }],
  });

  return await Packer.toBlob(doc);
}