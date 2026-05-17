"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  createGroupConversation,
  getConversationMessages,
  getConversations,
  getMatchedConversationUsers,
  markConversationRead,
  resolveMediaUrl,
  sendConversationAttachment,
  sendConversationMessage,
  translateConversationText,
  type ChatAttachment,
  type ChatConversation,
  type ChatMessage,
  type MatchedConversationUser,
} from "@/lib/profile-api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MockRoom {
  id: string;
  type?: "direct" | "group";
  partnerId?: string | null;
  name: string;
  location: string;
  level: string;
  avatar: string;
  lastMsg: string;
  time: string;
  lastMessageAt?: string;
  unread: number;
}

interface Msg {
  id: string;
  senderId: "me" | "partner";
  content: string;
  messageType?: "text" | "file" | "media" | "voice" | "system";
  attachments?: ChatAttachment[];
  time: string;
  sentAt?: string;
  status: "sent" | "read";
}

type ToolPanel = "attachment" | "emoji" | "voice" | "suggestions" | "translate" | null;
type AttachModal = "photo" | "document" | null;

interface GroupModalState {
  open: boolean;
  name: string;
  users: MatchedConversationUser[];
  selectedIds: Set<string>;
  submitting: boolean;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ROOMS: MockRoom[] = [
  { id: "chat1", name: "佐藤 健",    location: "東京, 日本",       level: "日本語 N1",    avatar: "https://api.dicebear.com/7.x/personas/svg?seed=sato",    lastMsg: "こんにちは！昨日のイベントはいかがでしたか？", time: "10:30 AM", unread: 0 },
  { id: "chat2", name: "グエン・ミン", location: "ハノイ, ベトナム",   level: "日本語 N2",    avatar: "https://api.dicebear.com/7.x/personas/svg?seed=nguyen",  lastMsg: "週末に一緒に勉強しませんか？",                 time: "昨日",     unread: 2 },
  { id: "chat3", name: "田中 由紀",   location: "大阪, 日本",       level: "ベトナム語 A2", avatar: "https://api.dicebear.com/7.x/personas/svg?seed=tanaka",  lastMsg: "ベトナム語のレッスンありがとう！",               time: "月曜日",   unread: 0 },
  { id: "chat4", name: "レ・ホアン",  location: "ホーチミン, ベトナム", level: "日本語 N3",    avatar: "https://api.dicebear.com/7.x/personas/svg?seed=lehoan",  lastMsg: "来月日本に行く予定です！",                     time: "先週",     unread: 1 },
  { id: "chat5", name: "山本 大輝",   location: "福岡, 日本",       level: "ベトナム語 A1", avatar: "https://api.dicebear.com/7.x/personas/svg?seed=yamamoto", lastMsg: "フォーの作り方を教えてください！",               time: "2週間前",  unread: 0 },
  { id: "chat6", name: "チャン・リン", location: "ダナン, ベトナム",   level: "日本語 N4",    avatar: "https://api.dicebear.com/7.x/personas/svg?seed=chanlinh", lastMsg: "日本の文化についてもっと教えて！",              time: "3週間前",  unread: 0 },
];

const MOCK_GROUP_USERS: MatchedConversationUser[] = MOCK_ROOMS.map((room) => ({
  id: room.id,
  fullName: room.name,
  nationality: (room.location.includes("日本") ? "JP" : "VN") as "JP" | "VN",
  avatarUrl: room.avatar,
  location: room.location,
}));

const MOCK_MESSAGES: Record<string, Msg[]> = {
  chat1: [
    { id: "m1a", senderId: "partner", content: "こんにちは！元気ですか？",                               time: "10:00 AM", status: "read" },
    { id: "m1b", senderId: "me",      content: "元気ですよ！ありがとう。最近どうですか？",                  time: "10:05 AM", status: "read" },
    { id: "m1c", senderId: "partner", content: "先週のベトナム料理イベント、すごく楽しかったです！",           time: "10:12 AM", status: "read" },
    { id: "m1d", senderId: "me",      content: "本当ですか？私も行きたかったです！",                        time: "10:15 AM", status: "read" },
    { id: "m1e", senderId: "partner", content: "次回は一緒に行きましょう！来月また開催されるみたいです。",       time: "10:20 AM", status: "read" },
    { id: "m1f", senderId: "me",      content: "ぜひ次回も参加したいですね。",                             time: "10:25 AM", status: "read" },
    { id: "m1g", senderId: "partner", content: "こんにちは！昨日のイベントはいかがでしたか？",                time: "10:30 AM", status: "read" },
    { id: "m1h", senderId: "me",      content: "はい、とても楽しかったです！",                             time: "10:32 AM", status: "read" },
  ],
  chat2: [
    { id: "m2a", senderId: "partner", content: "週末に一緒に勉強しませんか？", time: "昨日", status: "read" },
    { id: "m2b", senderId: "partner", content: "カフェで会いましょう！",       time: "昨日", status: "read" },
  ],
  chat4: [
    { id: "m4a", senderId: "me",      content: "来月日本に来るんですね！楽しみですね。", time: "先週", status: "read" },
    { id: "m4b", senderId: "partner", content: "来月日本に行く予定です！",              time: "先週", status: "read" },
  ],
};

const MOCK_TRANSLATIONS: Record<string, string> = {
  "こんにちは！元気ですか？": "Xin chào! Bạn có khỏe không?",
  "先週のベトナム料理イベント、すごく楽しかったです！": "Sự kiện ẩm thực Việt Nam tuần trước vui lắm!",
  "次回は一緒に行きましょう！来月また開催されるみたいです。": "Lần sau cùng đi nhé! Hình như tháng tới sẽ tổ chức lại.",
  "こんにちは！昨日のイベントはいかがでしたか？": "Xin chào! Sự kiện hôm qua thế nào?",
  "週末に一緒に勉強しませんか？": "Cuối tuần cùng học nhé?",
  "カフェで会いましょう！": "Hẹn gặp ở quán cà phê nhé!",
  "来月日本に行く予定です！": "Tháng tới tôi dự định đi Nhật!",
  "元気ですよ！ありがとう。最近どうですか？": "Tôi khỏe! Cảm ơn bạn. Dạo này bạn thế nào?",
  "本当ですか？私も行きたかったです！": "Thật sao? Tôi cũng muốn đi!",
  "ぜひ次回も参加したいですね。": "Tôi nhất định muốn tham gia lần sau.",
  "はい、とても楽しかったです！": "Vâng, vui lắm!",
  "来月日本に来るんですね！楽しみですね。": "Tháng tới bạn đến Nhật à! Mong lắm đấy.",
};

function mockTranslate(text: string, direction: "ja-vi" | "vi-ja"): Promise<string> {
  return new Promise((resolve) =>
    setTimeout(() => {
      if (MOCK_TRANSLATIONS[text]) {
        resolve(MOCK_TRANSLATIONS[text]);
      } else if (direction === "ja-vi") {
        resolve(`[Bản dịch] ${text}`);
      } else {
        resolve(`[翻訳] ${text}`);
      }
    }, 600),
  );
}

const EMOJIS = ["😀","😂","❤️","👍","🎉","🙏","🥰","🔥","✨","🌸","🍜","🇻🇳","🇯🇵","☕","📚","⭐","💪","🤝","😁","🥹"];

const TOPICS = [
  { emoji: "🍳", label: "おすすめの料理" },
  { emoji: "🌸", label: "文化の違い" },
  { emoji: "📚", label: "言語学習のコツ" },
  { emoji: "✈️", label: "旅行の話" },
  { emoji: "🎪", label: "イベント情報" },
  { emoji: "💼", label: "仕事の話題" },
];

// ─── Toolbar button definitions ───────────────────────────────────────────────

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);
const DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"];
const EMPTY_ROOM: MockRoom = {
  id: "",
  name: "-",
  location: "",
  level: "",
  avatar: "https://api.dicebear.com/7.x/personas/svg?seed=empty-chat",
  lastMsg: "",
  time: "",
  unread: 0,
};

function formatChatTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - messageDay.getTime()) / 86400000);

  if (diffDays === 0) {
    return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  return date.toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" });
}

function mapConversation(conversation: ChatConversation): MockRoom {
  return {
    id: conversation.id,
    type: conversation.type,
    partnerId: conversation.partnerId,
    name: conversation.name,
    location: conversation.location,
    level: conversation.level,
    avatar: resolveMediaUrl(conversation.avatar, 160) || EMPTY_ROOM.avatar,
    lastMsg: conversation.lastMessage,
    time: formatChatTime(conversation.lastMessageAt),
    lastMessageAt: conversation.lastMessageAt,
    unread: conversation.unreadCount,
  };
}

function mapMessage(message: ChatMessage): Msg {
  return {
    id: message.id,
    senderId: message.senderId,
    content: message.content,
    messageType: message.messageType,
    attachments: message.attachments,
    time: formatChatTime(message.sentAt),
    sentAt: message.sentAt,
    status: message.status,
  };
}

function attachmentFileName(attachment: ChatAttachment) {
  const fallback = attachment.url.split("/").pop() || "download";
  return attachment.file_name || fallback;
}

function formatAttachmentSize(size?: number) {
  if (!size || size < 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageAttachment(attachment: ChatAttachment) {
  return (attachment.mime_type ?? "").startsWith("image/");
}

function isVideoAttachment(attachment: ChatAttachment) {
  return (attachment.mime_type ?? "").startsWith("video/");
}

function isAudioAttachment(attachment: ChatAttachment) {
  return (attachment.mime_type ?? "").startsWith("audio/");
}

function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function audioExtensionFromMimeType(mimeType: string) {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg") || mimeType.includes("opus")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg")) return "mp3";
  return "webm";
}

function formatVoiceDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function isSupportedDocumentFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return (
    DOCUMENT_MIME_TYPES.has(file.type) ||
    DOCUMENT_EXTENSIONS.some((extension) => lowerName.endsWith(extension))
  );
}

async function downloadAttachment(attachment: ChatAttachment) {
  const url = resolveMediaUrl(attachment.url);
  const fileName = attachmentFileName(attachment);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`download failed with ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.download = fileName;
    anchor.click();
  }
}

function readStoredConversationId() {
  try {
    const storedConversation = sessionStorage.getItem("vn_jp_active_conversation");
    return storedConversation ? JSON.parse(storedConversation)?.id ?? "" : "";
  } catch {
    return "";
  }
}

const TOOLBAR_BTNS: { id: Exclude<ToolPanel, null>; title: string; icon: React.ReactNode }[] = [
  {
    id: "attachment", title: "添付ファイル",
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>,
  },
  {
    id: "emoji", title: "絵文字",
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>,
  },
  {
    id: "voice", title: "ボイスメッセージ",
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>,
  },
  {
    id: "suggestions", title: "会話トピックの提案",
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>,
  },
  {
    id: "translate", title: "翻訳サポート",
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" /></svg>,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoomItem({ room, isActive, onClick }: { room: MockRoom; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx("w-full flex items-center gap-3 px-4 py-3 text-left transition-colors", isActive ? "bg-gray-100" : "hover:bg-gray-50")}
    >
      <div className="relative w-11 h-11 shrink-0">
        <div className="relative w-full h-full rounded-full overflow-hidden bg-gray-200">
          <Image src={room.avatar} alt={room.name} fill className="object-cover" unoptimized />
        </div>
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 truncate">{room.name}</span>
          <span className="text-xs text-gray-400 shrink-0 ml-2">{room.time}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-gray-500 truncate">{room.lastMsg}</p>
          {room.unread > 0 && (
            <span className="ml-2 shrink-0 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center" style={{ backgroundColor: "#1B4332" }}>
              {room.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function AttachmentPreview({ attachment, isMe }: { attachment: ChatAttachment; isMe: boolean }) {
  const url = resolveMediaUrl(attachment.url);
  const fileName = attachmentFileName(attachment);
  const size = formatAttachmentSize(attachment.size);

  if (isImageAttachment(attachment)) {
    return (
      <div className="overflow-hidden rounded-xl bg-black/5">
        <Image
          src={url}
          alt={fileName}
          width={320}
          height={220}
          className="max-h-64 w-full object-cover"
          unoptimized
        />
        <button
          onClick={() => void downloadAttachment(attachment)}
          className={clsx("w-full px-3 py-2 text-left text-xs font-semibold transition-colors", isMe ? "bg-white/10 text-white hover:bg-white/15" : "bg-gray-50 text-gray-600 hover:bg-gray-100")}
        >
          ダウンロード{size ? ` · ${size}` : ""}
        </button>
      </div>
    );
  }

  if (isVideoAttachment(attachment)) {
    return (
      <div className="overflow-hidden rounded-xl bg-black">
        <video src={url} controls className="max-h-64 w-full bg-black" />
        <button
          onClick={() => void downloadAttachment(attachment)}
          className={clsx("w-full px-3 py-2 text-left text-xs font-semibold transition-colors", isMe ? "bg-white/10 text-white hover:bg-white/15" : "bg-gray-50 text-gray-600 hover:bg-gray-100")}
        >
          ダウンロード{size ? ` · ${size}` : ""}
        </button>
      </div>
    );
  }

  if (isAudioAttachment(attachment)) {
    return (
      <div className={clsx("overflow-hidden rounded-xl p-2", isMe ? "bg-white/10" : "bg-gray-50")}>
        <audio src={url} controls className="h-10 w-64 max-w-full" preload="metadata" />
        <button
          onClick={() => void downloadAttachment(attachment)}
          className={clsx("mt-1 w-full px-1 text-left text-xs font-semibold transition-colors", isMe ? "text-white/80 hover:text-white" : "text-gray-500 hover:text-gray-700")}
        >
          ãƒ€ã‚¦ãƒ³ãƒ­ãƒ¼ãƒ‰{size ? ` Â· ${size}` : ""}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => void downloadAttachment(attachment)}
      className={clsx("flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors", isMe ? "border-white/20 bg-white/10 text-white hover:bg-white/15" : "border-gray-100 bg-gray-50 text-gray-700 hover:bg-gray-100")}
    >
      <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", isMe ? "bg-white/15" : "bg-white")}>
        <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{fileName}</span>
        <span className={clsx("text-xs", isMe ? "text-white/70" : "text-gray-400")}>
          {size ? `${size} · ` : ""}ダウンロード
        </span>
      </span>
    </button>
  );
}

function MsgBubble({
  msg,
  onTranslate,
  translation,
  isTranslating,
}: {
  msg: Msg;
  onTranslate: (msgId: string, content: string) => void;
  translation?: string;
  isTranslating?: boolean;
}) {
  const isMe = msg.senderId === "me";
  const attachments = msg.attachments ?? [];
  const hasAttachments = attachments.length > 0;
  const showText = Boolean(msg.content.trim()) && !hasAttachments;
  const canTranslate = showText;

  return (
    <div className={clsx("flex", isMe ? "justify-end" : "justify-start")}>
      <div className={clsx("flex flex-col max-w-xs lg:max-w-md", isMe ? "items-end" : "items-start")}>
        <div
          className={clsx("px-4 py-2.5 rounded-2xl text-sm leading-relaxed", isMe ? "text-white rounded-br-sm" : "bg-white text-gray-800 rounded-bl-sm shadow-sm")}
          style={isMe ? { backgroundColor: "#1B4332" } : undefined}
        >
          {showText && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
          {hasAttachments && (
            <div className="flex flex-col gap-2">
              {attachments.map((attachment) => (
                <AttachmentPreview
                  key={`${msg.id}-${attachment.url}`}
                  attachment={attachment}
                  isMe={isMe}
                />
              ))}
            </div>
          )}
          {canTranslate && (translation || isTranslating) && (
            <>
              <div className={clsx("border-t my-2", isMe ? "border-white/20" : "border-gray-100")} />
              <p className={clsx("text-xs font-medium mb-0.5", isMe ? "text-white/60" : "text-gray-400")}>
                vn Bản dịch:
              </p>
              {isTranslating ? (
                <p className={clsx("text-xs italic", isMe ? "text-white/50" : "text-gray-400")}>翻訳中...</p>
              ) : (
                <p className={clsx("text-xs", isMe ? "text-white/90" : "text-gray-600")}>{translation}</p>
              )}
            </>
          )}
        </div>
        <div className={clsx("flex items-center gap-1.5 mt-1 px-1", isMe ? "flex-row justify-end" : "flex-row")}>
          <span className="text-xs text-gray-400">{msg.time}</span>
          {isMe && (
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none" className="text-gray-400 shrink-0">
              <path d="M1 5L4.5 8.5L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 5L9.5 8.5L16 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {canTranslate && (
          <button
            onClick={() => onTranslate(msg.id, msg.content)}
            disabled={isTranslating}
            className={clsx("transition-colors", isTranslating ? "text-emerald-400" : "text-gray-300 hover:text-gray-500")}
            title="翻訳"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
            </svg>
          </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-semibold text-gray-900">{title}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<MockRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>("");
  const [messages, setMessages] = useState<Record<string, Msg[]>>({});
  const [inputText, setInputText] = useState("");
  const [openTool, setOpenTool] = useState<ToolPanel>(null);
  const [attachModal, setAttachModal] = useState<AttachModal>(null);
  const [translateInput, setTranslateInput] = useState("");
  const [translateDir, setTranslateDir] = useState<"ja-vi" | "vi-ja">("ja-vi");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isVoiceSending, setIsVoiceSending] = useState(false);
  const [search, setSearch] = useState("");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const [groupModal, setGroupModal] = useState<GroupModalState>({
    open: false,
    name: "",
    users: [],
    selectedIds: new Set(),
    submitting: false,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef(0);
  const recordingConversationIdRef = useRef("");

  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? rooms[0] ?? EMPTY_ROOM;
  const roomMessages = messages[activeRoomId] ?? [];
  const filteredRooms = search
    ? rooms.filter((r) => r.name.includes(search) || r.lastMsg.includes(search))
    : rooms;

  function clearRecordingTimer() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function releaseVoiceStream() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  useEffect(() => {
    return () => {
      clearRecordingTimer();
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      mediaRecorderRef.current = null;
      releaseVoiceStream();
    };
  }, []);

  useEffect(() => {
    let active = true;

    getConversations()
      .then((conversations) => {
        if (!active) return;

        const nextRooms = conversations.map(mapConversation);
        const urlConversationId = new URLSearchParams(window.location.search).get("conversationId");
        const storedConversationId = readStoredConversationId();
        const preferredRoomId = urlConversationId || storedConversationId;
        const nextActiveRoomId =
          nextRooms.find((room) => room.id === preferredRoomId)?.id ||
          nextRooms[0]?.id ||
          "";

        setRooms(nextRooms);
        setActiveRoomId((current) =>
          nextRooms.some((room) => room.id === current) ? current : nextActiveRoomId,
        );
      })
      .catch((error) => {
        console.error(error);
        setRooms(MOCK_ROOMS);
        setMessages(MOCK_MESSAGES);
        setActiveRoomId(MOCK_ROOMS[0]?.id ?? "");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!activeRoomId) return;

    let active = true;

    getConversationMessages(activeRoomId)
      .then((response) => {
        if (!active) return;

        setMessages((prev) => ({
          ...prev,
          [activeRoomId]: response.messages.map(mapMessage),
        }));
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

        return markConversationRead(activeRoomId);
      })
      .then(() => {
        if (!active) return;

        setRooms((prev) =>
          prev.map((room) => (room.id === activeRoomId ? { ...room, unread: 0 } : room)),
        );
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      active = false;
    };
  }, [activeRoomId]);

  function applySavedMessage(savedMessage: ChatMessage, conversationId = activeRoomId) {
    if (!conversationId) return;

    const newMsg = mapMessage(savedMessage);

    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), newMsg],
    }));
    setRooms((prev) =>
      prev
        .map((room) =>
          room.id === conversationId
            ? {
                ...room,
                lastMsg: savedMessage.content,
                lastMessageAt: savedMessage.sentAt,
                time: formatChatTime(savedMessage.sentAt),
              }
            : room,
        )
        .sort((a, b) => {
          if (a.id === conversationId) return -1;
          if (b.id === conversationId) return 1;
          return new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime();
        }),
    );
    if (conversationId === activeRoomId) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  async function sendMessage(content: string, messageType: "text" | "file" | "media" | "voice" = "text") {
    if (!content.trim() || !activeRoomId) return;

    try {
      const savedMessage = await sendConversationMessage(activeRoomId, {
        content: content.trim(),
        messageType,
      });
      applySavedMessage(savedMessage);
      setInputText("");
    } catch (error) {
      console.error(error);
    }
  }

  async function uploadVoiceBlob(
    blob: Blob,
    mimeType: string,
    conversationId: string,
  ) {
    if (!conversationId || blob.size === 0) return;

    if (blob.size > MAX_ATTACHMENT_SIZE) {
      window.alert("File too large. Max size is 25MB.");
      return;
    }

    const normalizedMimeType = mimeType || "audio/webm";
    const file = new File(
      [blob],
      `voice-${Date.now()}.${audioExtensionFromMimeType(normalizedMimeType)}`,
      { type: normalizedMimeType },
    );

    setIsVoiceSending(true);
    try {
      const savedMessage = await sendConversationAttachment(conversationId, file, "voice");
      applySavedMessage(savedMessage, conversationId);
      setOpenTool(null);
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "Could not send voice message.");
    } finally {
      setIsVoiceSending(false);
    }
  }

  async function startVoiceRecording() {
    if (!activeRoomId || isRecording || isVoiceSending) return;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      window.alert("Voice recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      recordingConversationIdRef.current = activeRoomId;
      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;
      recordingStartedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        clearRecordingTimer();
        releaseVoiceStream();
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        setIsRecording(false);
        setRecordingSeconds(0);
        window.alert("Could not record voice message.");
      };

      recorder.onstop = () => {
        const chunks = audioChunksRef.current;
        const conversationId = recordingConversationIdRef.current;
        const resolvedMimeType = recorder.mimeType || mimeType || chunks[0]?.type || "audio/webm";
        const blob = new Blob(chunks, { type: resolvedMimeType });

        clearRecordingTimer();
        releaseVoiceStream();
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        recordingConversationIdRef.current = "";
        setIsRecording(false);
        setRecordingSeconds(0);

        void uploadVoiceBlob(blob, resolvedMimeType, conversationId);
      };

      recorder.start();
      setRecordingSeconds(0);
      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(
          Math.floor((Date.now() - recordingStartedAtRef.current) / 1000),
        );
      }, 250);
    } catch (error) {
      console.error(error);
      clearRecordingTimer();
      releaseVoiceStream();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      setRecordingSeconds(0);
      window.alert("Could not access microphone.");
    }
  }

  function handleVoiceRecorderClick() {
    if (isVoiceSending) return;

    const recorder = mediaRecorderRef.current;
    if (isRecording) {
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      return;
    }

    void startVoiceRecording();
  }

  function cancelVoiceRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    clearRecordingTimer();
    releaseVoiceStream();
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    recordingConversationIdRef.current = "";
    setIsRecording(false);
    setRecordingSeconds(0);
    setOpenTool(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(inputText); }
  }

  function toggleTool(tool: Exclude<ToolPanel, null>) {
    if (openTool === "voice" && isRecording) {
      cancelVoiceRecording();
      if (tool !== "voice") {
        setOpenTool(tool);
      }
      return;
    }

    setOpenTool((prev) => (prev === tool ? null : tool));
  }

  async function handleTranslateMessage(msgId: string, content: string) {
    setTranslatingIds((prev) => new Set(prev).add(msgId));
    try {
      const result = await translateConversationText({ text: content, direction: translateDir });
      setTranslations((prev) => ({ ...prev, [msgId]: result.translatedText }));
    } catch {
      const fallback = await mockTranslate(content, translateDir);
      setTranslations((prev) => ({ ...prev, [msgId]: fallback }));
    } finally {
      setTranslatingIds((prev) => {
        const next = new Set(prev);
        next.delete(msgId);
        return next;
      });
    }
  }

  async function handleTranslateSubmit() {
    if (!translateInput.trim()) return;

    try {
      const result = await translateConversationText({
        text: translateInput,
        direction: translateDir,
      });
      setInputText(result.translatedText);
      setTranslateInput("");
      setOpenTool(null);
    } catch (error) {
      console.error(error);
    }
  }

  function handleRoomClick(roomId: string) {
    setActiveRoomId(roomId);
    setOpenTool(null);
    setRooms((prev) => prev.map((room) => (room.id === roomId ? { ...room, unread: 0 } : room)));
  }

  async function handleCreateGroupClick() {
    setGroupModal({ open: true, name: "", users: [], selectedIds: new Set(), submitting: true });
    try {
      const users = await getMatchedConversationUsers();
      setGroupModal((prev) => ({ ...prev, users, submitting: false }));
    } catch {
      setGroupModal((prev) => ({ ...prev, users: MOCK_GROUP_USERS, submitting: false }));
    }
  }

  function closeGroupModal() {
    setGroupModal({ open: false, name: "", users: [], selectedIds: new Set(), submitting: false });
  }

  async function handleCreateGroup() {
    const { name, selectedIds } = groupModal;
    if (!name.trim() || selectedIds.size < 2) return;
    setGroupModal((prev) => ({ ...prev, submitting: true }));
    try {
      const createdGroup = await createGroupConversation({
        name: name.trim(),
        memberIds: Array.from(selectedIds),
      });
      const room = mapConversation(createdGroup);
      setRooms((prev) => [room, ...prev.filter((item) => item.id !== room.id)]);
      setActiveRoomId(room.id);
      closeGroupModal();
    } catch (error) {
      console.error(error);
      setGroupModal((prev) => ({ ...prev, submitting: false }));
      window.alert(error instanceof Error ? error.message : "Could not create group.");
    }
  }

  async function handleFileSelected(file: File | undefined, messageType: "file" | "media") {
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_SIZE) {
      window.alert("File too large. Max size is 25MB.");
      return;
    }

    if (messageType === "media" && !file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      window.alert("Please choose an image or video file.");
      return;
    }

    if (messageType === "file" && !isSupportedDocumentFile(file)) {
      window.alert("Unsupported document type.");
      return;
    }

    if (!activeRoomId) return;

    try {
      const savedMessage = await sendConversationAttachment(activeRoomId, file, messageType);
      applySavedMessage(savedMessage);
      setAttachModal(null);
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "Could not upload file.");
    }
  }

  return (
    <div className="flex-1 flex min-h-0">
      {/* ── Room list ─────────────────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 border-r border-gray-100 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">メッセージ</h1>
          <button onClick={handleCreateGroupClick} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
          </button>
        </div>
        <div className="px-3 py-2.5 border-b border-gray-50">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={50}
              placeholder="名前またはキーワードで検索"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredRooms.map((room) => (
            <RoomItem key={room.id} room={room} isActive={room.id === activeRoomId} onClick={() => handleRoomClick(room.id)} />
          ))}
          {filteredRooms.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-400">結果が見つかりません</p>
          )}
        </div>
      </div>

      {/* ── Chat view ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 shrink-0">
              <div className="relative w-full h-full rounded-full overflow-hidden bg-gray-200">
                <Image src={activeRoom.avatar} alt={activeRoom.name} fill className="object-cover" unoptimized />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{activeRoom.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                  {activeRoom.location}
                </span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded border" style={{ color: "#1B4332", borderColor: "#1B4332" }}>
                  {activeRoom.level}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => activeRoom.partnerId && router.push(`/users/${activeRoom.partnerId}`)}
            disabled={!activeRoom.partnerId}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {roomMessages.map((msg) => (
            <MsgBubble
              key={msg.id}
              msg={msg}
              onTranslate={handleTranslateMessage}
              translation={translations[msg.id]}
              isTranslating={translatingIds.has(msg.id)}
            />
          ))}
          {roomMessages.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-400">まだメッセージがありません</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Footer: toolbar + floating panels (relative wrapper) ──────────────── */}
        <div className="shrink-0 relative">

          {/* Attachment floating dropdown — above attachment icon */}
          {openTool === "attachment" && (
            <div className="absolute bottom-full left-3 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20 min-w-[180px]">
              <button
                onClick={() => { setAttachModal("photo"); setOpenTool(null); }}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>
                写真・動画
              </button>
              <div className="h-px bg-gray-100 mx-3" />
              <button
                onClick={() => { setAttachModal("document"); setOpenTool(null); }}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                ドキュメント
              </button>
            </div>
          )}

          {/* Other panels — float above toolbar, overlay messages */}
          {openTool === "emoji" && (
            <div className="absolute bottom-full left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-10 px-5 py-4">
              <PanelHeader title="絵文字を選択" onClose={() => setOpenTool(null)} />
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map((emoji) => (
                  <button key={emoji} onClick={() => setInputText((prev) => `${prev}${emoji}`)} className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {openTool === "voice" && (
            <div className="absolute bottom-full left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-10 px-5 py-4">
              <PanelHeader title="ボイスメッセージ" onClose={cancelVoiceRecording} />
              <div className="flex items-center gap-4">
                <button
                  onClick={handleVoiceRecorderClick}
                  disabled={isVoiceSending}
                  className={clsx("w-12 h-12 rounded-full flex items-center justify-center shrink-0", isRecording && "animate-pulse", isVoiceSending && "opacity-60")}
                  style={{ backgroundColor: "#1B4332" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                </button>
                <span className={clsx("text-sm", isRecording ? "text-red-500 font-medium" : "text-gray-500")}>
                  {isVoiceSending
                    ? "Sending..."
                    : isRecording
                      ? `Recording... ${formatVoiceDuration(recordingSeconds)}`
                      : "Tap to record"}
                </span>
              </div>
            </div>
          )}

          {openTool === "suggestions" && (
            <div className="absolute bottom-full left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-10 px-5 py-4">
              <PanelHeader title="会話トピックの提案" onClose={() => setOpenTool(null)} />
              <p className="text-xs text-gray-400 mb-3 -mt-1">クリックするとメッセージとして送信されます</p>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => (
                  <button key={t.label} onClick={() => { setInputText(t.label); setOpenTool(null); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-sm text-gray-700 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all">
                    <span>{t.emoji}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {openTool === "translate" && (
            <div className="absolute bottom-full left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-10 px-5 py-4">
              <PanelHeader title="翻訳サポート" onClose={() => setOpenTool(null)} />
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => { setTranslateDir((d) => (d === "ja-vi" ? "vi-ja" : "ja-vi")); setTranslateInput(""); }} className="flex items-center gap-2">
                  <span className={clsx("px-2.5 py-1 rounded-full text-xs font-semibold", translateDir === "ja-vi" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500")}>JP 日本語</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                  <span className={clsx("px-2.5 py-1 rounded-full text-xs font-semibold", translateDir === "vi-ja" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500")}>VN ベトナム語</span>
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text" value={translateInput} onChange={(e) => setTranslateInput(e.target.value)} maxLength={500}
                  placeholder={translateDir === "ja-vi" ? "日本語のテキストを入力..." : "ベトナム語のテキストを入力..."}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 bg-gray-50"
                />
                <button
                  onClick={handleTranslateSubmit}
                  disabled={!translateInput.trim()}
                  className={clsx("flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shrink-0", translateInput.trim() ? "opacity-100" : "opacity-40")}
                  style={{ backgroundColor: "#1B4332" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" /></svg>
                  翻訳
                </button>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-2">
            {TOOLBAR_BTNS.map((btn) => (
              <button
                key={btn.id}
                onClick={() => toggleTool(btn.id)}
                title={btn.title}
                className={clsx("w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0", openTool === btn.id ? "text-emerald-700 bg-emerald-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100")}
              >
                {btn.icon}
              </button>
            ))}
            <textarea
              value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown} maxLength={2000}
              placeholder="メッセージを入力..." rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 max-h-32 bg-gray-50"
            />
            <button
              onClick={() => void sendMessage(inputText)}
              disabled={!inputText.trim() || !activeRoomId}
              className={clsx("shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity", inputText.trim() ? "opacity-100" : "opacity-40")}
              style={{ backgroundColor: "#1B4332" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" /></svg>
              送信
            </button>
          </div>
        </div>
      </div>

      {/* ── Attachment modals ─────────────────────────────────────────────────── */}
      {attachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center", attachModal === "photo" ? "bg-emerald-50" : "bg-gray-100")}>
                  {attachModal === "photo" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  )}
                </div>
                <h3 className="text-sm font-bold text-gray-900">
                  {attachModal === "photo" ? "写真・動画をアップロード" : "ドキュメントをアップロード"}
                </h3>
              </div>
              <button onClick={() => setAttachModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div
              onClick={() => attachModal === "photo" ? fileInputRef.current?.click() : docInputRef.current?.click()}
              className={clsx("border-2 border-dashed rounded-2xl py-10 flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity mb-5", attachModal === "photo" ? "border-emerald-300 bg-emerald-50/30" : "border-gray-200 bg-gray-50/30")}
            >
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-1", attachModal === "photo" ? "bg-emerald-100" : "bg-gray-100")}>
                <svg xmlns="http://www.w3.org/2000/svg" className={clsx("size-5", attachModal === "photo" ? "text-emerald-600" : "text-gray-500")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
              </div>
              <p className="text-sm font-medium text-gray-700">クリックしてファイルを選択</p>
              <p className="text-xs text-gray-400">{attachModal === "photo" ? "JPG, PNG, GIF, MP4 — 最大 25MB" : "PDF, DOC, XLSX, PPT — 最大 25MB"}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAttachModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">キャンセル</button>
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white opacity-40" style={{ backgroundColor: "#1B4332" }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" /></svg>
                送信する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Group creation modal ─────────────────────────────────────────────── */}
      {groupModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-900">グループを作成</h3>
              </div>
              <button onClick={closeGroupModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              グループ名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={groupModal.name}
              onChange={(e) => setGroupModal((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="例: 東京言語交換グループ"
              maxLength={50}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 bg-gray-50 mb-4"
            />

            <div className="mb-1.5">
              <span className="text-xs font-semibold text-gray-700">メンバーを選択</span>
              <span className="text-xs text-gray-400 ml-1">（2人以上）</span>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-5">
              <div className="max-h-52 overflow-y-auto divide-y divide-gray-100">
                {groupModal.submitting && groupModal.users.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-400">読み込み中...</div>
                ) : groupModal.users.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-400">マッチしたユーザーがいません</div>
                ) : (
                  groupModal.users.map((user) => {
                    const selected = groupModal.selectedIds.has(user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() =>
                          setGroupModal((prev) => {
                            const next = new Set(prev.selectedIds);
                            if (next.has(user.id)) next.delete(user.id);
                            else next.add(user.id);
                            return { ...prev, selectedIds: next };
                          })
                        }
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="relative w-10 h-10 shrink-0">
                          <div className="relative w-full h-full rounded-full overflow-hidden bg-gray-200">
                            <Image
                              src={resolveMediaUrl(user.avatarUrl, 80) || EMPTY_ROOM.avatar}
                              alt={user.fullName}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</p>
                          <p className="text-xs text-gray-500 truncate">{user.location}</p>
                        </div>
                        <div
                          className={clsx(
                            "w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center",
                            selected ? "border-emerald-600" : "border-gray-300",
                          )}
                          style={selected ? { backgroundColor: "#1B4332", borderColor: "#1B4332" } : undefined}
                        >
                          {selected && (
                            <svg className="size-3 text-white" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeGroupModal}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => void handleCreateGroup()}
                disabled={!groupModal.name.trim() || groupModal.selectedIds.size < 2 || groupModal.submitting}
                className={clsx(
                  "flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity",
                  !groupModal.name.trim() || groupModal.selectedIds.size < 2 || groupModal.submitting ? "opacity-40" : "opacity-100",
                )}
                style={{ backgroundColor: "#1B4332" }}
              >
                作成する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*"
        onChange={(e) => { void handleFileSelected(e.target.files?.[0], "media"); e.target.value = ""; }} />
      <input ref={docInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        onChange={(e) => { void handleFileSelected(e.target.files?.[0], "file"); e.target.value = ""; }} />
    </div>
  );
}
