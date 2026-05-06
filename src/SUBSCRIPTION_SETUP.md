# Credit-Based Subscription System Setup

## Overview
Complete subscription system with 4 tiers (Free, Starter, Pro, Pro Plus) using Stripe for payments and MongoDB for credit tracking.

## Entities Created
- **PlanSubscription**: Tracks user credits, plan, and subscription status

## Stripe Configuration
### Products & Prices
- **Free**: 10 credits (no charge)
- **Starter**: 50 credits/month - $9.99 (price_1TF898Gq5LgdOhaJRfJnGF6F)
- **Pro**: 200 credits/month - $24.99 (price_1TF898Gq5LgdOhaJrH5TScS1)
- **Pro Plus**: 500 credits/month - $49.99 (price_1TF898Gq5LgdOhaJR0WuGYeS)

### Webhook
- Registered at `/api/functions/stripeWebhook`
- Handles: `checkout.session.completed`, `invoice.payment_succeeded`
- Secret: `STRIPE_WEBHOOK_SECRET` (auto-set)

## Backend Functions

### 1. `getUserCredits`
Gets current user's credits and plan
- Returns: `{ plan, credits, total_credits_purchased, status }`

### 2. `deductCredits`
Deducts credits from user account
- Requires: `{ amount }`
- Returns: Credit remaining and upgrade prompt flag if low

### 3. `createCheckoutSession`
Creates Stripe checkout session for upgrade
- Requires: `{ planKey }` (starter, pro, pro_plus)
- Returns: Stripe session ID for redirect

### 4. `initializeUserSubscription`
First-time setup: gives user 10 free credits
- Triggered on first app visit (optional, can be manual)

### 5. `stripeWebhook`
Handles Stripe webhook events
- Updates user credits on successful payment
- Renews monthly credits on invoice payment

## Frontend Components

### 1. `CreditsDisplay`
Shows current credit balance with visual indicator
- Warns when < 5 credits
- Displays current plan

### 2. `PlansSection`
Shows all 4 plans with upgrade buttons
- Current plan highlighted with ring
- Stripe checkout redirect on upgrade

### 3. `UpgradePrompt`
Toast notification when credits run low
- Dismissible
- Shows current credit count

### 4. Settings Page Updates
Integrated CreditsDisplay and PlansSection
- Shows credit balance at top
- Plan selection and management below

## Usage Flow

### New User
1. User signs up → auto-receive 10 free credits
2. View current credits in Settings > Credits section
3. See all plans in Settings > Billing

### Using Credits
1. Backend deducts credits when user records session
2. Call `deductCredits` backend function with amount
3. If insufficient credits: return 402 status + show upgrade prompt
4. If credits < 5: show warning toast

### Upgrading Plan
1. User clicks "Upgrade" on desired plan in Settings
2. Redirected to Stripe checkout
3. Payment successful → webhook updates user credits
4. New plan credits added to existing balance

## Monthly Renewal
- Stripe handles subscription renewals
- On `invoice.payment_succeeded`: webhook resets credits to plan amount
- Previous credits are preserved in `total_credits_purchased`

## Test Mode
- Use test card: 4242 4242 4242 4242
- Any future date and CVC
- Test plan upgrades in Settings

## Next Steps
1. Call `initializeUserSubscription` on first Home page load
2. Integrate `deductCredits` when recording sessions
3. Show upgrade modal when credits insufficient
4. Monitor webhook in dashboard logs for payment events