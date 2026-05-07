"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TEAM_USER_ROLES,
  TEAM_USER_STATUSES,
  type AdminUserRecord,
  type UserRole,
  type UserStatus
} from "@/lib/admin-users";

type UserFormState = {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  notes: string;
};

const emptyUserForm: UserFormState = {
  email: "",
  password: "",
  fullName: "",
  role: "editor",
  status: "active",
  notes: ""
};

function createFormFromUser(user: AdminUserRecord): UserFormState {
  return {
    email: user.email,
    password: "",
    fullName: user.fullName,
    role: user.role,
    status: user.status,
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

export function AdminUsersWorkspace() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [form, setForm] = useState<UserFormState>(emptyUserForm);
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
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = (await response.json()) as { users?: AdminUserRecord[]; error?: string };

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
      setForm(emptyUserForm);
      return;
    }

    setForm(createFormFromUser(selectedUser));
  }, [selectedUser]);

  function updateForm<K extends keyof UserFormState>(key: K, value: UserFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setSelectedUserId("");
    setForm(emptyUserForm);
    setError(null);
    setMessage(null);
  }

  async function handleSubmit() {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        selectedUserId ? `/api/admin/users/${selectedUserId}` : "/api/admin/users",
        {
          method: selectedUserId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(form)
        }
      );

      const data = (await response.json()) as { user?: AdminUserRecord; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save user.");
      }

      setMessage(selectedUserId ? "User updated." : "User created.");
      await loadUsers();

      if (data.user?.id) {
        setSelectedUserId(data.user.id);
      } else if (!selectedUserId) {
        setSelectedUserId("");
        setForm(emptyUserForm);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save user.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(user: AdminUserRecord) {
    const confirmed = window.confirm(`Delete ${user.email}? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
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
            <div className="panel-label">User Management</div>
            <h2>{selectedUserId ? "Edit user" : "Register user"}</h2>
            <p className="page-copy admin-copy">
              Create accounts for your team, assign roles, and keep notes on who should manage the
              back end.
            </p>
          </div>
          <div className="admin-actions">
            <button className="secondary-button" onClick={resetForm} type="button">
              New User
            </button>
            <button className="submit-button" onClick={() => void handleSubmit()} type="button" disabled={isSaving}>
              {isSaving ? "Saving..." : selectedUserId ? "Save Changes" : "Create User"}
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
              placeholder="team@normie.one"
            />
          </label>
          <label className="field">
            <span>{selectedUserId ? "New password (optional)" : "Password"}</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateForm("password", event.target.value)}
              placeholder={selectedUserId ? "Leave blank to keep current password" : "At least 8 characters"}
            />
          </label>
          <label className="field">
            <span>Full name</span>
            <input
              type="text"
              value={form.fullName}
              onChange={(event) => updateForm("fullName", event.target.value)}
              placeholder="Alex Normie"
            />
          </label>
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
          <label className="field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => updateForm("status", event.target.value as UserStatus)}
            >
              {TEAM_USER_STATUSES.map((status) => (
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
            <div className="panel-label">User Directory</div>
            <h2>All users</h2>
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
                <th>Role</th>
                <th>Status</th>
                <th>Last Sign-In</th>
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
                  <td>{user.role}</td>
                  <td>{user.status}</td>
                  <td>{formatTimestamp(user.lastSignInAt)}</td>
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
                    No users found.
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
