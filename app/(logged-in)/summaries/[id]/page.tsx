import BgGradient from "@/components/common/bg-gradient";
import DownloadSummaryButton from "@/components/summaries/download-summary-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { deleteSummaryAction } from "@/action/summary-action";
import { getSummaryById } from "@/lib/summaries";
import { upsertUserFromClerk } from "@/lib/users";
import { formatFileName } from "@/lib/utils";
import { currentUser } from "@clerk/nextjs/server";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, CalendarDays, ExternalLink, FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function SummaryPage(props: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  await upsertUserFromClerk(user);

  const params = await props.params;
  const summary = await getSummaryById(params.id, user.id);

  if (!summary) {
    notFound();
  }

  const deleteSummaryWithId = deleteSummaryAction.bind(null, summary.id);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <BgGradient className="from-emerald-200 via-teal-200 to-cyan-200" />

      <div className="container mx-auto px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              asChild
              variant="outline"
              className="border-rose-200 bg-white/80 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            >
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>

            <form action={deleteSummaryWithId}>
              <Button
                type="submit"
                variant="destructive"
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete Summary
              </Button>
            </form>
          </div>

          <Card className="overflow-hidden border-rose-100 bg-white/90 shadow-xl shadow-rose-100/40 backdrop-blur">
            <CardHeader className="gap-5 border-b border-rose-100 bg-gradient-to-r from-white via-rose-50 to-orange-50">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-rose-100 p-3 text-rose-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Badge className="bg-rose-500 text-white hover:bg-rose-500">
                        Summary Ready
                      </Badge>
                      <CardTitle className="text-2xl font-bold text-gray-900 sm:text-3xl">
                        {summary.title || formatFileName(summary.original_file_url)}
                      </CardTitle>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-rose-500" />
                        Created{" "}
                        {formatDistanceToNow(new Date(summary.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                      <Badge
                        variant="secondary"
                        className="border border-emerald-200 bg-emerald-50 text-emerald-700"
                      >
                        {summary.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <DownloadSummaryButton
                    fileName={summary.file_name || summary.title || "summary"}
                    title={summary.title || formatFileName(summary.original_file_url)}
                    summary={summary.summary_text}
                  />
                  <Button
                    asChild
                    variant="outline"
                    className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                  >
                    <a
                      href={summary.original_file_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Original PDF
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px]">
              <section className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Summary
                  </h2>
                  <p className="text-sm text-gray-500">
                    Your AI-generated overview of the uploaded document.
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-gradient-to-b from-white to-rose-50/50 p-5 shadow-sm">
                  <div className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700 sm:text-base">
                    {summary.summary_text}
                  </div>
                </div>
              </section>

              <aside className="space-y-4">
                <Card className="border-rose-100 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-gray-900">
                      Document Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-gray-600">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">File name</p>
                      <p className="break-all">
                        {summary.file_name ||
                          formatFileName(summary.original_file_url)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">Summary title</p>
                      <p>{summary.title || "Untitled summary"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">Status</p>
                      <p className="capitalize">{summary.status}</p>
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
