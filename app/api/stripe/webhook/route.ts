import {
  createPaymentRecord,
  PRO_PLAN,
  updateUserSubscriptionState,
} from "@/lib/billing";
import {
  getStripeServer,
  getStripeWebhookSecret,
} from "@/lib/stripe";
import {
  getUserByClerkId,
  getUserByStripeCustomerId,
  getUserByStripeSubscriptionId,
} from "@/lib/users";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function fromUnixTimestamp(timestamp?: number | null) {
  return timestamp ? new Date(timestamp * 1000) : null;
}

async function resolveClerkUserIdFromSubscription(subscription: any) {
  const metadataClerkUserId = subscription?.metadata?.clerkUserId;
  if (metadataClerkUserId) {
    return metadataClerkUserId;
  }

  const customerId =
    typeof subscription?.customer === "string"
      ? subscription.customer
      : subscription?.customer?.id;

  if (customerId) {
    const user = await getUserByStripeCustomerId(customerId);
    if (user?.clerk_user_id) {
      return user.clerk_user_id as string;
    }
  }

  const subscriptionId = subscription?.id;
  if (subscriptionId) {
    const user = await getUserByStripeSubscriptionId(subscriptionId);
    if (user?.clerk_user_id) {
      return user.clerk_user_id as string;
    }
  }

  return null;
}

async function handleSubscriptionEvent(subscription: any) {
  const clerkUserId = await resolveClerkUserIdFromSubscription(subscription);
  if (!clerkUserId) {
    return;
  }

  const priceId =
    subscription?.items?.data?.[0]?.price?.id ??
    subscription?.plan?.id ??
    null;

  const activeStatuses = ["trialing", "active", "past_due"];
  const plan =
    activeStatuses.includes(String(subscription?.status ?? ""))
      ? PRO_PLAN
      : "basic";

  await updateUserSubscriptionState({
    clerkUserId,
    plan,
    stripeCustomerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id ?? null,
    stripeSubscriptionId: subscription.id ?? null,
    stripePriceId: priceId,
    subscriptionStatus: String(subscription.status ?? "inactive"),
    currentPeriodStart: fromUnixTimestamp(subscription.current_period_start),
    currentPeriodEnd: fromUnixTimestamp(subscription.current_period_end),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  });
}

async function handleInvoiceEvent(invoice: any, status: string) {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? null;
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id ?? null;

  const user =
    (customerId ? await getUserByStripeCustomerId(customerId) : null) ??
    (subscriptionId
      ? await getUserByStripeSubscriptionId(subscriptionId)
      : null);

  if (!user?.clerk_user_id) {
    return;
  }

  const lineItem = invoice.lines?.data?.[0];
  const priceId = lineItem?.pricing?.price_details?.price ?? lineItem?.price?.id ?? null;

  await createPaymentRecord({
    clerkUserId: user.clerk_user_id as string,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripeInvoiceId: invoice.id ?? null,
    stripePaymentIntentId:
      typeof invoice.payment_intent === "string"
        ? invoice.payment_intent
        : invoice.payment_intent?.id ?? null,
    stripeChargeId:
      typeof invoice.charge === "string" ? invoice.charge : invoice.charge?.id ?? null,
    stripePriceId: priceId,
    plan: PRO_PLAN,
    billingReason: invoice.billing_reason ?? null,
    amount: Number(invoice.amount_paid ?? invoice.amount_due ?? 0),
    currency: invoice.currency ?? "usd",
    status,
    paidAt: fromUnixTimestamp(invoice.status_transitions?.paid_at),
  });

  if (status === "paid") {
    await updateUserSubscriptionState({
      clerkUserId: user.clerk_user_id as string,
      plan: PRO_PLAN,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      subscriptionStatus: "active",
      currentPeriodStart: user.current_period_start ?? null,
      currentPeriodEnd: user.current_period_end ?? null,
      cancelAtPeriodEnd: Boolean(user.cancel_at_period_end),
    });
  }

  if (status === "failed") {
    await updateUserSubscriptionState({
      clerkUserId: user.clerk_user_id as string,
      plan: PRO_PLAN,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      subscriptionStatus: "past_due",
      currentPeriodStart: user.current_period_start ?? null,
      currentPeriodEnd: user.current_period_end ?? null,
      cancelAtPeriodEnd: Boolean(user.cancel_at_period_end),
    });
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const stripe = getStripeServer();

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      getStripeWebhookSecret()
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid webhook signature",
      },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const clerkUserId =
          session.client_reference_id ?? session.metadata?.clerkUserId ?? null;

        if (clerkUserId) {
          const user = await getUserByClerkId(clerkUserId);
          await updateUserSubscriptionState({
            clerkUserId,
            plan: PRO_PLAN,
            stripeCustomerId:
              typeof session.customer === "string"
                ? session.customer
                : session.customer?.id ?? user?.stripe_customer_id ?? null,
            stripeSubscriptionId:
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription?.id ?? null,
            stripePriceId: session.metadata?.priceId ?? null,
            subscriptionStatus: "active",
            currentPeriodStart: user?.current_period_start ?? null,
            currentPeriodEnd: user?.current_period_end ?? null,
            cancelAtPeriodEnd: Boolean(user?.cancel_at_period_end),
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(event.data.object);
        break;
      case "invoice.payment_succeeded":
        await handleInvoiceEvent(event.data.object, "paid");
        break;
      case "invoice.payment_failed":
        await handleInvoiceEvent(event.data.object, "failed");
        break;
      default:
        break;
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process webhook",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
