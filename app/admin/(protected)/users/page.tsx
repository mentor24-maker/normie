import { AdminUsersWorkspace } from "@/components/admin-users-workspace";

type UsersPageProps = {
  searchParams: Promise<{ user?: string }>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const { user } = await searchParams;

  return (
    <AdminUsersWorkspace
      eyebrow="Player Management"
      formTitleNew="Register player"
      formTitleEdit="Edit player"
      introCopy="Manage registered end users, player profiles, poll responses, and point history."
      newButtonLabel="New Player"
      createButtonLabel="Create Player"
      directoryEyebrow="Player Directory"
      directoryTitle="All registered players"
      emptyMessage="No registered players found."
      initialSelectedUserId={user?.trim() ?? ""}
    />
  );
}
