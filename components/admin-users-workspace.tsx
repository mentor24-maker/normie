"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TEAM_USER_ROLES,
  TEAM_USER_STATUSES,
  type AdminUserRecord,
  type UserRole,
  type UserStatus
} from "@/lib/admin-users";
import { PUBLIC_USER_STATUSES, type PublicUserRecord, type PublicUserStatus } from "@/lib/public-users";

type DirectoryRecord = AdminUserRecord | PublicUserRecord;

type UserFormState = {
  email: string;
  password: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  status: UserStatus | PublicUserStatus;
  source: string;
  notes: string;
};

const emptyUserForm: UserFormState = {
  email: "",
  password: "",
  fullName: "",
  firstName: "",
  lastName: "",
  phone: "",
  role: "editor",
  status: "lead",
  source: "manual",
  notes: ""
};

function createEmptyForm(directoryKind: "users" | "team"): UserFormState {
  return {
    ...emptyUserForm,
    status: directoryKind === "team" ? "active" : "lead",
    source: directoryKind === "team" ? "team" : "manual"
  };
}

function isPublicUserRecord(user: DirectoryRecord): user is PublicUserRecord {
  return "firstName" in user;
}

function createFormFromUser(user: DirectoryRecord, directoryKind: "users" | "team"): UserFormState {
  return {
    email: user.email,
    password: "",
    fullName: user.fullName,
    firstName: isPublicUserRecord(user) ? user.firstName : "",
    lastName: isPublicUserRecord(user) ? user.lastName : "",
    phone: isPublicUserRecord(user) ? user.phone : "",
    role: "role" in user ? user.role : "viewer",
    status: user.status,
    source: isPublicUserRecord(user) ? user.source : directoryKind === "team" ? "team" : "manual",
    notes: user.notes
  };
}

function formatTimestamp(value: string) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

type AdminUsersWorkspaceProps = {
  apiPath?: string;
  directoryKind?: "users" | "team";
  eyebrow?: string;
  formTitleNew?: string;
  formTitleEdit?: string;
  introCopy?: string;
  newButtonLabel?: string;
  createButtonLabel?: string;
  directoryEyebrow?: string;
  directoryTitle?: string;
  emptyMessage?: string;
};

export function AdminUsersWorkspace({
  apiPath = "/api/admin/users",
  directoryKind = "users",
  eyebrow = "User Management",
  formTitleNew = "Register user",
  formTitleEdit = "Edit user",
  introCopy = "Create end-user accounts, assign roles, and keep notes on contact or membership status.",
  newButtonLabel = "New User",
  createButtonLabel = "Create User",
  directoryEyebrow = "User Directory",
  directoryTitle = "All users",
  emptyMessage = "No users found."
}: AdminUsersWorkspaceProps) {
  const [users, setUsers] = useState<DirectoryRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [form, setForm] = useState<UserFormState>(() => createEmptyForm(directoryKind));
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  async function loadUsers() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(apiPath, { cache: "no-store" });
      const data = (await response.json()) as { users?: DirectoryRecord[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load users.");
      }

      setUsers(data.users ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load users.");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    if (!selectedUser) {
      setForm(createEmptyForm(directoryKind));
      return;
    }

    setForm(createFormFromUser(selectedUser, directoryKind));
  }, [directoryKind, selectedUser]);

  function updateForm<K extends keyof UserFormState>(key: K, value: UserFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setSelectedUserId("");
    setForm(createEmptyForm(directoryKind));
    setError(null);
    setMessage(null);
  }

  async function handleSubmit() {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        selectedUserId ? `${apiPath}/${selectedUserId}` : apiPath,
        {
          method: selectedUserId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(form)
        }
      );

      const data = (await response.json()) as { user?: DirectoryRecord; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save user.");
      }

      setMessage(selectedUserId ? "User updated." : `${createButtonLabel.replace(/^Create /, "")} created.`);
      await loadUsers();

      if (data.user?.id) {
        setSelectedUserId(data.user.id);
      } else if (!selectedUserId) {
        setSelectedUserId("");
        setForm(createEmptyForm(directoryKind));
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save user.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(user: DirectoryRecord) {
    const confirmed = window.confirm(`Delete ${user.email}? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${apiPath}/${user.id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete user.");
      }

      if (selectedUserId === user.id) {
        resetForm();
      }

      setMessage("User deleted.");
      await loadUsers();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete user.");
    } finally {
      setIsDeleting(false);
    }
  }

  const userSummary = isLoading
    ? "Loading users..."
    : `${users.length} user${users.length === 1 ? "" : "s"} loaded`;

  return (
    <section className="admin-stack">
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">{eyebrow}</div>
            <h2>{selectedUserId ? formTitleEdit : formTitleNew}</h2>
            <p className="page-copy admin-copy">
              {introCopy}
            </p>
          </div>
          <div className="admin-actions">
            <button className="secondary-button" onClick={resetForm} type="button">
              {newButtonLabel}
            </button>
            <button className="submit-button" onClick={() => void handleSubmit()} type="button" disabled={isSaving}>
              {isSaving ? "Saving..." : selectedUserId ? "Save Changes" : createButtonLabel}
            </button>
          </div>
        </div>

        <div className="admin-form-grid">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateForm("email", event.target.value)}
              placeholder={directoryKind === "team" ? "team@normie.one" : "reader@example.com"}
            />
          </label>
          {directoryKind === "team" ? (
            <label className="field">
              <span>{selectedUserId ? "New password (optional)" : "Password"}</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateForm("password", event.target.value)}
                placeholder={selectedUserId ? "Leave blank to keep current password" : "At least 8 characters"}
              />
            </label>
          ) : null}
          <label className="field">
            <span>Full name</span>
            <input
              type="text"
              value={form.fullName}
              onChange={(event) => updateForm("fullName", event.target.value)}
              placeholder="Alex Normie"
            />
          </label>
          {directoryKind === "users" ? (
            <>
              <label className="field">
                <span>First name</span>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(event) => updateForm("firstName", event.target.value)}
                  placeholder="Alex"
                />
              </label>
              <label className="field">
                <span>Last name</span>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(event) => updateForm("lastName", event.target.value)}
                  placeholder="Normie"
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                  placeholder="Optional"
                />
              </label>
              <label className="field">
                <span>Source</span>
                <input
                  type="text"
                  value={form.source}
                  onChange={(event) => updateForm("source", event.target.value)}
                  placeholder="contact-form"
                />
              </label>
            </>
          ) : (
            <label className="field">
              <span>Role</span>
              <select value={form.role} onChange={(event) => updateForm("role", event.target.value as UserRole)}>
                {TEAM_USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => updateForm("status", event.target.value as UserFormState["status"])}
            >
              {(directoryKind === "team" ? TEAM_USER_STATUSES : PUBLIC_USER_STATUSES).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="field admin-form-notes">
            <span>Notes</span>
            <textarea
              className="builder-textarea"
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="What this person is responsible for, access notes, etc."
            />
          </label>
        </div>

        {message ? <div className="notice success admin-notice">{message}</div> : null}
        {error ? <div className="notice error admin-notice">{error}</div> : null}
      </section>

      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">{directoryEyebrow}</div>
            <h2>{directoryTitle}</h2>
            <p className="page-copy admin-copy">{userSummary}</p>
          </div>
          <div className="admin-actions">
            <button className="secondary-button" onClick={() => void loadUsers()} type="button" disabled={isLoading}>
              Refresh
            </button>
          </div>
        </div>

        <div className="table-shell">
          <table className="polls-table users-table">
            <thead>
              <tr>
                <th>User</th>
                {directoryKind === "team" ? <th>Role</th> : null}
                <th>Status</th>
                {directoryKind === "team" ? <th>Last Sign-In</th> : <th>Source</th>}
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr className={selectedUserId === user.id ? "is-selected-row" : undefined} key={user.id}>
                  <td>
                    <strong>{user.fullName || "Unnamed user"}</strong>
                    <div className="admin-table-subcopy">{user.email}</div>
                  </td>
                  {directoryKind === "team" && "role" in user ? <td>{user.role}</td> : null}
                  <td>{user.status}</td>
                  <td>
                    {directoryKind === "team" && "lastSignInAt" in user
                      ? formatTimestamp(user.lastSignInAt)
                      : "source" in user
                        ? user.source || "manual"
                        : ""}
                  </td>
                  <td>{formatTimestamp(user.createdAt)}</td>
                  <td>
                    <div className="builder-template-actions">
                      <button
                        className="secondary-button"
                        onClick={() => setSelectedUserId(user.id)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="row-delete-button"
                        onClick={() => void handleDelete(user)}
                        type="button"
                        disabled={isDeleting}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
