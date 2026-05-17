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

async function fetchPostThrowingMessage(path: string, payload: unknown) {
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

  return response;
}

function parseNestErrorMessage(errorBody: unknown, fallback: string) {
  if (!errorBody || typeof errorBody !== "object") {
    return fallback;
  }

  const message = (errorBody as { message?: unknown }).message;
  if (Array.isArray(message)) {
    return message.map(String).join(", ");
  }
  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return fallback;
}

async function requestAuth(path: string, payload: unknown) {
  const response = await fetchPostThrowingMessage(path, payload);

  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}`;

    let message = fallback;
    try {
      const errorBody: unknown = await response.json();
      message = parseNestErrorMessage(errorBody, fallback);
    } catch {
      message = fallback;
    }

    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }

  return response.json() as Promise<AuthResponse>;
}

async function requestJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetchPostThrowingMessage(path, payload);

  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}`;

    let message = fallback;
    try {
      const errorBody: unknown = await response.json();
      message = parseNestErrorMessage(errorBody, fallback);
    } catch {
      message = fallback;
    }

    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }

  return response.json() as Promise<T>;
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

export interface PasswordResetAck {
  ok: true;
  message: string;
}

export interface VerifyOtpOk {
  ok: true;
  resetToken: string;
  resetSessionExpiresAt: string;
}

/** Step ① — issues OTP + mails via Resend (backend enforces quotas). */
export function sendPasswordResetOtp(payload: { email: string }) {
  return requestJson<PasswordResetAck>(
    "/auth/password-reset/send-otp",
    payload,
  );
}

/** Step ② — consumes OTP, returns privileged reset token. */
export function verifyPasswordResetOtp(payload: { email: string; otp: string }) {
  return requestJson<VerifyOtpOk>(
    "/auth/password-reset/verify-otp",
    payload,
  );
}

/** Step ③ — exchanges reset token exactly once for a hashed password rotation. */
export function completePasswordReset(payload: {
  email: string;
  resetToken: string;
  newPassword: string;
}) {
  return requestJson<{ ok: true }>("/auth/password-reset/complete", payload);
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
