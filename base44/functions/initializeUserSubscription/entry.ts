import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has subscription
    const existing = await base44.asServiceRole.entities.PlanSubscription.filter(
      { user_email: user.email }
    ).then(r => r[0]);

    if (existing) {
      return Response.json({
        message: 'User already has subscription',
        subscription: existing,
      });
    }

    // Create free subscription for new user
    const subscription = await base44.asServiceRole.entities.PlanSubscription.create({
      user_email: user.email,
      plan: 'free',
      credits: 10,
      total_credits_purchased: 0,
      status: 'active',
    });

    return Response.json({
      message: 'Subscription initialized',
      subscription,
    });
  } catch (error) {
    console.error('Initialize subscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});