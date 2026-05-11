"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { MOCK_USERS } from "@/lib/mock-data";
import type { User, FilterState } from "@/types";

const JP_FILTER_LEVELS = ["N1", "N2", "N3", "N4", "N5", "なし", "母語レベル"] as const;

const FILTER_INTERESTS = ["旅行", "アニメ", "食べ歩き", "写真", "言語学習", "音楽", "映画", "スポーツ", "テクノロジー", "料理"];

const DEFAULT_FILTER: FilterState = {
  gender: "all",
  ageMin: 18,
  ageMax: 35,
  distanceMax: 50,
  japaneseLevel: [],
  nationality: "all",
  interests: [],
};

function calcAge(birthDate: string) {
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function getFirstName(fullName: string) {
  return fullName.split(" ")[0];
}

/* ─── Profile Card ─── */
function ProfileCard({
  user,
  onLike,
  onSkip,
  onViewDetail,
}: {
  user: User;
  onLike: () => void;
  onSkip: () => void;
  onViewDetail: () => void;
}) {
  const age = calcAge(user.birthDate);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex w-full" style={{ minHeight: 320 }}>
      {/* Left: photo */}
      <div className="relative shrink-0" style={{ width: "42%" }}>
        <Image
          src={user.avatarUrl}
          alt={user.fullName}
          fill
          className="object-cover"
          unoptimized
        />
        {/* Like rate badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur rounded-full px-2.5 py-1 shadow text-xs font-bold text-gray-800">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
          </svg>
          {user.likeRate}%
        </div>
      </div>

      {/* Right: info */}
      <div className="flex-1 flex flex-col px-5 py-4 gap-3 min-w-0">
        {/* Name & age */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">{user.fullName}, {age}</h2>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 15.327 17 12.993 17 10a7 7 0 10-14 0c0 2.993 1.698 5.327 3.354 6.985a21.485 21.485 0 002.273 1.765 11.44 11.44 0 00.757.433 5.741 5.741 0 00.28.14l.019.008.006.002zM10 11.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z" clipRule="evenodd" />
            </svg>
            {user.nationality === "Japanese" ? "東京・日本" : "ハノイ・ベトナム"} · {user.city}在住
          </p>
        </div>

        {/* バイブス */}
        {user.bio && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">バイブス</p>
            <div className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
              <p className="text-xs text-gray-700 line-clamp-3 leading-relaxed">{user.bio}</p>
            </div>
          </div>
        )}

        {/* 話せる言語 ＆ 興味・関心 — 2 columns */}
        <div className="flex gap-4">
          {/* 話せる言語 */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500 mb-1.5">話せる言語</p>
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1.5 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">日本語</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">{user.japaneseLevel}</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold w-fit">ベトナム語（{user.vietnameseLevel}）</span>
            </div>
          </div>

          {/* 興味・関心 */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500 mb-1.5">興味・関心</p>
            <div className="grid grid-cols-2 gap-1.5">
              {user.interests.slice(0, 4).map((i) => (
                <span key={i} className="text-xs text-gray-700 rounded-md px-2 py-1 text-center truncate" style={{ backgroundColor: "#DDDDDD" }}>
                  {i}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-auto">
          {/* スキップ */}
          <button
            onClick={onSkip}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors"
          >
            <span className="font-bold">×</span> スキップ
          </button>
          {/* プロフィール */}
          <button
            onClick={onViewDetail}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
            </svg>
            プロフィール
          </button>
          {/* つながる */}
          <button
            onClick={onLike}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-white text-xs font-semibold transition-colors"
            style={{ backgroundColor: "#1B4332" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            {getFirstName(user.fullName)}さんとつながる
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Filter Panel ─── */
function SectionHeader({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
    >
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <span className="text-gray-500 text-xs" style={{ transform: open ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>▽</span>
    </button>
  );
}

function FilterPanel({
  filter,
  onApply,
  onReset,
  onClose,
}: {
  filter: FilterState;
  onApply: (f: FilterState) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<FilterState>({ ...filter });
  const [natArr, setNatArr] = useState<string[]>(
    filter.nationality === "all" ? [] : [filter.nationality as string]
  );
  const [open, setOpen] = useState({ gender: true, age: true, distance: true, jpLevel: true, nationality: true, interests: true });

  function toggleSection(key: keyof typeof open) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function update<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  function toggleJpLevel(display: string) {
    const mapped = display === "なし" ? "Basic" : display === "母語レベル" ? "Native" : display;
    const lvl = mapped as FilterState["japaneseLevel"][number];
    setLocal((prev) => ({
      ...prev,
      japaneseLevel: prev.japaneseLevel.includes(lvl)
        ? prev.japaneseLevel.filter((l) => l !== lvl)
        : [...prev.japaneseLevel, lvl],
    }));
  }

  function isJpActive(display: string) {
    const mapped = display === "なし" ? "Basic" : display === "母語レベル" ? "Native" : display;
    return local.japaneseLevel.includes(mapped as FilterState["japaneseLevel"][number]);
  }

  function toggleNat(val: string) {
    setNatArr((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);
  }

  function toggleInterest(interest: string) {
    setLocal((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  }

  function handleApply() {
    const nat = natArr.length === 1 ? (natArr[0] as FilterState["nationality"]) : "all";
    onApply({ ...local, nationality: nat });
  }

  function handleReset() {
    setLocal({ ...DEFAULT_FILTER });
    setNatArr([]);
    onReset();
  }

  const pillBase = "py-1 px-2.5 rounded-md text-xs font-medium border transition-all";
  const pillActive = "text-white border-transparent";
  const pillInactive = "bg-white text-gray-600 border-gray-200 hover:border-gray-400";

  return (
    <div className="w-60 shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <span className="text-sm font-semibold text-gray-900">フィルター</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-1">

        {/* 性別 */}
        <div>
          <SectionHeader label="性別" open={open.gender} onToggle={() => toggleSection("gender")} />
          {open.gender && (
            <div className="flex gap-1.5 px-3 pt-2 pb-3">
              {[{ v: "all", l: "すべて" }, { v: "male", l: "男性" }, { v: "female", l: "女性" }].map((o) => (
                <button
                  key={o.v}
                  onClick={() => update("gender", o.v as FilterState["gender"])}
                  className={clsx(pillBase, "flex-1", local.gender === o.v ? pillActive : pillInactive)}
                  style={local.gender === o.v ? { backgroundColor: "#1B4332" } : undefined}
                >
                  {o.l}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 年齢範囲 */}
        <div>
          <SectionHeader label="年齢範囲" open={open.age} onToggle={() => toggleSection("age")} />
          {open.age && (
            <div className="px-3 pt-2 pb-3">
              <div className="flex justify-center text-xs font-medium text-gray-700 mb-2">
                {local.ageMin} - {local.ageMax} 歳
              </div>
              <div className="flex flex-col gap-1">
                <input type="range" min={18} max={local.ageMax - 1} value={local.ageMin}
                  onChange={(e) => update("ageMin", Number(e.target.value))} className="w-full" />
                <input type="range" min={local.ageMin + 1} max={60} value={local.ageMax}
                  onChange={(e) => update("ageMax", Number(e.target.value))} className="w-full" />
              </div>
            </div>
          )}
        </div>

        {/* 距離 */}
        <div>
          <SectionHeader label="距離" open={open.distance} onToggle={() => toggleSection("distance")} />
          {open.distance && (
            <div className="px-3 pt-2 pb-3">
              <div className="flex justify-center text-xs font-medium text-gray-700 mb-2">
                {local.distanceMax} km
              </div>
              <input type="range" min={1} max={100} value={local.distanceMax}
                onChange={(e) => update("distanceMax", Number(e.target.value))} className="w-full" />
            </div>
          )}
        </div>

        {/* 日本語レベル */}
        <div>
          <SectionHeader label="日本語レベル" open={open.jpLevel} onToggle={() => toggleSection("jpLevel")} />
          {open.jpLevel && (
            <div className="flex gap-1.5 flex-wrap px-3 pt-2 pb-3">
              {JP_FILTER_LEVELS.map((lv) => (
                <button
                  key={lv}
                  onClick={() => toggleJpLevel(lv)}
                  className={clsx(pillBase, isJpActive(lv) ? pillActive : pillInactive)}
                  style={isJpActive(lv) ? { backgroundColor: "#1B4332" } : undefined}
                >
                  {lv}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 国籍 */}
        <div>
          <SectionHeader label="国籍" open={open.nationality} onToggle={() => toggleSection("nationality")} />
          {open.nationality && (
            <div className="flex gap-1.5 flex-wrap px-3 pt-2 pb-3">
              {[{ v: "Vietnamese", l: "ベトナム" }, { v: "Japanese", l: "日本" }, { v: "other", l: "その他" }].map((o) => (
                <button
                  key={o.v}
                  onClick={() => toggleNat(o.v)}
                  className={clsx(pillBase, "flex items-center gap-1", natArr.includes(o.v) ? pillActive : pillInactive)}
                  style={natArr.includes(o.v) ? { backgroundColor: "#1B4332" } : undefined}
                >
                  {natArr.includes(o.v) && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  )}
                  {o.l}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 興味 */}
        <div>
          <SectionHeader label="興味" open={open.interests} onToggle={() => toggleSection("interests")} />
          {open.interests && (
            <div className="flex gap-1.5 flex-wrap px-3 pt-2 pb-3">
              {FILTER_INTERESTS.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={clsx(pillBase, "flex items-center gap-1", local.interests.includes(interest) ? pillActive : pillInactive)}
                  style={local.interests.includes(interest) ? { backgroundColor: "#1B4332" } : undefined}
                >
                  {local.interests.includes(interest) && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  )}
                  {interest}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 flex gap-2 shrink-0">
        <button
          onClick={handleReset}
          className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all"
        >
          リセット
        </button>
        <button
          onClick={handleApply}
          className="flex-1 py-2 rounded-lg text-white text-xs font-semibold"
          style={{ backgroundColor: "#1B4332" }}
        >
          適用する
        </button>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function DiscoverPage() {
  const router = useRouter();
  const [users] = useState<User[]>([...MOCK_USERS]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<FilterState>({ ...DEFAULT_FILTER });
  const [showFilter, setShowFilter] = useState(false);
  const [matchAlert, setMatchAlert] = useState<string | null>(null);

  const current = users[currentIndex];

  function handleSkip() {
    setCurrentIndex((i) => (i < users.length - 1 ? i + 1 : 0));
  }

  function handleLike() {
    if (!current) return;
    if (Math.random() > 0.5) {
      setMatchAlert(current.fullName);
      setTimeout(() => setMatchAlert(null), 3000);
    }
    handleSkip();
  }

  if (!current) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center bg-gray-50">
        <div>
          <p className="text-5xl mb-4">🎉</p>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">表示できるプロフィールがありません</h2>
          <p className="text-gray-500 text-sm">絞り込み条件を変更してみてください。</p>
        </div>
      </div>
    );
  }

  const hasActiveFilter =
    filter.gender !== "all" ||
    filter.japaneseLevel.length > 0 ||
    filter.interests.length > 0 ||
    filter.nationality !== "all";

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 shrink-0">
        <div>
          <h1 className="text-base font-bold text-gray-900">ディスカバー</h1>
          <p className="text-xs text-gray-400">新しい出会いを探す</p>
        </div>
        <button
          onClick={() => setShowFilter((v) => !v)}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            showFilter
              ? "text-white"
              : "border border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
          )}
          style={showFilter ? { backgroundColor: "#1B4332" } : undefined}
        >
          {/* ≡ lines icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
          </svg>
          フィルター
          {hasActiveFilter && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Card area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto">
          <div className="w-full max-w-2xl flex flex-col gap-3">
            <ProfileCard
              user={current}
              onLike={handleLike}
              onSkip={handleSkip}
              onViewDetail={() => router.push(`/users/${current.id}`)}
            />
            <p className="text-xs text-gray-400 text-center">
              {currentIndex + 1} / {users.length}
            </p>
          </div>
        </div>

        {/* Filter panel (right) */}
        {showFilter && (
          <FilterPanel
            filter={filter}
            onApply={(f) => setFilter(f)}
            onReset={() => setFilter({ ...DEFAULT_FILTER })}
            onClose={() => setShowFilter(false)}
          />
        )}
      </div>

      {/* Match toast */}
      {matchAlert && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 text-sm font-medium"
          style={{ backgroundColor: "#1B4332" }}
        >
          💞 {getFirstName(matchAlert)}さんとマッチしました！メッセージを送りましょう。
        </div>
      )}
    </div>
  );
}
