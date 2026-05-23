import type { ReactNode } from "react";

type AdminPollUploadPodProps = {
  title: string;
  columns: string[];
  children: ReactNode;
};

export function AdminPollUploadPod({ title, columns, children }: AdminPollUploadPodProps) {
  return (
    <article className="admin-poll-upload-pod">
      <h3 className="admin-poll-upload-pod-title">{title}</h3>
      <div className="admin-poll-upload-pod-body">
        <ul className="admin-poll-upload-pod-columns">
          {columns.map((column) => (
            <li key={column}>{column}</li>
          ))}
        </ul>
        <div className="admin-poll-upload-pod-actions">{children}</div>
      </div>
    </article>
  );
}
