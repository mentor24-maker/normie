import { safeUserText } from "./admin-users";

export const PUBLIC_USER_STATUSES = ["lead", "active", "unsubscribed", "blocked"] as const;

export type PublicUserStatus = (typeof PUBLIC_USER_STATUSES)[number];

export type PublicUserRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  source: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PublicUserRecord = {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: PublicUserStatus;
  source: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export function normalizePublicUserStatus(value: unknown): PublicUserStatus {
  const candidate = safeUserText(value, 40).toLowerCase();
  return PUBLIC_USER_STATUSES.includes(candidate as PublicUserStatus)
    ? (candidate as PublicUserStatus)
    : "lead";
}

export function buildPublicUserFullName(firstName: string, lastName: string, fallback = "") {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || fallback;
}

export function mergePublicUserRecord(row: PublicUserRow): PublicUserRecord {
  const firstName = safeUserText(row.first_name, 120);
  const lastName = safeUserText(row.last_name, 120);
  const fullName = safeUserText(row.full_name, 255) || buildPublicUserFullName(firstName, lastName);

  return {
    id: safeUserText(row.id, 80),
    email: safeUserText(row.email, 255),
    fullName,
    firstName,
    lastName,
    phone: safeUserText(row.phone, 80),
    status: normalizePublicUserStatus(row.status),
    source: safeUserText(row.source, 120),
    notes: safeUserText(row.notes, 4000),
    createdAt: safeUserText(row.created_at, 120),
    updatedAt: safeUserText(row.updated_at, 120)
  };
}
