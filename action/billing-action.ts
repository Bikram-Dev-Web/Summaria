"use server";

import {
  getUserBillingSnapshot,
  PRO_PLAN,
  setUserStripeCustomerId,
  updateUserSubscriptionState,
} from "@/lib/billing";
import { getBaseUrl, getProPriceId, getStripeServer } from "@/lib/stripe";
import { getUserByClerkId, upsertUserFromClerk } from "@/lib/users";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

async function ensureStripeCustomer(clerkUserId: string) {
  const user = await getUserByClerkId(clerkUserId);

  if (!user) {
    throw new Error("User not found in billing database");
  }

  if (user.stripe_customer_id) {
    return user.stripe_customer_id as string;
  }

  const stripe = getStripeServer();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.full_name || undefined,
    metadata: {
      clerkUserId,
    },
  });

  await setUserStripeCustomerId(clerkUserId, customer.id);
  return customer.id as string;
}

function fromUnixTimestamp(timestamp?: number | null) {
  return timestamp ? new Date(timestamp * 1000) : null;
}

export async function syncCheckoutSessionStatus(
  clerkUserId: string,
  sessionId: string
) {
  const stripe = getStripeServer();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (
    session.mode !== "subscription" ||
    session.payment_status !== "paid" ||
    !session.subscription
  ) {
    return null;
  }

  const subscription =
    typeof session.subscription === "string"
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

  const priceId =
    subscription.items.data[0]?.price?.id ?? getProPriceId();

  await updateUserSubscriptionState({
    clerkUserId,
    plan: PRO_PLAN,
    stripeCustomerId:
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    subscriptionStatus: String(subscription.status ?? "active"),
    currentPeriodStart: fromUnixTimestamp(subscription.current_period_start),
    currentPeriodEnd: fromUnixTimestamp(subscription.current_period_end),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  });

  return subscription;
}

export async function createCheckoutSessionAction() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  await upsertUserFromClerk(user);

  const billing = await getUserBillingSnapshot(user.id);
  if (billing.isPro && billing.subscriptionStatus !== "canceled") {
    redirect("/dashboard?billing=active");
  }

  const stripe = getStripeServer();
  const customerId = await ensureStripeCustomer(user.id);
  const baseUrl = getBaseUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    success_url: `${baseUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/#pricing?checkout=cancelled`,
    line_items: [
      {
        price: getProPriceId(),
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    metadata: {
      clerkUserId: user.id,
      plan: PRO_PLAN,
    },
    subscription_data: {
      metadata: {
        clerkUserId: user.id,
        plan: PRO_PLAN,
      },
    },
  });

  if (!session.url) {
    throw new Error("Stripe checkout session did not return a URL");
  }

  redirect(session.url);
}

export async function createBillingPortalSessionAction() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  await upsertUserFromClerk(user);
  const dbUser = await getUserByClerkId(user.id);

  if (!dbUser?.stripe_customer_id) {
    redirect("/dashboard?billing=missing-customer");
  }

  const stripe = getStripeServer();
  const session = await stripe.billingPortal.sessions.create({
    customer: dbUser.stripe_customer_id,
    return_url: `${getBaseUrl()}/dashboard`,
  });

  if (!session.url) {
    throw new Error("Stripe billing portal session did not return a URL");
  }

  redirect(session.url);
}
