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

function parseApiErrorMessage(path: string, status: number, rawBody: string) {
  const fallback = `Request failed with status ${status}`;
  const trimmed = rawBody.trim();

  if (!trimmed) {
    return fallback;
  }

  try {
    const errorBody = JSON.parse(trimmed) as { message?: unknown };
    const message = errorBody.message;

    if (Array.isArray(message)) {
      return message.map(String).join(", ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  } catch {
    // Non-JSON responses are handled below.
  }

  const plainText = trimmed
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/Cannot\s+GET\s+\/events/i.test(plainText)) {
    return `Backend API at ${API_BASE_URL} does not expose ${path}. Check Render deployment and NEXT_PUBLIC_API_BASE_URL.`;
  }

  return plainText.slice(0, 300) || fallback;
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
    let rawBody = "";

    try {
      rawBody = await response.text();
    } catch {
      // Keep an empty body and use the status fallback below.
    }

    throw new Error(parseApiErrorMessage(path, response.status, rawBody));
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
