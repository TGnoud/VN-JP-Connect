"use client";

import { API_BASE_URL, getStoredUserId } from "@/lib/auth-api";

export type UserEventFormat = "in-person" | "online" | "hybrid";

export interface UserEventParticipantPreview {
  id: string;
  fullName: string;
  avatarUrl: string;
}

export interface UserEventData {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  format: UserEventFormat;
  location: string;
  onlineUrl: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  capacity: number | null;
  currentParticipants: number;
  coverImageUrl: string;
  isJoined: boolean;
  isBookmarked: boolean;
  participantsPreview: UserEventParticipantPreview[];
  shareUrl: string;
}

export interface UserEventsResponse {
  events: UserEventData[];
}

const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "";

function requireUserId() {
  const storedUserId = getStoredUserId();

  if (storedUserId) {
    return storedUserId;
  }

  const isLocalPage =
    typeof window !== "undefined" && window.location.hostname.includes("localhost");

  if (DEV_USER_ID && isLocalPage) {
    return DEV_USER_ID;
  }

  throw new Error("Login is required before using events.");
}

async function requestEventsApi<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("x-user-id", requireUserId());

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

export function getUserEvents({
  search = "",
  category = "",
}: {
  search?: string;
  category?: string;
} = {}) {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set("search", search.trim());
  }

  if (category.trim() && category !== "すべて") {
    params.set("category", category.trim());
  }

  const query = params.toString();
  return requestEventsApi<UserEventsResponse>(`/events${query ? `?${query}` : ""}`);
}

export function getUserEvent(eventId: string) {
  return requestEventsApi<UserEventData>(`/events/${eventId}`);
}

export function joinUserEvent(eventId: string) {
  return requestEventsApi<UserEventData>(`/events/${eventId}/participants`, {
    method: "POST",
  });
}

export function leaveUserEvent(eventId: string) {
  return requestEventsApi<UserEventData>(`/events/${eventId}/participants`, {
    method: "DELETE",
  });
}

export function bookmarkUserEvent(eventId: string) {
  return requestEventsApi<UserEventData>(`/events/${eventId}/bookmark`, {
    method: "POST",
  });
}

export function unbookmarkUserEvent(eventId: string) {
  return requestEventsApi<UserEventData>(`/events/${eventId}/bookmark`, {
    method: "DELETE",
  });
}

export function resolveEventMediaUrl(url?: string) {
  if (!url) {
    return "";
  }

  if (url.startsWith("/uploads/")) {
    return `${API_BASE_URL}${url}`;
  }

  return url;
}
