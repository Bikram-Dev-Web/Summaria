import { getDbConnection } from "@/lib/db";
import { getUserByClerkId } from "@/lib/users";

export const BASIC_PLAN_UPLOAD_LIMIT = 5;
export const BASIC_PLAN = "basic";
export const PRO_PLAN = "pro";

export type AppPlan = typeof BASIC_PLAN | typeof PRO_PLAN;

type UsageCountRow = {
  count: string | number;
};

export async function getCurrentBillingPeriodUsage(clerkUserId: string) {
  const sql = await getDbConnection();
  const result = await sql`
    SELECT COUNT(*)::int AS count
    FROM pdf_summaries
    WHERE user_id = ${clerkUserId}
      AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
  `;

  return Number((result[0] as UsageCountRow | undefined)?.count ?? 0);
}

export async function getUserPlan(clerkUserId: string): Promise<AppPlan> {
  const user = await getUserByClerkId(clerkUserId);
  return user?.plan === PRO_PLAN ? PRO_PLAN : BASIC_PLAN;
}

export async function hasActiveProSubscription(clerkUserId: string) {
  const user = await getUserByClerkId(clerkUserId);

  if (!user) {
    return false;
  }

  if (user.plan !== PRO_PLAN) {
    return false;
  }

  return ["trialing", "active", "past_due"].includes(
    String(user.subscription_status ?? "")
  );
}

export async function getUserBillingSnapshot(clerkUserId: string) {
  const [user, usageCount] = await Promise.all([
    getUserByClerkId(clerkUserId),
    getCurrentBillingPeriodUsage(clerkUserId),
  ]);

  const plan: AppPlan = user?.plan === PRO_PLAN ? PRO_PLAN : BASIC_PLAN;
  const isPro = plan === PRO_PLAN;
  const uploadLimit = isPro ? null : BASIC_PLAN_UPLOAD_LIMIT;
  const uploadsRemaining = isPro
    ? null
    : Math.max(BASIC_PLAN_UPLOAD_LIMIT - usageCount, 0);

  return {
    user,
    plan,
    isPro,
    usageCount,
    uploadLimit,
    uploadsRemaining,
    canUpload: isPro || usageCount < BASIC_PLAN_UPLOAD_LIMIT,
    subscriptionStatus: user?.subscription_status ?? "inactive",
    cancelAtPeriodEnd: Boolean(user?.cancel_at_period_end),
    currentPeriodEnd: user?.current_period_end ?? null,
  };
}

export async function assertCanCreateSummary(clerkUserId: string) {
  const billing = await getUserBillingSnapshot(clerkUserId);

  if (!billing.canUpload) {
    throw new Error(
      `You have reached the ${BASIC_PLAN_UPLOAD_LIMIT} summaries per month limit for the Basic plan. Upgrade to Pro for unlimited uploads.`
    );
  }

  return billing;
}

export async function setUserStripeCustomerId(
  clerkUserId: string,
  stripeCustomerId: string
) {
  const sql = await getDbConnection();
  const result = await sql`
    UPDATE users
    SET stripe_customer_id = ${stripeCustomerId},
        updated_at = CURRENT_TIMESTAMP
    WHERE clerk_user_id = ${clerkUserId}
    RETURNING *
  `;

  return result[0] ?? null;
}

export async function updateUserSubscriptionState({
  clerkUserId,
  plan,
  stripeCustomerId,
  stripeSubscriptionId,
  stripePriceId,
  subscriptionStatus,
  currentPeriodStart,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: {
  clerkUserId: string;
  plan: AppPlan;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  subscriptionStatus: string;
  currentPeriodStart?: string | Date | null;
  currentPeriodEnd?: string | Date | null;
  cancelAtPeriodEnd?: boolean;
}) {
  const sql = await getDbConnection();
  const result = await sql`
    UPDATE users
    SET plan = ${plan},
        stripe_customer_id = ${stripeCustomerId},
        stripe_subscription_id = ${stripeSubscriptionId},
        stripe_price_id = ${stripePriceId},
        subscription_status = ${subscriptionStatus},
        current_period_start = ${currentPeriodStart ?? null},
        current_period_end = ${currentPeriodEnd ?? null},
        cancel_at_period_end = ${cancelAtPeriodEnd ?? false},
        updated_at = CURRENT_TIMESTAMP
    WHERE clerk_user_id = ${clerkUserId}
    RETURNING *
  `;

  return result[0] ?? null;
}

export async function createPaymentRecord({
  clerkUserId,
  stripeCustomerId,
  stripeSubscriptionId,
  stripeInvoiceId,
  stripePaymentIntentId,
  stripeChargeId,
  stripePriceId,
  plan,
  billingReason,
  amount,
  currency,
  status,
  paidAt,
}: {
  clerkUserId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeInvoiceId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  stripePriceId?: string | null;
  plan?: AppPlan;
  billingReason?: string | null;
  amount: number;
  currency?: string | null;
  status: string;
  paidAt?: string | Date | null;
}) {
  const sql = await getDbConnection();
  const result = await sql`
    INSERT INTO payments (
      clerk_user_id,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_invoice_id,
      stripe_payment_intent_id,
      stripe_charge_id,
      stripe_price_id,
      plan,
      billing_reason,
      amount,
      currency,
      status,
      paid_at
    )
    VALUES (
      ${clerkUserId},
      ${stripeCustomerId ?? null},
      ${stripeSubscriptionId ?? null},
      ${stripeInvoiceId ?? null},
      ${stripePaymentIntentId ?? null},
      ${stripeChargeId ?? null},
      ${stripePriceId ?? null},
      ${plan ?? PRO_PLAN},
      ${billingReason ?? null},
      ${amount},
      ${currency ?? "usd"},
      ${status},
      ${paidAt ?? null}
    )
    ON CONFLICT (stripe_invoice_id)
    DO UPDATE SET
      stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
      stripe_charge_id = EXCLUDED.stripe_charge_id,
      stripe_price_id = EXCLUDED.stripe_price_id,
      billing_reason = EXCLUDED.billing_reason,
      amount = EXCLUDED.amount,
      currency = EXCLUDED.currency,
      status = EXCLUDED.status,
      paid_at = EXCLUDED.paid_at,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  return result[0] ?? null;
}
