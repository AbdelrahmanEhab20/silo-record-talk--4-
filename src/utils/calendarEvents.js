/**
 * Cross-provider calendar helpers. We may receive the same meeting from both
 * Google and Outlook (corporate cross-sync, manual mirroring, etc.). Detect
 * and merge them so the UI shows one card with both provider chips.
 */

export const PROVIDER_COLORS = {
  google: "#4285F4",
  outlook: "#0078D4",
};

export const PROVIDER_LABELS = {
  google: "Google",
  outlook: "Outlook",
};

function getStartMs(event) {
  const raw = event.start?.dateTime || event.start?.date || event.start;
  return raw ? new Date(raw).getTime() : 0;
}

function normaliseTitle(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Two events are considered the same meeting if their normalised titles
 *  match AND their start times are within 60 seconds of each other. */
function dedupeKey(event) {
  const start = getStartMs(event);
  // Round to nearest minute so 09:00:00 and 09:00:23 collide.
  const minute = Math.round(start / 60000);
  return `${normaliseTitle(event.summary)}::${minute}`;
}

/** Score how "rich" an event is, so when merging duplicates we prefer the
 *  copy with more useful info (description, attendees, location). */
function eventScore(event) {
  return (
    (event.description ? 1 : 0) +
    (event.location ? 1 : 0) +
    (event.attendees?.length || 0)
  );
}

/**
 * Collapse events that exist on multiple providers into a single event whose
 * `providers` array lists every source. Returns a new array; original events
 * are not mutated.
 */
export function mergeDuplicateEvents(events) {
  if (!Array.isArray(events) || events.length === 0) return [];
  const buckets = new Map();
  for (const ev of events) {
    if (!ev) continue;
    const key = dedupeKey(ev);
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        ...ev,
        providers: [ev.provider].filter(Boolean),
      });
      continue;
    }
    if (ev.provider && !existing.providers.includes(ev.provider)) {
      existing.providers.push(ev.provider);
    }
    if (eventScore(ev) > eventScore(existing)) {
      const providers = existing.providers;
      buckets.set(key, { ...ev, providers });
    }
  }
  return Array.from(buckets.values());
}

/** Filter out events whose provider has been hidden by the user. */
export function filterByVisibleProviders(events, visible) {
  if (!visible) return events;
  return events.filter((ev) => {
    const providers = ev.providers && ev.providers.length ? ev.providers : [ev.provider];
    return providers.some((p) => !p || visible[p] !== false);
  });
}

function getStartEndMs(event) {
  const startRaw = event.start?.dateTime || event.start?.date || event.start;
  const endRaw = event.end?.dateTime || event.end?.date || event.end;
  const start = startRaw ? new Date(startRaw).getTime() : 0;
  const end = endRaw ? new Date(endRaw).getTime() : start;
  return { start, end };
}

function isAllDay(event) {
  return !!event.start?.date && !event.start?.dateTime;
}

function isCancelled(event) {
  const s = String(event.status || "").toLowerCase();
  return s === "cancelled" || s === "canceled";
}

/**
 * Detect time conflicts between events. Two events conflict when their
 * [start, end) intervals overlap and they are different meetings (i.e. they
 * survived the dedup pass). All-day events and cancelled events are skipped
 * because they rarely represent a real scheduling clash.
 *
 * Returns a Map of `eventId -> Array<{id, summary, start, end, providers}>`
 * describing the events each event conflicts with. Events with no conflicts
 * are not present in the map.
 */
export function findConflicts(events) {
  const result = new Map();
  if (!Array.isArray(events) || events.length < 2) return result;

  const normalised = events
    .filter((ev) => ev && !isAllDay(ev) && !isCancelled(ev))
    .map((ev) => {
      const { start, end } = getStartEndMs(ev);
      return { ev, start, end };
    })
    .filter((x) => x.start > 0 && x.end > x.start)
    .sort((a, b) => a.start - b.start);

  for (let i = 0; i < normalised.length; i += 1) {
    const a = normalised[i];
    for (let j = i + 1; j < normalised.length; j += 1) {
      const b = normalised[j];
      if (b.start >= a.end) break; // sorted by start: no further events can overlap with a
      const idA = a.ev.id;
      const idB = b.ev.id;
      if (!idA || !idB || idA === idB) continue;
      const summaryA = { id: idA, summary: a.ev.summary, start: a.ev.start, end: a.ev.end, providers: a.ev.providers || [a.ev.provider] };
      const summaryB = { id: idB, summary: b.ev.summary, start: b.ev.start, end: b.ev.end, providers: b.ev.providers || [b.ev.provider] };
      if (!result.has(idA)) result.set(idA, []);
      if (!result.has(idB)) result.set(idB, []);
      result.get(idA).push(summaryB);
      result.get(idB).push(summaryA);
    }
  }
  return result;
}

/** Count distinct days that contain at least one conflict. */
export function countConflictDays(conflictsMap, events) {
  if (!conflictsMap || conflictsMap.size === 0) return 0;
  const days = new Set();
  for (const ev of events) {
    if (!conflictsMap.has(ev.id)) continue;
    const { start } = getStartEndMs(ev);
    if (!start) continue;
    days.add(new Date(start).toLocaleDateString());
  }
  return days.size;
}
