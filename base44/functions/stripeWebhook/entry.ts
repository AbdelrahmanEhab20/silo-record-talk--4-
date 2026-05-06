import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@17.3.1';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  console.log('Webhook received:', req.method, req.url);

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    console.log('Body length:', body.length);
    console.log('Signature present:', !!signature);

    const webhookSecret = STRIPE_WEBHOOK_SECRET?.trim();
    if (!signature || !webhookSecret) {
      console.error('Missing stripe-signature header or STRIPE_WEBHOOK_SECRET');
      return Response.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      console.error('❌ Stripe webhook verify failed:', detail);
      return Response.json({ error: 'Invalid signature', detail }, { status: 400 });
    }

    console.log('Event type:', event.type);

    const base44 = createClientFromRequest(req);
    const now = new Date().toISOString();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userEmail = session.metadata?.user_email;
      const billingInterval = session.metadata?.billing_interval || 'monthly';

      console.log('Processing checkout for:', userEmail);

      if (!userEmail) {
        return Response.json({ error: 'Missing user email in metadata' }, { status: 400 });
      }

      const periodEnd = billingInterval === 'yearly'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const records = await base44.asServiceRole.entities.PlanSubscription.filter({ user_email: userEmail });
      const subscription = records[0];

      const stripeSubId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id ?? null;
      const stripeCustId =
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id ?? null;

      const updateData = {
        plan_type: 'pro',
        subscription_status: 'active',
        billing_interval: billingInterval,
        stripe_subscription_id: stripeSubId,
        stripe_customer_id: stripeCustId,
        current_period_start: now,
        current_period_end: periodEnd,
        monthly_minutes_used: 0,
        ads_enabled: false,
      };

      if (subscription) {
        await base44.asServiceRole.entities.PlanSubscription.update(subscription.id, updateData);
        console.log('✅ Updated existing subscription for:', userEmail);
      } else {
        await base44.asServiceRole.entities.PlanSubscription.create({ user_email: userEmail, ...updateData });
        console.log('✅ Created new subscription for:', userEmail);
      }
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      console.log('Payment succeeded for customer:', customerId);

      const records = await base44.asServiceRole.entities.PlanSubscription.filter({ stripe_customer_id: customerId });
      const subscription = records[0];

      if (subscription) {
        const billingInterval = subscription.billing_interval || 'monthly';
        const periodEnd = billingInterval === 'yearly'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await base44.asServiceRole.entities.PlanSubscription.update(subscription.id, {
          subscription_status: 'active',
          monthly_minutes_used: 0,
          current_period_start: now,
          current_period_end: periodEnd,
        });
        console.log('✅ Renewed subscription for customer:', customerId);
      }
    }

    if (event.type === 'customer.subscription.deleted' || event.type === 'invoice.payment_failed') {
      const obj = event.data.object;
      const customerId = obj.customer;
      console.log('Cancellation/failure for customer:', customerId);

      const records = await base44.asServiceRole.entities.PlanSubscription.filter({ stripe_customer_id: customerId });
      const subscription = records[0];

      if (subscription) {
        await base44.asServiceRole.entities.PlanSubscription.update(subscription.id, {
          plan_type: event.type === 'invoice.payment_failed' ? 'pro' : 'free',
          subscription_status: event.type === 'invoice.payment_failed' ? 'past_due' : 'cancelled',
          ads_enabled: true,
        });
        console.log('✅ Updated subscription status for customer:', customerId);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
});