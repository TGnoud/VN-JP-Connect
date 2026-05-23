"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAdminDashboard,
  type AdminDashboardChartPoint,
  type AdminDashboardMetric,
  type AdminDashboardRange,
  type AdminDashboardResponse,
} from "@/lib/admin-dashboard-api";

const TIME_RANGES: { label: string; value: AdminDashboardRange }[] = [
  { label: "過去7日間", value: "7d" },
  { label: "過去30日間", value: "30d" },
  { label: "過去3ヶ月", value: "3m" },
  { label: "過去1年", value: "1y" },
];

const EMPTY_DASHBOARD: AdminDashboardResponse = {
  range: "7d",
  totalUsers: { value: 0, changePercent: null },
  vnUsers: { value: 0, changePercent: null },
  jpUsers: { value: 0, changePercent: null },
  totalEvents: { value: 0, changePercent: null },
  newUsersToday: { value: 0, changePercent: null },
  frozenAccounts: { value: 0, changePercent: null },
  systemGrowthRate: { value: 0, changePercent: null },
  userGrowthChart: [],
  userDistribution: {
    total: 0,
    vn: { count: 0, percent: 0 },
    jp: { count: 0, percent: 0 },
  },
  eventStats: {
    totalEvents: 0,
    interestedUsers: 0,
  },
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

function formatChange(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  if (value > 0) {
    return `+${formatPercent(value)}`;
  }

  return formatPercent(value);
}

function changeTone(value: number | null) {
  if (value === null) {
    return {
      backgroundColor: "#f3f4f6",
      color: "#6b7280",
    };
  }

  return {
    backgroundColor: value >= 0 ? "#dcfce7" : "#fee2e2",
    color: value >= 0 ? "#15803d" : "#dc2626",
  };
}

function StatCard({
  title,
  metric,
  changeLabel,
  icon,
  valueKind = "number",
}: {
  title: string;
  metric: AdminDashboardMetric;
  changeLabel: string;
  icon: React.ReactNode;
  valueKind?: "number" | "percent";
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
        <p className="text-3xl font-bold text-gray-900">
          {valueKind === "percent" ? formatPercent(metric.value) : formatNumber(metric.value)}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
            style={changeTone(metric.changePercent)}
          >
            {formatChange(metric.changePercent)}
          </span>
          <span className="text-xs text-gray-400">{changeLabel}</span>
        </div>
      </div>
    </div>
  );
}

function BarChart({ data }: { data: AdminDashboardChartPoint[] }) {
  const [tooltip, setTooltip] = useState<AdminDashboardChartPoint | null>(null);
  const maxValue = useMemo(() => {
    const largest = Math.max(1, ...data.flatMap((item) => [item.vn, item.jp]));
    const step = largest <= 20 ? 5 : largest <= 100 ? 25 : 100;
    return Math.ceil(largest / step) * step;
  }, [data]);
  const tickValues = [1, 0.75, 0.5, 0.25, 0].map((ratio) =>
    Math.round(maxValue * ratio),
  );
  const barWidth = data.length > 8 ? 10 : 16;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex-1 min-w-0">
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
        <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-right pr-2" style={{ width: 36 }}>
          {tickValues.map((value) => (
            <span key={value} className="text-xs text-gray-400 leading-none">
              {formatNumber(value)}
            </span>
          ))}
        </div>

        <div className="absolute top-0 bottom-0" style={{ left: 36, right: 0 }}>
          <div className="absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between pointer-events-none">
            {tickValues.map((value) => (
              <div key={value} className="border-t border-gray-100 w-full" />
            ))}
          </div>

          {data.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
              データがありません
            </div>
          ) : (
            <div className="absolute inset-x-0 top-0 flex items-end justify-around px-2 gap-1" style={{ bottom: 24 }}>
              {data.map((item) => (
                <div
                  key={item.label}
                  className="flex-1 flex items-end justify-center gap-1 relative h-full min-w-0"
                  onMouseEnter={() => setTooltip(item)}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <div
                    className="rounded-t self-end transition-opacity"
                    style={{
                      width: barWidth,
                      height: `${(item.vn / maxValue) * 100}%`,
                      backgroundColor: "#ef4444",
                      opacity: tooltip && tooltip.label !== item.label ? 0.4 : 1,
                    }}
                  />
                  <div
                    className="rounded-t self-end transition-opacity"
                    style={{
                      width: barWidth,
                      height: `${(item.jp / maxValue) * 100}%`,
                      backgroundColor: "#f472b6",
                      opacity: tooltip && tooltip.label !== item.label ? 0.4 : 1,
                    }}
                  />

                  {tooltip?.label === item.label && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-100 p-3 z-10 w-32 pointer-events-none">
                      <p className="text-xs font-bold text-gray-800 mb-1.5">{item.label}</p>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        <span className="text-xs text-gray-500">ベトナム:</span>
                        <span className="text-xs font-semibold text-gray-800 ml-auto">{formatNumber(item.vn)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-pink-400 shrink-0" />
                        <span className="text-xs text-gray-500">日本:</span>
                        <span className="text-xs font-semibold text-gray-800 ml-auto">{formatNumber(item.jp)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 flex justify-around px-2 gap-1" style={{ height: 24 }}>
            {data.map((item) => (
              <div key={item.label} className="flex-1 flex justify-center items-center min-w-0">
                <span className="text-xs text-gray-400 truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RightPanel({ data }: { data: AdminDashboardResponse }) {
  return (
    <div className="flex flex-col gap-4" style={{ width: 280 }}>
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-sm font-bold text-gray-900 mb-4">国別ユーザー分布</p>
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">VN</span>
                <span className="text-sm text-gray-700">ベトナム</span>
              </div>
              <span className="text-sm font-bold text-gray-800">{formatPercent(data.userDistribution.vn.percent)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-red-400" style={{ width: `${data.userDistribution.vn.percent}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">JP</span>
                <span className="text-sm text-gray-700">日本</span>
              </div>
              <span className="text-sm font-bold text-gray-800">{formatPercent(data.userDistribution.jp.percent)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-pink-400" style={{ width: `${data.userDistribution.jp.percent}%` }} />
            </div>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">合計ユーザー</span>
            <span className="text-sm font-bold text-gray-800">{formatNumber(data.userDistribution.total)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-sm font-bold text-gray-900 mb-4">イベント統計</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{formatNumber(data.eventStats.totalEvents)}</p>
            <p className="text-xs text-gray-400 mt-1">総イベント数</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{formatNumber(data.eventStats.interestedUsers)}</p>
            <p className="text-xs text-gray-400 mt-1">興味ありユーザー</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [selectedRange, setSelectedRange] = useState<AdminDashboardRange>("7d");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    getAdminDashboard(selectedRange)
      .then((response) => {
        if (active) {
          setDashboard(response);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Dashboard data could not be loaded.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedRange]);

  const data = dashboard ?? EMPTY_DASHBOARD;
  const selectedLabel = TIME_RANGES.find((range) => range.value === selectedRange)?.label ?? "";

  return (
    <div className="p-6 min-h-screen">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">VN-JP Connectプラットフォームの利用状況概要</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen((value) => !value)}
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
                {TIME_RANGES.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => {
                      setSelectedRange(range.value);
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm transition-colors"
                    style={{
                      backgroundColor: selectedRange === range.value ? "#f0fdf4" : "",
                      color: selectedRange === range.value ? "#15803d" : "#374151",
                      fontWeight: selectedRange === range.value ? 600 : 400,
                    }}
                    onMouseEnter={(event) => {
                      if (selectedRange !== range.value) event.currentTarget.style.backgroundColor = "#f9fafb";
                    }}
                    onMouseLeave={(event) => {
                      if (selectedRange !== range.value) event.currentTarget.style.backgroundColor = "";
                    }}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {(loading || error) && (
        <div
          className="mb-4 rounded-xl border px-4 py-3 text-sm"
          style={{
            backgroundColor: error ? "#fef2f2" : "#f9fafb",
            borderColor: error ? "#fecaca" : "#e5e7eb",
            color: error ? "#b91c1c" : "#6b7280",
          }}
        >
          {error || "統計データを読み込んでいます..."}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-3">
        <StatCard
          title="総ユーザー数"
          metric={data.totalUsers}
          changeLabel="前期間比"
          icon={<UsersIcon />}
        />
        <StatCard
          title="ベトナムユーザー"
          metric={data.vnUsers}
          changeLabel="前期間比"
          icon={<GlobeIcon />}
        />
        <StatCard
          title="日本ユーザー"
          metric={data.jpUsers}
          changeLabel="前期間比"
          icon={<GlobeIcon />}
        />
        <StatCard
          title="総イベント数"
          metric={data.totalEvents}
          changeLabel="前期間比"
          icon={<CalendarIcon />}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatCard
          title="本日の新規ユーザー"
          metric={data.newUsersToday}
          changeLabel="前日比"
          icon={<AddUserIcon />}
        />
        <StatCard
          title="凍結アカウント"
          metric={data.frozenAccounts}
          changeLabel="前期間比"
          icon={<BlockedIcon />}
        />
        <StatCard
          title="成長率"
          metric={data.systemGrowthRate}
          changeLabel="前期間比"
          valueKind="percent"
          icon={<GrowthIcon />}
        />
      </div>

      <div className="flex gap-4">
        <BarChart data={data.userGrowthChart} />
        <RightPanel data={data} />
      </div>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M3 12a8.959 8.959 0 00.284 2.253" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function AddUserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  );
}

function BlockedIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  );
}

function GrowthIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}
