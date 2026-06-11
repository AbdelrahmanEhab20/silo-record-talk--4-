import { getValidAccessToken } from "./oauth.js";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

async function authedRequest(userEmail, path, { method = "GET", query, body, headers } = {}) {
  const token = await getValidAccessToken(userEmail);
  if (!token) {
    const err = new Error("Outlook not connected");
    err.code = "not_connected";
    throw err;
  }
  let url = `${GRAPH_BASE}${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v != null) params.set(k, String(v));
    });
    url += `?${params.toString()}`;
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.error_description || text || res.statusText;
    const err = new Error(`Microsoft Graph error ${res.status}: ${msg}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Normalise a Graph event into the same shape we use for Google events. */
function normaliseEvent(ev) {
  return {
    id: ev.id,
    summary: ev.subject || "(no title)",
    description: ev.bodyPreview || ev.body?.content || "",
    location: ev.location?.displayName || "",
    start: ev.start?.dateTime ? `${ev.start.dateTime}${ev.start.dateTime.endsWith("Z") ? "" : "Z"}` : null,
    end: ev.end?.dateTime ? `${ev.end.dateTime}${ev.end.dateTime.endsWith("Z") ? "" : "Z"}` : null,
    timeZone: ev.start?.timeZone || null,
    html_link: ev.webLink,
    attendees: (ev.attendees || []).map((a) => ({
      email: a.emailAddress?.address,
      displayName: a.emailAddress?.name,
      responseStatus: a.status?.response,
    })),
    status: ev.showAs || ev.responseStatus?.response || null,
    provider: "outlook",
  };
}

export async function listUpcomingEvents(userEmail, { daysAhead = 14, maxResults = 25 } = {}) {
  const startDateTime = new Date().toISOString();
  const endDateTime = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
  const data = await authedRequest(userEmail, "/me/calendarView", {
    query: {
      startDateTime,
      endDateTime,
      $orderby: "start/dateTime",
      $top: maxResults,
      $select: "id,subject,bodyPreview,location,start,end,webLink,attendees,showAs,responseStatus",
    },
    headers: { Prefer: 'outlook.timezone="UTC"' },
  });
  return (data.value || []).map(normaliseEvent);
}

/**
 * Accepts the same Google-shaped event payload used elsewhere
 * ({ summary, description, start: { dateTime, timeZone }, end, ... }) and maps
 * it to Microsoft Graph's event schema.
 */
export async function createEvent(userEmail, event) {
  if (!event?.summary) throw new Error("event.summary is required");
  if (!event?.start?.dateTime || !event?.end?.dateTime) {
    throw new Error("event.start.dateTime and event.end.dateTime are required");
  }
  const tz = event.start.timeZone || event.end.timeZone || "UTC";
  const payload = {
    subject: event.summary,
    body: { contentType: "HTML", content: event.description || "" },
    start: { dateTime: event.start.dateTime, timeZone: tz },
    end: { dateTime: event.end.dateTime, timeZone: event.end.timeZone || tz },
    ...(event.location ? { location: { displayName: event.location } } : {}),
    ...(Array.isArray(event.attendees) && event.attendees.length
      ? {
          attendees: event.attendees.map((a) => ({
            emailAddress: { address: a.email, name: a.displayName || a.name },
            type: "required",
          })),
        }
      : {}),
    ...(event.reminders?.overrides?.[0]?.minutes != null
      ? { reminderMinutesBeforeStart: event.reminders.overrides[0].minutes, isReminderOn: true }
      : {}),
  };
  const created = await authedRequest(userEmail, "/me/events", { method: "POST", body: payload });
  return normaliseEvent(created);
}
