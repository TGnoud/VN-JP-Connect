"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { MOCK_USERS } from "@/lib/mock-data";

function calcAge(birthDate: string) {
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

const REPORT_REASONS = [
  "スパム行為",
  "不適切なコンテンツ",
  "ハラスメント",
  "偽のプロフィール",
  "その他",
];

type Lang = { useFlag: boolean; flagSrc: string; dotColor: string; name: string; level: string; sub?: string };

function getLanguages(user: (typeof MOCK_USERS)[0]): Lang[] {
  if (user.nationality === "Japanese") {
    return [
      { useFlag: false, flagSrc: "", dotColor: "#ef4444", name: "日本語", level: "母語" },
      { useFlag: true,  flagSrc: "https://flagcdn.com/20x15/vn.png", dotColor: "", name: "ベトナム語", level: user.vietnameseLevel },
      { useFlag: true,  flagSrc: "https://flagcdn.com/20x15/gb.png", dotColor: "", name: "英語", level: "流暢", sub: "TOEIC 920" },
    ];
  }
  return [
    { useFlag: true,  flagSrc: "https://flagcdn.com/20x15/vn.png", dotColor: "", name: "ベトナム語", level: "母語" },
    { useFlag: false, flagSrc: "", dotColor: "#ef4444", name: "日本語", level: user.japaneseLevel },
    { useFlag: true,  flagSrc: "https://flagcdn.com/20x15/gb.png", dotColor: "", name: "英語", level: "流暢", sub: "TOEIC 920" },
  ];
}

const DEMO_PHOTOS = [
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80",
  "https://images.unsplash.com/photo-1527203561188-dae1bc1a417f?w=300&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80",
  "https://images.unsplash.com/photo-1614289371518-722f2615943d?w=300&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&q=80",
];

const MOCK_COVER: Record<string, string> = {
  "1": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=900&q=80",
  "2": "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=900&q=80",
  "3": "https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=900&q=80",
};

/* ── Icons ── */
function BackArrowIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
    </svg>
  );
}
function ChatBubbleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}
function FlagReportIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 15.327 17 12.993 17 10a7 7 0 10-14 0c0 2.993 1.698 5.327 3.354 6.985a21.485 21.485 0 002.273 1.765 11.44 11.44 0 00.757.433 5.741 5.741 0 00.28.14l.019.008.006.002zM10 11.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z" clipRule="evenodd" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
  );
}
function ThumbsUpIcon() {
  return (
    <span className="inline-flex items-center justify-center size-6 rounded-full bg-green-50">
      <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
      </svg>
    </span>
  );
}
function PeopleGroupIcon() {
  return (
    <span className="inline-flex items-center justify-center size-6 rounded-full bg-green-50">
      <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    </span>
  );
}
function SectionIconWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center w-7 h-7 rounded-md shrink-0" style={{ backgroundColor: "#ecfdf5" }}>
      {children}
    </div>
  );
}
function UserInfoIcon() {
  return (
    <SectionIconWrap>
      <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    </SectionIconWrap>
  );
}
function LanguageGlobeIcon() {
  return (
    <SectionIconWrap>
      <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    </SectionIconWrap>
  );
}
function HeartIcon() {
  return (
    <SectionIconWrap>
      <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    </SectionIconWrap>
  );
}
function CameraIcon() {
  return (
    <SectionIconWrap>
      <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
      </svg>
    </SectionIconWrap>
  );
}
function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}

/* ── ReportModal ── */
function ReportModal({ onClose }: { onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (!reason) return;
    setSubmitted(true);
    setTimeout(onClose, 1500);
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-6 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">報告を送信しました</h3>
          <p className="text-sm text-gray-500">内容を確認し、できる限り早く対応いたします。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">ユーザーを報告</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><XIcon /></button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">

          {/* Subtitle */}
          <p className="text-sm text-gray-500">報告の理由を選択してください。</p>

          {/* Radio list — bordered with dividers */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {REPORT_REASONS.map((r, i) => (
              <label
                key={r}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${i > 0 ? "border-t border-gray-100" : ""}`}
              >
                <input
                  type="radio" name="report-reason" value={r} checked={reason === r}
                  onChange={() => setReason(r)}
                  className="w-4 h-4 shrink-0" style={{ accentColor: "#1B4332" }}
                />
                <span className="text-sm text-gray-700">{r}</span>
              </label>
            ))}
          </div>

          {/* Detail textarea */}
          <textarea
            placeholder="詳細を入力してください（任意）..."
            value={detail} onChange={(e) => setDetail(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400"
          />

          {/* Upload section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">証拠をアップロード（任意）</span>
              <span className="text-xs text-gray-400">{files.length}/5 ファイル</span>
            </div>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl py-5 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all">
              <span className="inline-flex items-center justify-center size-10 rounded-full mb-2" style={{ backgroundColor: "#ecfdf5" }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="size-5" style={{ color: "#1B4332" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </span>
              <span className="text-sm font-medium text-gray-700">クリックしてファイルを選択</span>
              <span className="text-xs text-gray-400 mt-0.5">画像・スクリーンショット（PNG, JPG, PDF）最大5MB・各10MBまで</span>
              <input
                type="file" accept="image/png,image/jpeg,application/pdf" multiple className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))}
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit} disabled={!reason}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: reason ? "#1B4332" : "#9ca3af" }}
          >
            報告する
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [showReport, setShowReport] = useState(false);

  const user = MOCK_USERS.find((u) => u.id === params.id) ?? MOCK_USERS[0];
  const age = calcAge(user.birthDate);
  const languages = getLanguages(user);

  const genderLabel = user.gender === "male" ? "男性" : "女性";
  const nationalityLabel = user.nationality === "Japanese" ? "日本" : "ベトナム";
  const joinedLabel = new Date(user.joinedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long" }) + "参加";
  const coverUrl = user.coverUrl ?? MOCK_COVER[user.id] ?? MOCK_COVER["1"];
  const photos = (user.photos && user.photos.length > 0) ? user.photos : DEMO_PHOTOS;

  const infoItems = [
    { label: "年齢",  value: `${age}歳` },
    { label: "性別",  value: genderLabel },
    { label: "国籍",  value: nationalityLabel },
    { label: "学歴",  value: "早稲田大学" },
  ];

  return (
    <div className="flex-1 overflow-auto bg-gray-50">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors shrink-0"
        >
          <BackArrowIcon />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-tight truncate">{user.fullName}</p>
          <p className="text-xs text-gray-400">プロフィールを見る</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pt-6">

        {/* ── Cover photo ── */}
        <div className="relative h-44 bg-gradient-to-br from-emerald-100 to-gray-200 overflow-hidden">
          <Image src={coverUrl} alt="cover" fill className="object-cover" unoptimized />
        </div>

        {/* ── Profile hero ── */}
        <div className="bg-white px-5 pb-4">
          {/* Avatar + name + buttons — avatar has -mt-10 independently */}
          <div className="flex gap-4 mb-3">
            <div className="relative w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100 shrink-0 -mt-10">
              <Image src={user.avatarUrl} alt={user.fullName} fill className="object-cover" unoptimized />
            </div>
            {/* Name + buttons: start cleanly in white section */}
            <div className="flex flex-1 items-start justify-between gap-2 mt-2">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 leading-tight">{user.fullName}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                  <span className="flex items-center gap-1"><PinIcon />{user.city}</span>
                  <span className="flex items-center gap-1"><BriefcaseIcon />{user.occupation}</span>
                  <span className="flex items-center gap-1"><CalendarIcon />{joinedLabel}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => router.push("/chat")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
                  style={{ backgroundColor: "#1B4332" }}
                >
                  <ChatBubbleIcon /> メッセージ
                </button>
                <button
                  onClick={() => setShowReport(true)}
                  className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <FlagReportIcon />
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <ThumbsUpIcon />
              <span className="text-sm font-bold text-gray-900">{user.likeRate}%</span>
              <span className="text-xs text-gray-400">高評価</span>
            </div>
            <div className="flex items-center gap-1.5">
              <PeopleGroupIcon />
              <span className="text-sm font-bold text-gray-900">{user.connectionsCount}</span>
              <span className="text-xs text-gray-400">つながり</span>
            </div>
          </div>
        </div>

        {/* ── Content cards ── */}
        <div className="px-4 py-4 flex flex-col gap-3">

          {/* 自己紹介 */}
          {user.bio && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1.5">自己紹介</p>
              <p className="text-sm text-gray-700 leading-relaxed">{user.bio}</p>
            </div>
          )}

          {/* 基本情報 */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <UserInfoIcon />
              <h2 className="text-sm font-semibold text-gray-900">基本情報</h2>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {infoItems.map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                  <p className="text-xs font-semibold text-gray-800">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 言語スキル */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <LanguageGlobeIcon />
              <h2 className="text-sm font-semibold text-gray-900">言語スキル</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {languages.map((l) => {
                const badgeStyle =
                  l.name === "日本語"
                    ? { color: "#1B4332", borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" }
                    : l.name === "ベトナム語"
                    ? { color: "#c2410c", borderColor: "#fed7aa", backgroundColor: "#fff7ed" }
                    : { color: "#1d4ed8", borderColor: "#bfdbfe", backgroundColor: "#eff6ff" };
                return (
                  <div key={l.name} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    {l.useFlag ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.flagSrc} alt={l.name} className="w-5 h-auto rounded-sm shrink-0" />
                    ) : (
                      <span style={{ color: l.dotColor }} className="text-sm leading-none shrink-0">●</span>
                    )}
                    <span className="text-xs font-semibold text-gray-800">{l.name}</span>
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded border leading-tight" style={badgeStyle}>
                        {l.level}
                      </span>
                      {l.sub && <span className="text-xs text-gray-400">{l.sub}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 趣味・関心 */}
          {user.interests.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <HeartIcon />
                <h2 className="text-sm font-semibold text-gray-900">趣味・関心</h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {user.interests.map((interest) => (
                  <span key={interest} className="text-xs px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 font-medium">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 写真 */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <CameraIcon />
                <h2 className="text-sm font-semibold text-gray-900">写真</h2>
              </div>
              <span className="text-xs text-gray-400">{photos.length}枚</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <Image src={p} alt={`photo-${i}`} fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {showReport && <ReportModal onClose={() => setShowReport(false)} />}
    </div>
  );
}
