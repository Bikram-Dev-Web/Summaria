import { createBillingPortalSessionAction, createCheckoutSessionAction } from "@/action/billing-action";
import { Button } from "@/components/ui/button";
import { BASIC_PLAN, PRO_PLAN, getUserBillingSnapshot } from "@/lib/billing";
import { cn } from "@/lib/utils";
import { upsertUserFromClerk } from "@/lib/users";
import { currentUser } from "@clerk/nextjs/server";
import { ArrowRight, CheckIcon } from "lucide-react";
import Link from "next/link";

type PriceType = {
  id: "basic" | "pro";
  name: string;
  priceLabel: string;
  description: string;
  items: string[];
};

const plans: PriceType[] = [
  {
    id: "basic",
    name: "Basic",
    priceLabel: "Free",
    description: "Perfect for getting started",
    items: ["5 PDF summaries per month", "Standard processing speed", "Email support"],
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$19",
    description: "For power users who need more",
    items: [
      "Unlimited PDF summaries",
      "Priority processing",
      "Markdown export",
      "Priority support",
    ],
  },
];

function PricingAction({
  planId,
  isSignedIn,
  isCurrentPlan,
}: {
  planId: PriceType["id"];
  isSignedIn: boolean;
  isCurrentPlan: boolean;
}) {
  if (planId === BASIC_PLAN) {
    return (
      <Link
        href={isSignedIn ? "/upload" : "/sign-up"}
        className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-rose-100 bg-linear-to-r from-rose-400 to-rose-500 py-2 text-white transition-all hover:from-rose-500 hover:to-rose-600"
      >
        {isSignedIn ? "Start Uploading" : "Get Started Free"}
        <ArrowRight size={18} />
      </Link>
    );
  }

  if (!isSignedIn) {
    return (
      <Link
        href="/sign-up"
        className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-rose-900 bg-linear-to-r from-rose-800 to-rose-500 py-2 text-white transition-all hover:from-rose-500 hover:to-rose-800"
      >
        Start Pro
        <ArrowRight size={18} />
      </Link>
    );
  }

  if (isCurrentPlan) {
    return (
      <form action={createBillingPortalSessionAction} className="w-full">
        <Button
          type="submit"
          className="w-full rounded-full border-2 border-emerald-900 bg-linear-to-r from-emerald-600 to-teal-500 py-2 text-white hover:from-emerald-500 hover:to-teal-400"
        >
          Manage Billing
          <ArrowRight size={18} />
        </Button>
      </form>
    );
  }

  return (
    <form action={createCheckoutSessionAction} className="w-full">
      <Button
        type="submit"
        className="w-full rounded-full border-2 border-rose-900 bg-linear-to-r from-rose-800 to-rose-500 py-2 text-white hover:from-rose-500 hover:to-rose-800"
      >
        Upgrade to Pro
        <ArrowRight size={18} />
      </Button>
    </form>
  );
}

function PricingCard({
  id,
  name,
  description,
  items,
  priceLabel,
  isSignedIn,
  isCurrentPlan,
}: PriceType & {
  isSignedIn: boolean;
  isCurrentPlan: boolean;
}) {
  return (
    <div className="relative w-full max-w-lg transition-all duration-300 hover:scale-105">
      <div
        className={cn(
          "relative z-10 flex h-full flex-col gap-4 rounded-2xl border-[1px] border-gray-500/20 p-8 lg:gap-8",
          id === PRO_PLAN && "gap-5 border-2 border-rose-500"
        )}
      >
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-lg font-bold capitalize lg:text-xl">{name}</p>
            <p className="mt-2 text-base-content/80">{description}</p>
          </div>
          {isCurrentPlan ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              Current Plan
            </span>
          ) : null}
        </div>

        <div className="flex items-end gap-2">
          <p className="text-5xl font-extrabold tracking-tight">{priceLabel}</p>
          {id === PRO_PLAN ? (
            <div className="mb-[4px] flex flex-col justify-end">
              <p className="text-xs font-semibold uppercase">USD</p>
              <p className="text-xs">/month</p>
            </div>
          ) : (
            <p className="mb-[6px] text-sm text-gray-500">Forever</p>
          )}
        </div>

        <div className="flex-1 space-y-2.5 text-base leading-relaxed">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <CheckIcon size={18} />
              <span>{item}</span>
            </li>
          ))}
        </div>

        <div className="flex w-full justify-center space-y-2">
          <PricingAction
            planId={id}
            isSignedIn={isSignedIn}
            isCurrentPlan={isCurrentPlan}
          />
        </div>
      </div>
    </div>
  );
}

export default async function PricingSection() {
  const user = await currentUser();
  let currentPlan: "basic" | "pro" = BASIC_PLAN;

  if (user) {
    await upsertUserFromClerk(user);
    const billing = await getUserBillingSnapshot(user.id);
    currentPlan = billing.plan;
  }

  return (
    <section className="relative overflow-hidden" id="pricing">
      <div className="mx-auto max-w-5xl px-4 pb-12 pt-12 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex w-full items-center justify-center pb-12">
          <h2 className="mb-8 text-xl font-bold uppercase text-rose-500">Pricing</h2>
        </div>
        <div className="relative flex flex-col items-center justify-center gap-8 lg:flex-row lg:items-stretch">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              {...plan}
              isSignedIn={Boolean(user)}
              isCurrentPlan={currentPlan === plan.id}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
