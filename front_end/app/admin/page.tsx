"use client";

import { useState } from "react";

const TIME_RANGES = [
  { label: "過去7日間", value: "7d" },
  { label: "過去30日間", value: "30d" },
  { label: "過去3ヶ月", value: "3m" },
  { label: "過去1年", value: "1y" },
];

const CHART_DATA = [
  { month: "1月", vn: 280, jp: 210 },
  { month: "2月", vn: 155, jp: 155 },
  { month: "3月", vn: 320, jp: 305 },
  { month: "4月", vn: 435, jp: 325 },
  { month: "5月", vn: 465, jp: 440 },
  { month: "6月", vn: 575, jp: 470 },
];

const MAX_VALUE = 600;

function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  changePositive = true,
}: {
  title: string;
  value: string;
  change: string;
  changeLabel: string;
  icon: React.ReactNode;
  changePositive?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: changePositive ? "#dcfce7" : "#fee2e2",
              color: changePositive ? "#15803d" : "#dc2626",
            }}
          >
            {change}
          </span>
          <span className="text-xs text-gray-400">{changeLabel}</span>
        </div>
      </div>
    </div>
  );
}

function BarChart() {
  const [tooltip, setTooltip] = useState<{ month: string; vn: number; jp: number } | null>(null);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex-1">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-sm font-bold text-gray-900">ユーザー増加</p>
          <p className="text-xs text-gray-400 mt-0.5">国別新規登録数</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            <span className="text-xs text-gray-500">ベトナム</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-400 inline-block" />
            <span className="text-xs text-gray-500">日本</span>
          </div>
        </div>
      </div>

      <div className="relative mt-4" style={{ height: 200 }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-right pr-2" style={{ width: 32 }}>
          {[600, 450, 300, 150, 0].map((v) => (
            <span key={v} className="text-xs text-gray-400 leading-none">{v}</span>
          ))}
        </div>

        {/* Chart area */}
        <div className="absolute top-0 bottom-0" style={{ left: 32, right: 0 }}>
          {/* Grid lines */}
          <div className="absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between pointer-events-none">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="border-t border-gray-100 w-full" />
            ))}
          </div>

          {/* Bars */}
          <div className="absolute inset-x-0 top-0 flex items-end justify-around px-2 gap-1" style={{ bottom: 24 }}>
            {CHART_DATA.map((d) => (
              <div
                key={d.month}
                className="flex-1 flex items-end justify-center gap-1 relative h-full"
                onMouseEnter={() => setTooltip({ month: d.month, vn: d.vn, jp: d.jp })}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* VN bar */}
                <div
                  className="rounded-t w-4 self-end transition-opacity"
                  style={{
                    height: `${(d.vn / MAX_VALUE) * 100}%`,
                    backgroundColor: "#ef4444",
                    opacity: tooltip && tooltip.month !== d.month ? 0.4 : 1,
                  }}
                />
                {/* JP bar */}
                <div
                  className="rounded-t w-4 self-end transition-opacity"
                  style={{
                    height: `${(d.jp / MAX_VALUE) * 100}%`,
                    backgroundColor: "#f472b6",
                    opacity: tooltip && tooltip.month !== d.month ? 0.4 : 1,
                  }}
                />

                {/* Tooltip */}
                {tooltip?.month === d.month && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-100 p-3 z-10 w-32 pointer-events-none">
                    <p className="text-xs font-bold text-gray-800 mb-1.5">{d.month}</p>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <span className="text-xs text-gray-500">ベトナム:</span>
                      <span className="text-xs font-semibold text-gray-800 ml-auto">{d.vn}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-pink-400 shrink-0" />
                      <span className="text-xs text-gray-500">日本:</span>
                      <span className="text-xs font-semibold text-gray-800 ml-auto">{d.jp}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* X-axis labels */}
          <div className="absolute inset-x-0 bottom-0 flex justify-around px-2 gap-1" style={{ height: 24 }}>
            {CHART_DATA.map((d) => (
              <div key={d.month} className="flex-1 flex justify-center items-center">
                <span className="text-xs text-gray-400">{d.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RightPanel() {
  return (
    <div className="flex flex-col gap-4" style={{ width: 280 }}>
      {/* Country distribution */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-sm font-bold text-gray-900 mb-4">国別ユーザー分布</p>
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">VN</span>
                <span className="text-sm text-gray-700">ベトナム</span>
              </div>
              <span className="text-sm font-bold text-gray-800">50%</span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-red-400" style={{ width: "50%" }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">JP</span>
                <span className="text-sm text-gray-700">日本</span>
              </div>
              <span className="text-sm font-bold text-gray-800">50%</span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-pink-400" style={{ width: "50%" }} />
            </div>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">合計ユーザー</span>
            <span className="text-sm font-bold text-gray-800">12,847</span>
          </div>
        </div>
      </div>

      {/* Event stats */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-sm font-bold text-gray-900 mb-4">イベント統計</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">128</p>
            <p className="text-xs text-gray-400 mt-1">総イベント数</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">1,247</p>
            <p className="text-xs text-gray-400 mt-1">興味ありユーザー</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [selectedRange, setSelectedRange] = useState("7d");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedLabel = TIME_RANGES.find((r) => r.value === selectedRange)?.label ?? "";

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-xs text-gray-400 mt-0.5">VN-JP Connectプラットフォームの利用状況概要</p>
        </div>

        {/* Time range selector */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full border-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            style={{ borderColor: "#1B4332" }}
          >
            {selectedLabel}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`size-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden py-1">
                {TIME_RANGES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => {
                      setSelectedRange(r.value);
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm transition-colors"
                    style={{
                      backgroundColor: selectedRange === r.value ? "#f0fdf4" : "",
                      color: selectedRange === r.value ? "#15803d" : "#374151",
                      fontWeight: selectedRange === r.value ? 600 : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (selectedRange !== r.value) e.currentTarget.style.backgroundColor = "#f9fafb";
                    }}
                    onMouseLeave={(e) => {
                      if (selectedRange !== r.value) e.currentTarget.style.backgroundColor = "";
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-3">
        <StatCard
          title="総ユーザー数"
          value="12,847"
          change="+12.5%"
          changeLabel="先月比"
          changePositive
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          }
        />
        <StatCard
          title="ベトナムユーザー"
          value="6,423"
          change="+8.2%"
          changeLabel="アクティブユーザー"
          changePositive
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M3 12a8.959 8.959 0 00.284 2.253" />
            </svg>
          }
        />
        <StatCard
          title="日本ユーザー"
          value="6,424"
          change="+15.1%"
          changeLabel="アクティブユーザー"
          changePositive
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M3 12a8.959 8.959 0 00.284 2.253" />
            </svg>
          }
        />
        <StatCard
          title="総イベント数"
          value="128"
          change="+5.4%"
          changeLabel="開催中イベント"
          changePositive
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
        />
      </div>

      {/* Second row stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatCard
          title="本日の新規ユーザー"
          value="47"
          change="+23%"
          changeLabel="新規登録"
          changePositive
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
          }
        />
        <StatCard
          title="凍結アカウント"
          value="12"
          change="-5%"
          changeLabel="ポリシー違反"
          changePositive={false}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          }
        />
        <StatCard
          title="成長率"
          value="18.5%"
          change="+3.2%"
          changeLabel="今月"
          changePositive
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          }
        />
      </div>

      {/* Chart + Right panel */}
      <div className="flex gap-4">
        <BarChart />
        <RightPanel />
      </div>
    </div>
  );
}
