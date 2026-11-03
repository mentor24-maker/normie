import { AdminUsersWorkspace } from "@/components/admin-users-workspace";

export default function TeamPage() {
  return (
    <AdminUsersWorkspace
      apiPath="/api/admin/team"
      directoryKind="team"
      eyebrow="Team Management"
      formTitleNew="Register team member"
      formTitleEdit="Edit team member"
      introCopy="Create accounts for your team, assign roles, and keep notes on who should manage the back end."
      newButtonLabel="New Team Member"
      createButtonLabel="Create Team Member"
      directoryEyebrow="Team Directory"
      directoryTitle="All team members"
      emptyMessage="No team members found."
    />
  );
}
