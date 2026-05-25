import { AdminUsersWorkspace } from "@/components/admin-users-workspace";

export default function UsersPage() {
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
    />
  );
}
