import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BONUS_MINUTES = 10;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let subscription = await base44.asServiceRole.entities.PlanSubscription.filter(
      { user_email: user.email }
    ).then(r => r[0]);

    if (!subscription) {
      subscription = await base44.asServiceRole.entities.PlanSubscription.create({
        user_email: user.email,
        plan: 'free',
        minutes_used: 0,
        daily_minutes_used: 0,
        daily_bonus_minutes: 0,
        status: 'active',
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Reset daily counter if new day
    let dailyUsed = subscription.daily_minutes_used || 0;
    let currentBonus = subscription.daily_bonus_minutes || 0;
    if (subscription.daily_reset_date !== today) {
      dailyUsed = 0;
      currentBonus = 0;
    }

    const newBonus = currentBonus + BONUS_MINUTES;

    await base44.asServiceRole.entities.PlanSubscription.update(subscription.id, {
      daily_bonus_minutes: newBonus,
      daily_reset_date: today,
    });

    return Response.json({
      success: true,
      bonus_minutes_added: BONUS_MINUTES,
      total_bonus_today: newBonus,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});