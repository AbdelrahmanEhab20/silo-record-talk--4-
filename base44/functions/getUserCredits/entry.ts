import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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
      // First time user - create free subscription
      subscription = await base44.asServiceRole.entities.PlanSubscription.create({
        user_email: user.email,
        plan: 'free',
        credits: 10,
        total_credits_purchased: 0,
        status: 'active',
      });
    }

    return Response.json({
      plan: subscription.plan,
      credits: subscription.credits,
      total_credits_purchased: subscription.total_credits_purchased,
      status: subscription.status,
    });
  } catch (error) {
    console.error('Get credits error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});