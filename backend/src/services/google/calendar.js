import { getValidAccessToken } from "./oauth.js";

const API_BASE = "https://www.googleapis.com/calendar/v3";

async function authedRequest(userEmail, path, { method = "GET", query, body } = {}) {
  const token = await getValidAccessToken(userEmail);
  if (!token) {
    const err = new Error("Google Calendar not connected");
    err.code = "not_connected";
    throw err;
  }
  let url = `${API_BASE}${path}`;
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
    const message = data?.error?.message || data?.error_description || text || res.statusText;
    const err = new Error(`Google Calendar API error ${res.status}: ${message}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function listUpcomingEvents(userEmail, { maxResults = 25, daysAhead = 14 } = {}) {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
  const data = await authedRequest(userEmail, "/calendars/primary/events", {
    query: {
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults,
    },
  });
  return (data.items || []).map((ev) => ({
    id: ev.id,
    summary: ev.summary || "(no title)",
    description: ev.description || "",
    location: ev.location || "",
    start: ev.start?.dateTime || ev.start?.date || null,
    end: ev.end?.dateTime || ev.end?.date || null,
    timeZone: ev.start?.timeZone || ev.end?.timeZone || null,
    html_link: ev.htmlLink,
    attendees: ev.attendees || [],
    status: ev.status,
  }));
}

export async function createEvent(userEmail, event) {
  if (!event?.summary) throw new Error("event.summary is required");
  if (!event?.start) throw new Error("event.start is required");
  if (!event?.end) throw new Error("event.end is required");
  const created = await authedRequest(userEmail, "/calendars/primary/events", {
    method: "POST",
    body: event,
  });
  return {
    id: created.id,
    html_link: created.htmlLink,
    status: created.status,
    start: created.start,
    end: created.end,
    summary: created.summary,
  };
}
