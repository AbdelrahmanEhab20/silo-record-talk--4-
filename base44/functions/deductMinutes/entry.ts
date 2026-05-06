import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const FREE_DAILY_BASE = 30;
const PRO_MONTHLY = 1800;

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const minutes = Number(body?.minutes || 0);
    const sessionId = body?.session_id || null;
    const chargeKey = body?.charge_key || null;
    const userEmailFromBody = body?.user_email ? String(body.user_email).trim().toLowerCase() : null;

    if (!minutes || minutes <= 0) {
      return Response.json({ error: 'Invalid minutes' }, { status: 400 });
    }

    // Resolve user email from auth OR backend payload
    const authUser = await base44.auth.me().catch(() => null);
    const resolvedUserEmail = authUser?.email ? String(authUser.email).toLowerCase() : userEmailFromBody;
    
    if (!resolvedUserEmail) {
      return Response.json({ error: 'Unauthorized: missing user context' }, { status: 401 });
    }

    // Idempotency guard at session level (best protection against webhook/poller/retry duplicates)
    if (sessionId) {
      const session = await base44.asServiceRole.entities.Session.get(sessionId);
      if (!session) {
        return Response.json({ error: 'Session not found' }, { status: 404 });
      }

      if (session.usage_charged_at) {
        return Response.json({
          success: true,
          skipped: true,
          reason: 'already_charged',
          session_id: sessionId,
          charged_at: session.usage_charged_at,
        });
      }
    }

    let subscription = await base44.asServiceRole.entities.PlanSubscription
      .filter({ user_email: resolvedUserEmail })
      .then((r) => r[0]);

    if (!subscription) {
      subscription = await base44.asServiceRole.entities.PlanSubscription.create({
        user_email: resolvedUserEmail,
        plan: 'free',
        minutes_used: 0,
        status: 'active',
      });
    }

    const today = getTodayIso();
    const plan = subscription.plan || subscription.plan_type || 'free';

    let updatePayload = {};
    let responsePayload = { success: true, charged_minutes: minutes };

    // Reset free-plan daily counter if day changed
    let dailyUsed = subscription.daily_minutes_used || 0;
    if (subscription.daily_reset_date !== today) {
      dailyUsed = 0;
    }

    if (plan === 'pro' && (subscription.status === 'active' || subscription.subscription_status === 'active')) {
      const monthlyUsed = (subscription.monthly_minutes_used || subscription.minutes_used || 0) + minutes;
      if (monthlyUsed > PRO_MONTHLY) {
        return Response.json({
          error: 'Monthly limit exceeded (1,800 min)',
          monthly_minutes_used: monthlyUsed - minutes,
          monthly_limit: PRO_MONTHLY,
          needs_upgrade: false,
          at_limit: true,
        }, { status: 402 });
      }

      updatePayload = {
        monthly_minutes_used: monthlyUsed,
        minutes_used: monthlyUsed,
      };

      responsePayload = {
        ...responsePayload,
        plan: 'pro',
        monthly_minutes_remaining: PRO_MONTHLY - monthlyUsed,
      };
    } else {
      const dailyBonus = subscription.daily_bonus_minutes || 0;
      const dailyLimit = FREE_DAILY_BASE + dailyBonus;
      const newDailyUsed = dailyUsed + minutes;

      if (newDailyUsed > dailyLimit) {
        return Response.json({
          error: 'Daily limit exceeded',
          daily_minutes_used: dailyUsed,
          daily_limit: dailyLimit,
          needs_upgrade: true,
          at_limit: true,
        }, { status: 402 });
      }

      updatePayload = {
        daily_minutes_used: newDailyUsed,
        daily_reset_date: today,
        minutes_used: (subscription.minutes_used || 0) + minutes,
      };

      responsePayload = {
        ...responsePayload,
        plan: 'free',
        daily_minutes_remaining: dailyLimit - newDailyUsed,
        daily_limit: dailyLimit,
      };
    }

    await base44.asServiceRole.entities.PlanSubscription.update(subscription.id, updatePayload);

    // Mark session as charged after subscription update succeeds
    if (sessionId) {
      const nowIso = new Date().toISOString();
      await base44.asServiceRole.entities.Session.update(sessionId, {
        usage_charged_at: nowIso,
        ...(chargeKey ? { usage_charge_key: String(chargeKey) } : {}),
      });
      responsePayload.session_id = sessionId;
      responsePayload.usage_charged_at = nowIso;
    }

    return Response.json(responsePayload);
  } catch (error) {
    console.error('Deduct minutes error:', error);
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});