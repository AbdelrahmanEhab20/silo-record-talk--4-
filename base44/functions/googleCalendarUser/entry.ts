import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONNECTOR_ID = "69f36381360cadf794b1d9be";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, event } = body;

    let accessToken;
    try {
      ({ accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID));
    } catch {
      return Response.json({ error: 'not_connected' }, { status: 401 });
    }
    const authHeader = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    if (action === 'list') {
      // List upcoming events for the next 30 days
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=50&singleEvents=true&orderBy=startTime`,
        { headers: authHeader }
      );
      if (!res.ok) throw new Error(`Calendar API error: ${res.status} ${await res.text()}`);
      const data = await res.json();
      return Response.json({ events: data.items || [] });
    }

    if (action === 'create') {
      // Create a calendar event/reminder
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
        {
          method: 'POST',
          headers: authHeader,
          body: JSON.stringify(event),
        }
      );
      if (!res.ok) throw new Error(`Calendar API error: ${res.status} ${await res.text()}`);
      const data = await res.json();
      return Response.json({ event: data });
    }

    if (action === 'delete') {
      const { eventId } = body;
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        { method: 'DELETE', headers: authHeader }
      );
      if (!res.ok && res.status !== 404) throw new Error(`Calendar API error: ${res.status}`);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});