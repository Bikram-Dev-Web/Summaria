import BgGradient from "@/components/common/bg-gradient";
import {
  createBillingPortalSessionAction,
  createCheckoutSessionAction,
  syncCheckoutSessionStatus,
} from "@/action/billing-action";
import SummaryCard from "@/components/summaries/summary-card";
import { Button } from "@/components/ui/button";
import { getUserBillingSnapshot } from "@/lib/billing";
import { getSummaries } from "@/lib/summaries";
import { upsertUserFromClerk } from "@/lib/users";
import { currentUser } from "@clerk/nextjs/server";
import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage(props: {
  searchParams?: Promise<{
    checkout?: string;
    session_id?: string;
    billing?: string;
  }>;
}) {
  const user = await currentUser();
  const userId = user?.id;
  if(!userId){
     return redirect('/sign-in');
  }

  await upsertUserFromClerk(user);
  const searchParams = props.searchParams ? await props.searchParams : undefined;

  if (
    searchParams?.checkout === "success" &&
    searchParams.session_id
  ) {
    await syncCheckoutSessionStatus(userId, searchParams.session_id);
  }

  const [summaries, billing] = await Promise.all([
    getSummaries(userId),
    getUserBillingSnapshot(userId),
  ]);
  return (
    <main className="min-h-screen">
      <BgGradient className="from-emerald-200 via-teal-200 to-cyan-200 " />
      <div className=" container mx-auto flex flex-col gap-4">
        <div className="px-2 py-12 sm:py-24">
          <div className="flex justify-between gap-4 mb-8">
            <div className="flex flex-col gap-2">
              <h1 className="font-bold text-4xl tracking-right bg-linear-to-r from-gray-500 to-gray-700 bg-clip-text text-transparent">
                Your Summaries
              </h1>
              <p className="text-gary-600">
                Transform your PDFs into concise, actionable insights
              </p>
            </div>
            <div>
              <Button
                variant={"link"}
                className="bg-linear-to-r from-rose-500 to-rose-700 hover:from-rose-600 hover:to-rose-800 hover:scale-105 transition-all duration-300  hover:no-underline"
              >
                <Link href="/upload" className="flex text-white item-center">
                  <Plus className="w-5 h-5 mr-2" />
                  New Summary
                </Link>
              </Button>
            </div>
          </div>
          <div className="mb-6 flex flex-wrap gap-3">
            {billing.isPro ? (
              <form action={createBillingPortalSessionAction}>
                <Button
                  type="submit"
                  variant="outline"
                  className="border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  Manage Billing
                </Button>
              </form>
            ) : (
              <form action={createCheckoutSessionAction}>
                <Button
                  type="submit"
                  className="bg-linear-to-r from-rose-500 to-rose-700 text-white hover:from-rose-600 hover:to-rose-800"
                >
                  Upgrade to Pro
                </Button>
              </form>
            )}
          </div>
          {billing.isPro ? (
            <div className="mb-6">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <p className="text-sm">
                  You are on the Pro plan with unlimited monthly uploads.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
                <p className="text-sm">
                  You have used {billing.usageCount} of {billing.uploadLimit} free
                  summaries this month.
                  {" "}
                  <Link
                    href="/#pricing"
                    className="inline-flex items-center font-medium text-rose-800 underline underline-offset-4"
                  >
                    Upgrade to Pro
                    <ArrowRight className="ml-2 inline-block h-4 w-4" />
                  </Link>
                  {" "}
                  for unlimited uploads.
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 sm:px-0">
            {summaries.map((summary,index)=> (
              <SummaryCard key={index} summary={summary}/>
            ))}

          </div>
        </div>
      </div>
    </main>
  );
}
