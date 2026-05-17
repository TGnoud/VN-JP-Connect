"use client";

import { API_BASE_URL, getStoredUserId } from "@/lib/auth-api";

export type AdminEventStatus = "published" | "draft";
export type AdminEventFormat = "in-person" | "online" | "hybrid";

export interface AdminEventData {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  format: AdminEventFormat;
  location: string;
  onlineUrl: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  capacity: number | null;
  currentParticipants: number;
  coverImageUrl: string;
  status: AdminEventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminEventsResponse {
  events: AdminEventData[];
  stats: {
    totalCount: number;
    publishedCount: number;
    draftCount: number;
  };
}

export type AdminEventPayload = Omit<
  AdminEventData,
  "id" | "currentParticipants" | "createdAt" | "updatedAt"
>;

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

  throw new Error("Admin login is required before using event management.");
}

async function requestAdminApi<T>(path: string, init: RequestInit = {}) {
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

    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }

  return response.json() as Promise<T>;
}

export function getAdminEvents() {
  return requestAdminApi<AdminEventsResponse>("/admin/events");
}

export function createAdminEvent(payload: AdminEventPayload) {
  return requestAdminApi<AdminEventData>("/admin/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminEvent(eventId: string, payload: AdminEventPayload) {
  return requestAdminApi<AdminEventData>(`/admin/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminEvent(eventId: string) {
  return requestAdminApi<{ id: string; deleted: true }>(`/admin/events/${eventId}`, {
    method: "DELETE",
  });
}

export function uploadAdminEventCover(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return requestAdminApi<{ url: string }>("/admin/events/cover-image", {
    method: "POST",
    body: formData,
  });
}

export function resolveAdminEventMediaUrl(url?: string) {
  if (!url) {
    return "";
  }

  if (url.startsWith("/uploads/")) {
    return `${API_BASE_URL}${url}`;
  }

  return url;
}
