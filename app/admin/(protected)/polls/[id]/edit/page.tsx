import { AdminPollEditorForm } from "@/components/admin-poll-editor-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminPollEditPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminPollEditorForm pollId={id} />;
}
