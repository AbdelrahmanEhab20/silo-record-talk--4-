import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageBreak, Footer, Header,
} from 'npm:docx@9';

// ── Palette ────────────────────────────────────────────────────
const C = {
  BLACK:    "000000",
  DARK:     "1A1A1A",
  MID:      "404040",
  LIGHT:    "767676",
  RULE:     "D0D0D0",
  OFFWHITE: "F9F9F9",
  WHITE:    "FFFFFF",
  ACCENT:   "003366",
  ACCENT2:  "005B99",
  POSITIVE: "1A5C38",
  NEG:      "8B0000",
};

const BODY_FONT = "Calibri";
const HEAD_FONT = "Calibri";

// ── Language detection ─────────────────────────────────────────
function isArabicText(text) {
  if (!text) return false;
  const arabicChars = (String(text).match(/[\u0600-\u06FF]/g) || []).length;
  const totalChars = String(text).replace(/\s/g, '').length;
  return totalChars > 0 && arabicChars / totalChars > 0.3;
}

// ── Primitives (with RTL support) ─────────────────────────────

const rule = () => new Paragraph({
  children: [new TextRun({ text: "" })],
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.RULE } },
  spacing: { before: 0, after: 0 },
});

const spacer = (before = 120, after = 0) =>
  new Paragraph({ children: [new TextRun({ text: "" })], spacing: { before, after } });

const sectionHead = (text, rtl = false) => new Paragraph({
  children: [new TextRun({ text, font: HEAD_FONT, size: 18, bold: true, color: C.ACCENT, allCaps: !rtl, characterSpacing: rtl ? 0 : 40 })],
  alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
  spacing: { before: 400, after: 140 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.ACCENT } },
  bidirectional: rtl,
});

const subHead = (text, rtl = false) => new Paragraph({
  children: [new TextRun({ text, font: HEAD_FONT, size: 22, bold: true, color: C.DARK })],
  alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
  spacing: { before: 180, after: 80 },
  bidirectional: rtl,
});

const body = (text, opts = {}) => {
  const rtl = opts.rtl || false;
  return new Paragraph({
    children: [new TextRun({ text: String(text || ''), font: BODY_FONT, size: 20, color: opts.color || C.DARK, rtl })],
    alignment: rtl ? AlignmentType.RIGHT : AlignmentType.JUSTIFIED,
    spacing: { before: 80, after: 80 },
    indent: opts.indent ? { left: opts.indent } : undefined,
    bidirectional: rtl,
  });
};

const bullet = (text, rtl = false) => new Paragraph({
  children: rtl
    ? [
        new TextRun({ text: String(text || ''), font: BODY_FONT, size: 20, color: C.DARK, rtl: true }),
        new TextRun({ text: "  \u2013", font: BODY_FONT, size: 20, color: C.ACCENT, bold: true }),
      ]
    : [
        new TextRun({ text: "\u2013  ", font: BODY_FONT, size: 20, color: C.ACCENT, bold: true }),
        new TextRun({ text: String(text || ''), font: BODY_FONT, size: 20, color: C.DARK }),
      ],
  alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
  spacing: { before: 80, after: 80 },
  indent: rtl ? { right: 360 } : { left: 360, hanging: 360 },
  bidirectional: rtl,
});

const numbered = (n, text, rtl = false) => new Paragraph({
  children: rtl
    ? [
        new TextRun({ text: String(text || ''), font: BODY_FONT, size: 20, color: C.DARK, rtl: true }),
        new TextRun({ text: `   .${n}`, font: BODY_FONT, size: 20, bold: true, color: C.ACCENT }),
      ]
    : [
        new TextRun({ text: `${n}.   `, font: BODY_FONT, size: 20, bold: true, color: C.ACCENT }),
        new TextRun({ text: String(text || ''), font: BODY_FONT, size: 20, color: C.DARK }),
      ],
  alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
  spacing: { before: 80, after: 80 },
  indent: rtl ? { right: 480 } : { left: 480, hanging: 480 },
  bidirectional: rtl,
});

// ── Table helpers ──────────────────────────────────────────────

const cell = (text, { fill, color, bold, italic, width, align } = {}) =>
  new TableCell({
    width: { size: width || 2340, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 100, bottom: 100, left: 160, right: 160 },
    verticalAlign: VerticalAlign.CENTER,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: C.RULE },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: C.RULE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
    children: [new Paragraph({
      alignment: align || AlignmentType.LEFT,
      children: [new TextRun({
        text: String(text || ""),
        font: BODY_FONT, size: 18,
        bold: bold || false,
        italic: italic || false,
        color: color || C.DARK,
      })],
    })],
  });

const hdrRow = (labels, widths) =>
  new TableRow({
    tableHeader: true,
    children: labels.map((lbl, i) =>
      new TableCell({
        width: { size: widths[i], type: WidthType.DXA },
        shading: { fill: C.ACCENT, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        verticalAlign: VerticalAlign.CENTER,
        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        children: [new Paragraph({
          children: [new TextRun({ text: lbl, font: BODY_FONT, size: 18, bold: true, color: C.WHITE, allCaps: true, characterSpacing: 20 })],
        })],
      })
    ),
  });

const dataRow = (vals, widths, alt = false) =>
  new TableRow({
    children: vals.map((v, i) =>
      cell(v, { fill: alt ? C.OFFWHITE : C.WHITE, width: widths[i] })
    ),
  });

const makeTable = (labels, widths, rows) =>
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    borders: {
      insideH: { style: BorderStyle.SINGLE, size: 2, color: C.RULE },
      insideV: { style: BorderStyle.NONE },
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
    rows: [hdrRow(labels, widths), ...rows.map((r, i) => dataRow(r, widths, i % 2 !== 0))],
  });

// ── Colored divider for discussion sections ────────────────────
const discussionDivider = () => new Paragraph({
  children: [new TextRun({ text: "" })],
  border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.RULE } },
  spacing: { before: 120, after: 0 },
});

// ── Summary parser ─────────────────────────────────────────────
function parseSummary(text) {
  if (!text) return null;
  try { return typeof text === "string" ? JSON.parse(text) : text; }
  catch { return null; }
}

// ── Document builder ──────────────────────────────────────────
function buildDoc(session, user) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const ref = `MTG-${now.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const sum = parseSummary(session.summary_text);
  const transcript = session.transcript_text || "";

  // Detect language from title or executive summary
  const sampleText = session.title + ' ' + (Array.isArray(sum?.executive_summary) ? sum.executive_summary.join(' ') : (sum?.executive_summary || ''));
  const rtl = isArabicText(sampleText);
  const textAlign = rtl ? AlignmentType.RIGHT : AlignmentType.LEFT;

  const meetingType    = sum?.meeting_type || "Meeting";
  const attendees      = sum?.attendees || session.calendar_attendees || [];
  // Support both array of strings and array of objects {name, role, sample_quote}
  const attendeeNames  = attendees.map(a => (typeof a === 'object' && a !== null) ? (a.name || String(a)) : String(a));
  const keyDiscussions = sum?.key_discussions || [];
  const decisions      = sum?.decisions || [];
  const actionItems    = sum?.action_items || [];
  const risks          = sum?.risks || sum?.risks_issues || [];
  const nextSteps      = sum?.next_steps || [];
  const insights       = sum?.ai_insights || [];
  const location       = session.calendar_event_location || "Not specified";
  const chair          = session.calendar_attendees?.[0] || "Not specified";
  const eventDate      = session.calendar_event_date
    ? new Date(session.calendar_event_date).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })
    : dateStr;
  const execSummary    = sum?.executive_summary || [];

  const children = [];

  // ── CONFIDENTIAL BAR ──────────────────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "CONFIDENTIAL", font: HEAD_FONT, size: 16, bold: true, color: C.WHITE, allCaps: true, characterSpacing: 80 })],
      alignment: AlignmentType.RIGHT,
      shading: { fill: C.ACCENT, type: ShadingType.CLEAR },
      spacing: { before: 0, after: 0 },
    })
  );

  children.push(spacer(360));

  // ── TITLE ─────────────────────────────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: session.title || "Meeting Minutes", font: HEAD_FONT, size: 56, bold: true, color: C.BLACK, rtl })],
      alignment: textAlign,
      spacing: { before: 0, after: 100 },
      bidirectional: rtl,
    })
  );

  children.push(
    new Paragraph({
      children: [new TextRun({ text: rtl ? meetingType : meetingType.toUpperCase(), font: HEAD_FONT, size: 22, bold: false, color: C.ACCENT, allCaps: !rtl, characterSpacing: rtl ? 0 : 60 })],
      alignment: textAlign,
      spacing: { before: 0, after: 280 },
      bidirectional: rtl,
    })
  );

  children.push(rule());
  children.push(spacer(180));

  // ── META TABLE ────────────────────────────────────────────
  const metaLines = [
    ["Date", eventDate],
    ["Location / Platform", location],
    ["Chaired By", chair],
    ["Prepared By", user?.full_name || "Not specified"],
    ["Reference", ref],
    ["Status", "Draft — For Review"],
  ];
  const metaW = [2200, 7160];
  children.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: metaW,
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideH: { style: BorderStyle.SINGLE, size: 2, color: C.RULE }, insideV: { style: BorderStyle.NONE } },
      rows: metaLines.map(([k, v]) =>
        new TableRow({ children: [
          new TableCell({ width: { size: metaW[0], type: WidthType.DXA }, margins: { top: 90, bottom: 90, left: 0, right: 120 }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, size: 2, color: C.RULE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [new Paragraph({ children: [new TextRun({ text: k, font: BODY_FONT, size: 18, bold: true, color: C.LIGHT, allCaps: true, characterSpacing: 20 })] })] }),
          new TableCell({ width: { size: metaW[1], type: WidthType.DXA }, margins: { top: 90, bottom: 90, left: 120, right: 0 }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, size: 2, color: C.RULE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [new Paragraph({ children: [new TextRun({ text: String(v || ''), font: BODY_FONT, size: 18, color: C.DARK })] })] }),
        ]})
      ),
    })
  );

  children.push(spacer(360));

  // ── DISTRIBUTION ──────────────────────────────────────────
  if (attendeeNames.length) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Distribution: ", font: BODY_FONT, size: 18, bold: true, color: C.LIGHT, allCaps: true, characterSpacing: 20 }),
          new TextRun({ text: attendeeNames.join("  |  "), font: BODY_FONT, size: 18, color: C.DARK }),
        ],
        alignment: textAlign,
        spacing: { before: 0, after: 0 },
        bidirectional: rtl,
      })
    );
  }

  children.push(spacer(520));

  // ── EXECUTIVE SUMMARY ─────────────────────────────────────
  if (execSummary.length) {
    children.push(sectionHead("Executive Summary", rtl));
    children.push(spacer(80));
    const summaryParagraph = Array.isArray(execSummary) ? execSummary.join(" ") : String(execSummary);
    children.push(body(summaryParagraph, { rtl }));
    children.push(spacer(80));
  }

  // ── KEY DISCUSSIONS ───────────────────────────────────────
  const agendaItems = keyDiscussions.length
    ? keyDiscussions
    : transcript
      ? [{ title: "General Discussion", points: [transcript.slice(0, 600)] }]
      : [];

  if (agendaItems.length) {
    children.push(sectionHead("Key Discussions", rtl));
    children.push(spacer(80));

    agendaItems.forEach((item, idx) => {
      // Support both item.title and item.topic (legacy)
      const discussionTitle = item.title || item.topic || (typeof item === 'string' ? item : `Topic ${idx + 1}`);
      const prefix = rtl ? `${idx + 1} .` : `${idx + 1}.`;
      children.push(
        new Paragraph({
          children: rtl
            ? [
                new TextRun({ text: String(discussionTitle), font: HEAD_FONT, size: 22, bold: true, color: C.ACCENT, rtl: true }),
                new TextRun({ text: `  ${prefix}  `, font: HEAD_FONT, size: 22, bold: true, color: C.ACCENT }),
              ]
            : [
                new TextRun({ text: `${prefix}  `, font: HEAD_FONT, size: 22, bold: true, color: C.ACCENT }),
                new TextRun({ text: String(discussionTitle), font: HEAD_FONT, size: 22, bold: true, color: C.DARK }),
              ],
          alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
          spacing: { before: 200, after: 80 },
          bidirectional: rtl,
        })
      );
      const points = Array.isArray(item.points) ? item.points : (item.points ? [item.points] : []);
      points.forEach(pt => {
        if (pt) children.push(bullet(String(pt), rtl));
      });
      if (idx < agendaItems.length - 1) {
        children.push(discussionDivider());
      }
    });
    children.push(spacer(80));
  }

  // ── DECISIONS ─────────────────────────────────────────────
  if (decisions.length) {
    children.push(sectionHead("Decisions & Agreements", rtl));
    children.push(spacer(80));
    decisions.forEach((d, i) => children.push(numbered(i + 1, String(d), rtl)));
    children.push(spacer(80));
  }

  // ── RISKS ─────────────────────────────────────────────────
  if (risks.length) {
    children.push(sectionHead("Risks & Issues", rtl));
    children.push(spacer(80));
    risks.forEach(r => children.push(bullet(String(r), rtl)));
    children.push(spacer(80));
  }

  // ── NEXT STEPS ────────────────────────────────────────────
  if (nextSteps.length) {
    children.push(sectionHead("Next Steps", rtl));
    children.push(spacer(80));
    nextSteps.forEach((s, i) => children.push(numbered(i + 1, String(s), rtl)));
    children.push(spacer(80));
  }

  // ── AI INSIGHTS ───────────────────────────────────────────
  if (insights.length) {
    children.push(sectionHead("AI Insights", rtl));
    children.push(spacer(80));
    insights.forEach(ins => children.push(bullet(String(ins), rtl)));
    children.push(spacer(80));
  }

  // ── PAGE BREAK → ACTION REGISTER ──────────────────────────
  children.push(new Paragraph({ children: [new PageBreak()] }));

  children.push(
    new Paragraph({
      children: [new TextRun({ text: rtl ? "سجل الإجراءات" : "Action Register", font: HEAD_FONT, size: 40, bold: true, color: C.BLACK, rtl })],
      alignment: textAlign,
      spacing: { before: 0, after: 100 },
      bidirectional: rtl,
    }),
    rule(),
    spacer(180),
  );

  const actRows = actionItems.length
    ? actionItems
    : [{ task: "No actions recorded", owner: "—", priority: "—", deadline: "—", status: "—" }];

  const actW = [640, 3520, 1600, 1000, 1200, 1400];
  children.push(
    makeTable(
      ["Ref", "Action", "Owner", "Priority", "Deadline", "Status"],
      actW,
      actRows.map((a, i) => [
        `A-${String(i + 1).padStart(2, "0")}`,
        a.task || a.action || String(a),
        a.owner || "TBC",
        a.priority || "Medium",
        a.deadline || "TBD",
        a.status || "Open",
      ])
    ),
    spacer(360),
  );

  // ── DECISIONS LOG ─────────────────────────────────────────
  if (decisions.length) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: rtl ? "سجل القرارات" : "Decisions Log", font: HEAD_FONT, size: 32, bold: true, color: C.BLACK, rtl })],
        alignment: textAlign,
        spacing: { before: 360, after: 100 },
        bidirectional: rtl,
      }),
      rule(),
      spacer(180),
    );
    const decW = [900, 5160, 1800, 1500];
    children.push(
      makeTable(
        ["Ref", "Decision", "Agreed By", "Date"],
        decW,
        decisions.map((d, i) => [`D-${String(i + 1).padStart(2, "0")}`, String(d), String(chair), dateStr])
      ),
      spacer(360),
    );
  }

  // ── SIGNATURE BLOCK ───────────────────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: rtl ? "توقيع" : "Sign-off", font: HEAD_FONT, size: 32, bold: true, color: C.BLACK, rtl })],
      alignment: textAlign,
      spacing: { before: 360, after: 100 },
      bidirectional: rtl,
    }),
    rule(),
    spacer(180),
  );
  const sigW = [3120, 3120, 3120];
  children.push(
    makeTable(
      ["Prepared By", "Reviewed By", "Approved By"],
      sigW,
      [
        [user?.full_name || "[Name]", "[Name]", "[Name]"],
        ["[Title]", "[Title]", "[Title]"],
        ["Signed: _______________", "Signed: _______________", "Signed: _______________"],
        [`Date: ${dateStr}`, "Date: ___________", "Date: ___________"],
      ]
    )
  );

  // ── DOCUMENT ──────────────────────────────────────────────
  return new Document({
    styles: {
      default: {
        document: {
          run: { font: BODY_FONT, size: 20, color: C.DARK },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
        ...(rtl ? { bidi: true } : {}),
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `${session.title || "Meeting Minutes"}`, font: BODY_FONT, size: 16, color: C.LIGHT }),
                new TextRun({ text: `   |   ${ref}   |   CONFIDENTIAL`, font: BODY_FONT, size: 16, color: C.LIGHT }),
              ],
              alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.RULE } },
              spacing: { after: 60 },
              bidirectional: rtl,
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Generated by SILO", font: BODY_FONT, size: 16, color: C.LIGHT }),
                new TextRun({ text: `   |   ${dateStr}`, font: BODY_FONT, size: 16, color: C.LIGHT }),
              ],
              alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.RULE } },
              spacing: { before: 60 },
              bidirectional: rtl,
            }),
          ],
        }),
      },
      children,
    }],
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await req.json();
    if (!sessionId) return Response.json({ error: "sessionId required" }, { status: 400 });

    const session = await base44.entities.Session.get(sessionId);
    if (!session || session.user_email !== user.email) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    const doc = buildDoc(session, user);
    const buffer = await Packer.toBuffer(doc);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    const slug = (session.title || "Meeting").replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_").slice(0, 30);
    const date = new Date(session.created_date).toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `SILO_${date}_${slug}.docx`;

    return Response.json({ base64, filename });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});