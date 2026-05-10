"use client";

import { useState } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import { MOCK_CHAT_ROOMS, MOCK_CURRENT_USER } from "@/lib/mock-data";
import type { ChatRoom, ChatMessage } from "@/types";

const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  chat1: [
    { id: "m1a", senderId: "1", content: "こんにちは！元気ですか？", timestamp: "2024-05-10T10:00:00", status: "read" },
    { id: "m1b", senderId: "me", content: "元気です！あなたは？", timestamp: "2024-05-10T10:05:00", status: "read" },
    { id: "m1c", senderId: "1", content: "私も元気です。今日はいい天気ですね。", timestamp: "2024-05-10T10:10:00", status: "read" },
    { id: "m1d", senderId: "1", content: "こんにちは！元気ですか？", timestamp: "2024-05-10T10:30:00", status: "read" },
  ],
  chat2: [
    { id: "m2a", senderId: "2", content: "こんにちは！", timestamp: "2024-05-09T14:50:00", status: "read" },
    { id: "m2b", senderId: "me", content: "Xin chào bạn! Bạn có muốn luyện tiếng Nhật không?", timestamp: "2024-05-09T15:00:00", status: "read" },
  ],
};

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

interface RoomItemProps {
  room: ChatRoom;
  isActive: boolean;
  onClick: () => void;
}

function RoomItem({ room, isActive, onClick }: RoomItemProps) {
  const partner = room.participants[0];
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
        isActive ? "bg-gray-100" : "hover:bg-gray-50"
      )}
    >
      <div className="relative w-11 h-11 rounded-full overflow-hidden bg-gray-200 shrink-0">
        <Image src={partner.avatarUrl} alt={partner.fullName} fill className="object-cover" unoptimized />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 truncate">{partner.fullName}</span>
          {room.lastMessage && (
            <span className="text-xs text-gray-400 shrink-0 ml-2">
              {formatTime(room.lastMessage.timestamp)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-gray-500 truncate">
            {room.lastMessage?.content ?? "まだメッセージがありません"}
          </p>
          {room.unreadCount > 0 && (
            <span className="ml-2 shrink-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {room.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function ChatPage() {
  const [activeRoomId, setActiveRoomId] = useState<string | null>(MOCK_CHAT_ROOMS[0]?.id ?? null);
  const [inputText, setInputText] = useState("");
  const [messagesByRoom, setMessagesByRoom] = useState(MOCK_MESSAGES);

  const activeRoom = MOCK_CHAT_ROOMS.find((r) => r.id === activeRoomId) ?? null;
  const partner = activeRoom?.participants[0] ?? null;
  const messages = activeRoomId ? (messagesByRoom[activeRoomId] ?? []) : [];

  function handleSend() {
    if (!inputText.trim() || !activeRoomId) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: "me",
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
      status: "sent",
    };
    setMessagesByRoom((prev) => ({
      ...prev,
      [activeRoomId]: [...(prev[activeRoomId] ?? []), newMsg],
    }));
    setInputText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex-1 flex min-h-0">
      {/* Left: room list */}
      <div className="w-72 shrink-0 border-r border-gray-100 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">メッセージ</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {MOCK_CHAT_ROOMS.map((room) => (
            <RoomItem
              key={room.id}
              room={room}
              isActive={room.id === activeRoomId}
              onClick={() => setActiveRoomId(room.id)}
            />
          ))}
        </div>
      </div>

      {/* Right: chat view */}
      {activeRoom && partner ? (
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 bg-white border-b border-gray-100 shrink-0">
            <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gray-200 shrink-0">
              <Image src={partner.avatarUrl} alt={partner.fullName} fill className="object-cover" unoptimized />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{partner.fullName}</p>
              <p className="text-xs text-gray-400">
                {partner.nationality === "Japanese" ? "🇯🇵 日本" : "🇻🇳 ベトナム"} · {partner.japaneseLevel}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {messages.map((msg) => {
              const isMe = msg.senderId === "me";
              return (
                <div key={msg.id} className={clsx("flex", isMe ? "justify-end" : "justify-start")}>
                  {!isMe && (
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0 mr-2 mt-0.5">
                      <Image src={partner.avatarUrl} alt={partner.fullName} fill className="object-cover" unoptimized />
                    </div>
                  )}
                  <div className={clsx("max-w-xs lg:max-w-sm")}>
                    <div
                      className={clsx(
                        "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                        isMe
                          ? "text-white rounded-br-sm"
                          : "bg-white text-gray-800 rounded-bl-sm shadow-sm"
                      )}
                      style={isMe ? { backgroundColor: "#1B4332" } : undefined}
                    >
                      {msg.content}
                    </div>
                    <p className={clsx("text-xs text-gray-400 mt-1", isMe ? "text-right" : "text-left")}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="px-5 py-3 bg-white border-t border-gray-100 flex items-end gap-3 shrink-0">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 max-h-32"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: "#1B4332" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-sm text-gray-500">会話を選択してください</p>
          </div>
        </div>
      )}
    </div>
  );
}
