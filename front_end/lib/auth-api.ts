"use client";

export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001").replace(
    /\/$/,
    "",
  );

export const AUTH_USER_ID_KEY = "vn_jp_user_id";

export interface AuthResponse {
  userId: string;
  email?: string;
  fullName?: string;
  nationality?: "JP" | "VN";
  createdAt?: string;
}

async function requestAuth(path: string, payload: unknown) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

  return response.json() as Promise<AuthResponse>;
}

export function login(payload: { identifier: string; password: string }) {
  return requestAuth("/auth/login", payload);
}

export function register(payload: {
  email: string;
  phoneNumber: string;
  password: string;
  fullName: string;
  nationality: "JP" | "VN";
  birthDate: string;
}) {
  return requestAuth("/auth/register", payload);
}

export function forgotPassword(payload: { email: string }) {
  return requestAuth("/auth/forgot-password", payload);
}

export function resetPassword(payload: {
  email: string;
  code: string;
  newPassword: string;
}) {
  return requestAuth("/auth/reset-password", payload);
}

export function setStoredUserId(userId: string) {
  localStorage.setItem(AUTH_USER_ID_KEY, userId);
}

export function getStoredUserId() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(AUTH_USER_ID_KEY) ?? "";
}

export function clearStoredUserId() {
  localStorage.removeItem(AUTH_USER_ID_KEY);
}
