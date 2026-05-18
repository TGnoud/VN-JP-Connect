"use client";

import { getStoredUserId } from "@/lib/auth-api";

export const MAX_PROFILE_BIO_LENGTH = 300;

export interface ProfileTag {
  id: string;
  name: string;
  type: string;
}

export interface ProfileLanguage {
  language: string;
  level: string;
}

export interface ProfilePhoto {
  id: string;
  url: string;
  isMain: boolean;
  uploadedAt: string;
}

export interface ProfileData {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  nationality: "JP" | "VN";
  age: number | null;
  gender: "male" | "female" | "other" | null;
  location: string;
  occupation: string;
  education: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  socialLinks: {
    instagram: string;
    facebook: string;
    line: string;
  };
  languages: ProfileLanguage[];
  interests: ProfileTag[];
  photos: ProfilePhoto[];
  likeRate: number;
  connectionsCount: number;
  joinedAt: string;
  updatedAt: string;
}

export interface PublicProfileData {
  id: string;
  fullName: string;
  nationality: "JP" | "VN";
  age: number | null;
  gender: "male" | "female" | "other" | null;
  location: string;
  occupation: string;
  education: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  languages: ProfileLanguage[];
  interests: ProfileTag[];
  photos: ProfilePhoto[];
  likeRate: number;
  connectionsCount: number;
  joinedAt: string;
  updatedAt: string;
  isMe: boolean;
}

export interface DiscoverProfileData {
  id: string;
  fullName: string;
  nationality: "JP" | "VN";
  age: number | null;
  gender: "male" | "female" | "other" | null;
  location: string;
  occupation: string;
  bio: string;
  avatarUrl: string;
  languages: ProfileLanguage[];
  photos: ProfilePhoto[];
  interests: ProfileTag[];
  likeRate: number;
  connectionsCount: number;
  joinedAt: string;
}

export interface ConversationResponse {
  id: string;
  matchId: string;
  createdAt: string;
  partner: {
    id: string;
    fullName: string;
    nationality: "JP" | "VN";
    avatarUrl: string;
  };
}

export interface ChatParticipant {
  id: string;
  fullName: string;
  nationality: "JP" | "VN";
  avatarUrl: string;
  location: string;
  level: string;
}

export interface ChatConversation {
  id: string;
  type: "direct" | "group";
  matchId: string | null;
  partnerId: string | null;
  name: string;
  location: string;
  level: string;
  avatar: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  participants: ChatParticipant[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatAttachment {
  url: string;
  file_name?: string;
  mime_type?: string;
  size?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderId: "me" | "partner";
  content: string;
  translatedContent: string;
  messageType: "text" | "file" | "media" | "voice" | "system";
  status: "sent" | "read";
  readBy: string[];
  attachments: ChatAttachment[];
  sentAt: string;
}

export interface ChatMessagesResponse {
  messages: ChatMessage[];
  totalCount: number;
  requiresFavoritePrompt: boolean;
}

export interface MessageCreatedRealtimeEvent {
  type: "message.created";
  conversationId: string;
  message: ChatMessage;
  conversation: ChatConversation;
}

export interface MessagesReadRealtimeEvent {
  type: "messages.read";
  conversationId: string;
  readerUserId: string;
  readAt: string;
}

export interface MatchedConversationUser {
  id: string;
  fullName: string;
  nationality: "JP" | "VN";
  avatarUrl: string;
  location: string;
}

export interface HomeFilterOptions {
  genders: Array<"male" | "female" | "other">;
  nationalities: Array<"JP" | "VN">;
  japaneseLevels: string[];
  interests: Array<{ id: string; name: string }>;
  ageRange: {
    min: number;
    max: number;
    defaultMin: number;
    defaultMax: number;
  };
  distanceRange: {
    min: number;
    max: number;
    defaultMax: number;
    supported: boolean;
  };
}

export interface DiscoverQueryParams {
  gender?: string;
  nationality?: "JP" | "VN";
  ageMin?: number;
  ageMax?: number;
  distanceMax?: number;
  japaneseLevels?: string[];
  interestTagIds?: string[];
  excludeUserIds?: string[];
  limit?: number;
}

export interface DiscoverInterestResponse {
  status: "pending" | "matched";
  matchId: string;
  conversation?: ConversationResponse;
}

export interface HomeNavSummary {
  unreadMessagesCount: number;
  unreadEventsCount: number;
}

export interface ProfileOptions {
  genders: string[];
  nationalities: string[];
  locations: string[];
  languages: string[];
  languageLevels: string[];
}

export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001").replace(
    /\/$/,
    "",
  );
export const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "";

function requireCurrentUserId() {
  const storedUserId = getStoredUserId();

  if (storedUserId) {
    return storedUserId;
  }

  const isLocalPage =
    typeof window !== "undefined" && window.location.hostname.includes("localhost");

  if (DEV_USER_ID && isLocalPage) {
    return DEV_USER_ID;
  }

  throw new Error("Login is required before using profile API requests.");
}

async function requestApi<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("x-user-id", requireCurrentUserId());

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    const isLocalApi = API_BASE_URL.includes("localhost");
    const deployedPage =
      typeof window !== "undefined" && !window.location.hostname.includes("localhost");
    const hint =
      isLocalApi && deployedPage
        ? " NEXT_PUBLIC_API_BASE_URL is still pointing to localhost on the deployed frontend."
        : " Check that the Render backend URL is reachable and CORS_ORIGINS includes this frontend origin.";

    throw new Error(
      `Cannot reach backend API at ${API_BASE_URL}.${hint} Original error: ${
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

export function subscribeConversationEvents({
  onMessageCreated,
  onMessagesRead,
  onError,
}: {
  onMessageCreated?: (event: MessageCreatedRealtimeEvent) => void;
  onMessagesRead?: (event: MessagesReadRealtimeEvent) => void;
  onError?: (event: Event) => void;
}) {
  if (typeof EventSource === "undefined") {
    return () => undefined;
  }

  const url = new URL(`${API_BASE_URL}/conversations/events`);
  url.searchParams.set("userId", requireCurrentUserId());
  const source = new EventSource(url.toString());

  source.addEventListener("message.created", (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data) as Omit<
        MessageCreatedRealtimeEvent,
        "type"
      >;
      onMessageCreated?.({ type: "message.created", ...data });
    } catch (error) {
      console.error(error);
    }
  });

  source.addEventListener("messages.read", (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data) as Omit<
        MessagesReadRealtimeEvent,
        "type"
      >;
      onMessagesRead?.({ type: "messages.read", ...data });
    } catch (error) {
      console.error(error);
    }
  });

  source.onerror = (event) => {
    onError?.(event);
  };

  return () => source.close();
}

export function resolveMediaUrl(url?: string, preferredWidth = 1200) {
  if (!url) {
    return "";
  }

  if (url.startsWith("/uploads/")) {
    return `${API_BASE_URL}${url}`;
  }

  if (url.startsWith("https://images.unsplash.com/")) {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set("w", String(preferredWidth));
    parsedUrl.searchParams.set("q", "90");
    return parsedUrl.toString();
  }

  return url;
}

export function getMyProfile() {
  return requestApi<ProfileData>("/profiles/me");
}

export function getUserPublicProfile(userId: string) {
  return requestApi<PublicProfileData>(`/users/${userId}/profile`);
}

function appendCsvParam(params: URLSearchParams, name: string, values?: string[]) {
  const cleanValues = values?.filter(Boolean) ?? [];

  if (cleanValues.length > 0) {
    params.set(name, cleanValues.join(","));
  }
}

export function getHomeFilters() {
  return requestApi<HomeFilterOptions>("/home/filters");
}

export function getHomeNavSummary() {
  return requestApi<HomeNavSummary>("/home/nav-summary");
}

export function getDiscoverProfiles(query: DiscoverQueryParams = {}) {
  const params = new URLSearchParams();

  if (query.gender) params.set("gender", query.gender);
  if (query.nationality) params.set("nationality", query.nationality);
  if (query.ageMin !== undefined) params.set("ageMin", String(query.ageMin));
  if (query.ageMax !== undefined) params.set("ageMax", String(query.ageMax));
  if (query.distanceMax !== undefined) params.set("distanceMax", String(query.distanceMax));
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  appendCsvParam(params, "japaneseLevels", query.japaneseLevels);
  appendCsvParam(params, "interestTagIds", query.interestTagIds);
  appendCsvParam(params, "excludeUserIds", query.excludeUserIds);

  const queryString = params.toString();
  return requestApi<DiscoverProfileData[]>(
    queryString ? `/home/discover?${queryString}` : "/home/discover",
  );
}

export function showDiscoverInterest(userId: string) {
  return requestApi<DiscoverInterestResponse>(`/home/discover/${userId}/interest`, {
    method: "POST",
  });
}

export function reportUser(
  userId: string,
  payload: { reason: string; detail: string; evidence: File[] },
) {
  const formData = new FormData();
  formData.append("reason", payload.reason);
  formData.append("detail", payload.detail);

  for (const file of payload.evidence) {
    formData.append("evidence", file);
  }

  return requestApi<{ id: string; status: string; createdAt: string }>(
    `/users/${userId}/report`,
    {
      method: "POST",
      body: formData,
    },
  );
}

export function openConversationWithUser(userId: string) {
  return requestApi<ConversationResponse>(`/conversations/with/${userId}`, {
    method: "POST",
  });
}

export function getConversations(search = "") {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set("search", search.trim());
  }

  const queryString = params.toString();
  return requestApi<ChatConversation[]>(
    queryString ? `/conversations?${queryString}` : "/conversations",
  );
}

export function getConversationMessages(conversationId: string) {
  return requestApi<ChatMessagesResponse>(
    `/conversations/${conversationId}/messages?limit=100`,
  );
}

export function sendConversationMessage(
  conversationId: string,
  payload: {
    content: string;
    messageType?: "text" | "file" | "media" | "voice" | "system";
    translatedContent?: string;
    attachments?: ChatAttachment[];
  },
) {
  return requestApi<ChatMessage>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function sendConversationAttachment(
  conversationId: string,
  file: File,
  messageType: "file" | "media" | "voice",
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("messageType", messageType);

  return requestApi<ChatMessage>(`/conversations/${conversationId}/attachments`, {
    method: "POST",
    body: formData,
  });
}

export function markConversationRead(conversationId: string) {
  return requestApi<{ unreadCount: number }>(`/conversations/${conversationId}/read`, {
    method: "POST",
  });
}

export function translateConversationText(payload: {
  text: string;
  direction: "ja-vi" | "vi-ja";
}) {
  return requestApi<{ direction: "ja-vi" | "vi-ja"; translatedText: string }>(
    "/conversations/translate",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getMatchedConversationUsers() {
  return requestApi<MatchedConversationUser[]>("/conversations/matched-users");
}

export function createGroupConversation(payload: { name: string; memberIds: string[] }) {
  return requestApi<ChatConversation>("/conversations/groups", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function leaveGroupConversation(conversationId: string) {
  return requestApi<{
    conversationId: string;
    left: boolean;
    remainingParticipantCount: number;
  }>(`/conversations/${conversationId}/leave`, {
    method: "POST",
  });
}

export function submitConversationFavoriteFeedback(
  conversationId: string,
  value: "liked" | "skipped",
) {
  return requestApi<{ conversationId: string; targetUserId: string; value: string }>(
    `/conversations/${conversationId}/favorite-feedback`,
    {
      method: "POST",
      body: JSON.stringify({ value }),
    },
  );
}

export function getProfileOptions() {
  return requestApi<ProfileOptions>("/profile-options");
}

export function searchInterestTags(query = "") {
  const params = new URLSearchParams({ type: "interest" });

  if (query) {
    params.set("q", query);
  }

  return requestApi<ProfileTag[]>(`/tags?${params.toString()}`);
}

export function updatePersonalProfile(payload: unknown) {
  return requestApi<ProfileData>("/profiles/me/personal", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateBio(bio: string) {
  if (bio.length > MAX_PROFILE_BIO_LENGTH) {
    throw new Error(`bio must be at most ${MAX_PROFILE_BIO_LENGTH} characters`);
  }

  return requestApi<ProfileData>("/profiles/me/bio", {
    method: "PATCH",
    body: JSON.stringify({ bio }),
  });
}

export function replaceLanguages(languages: ProfileLanguage[]) {
  return requestApi<ProfileData>("/profiles/me/languages", {
    method: "PUT",
    body: JSON.stringify({ languages }),
  });
}

export function replaceInterests(tagIds: string[]) {
  return requestApi<ProfileData>("/profiles/me/interests", {
    method: "PUT",
    body: JSON.stringify({ tagIds }),
  });
}

export function updateAvatarUrl(url: string) {
  return requestApi<ProfileData>("/profiles/me/avatar-url", {
    method: "PATCH",
    body: JSON.stringify({ url }),
  });
}

export function updateCoverUrl(url: string) {
  return requestApi<ProfileData>("/profiles/me/cover-url", {
    method: "PATCH",
    body: JSON.stringify({ url }),
  });
}

export function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return requestApi<ProfileData>("/profiles/me/avatar", {
    method: "PATCH",
    body: formData,
  });
}

export function uploadCover(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return requestApi<ProfileData>("/profiles/me/cover", {
    method: "PATCH",
    body: formData,
  });
}

export function uploadPhotos(files: File[]) {
  const formData = new FormData();

  for (const file of files) {
    formData.append("files", file);
  }

  return requestApi<ProfileData>("/profiles/me/photos", {
    method: "POST",
    body: formData,
  });
}

export function addPhotoUrls(urls: string[]) {
  return requestApi<ProfileData>("/profiles/me/photos-url", {
    method: "POST",
    body: JSON.stringify({ urls }),
  });
}

export function deletePhoto(photoId: string) {
  return requestApi<ProfileData>(`/profiles/me/photos/${photoId}`, {
    method: "DELETE",
  });
}
