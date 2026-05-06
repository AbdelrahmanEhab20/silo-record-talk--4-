import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, duration } = await req.json();
    if (!amount || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }
    if (!duration || duration <= 0) {
      return Response.json({ error: 'Invalid duration' }, { status: 400 });
    }

    let subscription = await base44.asServiceRole.entities.PlanSubscription.filter(
      { user_email: user.email }
    ).then(r => r[0]);

    if (!subscription) {
      return Response.json({ error: 'Subscription not found' }, { status: 404 });
    }

    if (subscription.credits < amount) {
      return Response.json({ 
        error: 'Insufficient credits',
        current_credits: subscription.credits,
        required: amount,
        needs_upgrade: true,
      }, { status: 402 });
    }

    // Check plan-specific limits (Free plan: 5 sessions OR 225 minutes max)
    const meetingsUsed = (subscription.meetings_used || 0) + 1;
    const minutesUsed = (subscription.minutes_used || 0) + Math.ceil(duration / 60);
    
    if (subscription.plan === 'free') {
      if (meetingsUsed > 5) {
        return Response.json({ 
          error: 'Free plan limit exceeded: 5 meetings max',
          meetings_used: meetingsUsed,
          meetings_limit: 5,
          needs_upgrade: true,
        }, { status: 402 });
      }
      if (minutesUsed > 225) {
        return Response.json({ 
          error: 'Free plan limit exceeded: 225 minutes max',
          minutes_used: minutesUsed,
          minutes_limit: 225,
          needs_upgrade: true,
        }, { status: 402 });
      }
    }

    // Deduct credits and track meetings/minutes used
    const updated = await base44.asServiceRole.entities.PlanSubscription.update(
      subscription.id,
      { 
        credits: subscription.credits - amount,
        meetings_used: meetingsUsed,
        minutes_used: minutesUsed,
      }
    );

    return Response.json({
      success: true,
      credits_remaining: updated.credits,
      needs_upgrade: updated.credits < 5, // Warn when < 5 credits
    });
  } catch (error) {
    console.error('Deduct credits error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});