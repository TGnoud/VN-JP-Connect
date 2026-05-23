"use client";

import { API_BASE_URL, getStoredUserId } from "@/lib/auth-api";

export type AdminDashboardRange = "7d" | "30d" | "3m" | "1y";

export interface AdminDashboardMetric {
  value: number;
  changePercent: number | null;
}

export interface AdminDashboardChartPoint {
  label: string;
  vn: number;
  jp: number;
}

export interface AdminDashboardResponse {
  range: AdminDashboardRange;
  totalUsers: AdminDashboardMetric;
  vnUsers: AdminDashboardMetric;
  jpUsers: AdminDashboardMetric;
  totalEvents: AdminDashboardMetric;
  newUsersToday: AdminDashboardMetric;
  frozenAccounts: AdminDashboardMetric;
  systemGrowthRate: AdminDashboardMetric;
  userGrowthChart: AdminDashboardChartPoint[];
  userDistribution: {
    total: number;
    vn: {
      count: number;
      percent: number;
    };
    jp: {
      count: number;
      percent: number;
    };
  };
  eventStats: {
    totalEvents: number;
    interestedUsers: number;
  };
}

const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "";

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

  throw new Error("Admin login is required before using dashboard statistics.");
}

async function requestAdminDashboardApi<T>(path: string) {
  const headers = new Headers();
  headers.set("x-user-id", requireAdminUserId());

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
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

    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }

  return response.json() as Promise<T>;
}

export function getAdminDashboard(range: AdminDashboardRange) {
  return requestAdminDashboardApi<AdminDashboardResponse>(
    `/admin/dashboard?range=${encodeURIComponent(range)}`,
  );
}
