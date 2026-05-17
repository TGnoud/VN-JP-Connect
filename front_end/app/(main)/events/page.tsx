"use client";

import { useState, useRef, useEffect } from "react";

type EventCategory = "文化交流" | "料理" | "言語学習";

interface EventItem {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  startTime: string;
  endTime: string;
  weekday: string;
  venue: string;
  address: string;
  maxParticipants: number;
  currentParticipants: number;
  isJoined: boolean;
  isBookmarked: boolean;
  about: string;
  expectations: string[];
  gradient: string;
  imageUrl?: string;
}

const CATEGORY_BG: Record<string, string> = {
  "文化交流": "#1B4332",
  "料理": "#92400e",
  "言語学習": "#1e3a5f",
};

const INITIAL_EVENTS: EventItem[] = [
  {
    id: "e1",
    title: "日越文化交流の夜",
    category: "文化交流",
    date: "2026年4月12日",
    startTime: "18:00",
    endTime: "21:00",
    weekday: "日",
    venue: "東京国際フォーラム",
    address: "東京都千代田区の内3-5-1 ホールB7",
    maxParticipants: 60,
    currentParticipants: 45,
    isJoined: true,
    isBookmarked: true,
    about:
      "日本とベトナムの文化をテーマにした交流イベントです。伝統的な音楽、料理、衣装の展示を通じて、両国の豊かな文化に触れることができます。言語交換セッションと文化体験ワークショップも開催されます。初めての方も大歓迎です！",
    expectations: [
      "伝統的な日越音楽パフォーマンス",
      "ベトナム・日本料理の試食",
      "言語交換セッション",
      "民族衣装の着付け体験",
    ],
    gradient: "from-emerald-900 via-green-700 to-emerald-500",
    imageUrl: "https://picsum.photos/seed/aodai-culture/800/300",
  },
  {
    id: "e2",
    title: "ベトナム料理教室",
    category: "料理",
    date: "2026年4月19日",
    startTime: "14:00",
    endTime: "17:00",
    weekday: "土",
    venue: "ABC料理スタジオ 渋谷",
    address: "東京都渋谷区神宮前1-2-3",
    maxParticipants: 20,
    currentParticipants: 19,
    isJoined: true,
    isBookmarked: false,
    about:
      "プロのベトナム人シェフと一緒に本格的なフォーとバインミーを作りましょう。材料や道具はすべてこちらで用意します。",
    expectations: [
      "フォーの作り方をゼロから学ぶ",
      "バインミーの具材と調理法",
      "ベトナム料理の基本スパイス解説",
    ],
    gradient: "from-amber-800 via-orange-600 to-amber-400",
    imageUrl: "https://picsum.photos/seed/cooking-vn/800/300",
  },
  {
    id: "e3",
    title: "日本語・ベトナム語 言語交換会",
    category: "言語学習",
    date: "2026年4月26日",
    startTime: "10:00",
    endTime: "12:00",
    weekday: "土",
    venue: "新宿コミュニティセンター",
    address: "東京都新宿区西新宿2-8-1",
    maxParticipants: 30,
    currentParticipants: 12,
    isJoined: false,
    isBookmarked: true,
    about:
      "日本語とベトナム語を互いに教え合う言語交換会です。初心者から上級者まで歓迎！ペアを組んで練習します。",
    expectations: [
      "1対1の言語練習セッション",
      "発音矯正アドバイス",
      "日常会話フレーズ集のプレゼント",
    ],
    gradient: "from-blue-900 via-indigo-700 to-blue-500",
    imageUrl: "https://picsum.photos/seed/language-study/800/300",
  },
];

const AVATAR_SEEDS = ["hiroshi", "minhanh", "yuki", "kenji", "linh", "duc", "sakura"];

const SHARE_OPTIONS = [
  { label: "LINE", bg: "#06C755", text: "L" },
  { label: "Facebook", bg: "#1877F2", text: "f" },
  { label: "X (Twitter)", bg: "#000000", text: "X" },
  { label: "LinkedIn", bg: "#0A66C2", text: "in" },
  { label: "メール", bg: "#ef4444", text: "✉" },
];

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="size-5"
      fill={filled ? "#f59e0b" : "none"}
      viewBox="0 0 24 24"
      stroke={filled ? "#f59e0b" : "currentColor"}
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PlusCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ShareDropdown({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
    >
      <div className="px-5 pt-5 pb-3">
        <p className="font-bold text-gray-900 text-base">イベントを共有</p>
        <p className="text-sm text-gray-400 mt-0.5">SNSで友達に知らせよう</p>
      </div>
      <div className="flex flex-col px-3 pb-3">
        {SHARE_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            className="flex items-center gap-4 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
            onClick={onClose}
          >
            <span
              className="rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: opt.bg, width: 36, height: 36 }}
            >
              {opt.text}
            </span>
            <span className="text-gray-800 font-medium text-sm">{opt.label}</span>
          </button>
        ))}
        <div className="border-t border-gray-100 mx-2 my-1" />
        <button
          className="flex items-center gap-4 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.clipboard) {
              navigator.clipboard.writeText(window.location.href);
            }
            onClose();
          }}
        >
          <span
            className="rounded-full bg-gray-100 flex items-center justify-center shrink-0"
            style={{ width: 36, height: 36 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          </span>
          <span className="text-gray-800 font-medium text-sm">リンクをコピー</span>
        </button>
      </div>
    </div>
  );
}

function EventListCard({
  event,
  isSelected,
  onSelect,
  onToggleBookmark,
}: {
  event: EventItem;
  isSelected: boolean;
  onSelect: () => void;
  onToggleBookmark: (id: string) => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="rounded-2xl cursor-pointer transition-all bg-white"
      style={{
        border: isSelected ? "2px solid #1B4332" : "1px solid #f3f4f6",
        boxShadow: isSelected ? "0 2px 8px rgba(27,67,50,0.08)" : undefined,
      }}
    >
      <div
        className="relative rounded-t-2xl overflow-hidden shrink-0"
        style={{
          height: 120,
          backgroundImage: event.imageUrl ? `url(${event.imageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: event.imageUrl ? undefined : "#d1fae5",
        }}
      >
        {!event.imageUrl && (
          <div className={`absolute inset-0 bg-gradient-to-br ${event.gradient}`} />
        )}
        <span
          className="absolute top-2.5 left-2.5 text-white text-xs font-semibold px-2.5 py-1 rounded-full z-10"
          style={{ backgroundColor: CATEGORY_BG[event.category] ?? "#1B4332" }}
        >
          {event.category}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(event.id);
          }}
          className="absolute top-2.5 right-2.5 size-8 rounded-full bg-white flex items-center justify-center shadow-sm z-10"
        >
          <StarIcon filled={event.isBookmarked} />
        </button>
      </div>

      <div className="px-3.5 py-3">
        <h3 className="font-bold text-gray-900 text-sm mb-1.5 leading-snug">{event.title}</h3>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {event.date}（{event.weekday}） {event.startTime} - {event.endTime}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            {event.venue}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            {event.currentParticipants}/{event.maxParticipants} 参加中
          </div>
        </div>
      </div>
    </div>
  );
}

function EventDetail({
  event,
  onToggleJoin,
  onToggleBookmark,
}: {
  event: EventItem;
  onToggleJoin: (id: string) => void;
  onToggleBookmark: (id: string) => void;
}) {
  const [showShare, setShowShare] = useState(false);
  const spotsLeft = event.maxParticipants - event.currentParticipants;
  const progressPct = Math.round((event.currentParticipants / event.maxParticipants) * 100);
  const visibleAvatars = AVATAR_SEEDS.slice(0, Math.min(4, event.currentParticipants));
  const extraCount = event.currentParticipants - visibleAvatars.length;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Hero */}
      <div
        className="relative shrink-0 h-56"
        style={{
          backgroundImage: event.imageUrl ? `url(${event.imageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: event.imageUrl ? undefined : "#d1fae5",
        }}
      >
        {!event.imageUrl && (
          <div className={`absolute inset-0 bg-gradient-to-br ${event.gradient}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <span
          className="absolute top-4 left-4 text-white text-xs font-semibold px-2.5 py-1 rounded-full z-10"
          style={{ backgroundColor: CATEGORY_BG[event.category] ?? "#1B4332" }}
        >
          {event.category}
        </span>
        <button
          onClick={() => onToggleBookmark(event.id)}
          className="absolute top-4 right-4 size-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center z-10"
        >
          <StarIcon filled={event.isBookmarked} />
        </button>
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <p className="text-white font-bold text-2xl leading-snug">{event.title}</p>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-5">
        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => onToggleJoin(event.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold text-sm transition-all"
            style={
              event.isJoined
                ? { borderColor: "#1B4332", color: "#1B4332", backgroundColor: "white" }
                : { backgroundColor: "#1B4332", color: "white", borderColor: "#1B4332" }
            }
          >
            {event.isJoined ? <CheckCircleIcon /> : <PlusCircleIcon />}
            {event.isJoined ? "イベントを退出する" : "イベントに参加する"}
          </button>
          <div className="relative shrink-0">
            <button
              onClick={() => setShowShare((s) => !s)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
              共有
            </button>
            {showShare && <ShareDropdown onClose={() => setShowShare(false)} />}
          </div>
        </div>

        {/* Date & Location */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              日時
            </div>
            <p className="text-sm font-semibold text-gray-800">
              {event.date}（{event.weekday}）
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ⏰ {event.startTime} - {event.endTime}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              場所
            </div>
            <p className="text-sm font-semibold text-gray-800">{event.venue}</p>
            <p className="text-xs text-gray-500 mt-1">{event.address}</p>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              参加者
            </div>
            <span className="text-xs font-semibold text-gray-400">残り{spotsLeft}枚</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center">
              {visibleAvatars.map((seed, i) => (
                <img
                  key={seed}
                  src={`https://api.dicebear.com/7.x/personas/svg?seed=${seed}`}
                  alt=""
                  className="rounded-full border-2 border-white object-cover"
                  style={{ width: 32, height: 32, marginLeft: i === 0 ? 0 : -10, zIndex: visibleAvatars.length - i }}
                />
              ))}
              {extraCount > 0 && (
                <div
                  className="rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-semibold text-gray-600"
                  style={{ width: 32, height: 32, marginLeft: -10, zIndex: 0 }}
                >
                  +{extraCount}
                </div>
              )}
            </div>
            <span className="text-sm font-semibold text-gray-700">
              {event.currentParticipants}/{event.maxParticipants} 参加中
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, backgroundColor: "#1B4332" }}
            />
          </div>
        </div>

        {/* About */}
        <div>
          <h4 className="font-bold text-gray-900 text-sm mb-2">イベントについて</h4>
          <p className="text-sm text-gray-500 leading-relaxed">{event.about}</p>
        </div>

        {/* Expectations */}
        {event.expectations.length > 0 && (
          <div>
            <h4 className="font-bold text-gray-900 text-sm mb-3">期待できること</h4>
            <div className="flex flex-col gap-2.5">
              {event.expectations.map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-gray-600">
                  <span
                    className="rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: "#d1fae5", width: 20, height: 20 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-3" fill="none" viewBox="0 0 24 24" stroke="#1B4332" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const CATEGORY_FILTERS = ["すべて", "文化交流", "料理", "言語学習", "ワークショップ"] as const;
type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_EVENTS[0].id);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("すべて");
  const [showFilterChips, setShowFilterChips] = useState(false);

  const selectedEvent = events.find((e) => e.id === selectedId) ?? events[0];
  const filteredEvents = events.filter((e) => {
    const matchSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase()) ||
      e.category.includes(search);
    const matchCategory = activeCategory === "すべて" || e.category === activeCategory;
    return matchSearch && matchCategory;
  });

  function handleToggleJoin(id: string) {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              isJoined: !e.isJoined,
              currentParticipants: e.currentParticipants + (e.isJoined ? -1 : 1),
            }
          : e
      )
    );
  }

  function handleToggleBookmark(id: string) {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isBookmarked: !e.isBookmarked } : e))
    );
  }

  return (
    <div className="flex overflow-hidden" style={{ height: "100vh" }}>
      {/* Left panel */}
      <div className="w-[380px] shrink-0 flex flex-col border-r border-gray-100 bg-white overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-bold text-gray-900">イベント</h1>
          <button
            onClick={() => setShowFilterChips((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors"
            style={
              showFilterChips
                ? { borderColor: "#1B4332", color: "#1B4332", backgroundColor: "#f0fdf4" }
                : { borderColor: "#e5e7eb", color: "#6b7280", backgroundColor: "white" }
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            フィルター
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-4 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="イベントを検索..."
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
            />
          </div>
        </div>

        {/* Category filter chips */}
        {showFilterChips && (
          <div className="px-5 pb-3 shrink-0 flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
                  style={
                    isActive
                      ? { backgroundColor: "#1B4332", color: "white" }
                      : { backgroundColor: "white", color: "#374151", border: "1.5px solid #e5e7eb" }
                  }
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 flex flex-col gap-3">
          {filteredEvents.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              イベントが見つかりません
            </div>
          ) : (
            filteredEvents.map((event) => (
              <EventListCard
                key={event.id}
                event={event}
                isSelected={event.id === selectedId}
                onSelect={() => setSelectedId(event.id)}
                onToggleBookmark={handleToggleBookmark}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-gray-50 overflow-hidden">
        {selectedEvent && (
          <EventDetail
            event={selectedEvent}
            onToggleJoin={handleToggleJoin}
            onToggleBookmark={handleToggleBookmark}
          />
        )}
      </div>
    </div>
  );
}
