import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

const PRICE_IDS = {
  pro_monthly: Deno.env.get('STRIPE_PRICE_PRO_MONTHLY'),
  pro_yearly: Deno.env.get('STRIPE_PRICE_PRO_YEARLY'),
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, billing_interval } = await req.json();

    if (plan !== 'pro') {
      return Response.json({ error: 'Only pro plan uses Stripe checkout' }, { status: 400 });
    }

    const interval = billing_interval === 'yearly' ? 'yearly' : 'monthly';
    const priceId = PRICE_IDS[`pro_${interval}`];

    let subscription = await base44.asServiceRole.entities.PlanSubscription.filter(
      { user_email: user.email },
    ).then((r) => r[0]);

    if (!subscription) {
      subscription = await base44.asServiceRole.entities.PlanSubscription.create({
        user_email: user.email,
        plan_type: 'free',
        ads_enabled: true,
        daily_minutes_used: 0,
        monthly_minutes_used: 0,
        subscription_status: 'active',
      });
    }

    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'mode': 'subscription',
      'success_url': `https://siloainotes.com/home?upgraded=true`,
      'cancel_url': `https://siloainotes.com/Pricing`,
      'customer_email': user.email,
      'metadata[user_email]': user.email,
      'metadata[plan]': 'pro',
      'metadata[billing_interval]': interval,
      'metadata[base44_app_id]': Deno.env.get('BASE44_APP_ID'),
    });

    if (subscription.stripe_customer_id) {
      params.set('customer', subscription.stripe_customer_id);
      params.delete('customer_email');
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-App-Id': Deno.env.get('BASE44_APP_ID'),
      },
      body: params.toString(),
    });

    const session = await res.json();

    if (!session.id) {
      console.error('Stripe error:', session);
      return Response.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    return Response.json({ checkout_url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
});