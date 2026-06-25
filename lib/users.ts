import { getDbConnection } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

type ClerkUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

function getPrimaryEmail(user: ClerkUser) {
  return (
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null
  );
}

function getFullName(user: ClerkUser) {
  if (user.fullName) {
    return user.fullName;
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || null;
}

export async function upsertUserFromClerk(user: ClerkUser) {
  const email = getPrimaryEmail(user);

  if (!email) {
    throw new Error("Authenticated user does not have an email address");
  }

  const sql = await getDbConnection();
  const result = await sql`
    INSERT INTO users (
      clerk_user_id,
      email,
      full_name,
      image_url
    )
    VALUES (
      ${user.id},
      ${email},
      ${getFullName(user)},
      ${user.imageUrl}
    )
    ON CONFLICT (clerk_user_id)
    DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      image_url = EXCLUDED.image_url,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  return result[0] ?? null;
}

export async function syncCurrentUser() {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  return upsertUserFromClerk(user);
}

export async function getUserByClerkId(clerkUserId: string) {
  const sql = await getDbConnection();
  const result = await sql`
    SELECT *
    FROM users
    WHERE clerk_user_id = ${clerkUserId}
    LIMIT 1
  `;

  return result[0] ?? null;
}

export async function getUserByStripeCustomerId(stripeCustomerId: string) {
  const sql = await getDbConnection();
  const result = await sql`
    SELECT *
    FROM users
    WHERE stripe_customer_id = ${stripeCustomerId}
    LIMIT 1
  `;

  return result[0] ?? null;
}

export async function getUserByStripeSubscriptionId(stripeSubscriptionId: string) {
  const sql = await getDbConnection();
  const result = await sql`
    SELECT *
    FROM users
    WHERE stripe_subscription_id = ${stripeSubscriptionId}
    LIMIT 1
  `;

  return result[0] ?? null;
}
