"use client";

import { useState, useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type User = {
  id: number;
  name: string;
  email: string;
  country: "VN" | "JP";
  status: "active" | "frozen";
  joinDate: string;
  reports: number;
  color: string;
};

type UserDetail = {
  connections: number;
  messages: number;
  occupation: string;
  location: string;
  lastActive: string;
  languages: string[];
  bio: string;
};

type EvidenceFile = {
  name: string;
  type: "image" | "pdf";
  size?: string;
};

type ViolationReport = {
  id: number;
  type: string;
  description: string;
  reportedUser: string;
  reporter: string;
  date: string;
  files: EvidenceFile[];
  status: "pending" | "ignored" | "frozen";
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const USERS: User[] = [
  { id: 1, name: "Nguyen Thi Lan", email: "lan.nguyen@email.com", country: "VN", status: "active", joinDate: "2024/01/15", reports: 0, color: "#f87171" },
  { id: 2, name: "Tanaka Yuki", email: "yuki.tanaka@email.com", country: "JP", status: "active", joinDate: "2024/02/20", reports: 2, color: "#60a5fa" },
  { id: 3, name: "Pham Minh Duc", email: "duc.pham@email.com", country: "VN", status: "frozen", joinDate: "2023/11/05", reports: 5, color: "#4ade80" },
  { id: 4, name: "Sato Hana", email: "hana.sato@email.com", country: "JP", status: "active", joinDate: "2024/03/12", reports: 0, color: "#c084fc" },
  { id: 5, name: "Le Hoang Nam", email: "nam.le@email.com", country: "VN", status: "active", joinDate: "2024/04/01", reports: 1, color: "#fb923c" },
  { id: 6, name: "Yamamoto Kenji", email: "kenji.yamamoto@email.com", country: "JP", status: "frozen", joinDate: "2023/09/18", reports: 8, color: "#a78bfa" },
  { id: 7, name: "Tran Thi Mai", email: "tran.mai@email.com", country: "VN", status: "active", joinDate: "2024/05/10", reports: 0, color: "#f472b6" },
  { id: 8, name: "Suzuki Ryo", email: "ryo.suzuki@email.com", country: "JP", status: "active", joinDate: "2024/06/03", reports: 0, color: "#34d399" },
];

const USER_DETAILS: Record<number, UserDetail> = {
  1: { connections: 87, messages: 342, occupation: "マーケティング", location: "ホーチミン市", lastActive: "2時間前", languages: ["ベトナム語（母語）", "日本語（N3）", "英語（B2）"], bio: "ホーチミン出身の日本語学習者です。" },
  2: { connections: 124, messages: 891, occupation: "エンジニア", location: "東京都", lastActive: "30分前", languages: ["日本語（母語）", "英語（B1）", "ベトナム語（入門）"], bio: "東京在住のソフトウェアエンジニアです。ベトナムの文化と料理が大好きです。" },
  3: { connections: 43, messages: 215, occupation: "学生", location: "ハノイ", lastActive: "3日前", languages: ["ベトナム語（母語）", "日本語（N2）"], bio: "日本語を勉強中の大学生です。日本への留学を目指しています。" },
  4: { connections: 201, messages: 1203, occupation: "デザイナー", location: "大阪府", lastActive: "1時間前", languages: ["日本語（母語）", "英語（C1）", "ベトナム語（N3相当）"], bio: "大阪在住のUIデザイナーです。ベトナムのデザイン文化に興味があります。" },
  5: { connections: 56, messages: 178, occupation: "ビジネスアナリスト", location: "ダナン", lastActive: "5時間前", languages: ["ベトナム語（母語）", "日本語（N3）", "英語（B2）"], bio: "ダナン在住のビジネスアナリストです。日本企業との取引に携わっています。" },
  6: { connections: 312, messages: 2847, occupation: "営業マネージャー", location: "名古屋市", lastActive: "1週間前", languages: ["日本語（母語）", "英語（B2）"], bio: "名古屋在住の営業マネージャーです。ベトナム市場への進出を検討中です。" },
  7: { connections: 34, messages: 89, occupation: "看護師", location: "ホーチミン市", lastActive: "今日", languages: ["ベトナム語（母語）", "日本語（N4）"], bio: "看護師として働きながら日本語を学んでいます。" },
  8: { connections: 78, messages: 456, occupation: "大学院生", location: "京都府", lastActive: "3時間前", languages: ["日本語（母語）", "英語（C2）", "フランス語（B1）"], bio: "京都大学の大学院生です。国際交流に興味があります。" },
};

const INITIAL_REPORTS: ViolationReport[] = [
  {
    id: 1,
    type: "ハラスメント",
    description: "複数のユーザーに対して不適切で攻撃的なメッセージを繰り返し送信していました。特に新規ユーザーに対して威圧的な言葉を使用しています。",
    reportedUser: "Pham Minh Duc",
    reporter: "Sato Hana",
    date: "2026/03/28",
    files: [
      { name: "harassment_screenshot.png", type: "image" },
      { name: "chat_log.pdf", type: "pdf", size: "182 KB" },
      { name: "evidence2.png", type: "image" },
    ],
    status: "pending",
  },
  {
    id: 2,
    type: "スパム",
    description: "同一内容の宣伝メッセージを50人以上のユーザーに大量送信していました。外部サイトへの誘導リンクを含んでいます。",
    reportedUser: "Yamamoto Kenji",
    reporter: "Nguyen Thi Lan",
    date: "2026/03/30",
    files: [
      { name: "spam_evidence.png", type: "image" },
      { name: "report_log.pdf", type: "pdf", size: "245 KB" },
    ],
    status: "pending",
  },
  {
    id: 3,
    type: "なりすまし",
    description: "他のユーザーの写真を無断で使用し、偽のプロフィールを作成していました。本人確認書類の提出を拒否しています。",
    reportedUser: "Yamamoto Kenji",
    reporter: "Tran Thi Mai",
    date: "2026/04/01",
    files: [
      { name: "profile_copy.png", type: "image" },
    ],
    status: "pending",
  },
];

const PAGE_SIZE = 6;

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

// ─── Country badge ────────────────────────────────────────────────────────────

function CountryBadge({ country }: { country: "VN" | "JP" }) {
  const isVN = country === "VN";
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{
        backgroundColor: isVN ? "#fce7e7" : "#e7f0fc",
        color: isVN ? "#dc2626" : "#2563eb",
      }}
    >
      <span className="font-bold">{country}</span>
      {isVN ? "ベトナム" : "日本"}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "active" | "frozen" }) {
  const isActive = status === "active";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
      style={{
        backgroundColor: isActive ? "#f0fdf4" : "#fef2f2",
        color: isActive ? "#16a34a" : "#dc2626",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: isActive ? "#16a34a" : "#dc2626" }}
      />
      {isActive ? "アクティブ" : "凍結"}
    </span>
  );
}

// ─── Report count ─────────────────────────────────────────────────────────────

function ReportCount({ count }: { count: number }) {
  const hasReports = count > 0;
  return (
    <div className="flex items-center gap-1" style={{ color: hasReports ? "#f97316" : "#9ca3af" }}>
      <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
      <span className="text-sm font-medium">{count}</span>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-full shadow-lg z-50 text-white text-sm font-medium" style={{ backgroundColor: "#1B4332" }}>
      <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {message}
    </div>
  );
}

// ─── Evidence Modal ───────────────────────────────────────────────────────────

function EvidenceModal({
  report,
  onClose,
}: {
  report: ViolationReport;
  onClose: () => void;
}) {
  const imageFiles = report.files.filter((f) => f.type === "image");
  const pdfFiles = report.files.filter((f) => f.type === "pdf");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">証拠ファイル</p>
              <p className="text-xs text-gray-400">{report.type} — {report.files.length}件のファイル</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image preview */}
        {imageFiles.length > 0 && (
          <div className="mb-3 rounded-xl overflow-hidden bg-gray-100" style={{ height: 200 }}>
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-12 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <p className="text-xs text-gray-400">{imageFiles[0].name}</p>
              </div>
            </div>
          </div>
        )}

        {/* File list */}
        <div className="flex flex-col gap-2 mb-5">
          {imageFiles.map((f) => (
            <div key={f.name} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
                </svg>
              </div>
              <span className="text-sm text-gray-700 font-medium">{f.name}</span>
            </div>
          ))}
          {pdfFiles.map((f) => (
            <div key={f.name} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-700 font-medium">{f.name}</p>
                {f.size && <p className="text-xs text-gray-400">PDFドキュメント — {f.size}</p>}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

// ─── User Drawer ──────────────────────────────────────────────────────────────

function UserDrawer({
  user,
  onClose,
  onToggleStatus,
}: {
  user: User;
  onClose: () => void;
  onToggleStatus: (id: number) => void;
}) {
  const detail = USER_DETAILS[user.id];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-screen bg-white z-50 flex flex-col shadow-2xl overflow-hidden" style={{ width: 380 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <p className="text-sm font-bold text-gray-900">ユーザー詳細</p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Avatar + name */}
          <div className="flex flex-col items-center text-center mb-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-bold mb-3"
              style={{ backgroundColor: user.color, outline: "2.5px solid #1B4332", outlineOffset: "3px" }}
            >
              {user.name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase()}
            </div>
            <p className="text-base font-bold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-400 mt-0.5 mb-2">{user.email}</p>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: user.status === "active" ? "#f0fdf4" : "#fef2f2",
                  color: user.status === "active" ? "#16a34a" : "#dc2626",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: user.status === "active" ? "#16a34a" : "#dc2626" }} />
                {user.status === "active" ? "アクティブ" : "凍結"}
              </span>
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: user.country === "VN" ? "#fce7e7" : "#e7f0fc",
                  color: user.country === "VN" ? "#dc2626" : "#2563eb",
                }}
              >
                <span className="font-bold">{user.country}</span>
                {user.country === "VN" ? "ベトナム" : "日本"}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 border-t border-b border-gray-100 py-4 mb-5">
            {[
              { label: "コネクション", value: detail?.connections ?? 0 },
              { label: "メッセージ", value: detail?.messages ?? 0 },
              { label: "通報", value: user.reports },
            ].map((s, i) => (
              <div key={s.label} className={`text-center ${i < 2 ? "border-r border-gray-100" : ""}`}>
                <p className="text-lg font-bold text-gray-900">{s.value.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* 基本情報 */}
          <div className="mb-5">
            <p className="text-sm font-bold text-gray-800 mb-3">基本情報</p>
            <div className="flex flex-col gap-3">
              {[
                {
                  icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" /></svg>,
                  label: "職業", value: detail?.occupation,
                },
                {
                  icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>,
                  label: "所在地", value: detail?.location,
                },
                {
                  icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
                  label: "参加日", value: user.joinDate,
                },
                {
                  icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                  label: "最終アクティブ", value: detail?.lastActive,
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-400">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-sm font-medium text-gray-800">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 言語スキル */}
          {detail?.languages && detail.languages.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-bold text-gray-800 mb-3">言語スキル</p>
              <div className="flex flex-wrap gap-2">
                {detail.languages.map((lang) => (
                  <span key={lang} className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 自己紹介 */}
          {detail?.bio && (
            <div>
              <p className="text-sm font-bold text-gray-800 mb-2">自己紹介</p>
              <p className="text-sm text-gray-500 leading-relaxed">{detail.bio}</p>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={() => { onToggleStatus(user.id); onClose(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: user.status === "active" ? "#ef4444" : "#1B4332" }}
          >
            {user.status === "active" ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                アカウントを凍結
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                凍結を解除
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </>
  );
}

// ─── All Users tab ────────────────────────────────────────────────────────────

function AllUsersTab({ users, onToggleStatus, onViewUser }: { users: User[]; onToggleStatus: (id: number) => void; onViewUser: (u: User) => void }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "frozen">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || u.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [users, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const filterLabel = statusFilter === "all" ? "すべてのステータス" : statusFilter === "active" ? "アクティブ" : "凍結";

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="ユーザー名を検索..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": "#1B4332" } as React.CSSProperties}
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white transition-colors hover:bg-gray-50 ${filterOpen ? "border-2" : "border border-transparent"}`}
            style={{ borderColor: filterOpen ? "#1B4332" : "transparent", color: filterOpen ? "#1B4332" : "#6b7280" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            {filterLabel}
            <svg xmlns="http://www.w3.org/2000/svg" className={`size-4 transition-transform ${filterOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {filterOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
              <div className="absolute left-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden py-1">
                {([
                  { value: "all", label: "すべてのステータス", dot: null },
                  { value: "active", label: "アクティブ", dot: "#16a34a" },
                  { value: "frozen", label: "凍結", dot: "#dc2626" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setStatusFilter(opt.value); setFilterOpen(false); setPage(1); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                    style={{
                      backgroundColor: statusFilter === opt.value ? "#f0fdf4" : "",
                      color: "#374151",
                    }}
                    onMouseEnter={(e) => { if (statusFilter !== opt.value) e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                    onMouseLeave={(e) => { if (statusFilter !== opt.value) e.currentTarget.style.backgroundColor = ""; }}
                  >
                    {opt.dot ? (
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.dot }} />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                    )}
                    <span>{opt.label}</span>
                    {statusFilter === opt.value && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="size-4 ml-auto text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <span className="ml-auto text-sm text-gray-400 font-medium">{filtered.length}件のユーザー</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="grid text-xs font-medium text-gray-400 px-5 py-3 border-b border-gray-100" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 0.7fr 1fr" }}>
          <span>ユーザー</span>
          <span>国</span>
          <span>ステータス</span>
          <span>参加日</span>
          <span>通報</span>
          <span>アクション</span>
        </div>

        {paginated.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">該当するユーザーが見つかりません</div>
        ) : (
          paginated.map((u, i) => (
            <div
              key={u.id}
              className="grid items-center px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
              style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 0.7fr 1fr" }}
            >
              {/* User */}
              <div className="flex items-center gap-3">
                <Avatar name={u.name} color={u.color} />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
              </div>

              {/* Country */}
              <div className="flex items-center">
                <CountryBadge country={u.country} />
              </div>

              {/* Status */}
              <div className="flex items-center">
                <StatusBadge status={u.status} />
              </div>

              {/* Join date */}
              <div className="flex items-center">
                <span className="text-sm text-gray-600">{u.joinDate}</span>
              </div>

              {/* Reports */}
              <div className="flex items-center">
                <ReportCount count={u.reports} />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* View */}
                <button onClick={() => onViewUser(u)} className="w-8 h-8 rounded-full flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {/* Toggle freeze */}
                {u.status === "active" ? (
                  <button
                    onClick={() => onToggleStatus(u.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={() => onToggleStatus(u.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-400">
            {filtered.length}件中 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)}件を表示
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                style={
                  p === page
                    ? { backgroundColor: "#1B4332", color: "#ffffff" }
                    : { color: "#6b7280" }
                }
                onMouseEnter={(e) => { if (p !== page) e.currentTarget.style.backgroundColor = "#f3f4f6"; }}
                onMouseLeave={(e) => { if (p !== page) e.currentTarget.style.backgroundColor = ""; }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Violation reports tab ────────────────────────────────────────────────────

function ViolationReportsTab({ onFreezeUser }: { onFreezeUser: (userName: string) => void }) {
  const [reports, setReports] = useState<ViolationReport[]>(INITIAL_REPORTS);
  const [evidenceReport, setEvidenceReport] = useState<ViolationReport | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const pending = reports.filter((r) => r.status === "pending");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function freezeAccount(id: number) {
    const report = reports.find((r) => r.id === id);
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: "frozen" } : r));
    if (report) onFreezeUser(report.reportedUser);
    showToast(`${report?.reportedUser} のアカウントを凍結しました`);
  }

  function ignoreReport(id: number) {
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: "ignored" } : r));
    showToast("報告を無視しました");
  }

  return (
    <div>
      {pending.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full border-2 flex items-center justify-center" style={{ borderColor: "#1B4332" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "#1B4332" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-base font-bold text-gray-800">すべての報告を処理しました</p>
          <p className="text-sm text-gray-400">現在未処理の違反報告はありません</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-4">
              {/* Left icon */}
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-gray-900">{r.type}</p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fef3c7", color: "#d97706" }}>
                    Pending
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-1.5">{r.description}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                  <span>被報告者: <span className="font-semibold text-gray-600">{r.reportedUser}</span></span>
                  <span className="text-gray-200">|</span>
                  <span>報告者: <span className="font-semibold text-gray-600">{r.reporter}</span></span>
                  <span className="text-gray-200">|</span>
                  <span>{r.date}</span>
                </div>
                <button
                  onClick={() => setEvidenceReport(r)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                  </svg>
                  証拠を見る ({r.files.length}ファイル)
                </button>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => freezeAccount(r.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#ef4444" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  アカウント凍結
                </button>
                <button
                  onClick={() => ignoreReport(r.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  無視
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {evidenceReport && <EvidenceModal report={evidenceReport} onClose={() => setEvidenceReport(null)} />}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<"users" | "reports">("users");
  const [users, setUsers] = useState<User[]>(USERS);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const pendingReports = INITIAL_REPORTS.filter((r) => r.status === "pending").length;

  function toggleStatus(id: number) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === "active" ? "frozen" : "active" } : u
      )
    );
    setSelectedUser((prev) => prev?.id === id ? { ...prev, status: prev.status === "active" ? "frozen" : "active" } : prev);
  }

  function freezeUserByName(userName: string) {
    setUsers((prev) =>
      prev.map((u) => u.name === userName ? { ...u, status: "frozen" } : u)
    );
  }

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">ユーザー管理</h1>
        <p className="text-xs text-gray-400 mt-0.5">ユーザーアカウントの管理と違反報告の処理</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("users")}
          className="flex items-center gap-1.5 px-4 pb-3 text-sm font-semibold transition-colors relative"
          style={{ color: activeTab === "users" ? "#1B4332" : "#9ca3af" }}
        >
          全ユーザー
          {activeTab === "users" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: "#1B4332" }} />
          )}
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className="flex items-center gap-1.5 px-4 pb-3 text-sm font-semibold transition-colors relative"
          style={{ color: activeTab === "reports" ? "#1B4332" : "#9ca3af" }}
        >
          違反報告
          <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
            {pendingReports}
          </span>
          {activeTab === "reports" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: "#1B4332" }} />
          )}
        </button>
      </div>

      {activeTab === "users" ? (
        <AllUsersTab users={users} onToggleStatus={toggleStatus} onViewUser={setSelectedUser} />
      ) : (
        <ViolationReportsTab onFreezeUser={freezeUserByName} />
      )}

      {selectedUser && (
        <UserDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onToggleStatus={toggleStatus}
        />
      )}
    </div>
  );
}
