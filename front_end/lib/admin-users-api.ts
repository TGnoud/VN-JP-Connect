"use client";

import { API_BASE_URL, getStoredUserId } from "@/lib/auth-api";

export type AdminUserStatus = "active" | "frozen";
export type AdminUserStatusFilter = "all" | AdminUserStatus;
export type AdminReportStatus = "pending" | "reviewed" | "dismissed";
export type AdminReportAction = "dismiss" | "freeze";

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  country: "VN" | "JP";
  status: AdminUserStatus;
  joinDate: string | null;
  reports: number;
  color: string;
}

export interface AdminUserDetail extends AdminUserSummary {
  detail: {
    connections: number;
    messages: number;
    occupation: string;
    location: string;
    lastActive: string | null;
    languages: string[];
    bio: string;
  };
}

export interface AdminUsersResponse {
  users: AdminUserSummary[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  stats: {
    totalUsers: number;
  };
}

export interface AdminReportEvidenceFile {
  name: string;
  type: "image" | "pdf";
  size: number;
  url: string;
  mimeType: string;
}

export interface AdminUserReport {
  id: string;
  reason: string;
  type: string;
  description: string;
  reportedUserId: string;
  reportedUser: string;
  reporterId: string;
  reporter: string;
  date: string | null;
  files: AdminReportEvidenceFile[];
  status: AdminReportStatus;
}

export interface AdminReportsResponse {
  reports: AdminUserReport[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  stats: {
    pendingCount: number;
  };
}

const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "";

export class AdminUsersApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AdminUsersApiError";
  }
}

export function isAdminUsersAuthError(
  error: unknown,
): error is AdminUsersApiError {
  return (
    error instanceof AdminUsersApiError &&
    (error.status === 401 || error.status === 403)
  );
}

function requireAdminUserId() {
  const storedUserId = getStoredUserId();

  if (storedUserId) {
    return storedUserId;
  }

  const isLocalPage =
    typeof window !== "undefined" && window.location.hostname.includes("localhost");

  if (DEV_USER_ID && isLocalPage) {
    return DEV_USER_ID;
  }

  throw new Error("Admin login is required before using user management.");
}

async function requestAdminUsersApi<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("x-user-id", requireAdminUserId());

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    throw new Error(
      `Cannot reach backend API at ${API_BASE_URL}. ${
        error instanceof Error ? error.message : "network error"
      }`,
    );
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const errorBody = await response.json();
      message = errorBody.message ?? message;
    } catch {
      // Keep the status-based message when the response is not JSON.
    }

    throw new AdminUsersApiError(
      Array.isArray(message) ? message.join(", ") : message,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export function getAdminUsers({
  page,
  pageSize,
  search,
  status,
}: {
  page: number;
  pageSize: number;
  search: string;
  status: AdminUserStatusFilter;
}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    status,
  });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  return requestAdminUsersApi<AdminUsersResponse>(`/admin/users?${params}`);
}

export function getAdminUserDetail(userId: string) {
  return requestAdminUsersApi<AdminUserDetail>(
    `/admin/users/${encodeURIComponent(userId)}`,
  );
}

export function updateAdminUserStatus(userId: string, status: AdminUserStatus) {
  return requestAdminUsersApi<AdminUserSummary>(
    `/admin/users/${encodeURIComponent(userId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export function getAdminUserReports({
  page,
  pageSize,
  status,
}: {
  page: number;
  pageSize: number;
  status?: AdminReportStatus;
}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (status) {
    params.set("status", status);
  }

  return requestAdminUsersApi<AdminReportsResponse>(
    `/admin/users/reports?${params}`,
  );
}

export function updateAdminUserReport(reportId: string, action: AdminReportAction) {
  return requestAdminUsersApi<AdminUserReport>(
    `/admin/users/reports/${encodeURIComponent(reportId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ action }),
    },
  );
}

export function resolveAdminUserEvidenceUrl(url?: string) {
  if (!url) {
    return "";
  }

  if (url.startsWith("/uploads/")) {
    return `${API_BASE_URL}${url}`;
  }

  return url;
}
