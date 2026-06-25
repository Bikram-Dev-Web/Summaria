"use server";

import { getDbConnection } from "@/lib/db";
import { upsertUserFromClerk } from "@/lib/users";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteSummaryAction(summaryId: string) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  await upsertUserFromClerk(user);

  const sql = await getDbConnection();
  const existingSummary = await sql`
    SELECT id
    FROM pdf_summaries
    WHERE id = ${summaryId} AND user_id = ${user.id}
    LIMIT 1
  `;

  if (!existingSummary[0]) {
    throw new Error("Summary not found");
  }

  await sql`
    DELETE FROM pdf_summaries
    WHERE id = ${summaryId} AND user_id = ${user.id}
  `;

  revalidatePath("/dashboard");
  revalidatePath(`/summaries/${summaryId}`);
  redirect("/dashboard");
}
