"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TEAM_USER_ROLES,
  TEAM_USER_STATUSES,
  type AdminUserRecord,
  type UserRole,
  type UserStatus
} from "@/lib/admin-users";
import { PUBLIC_USER_STATUSES, type PublicUserRecord, type PublicUserStatus } from "@/lib/public-users";
import { formatPlayerLastSignIn } from "@/lib/player-email-confirmation";

type DirectoryRecord = AdminUserRecord | PublicUserRecord;

type UserFormState = {
  email: string;
  password: string;
  fullName: string;
  handle: string;
  role: UserRole;
  status: UserStatus | PublicUserStatus;
  source: string;
  notes: string;
};

const emptyUserForm: UserFormState = {
  email: "",
  password: "",
  fullName: "",
  handle: "",
  role: "editor",
  status: "active",
  source: "manual",
  notes: ""
};

function createEmptyForm(directoryKind: "users" | "team"): UserFormState {
  return {
    ...emptyUserForm,
    status: "active",
    source: directoryKind === "team" ? "team" : "manual"
  };
}

function isPublicUserRecord(user: DirectoryRecord): user is PublicUserRecord {
  return "handle" in user;
}

function createFormFromUser(user: DirectoryRecord, directoryKind: "users" | "team"): UserFormState {
  return {
    email: user.email,
    password: "",
    fullName: user.fullName,
    handle: isPublicUserRecord(user) ? user.handle : "",
    role: "role" in user ? user.role : "viewer",
    status: user.status,
    source: directoryKind === "team" ? "team" : "manual",
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
  initialSelectedUserId?: string;
};

export function AdminUsersWorkspace({
  apiPath = "/api/admin/users",
  directoryKind = "users",
  eyebrow = "User Management",
  formTitleNew = "Register user",
  formTitleEdit = "Edit user",
  introCopy = "Manage registered player accounts, profile status, poll responses, and related end-user artifacts.",
  newButtonLabel = "New User",
  createButtonLabel = "Create User",
  directoryEyebrow = "User Directory",
  directoryTitle = "All users",
  emptyMessage = "No users found.",
  initialSelectedUserId = ""
}: AdminUsersWorkspaceProps) {
  const [users, setUsers] = useState<DirectoryRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [form, setForm] = useState<UserFormState>(() => createEmptyForm(directoryKind));
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const loadUsers = useCallback(async function loadUsers() {
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
  }, [apiPath]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const userId = initialSelectedUserId.trim();

    if (!userId || isLoading) {
      return;
    }

    if (users.some((user) => user.id === userId)) {
      setSelectedUserId(userId);
    }
  }, [initialSelectedUserId, isLoading, users]);

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

  async function handleInvite(source?: DirectoryRecord) {
    const payload = source ? createFormFromUser(source, directoryKind) : form;

    setIsInviting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/team/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...payload,
          resend: Boolean(source)
        })
      });
      const data = (await response.json()) as { user?: DirectoryRecord; message?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to invite team member.");
      }

      setMessage(data.message ?? "Invitation sent.");
      await loadUsers();

      if (data.user?.id) {
        setSelectedUserId(data.user.id);
      }
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Failed to invite team member.");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleDelete(user: DirectoryRecord) {
    const deleteDetail = directoryKind === "users"
      ? " This will also delete the player's poll responses and profile data."
      : "";
    const confirmed = window.confirm(`Delete ${user.email}?${deleteDetail} This cannot be undone.`);

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
            {directoryKind === "team" ? (
              <button className="secondary-button" onClick={() => void handleInvite()} type="button" disabled={isInviting}>
                {isInviting ? "Inviting..." : "Invite Team Member"}
              </button>
            ) : null}
            <button
              className="submit-button admin-blog-add-button"
              onClick={() => void handleSubmit()}
              type="button"
              disabled={isSaving}
            >
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
          {directoryKind === "team" || selectedUserId === "" ? (
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
            <label className="field">
              <span>Handle</span>
              <input
                type="text"
                value={form.handle}
                onChange={(event) => updateForm("handle", event.target.value)}
                placeholder="normie_player"
              />
            </label>
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
          {directoryKind === "team" ? (
            <label className="field admin-form-notes">
              <span>Notes</span>
              <textarea
                className="builder-textarea"
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                placeholder="What this person is responsible for, access notes, etc."
              />
            </label>
          ) : null}
          {directoryKind === "users" && selectedUser && isPublicUserRecord(selectedUser) ? (
            <div className="field admin-form-notes">
              <span>Crypto Wallets</span>
              {selectedUser.cryptoWallets.length === 0 ? (
                <p className="page-copy admin-copy">No wallets registered.</p>
              ) : (
                <ul className="admin-crypto-wallet-list">
                  {selectedUser.cryptoWallets.map((wallet) => (
                    <li key={wallet}>
                      <code>{wallet}</code>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
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
                {directoryKind === "team" ? <th>Last Sign-In</th> : <th>Last Sign-In</th>}
                {directoryKind === "users" ? <th>Handle</th> : null}
                {directoryKind === "users" ? <th>Polls</th> : null}
                {directoryKind === "users" ? <th>Points</th> : null}
                <th>Created</th>
                <th className="crud-actions-cell">Actions</th>
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
                      : isPublicUserRecord(user)
                        ? formatPlayerLastSignIn(user.lastSignInAt, user.emailConfirmedAt)
                        : ""}
                  </td>
                  {directoryKind === "users" && isPublicUserRecord(user) ? (
                    <td>@{user.handle}</td>
                  ) : null}
                  {directoryKind === "users" && "pollsTaken" in user ? <td>{user.pollsTaken}</td> : null}
                  {directoryKind === "users" && "pointsEarned" in user ? <td>{user.pointsEarned}</td> : null}
                  <td>{formatTimestamp(user.createdAt)}</td>
                  <td className="crud-actions-cell">
                    <div className="table-actions">
                      <button
                        className="polls-icon-button polls-icon-button-edit"
                        onClick={() => setSelectedUserId(user.id)}
                        type="button"
                        aria-label="Edit user"
                        title="Edit"
                      >
                        ✎
                      </button>
                      {directoryKind === "team" && user.status === "invited" ? (
                        <button
                          className="polls-icon-button"
                          onClick={() => void handleInvite(user)}
                          type="button"
                          disabled={isInviting}
                          aria-label="Resend invite"
                          title="Resend invite"
                        >
                          ↻
                        </button>
                      ) : null}
                      <button
                        className="polls-icon-button polls-icon-button-danger"
                        onClick={() => void handleDelete(user)}
                        type="button"
                        disabled={isDeleting}
                        aria-label="Delete user"
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={directoryKind === "users" ? 8 : 6}>
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
