/**
 * Local diagnostic: node --import tsx scripts/debug-password-reset.ts you@example.com
 * Loads .env.local via shell; does not print secrets.
 */
import { createAdminClient } from "../lib/supabase-admin";
import { isAuthEmailDeliveryConfigured } from "../lib/send-builder-auth-email";
import { sendPlayerPasswordResetEmail } from "../lib/player-password-reset-email";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: node --import tsx scripts/debug-password-reset.ts <email>");
  process.exit(1);
}

async function countAuthUsers(): Promise<number> {
  const supabase = createAdminClient();
  let page = 1;
  let total = 0;

  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) {
      throw new Error(error.message);
    }

    const batch = data.users?.length ?? 0;
    total += batch;

    if (batch < 1000) {
      return total;
    }

    page += 1;
  }
}

async function findOnFirstPage(targetEmail: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data.users?.some((user) => user.email?.toLowerCase() === targetEmail));
}

async function main() {
  console.log("authEmailConfigured:", isAuthEmailDeliveryConfigured());

  const totalUsers = await countAuthUsers();
  console.log("authUsersTotal:", totalUsers);

  const onFirstPage = await findOnFirstPage(email);
  console.log("emailOnListUsersPage1:", onFirstPage);

  try {
    await sendPlayerPasswordResetEmail({
      email,
      redirectTo: "http://localhost:3000/portal/reset"
    });
    console.log("sendPlayerPasswordResetEmail: ok");
  } catch (error) {
    console.error("sendPlayerPasswordResetEmail:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

void main();
