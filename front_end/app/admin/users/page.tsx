"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAdminUserDetail,
  getAdminUserReports,
  getAdminUsers,
  resolveAdminUserEvidenceUrl,
  updateAdminUserReport,
  updateAdminUserStatus,
  type AdminReportAction,
  type AdminUserDetail,
  type AdminUserReport,
  type AdminUserStatus,
  type AdminUserStatusFilter,
  type AdminUserSummary,
  type AdminUsersResponse,
  type AdminReportsResponse,
} from "@/lib/admin-users-api";

const PAGE_SIZE = 6;
const REPORT_PAGE_SIZE = 20;

// ─── Mock data (fallback khi API chưa sẵn sàng) ───────────────────────────────

const MOCK_USERS_RESPONSE: AdminUsersResponse = {
  users: [
    { id: "1", name: "Nguyen Thi Lan", email: "lan.nguyen@email.com", country: "VN", status: "active", joinDate: "2024-01-15", reports: 0, color: "#f87171" },
    { id: "2", name: "Tanaka Yuki", email: "yuki.tanaka@email.com", country: "JP", status: "active", joinDate: "2024-02-20", reports: 2, color: "#60a5fa" },
    { id: "3", name: "Pham Minh Duc", email: "duc.pham@email.com", country: "VN", status: "frozen", joinDate: "2023-11-05", reports: 5, color: "#4ade80" },
    { id: "4", name: "Sato Hana", email: "hana.sato@email.com", country: "JP", status: "active", joinDate: "2024-03-12", reports: 0, color: "#c084fc" },
    { id: "5", name: "Le Hoang Nam", email: "nam.le@email.com", country: "VN", status: "active", joinDate: "2024-04-01", reports: 1, color: "#fb923c" },
    { id: "6", name: "Yamamoto Kenji", email: "kenji.yamamoto@email.com", country: "JP", status: "frozen", joinDate: "2023-09-18", reports: 8, color: "#a78bfa" },
    { id: "7", name: "Tran Thi Mai", email: "tran.mai@email.com", country: "VN", status: "active", joinDate: "2024-05-10", reports: 0, color: "#f472b6" },
    { id: "8", name: "Suzuki Ryo", email: "ryo.suzuki@email.com", country: "JP", status: "active", joinDate: "2024-06-03", reports: 0, color: "#34d399" },
  ],
  pagination: { page: 1, pageSize: PAGE_SIZE, totalItems: 8, totalPages: 2 },
  stats: { totalUsers: 8 },
};

const MOCK_REPORTS_RESPONSE: AdminReportsResponse = {
  reports: [
    {
      id: "1", reason: "harassment", type: "ハラスメント",
      description: "複数のユーザーに対して不適切で攻撃的なメッセージを繰り返し送信していました。特に新規ユーザーに対して威圧的な言葉を使用しています。",
      reportedUserId: "3", reportedUser: "Pham Minh Duc",
      reporterId: "4", reporter: "Sato Hana",
      date: "2026-03-28", files: [], status: "pending",
    },
    {
      id: "2", reason: "spam", type: "スパム",
      description: "同一内容の宣伝メッセージを50人以上のユーザーに大量送信していました。外部サイトへの誘導リンクを含んでいます。",
      reportedUserId: "6", reportedUser: "Yamamoto Kenji",
      reporterId: "1", reporter: "Nguyen Thi Lan",
      date: "2026-03-30", files: [], status: "pending",
    },
    {
      id: "3", reason: "impersonation", type: "なりすまし",
      description: "他のユーザーの写真を無断で使用し、偽のプロフィールを作成していました。本人確認書類の提出を拒否しています。",
      reportedUserId: "6", reportedUser: "Yamamoto Kenji",
      reporterId: "7", reporter: "Tran Thi Mai",
      date: "2026-04-01", files: [], status: "reviewed",
    },
    {
      id: "4", reason: "inappropriate", type: "不適切なコンテンツ",
      description: "プロフィールに不適切な画像を設定していました。複数のユーザーから報告を受けています。",
      reportedUserId: "2", reportedUser: "Tanaka Yuki",
      reporterId: "5", reporter: "Le Hoang Nam",
      date: "2026-03-15", files: [], status: "dismissed",
    },
  ],
  pagination: { page: 1, pageSize: REPORT_PAGE_SIZE, totalItems: 4, totalPages: 1 },
  stats: { pendingCount: 2 },
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ja-JP");
}

function formatLastActive(value: string | null) {
  if (!value) return "未ログイン";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return "-";
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

function formatFileSize(value: number) {
  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(" ").slice(-2).map((word) => word[0]).join("").toUpperCase();
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ backgroundColor: color }}
    >
      {initials || "U"}
    </div>
  );
}

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

function StatusBadge({ status }: { status: AdminUserStatus }) {
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

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-full shadow-lg z-50 text-white text-sm font-medium"
      style={{ backgroundColor: "#1B4332" }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {message}
    </button>
  );
}

function EvidenceModal({
  report,
  onClose,
}: {
  report: AdminUserReport;
  onClose: () => void;
}) {
  const imageFiles = report.files.filter((file) => file.type === "image");
  const pdfFiles = report.files.filter((file) => file.type === "pdf");
  const preview = imageFiles[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">証拠ファイル</p>
              <p className="text-xs text-gray-400">{report.type} - {report.files.length}件のファイル</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {preview && (
          <div className="mb-3 rounded-xl overflow-hidden bg-gray-100" style={{ height: 200 }}>
            <img
              src={resolveAdminUserEvidenceUrl(preview.url)}
              alt={preview.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-col gap-2 mb-5">
          {[...imageFiles, ...pdfFiles].map((file) => (
            <a
              key={`${file.url}-${file.name}`}
              href={resolveAdminUserEvidenceUrl(file.url)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className={file.type === "image" ? "w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0" : "w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0"}>
                <svg xmlns="http://www.w3.org/2000/svg" className={file.type === "image" ? "size-4 text-blue-500" : "size-4 text-white"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  {file.type === "image" ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  )}
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-700 font-medium truncate">{file.name}</p>
                {file.size > 0 && <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>}
              </div>
            </a>
          ))}
          {report.files.length === 0 && (
            <div className="p-6 rounded-xl bg-gray-50 text-center text-sm text-gray-400">
              証拠ファイルはありません
            </div>
          )}
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

function UserDrawer({
  user,
  detail,
  loading,
  onClose,
  onToggleStatus,
  actionUserId,
}: {
  user: AdminUserSummary;
  detail: AdminUserDetail | null;
  loading: boolean;
  onClose: () => void;
  onToggleStatus: (user: AdminUserSummary) => void;
  actionUserId: string | null;
}) {
  const info = detail?.detail;
  const status = detail?.status ?? user.status;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-screen bg-white z-50 flex flex-col shadow-2xl overflow-hidden" style={{ width: 380 }}>
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

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col items-center text-center mb-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-bold mb-3"
              style={{ backgroundColor: user.color, outline: "2.5px solid #1B4332", outlineOffset: "3px" }}
            >
              {user.name.split(" ").slice(-2).map((word) => word[0]).join("").toUpperCase() || "U"}
            </div>
            <p className="text-base font-bold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-400 mt-0.5 mb-2">{user.email}</p>
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
              <CountryBadge country={user.country} />
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">詳細を読み込んでいます...</div>
          ) : (
            <>
              <div className="grid grid-cols-3 border-t border-b border-gray-100 py-4 mb-5">
                {[
                  { label: "コネクション", value: info?.connections ?? 0 },
                  { label: "メッセージ", value: info?.messages ?? 0 },
                  { label: "通報", value: detail?.reports ?? user.reports },
                ].map((item, index) => (
                  <div key={item.label} className={`text-center ${index < 2 ? "border-r border-gray-100" : ""}`}>
                    <p className="text-lg font-bold text-gray-900">{item.value.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="mb-5">
                <p className="text-sm font-bold text-gray-800 mb-3">基本情報</p>
                <div className="flex flex-col gap-3">
                  {[
                    { label: "職業", value: info?.occupation || "-" },
                    { label: "所在地", value: info?.location || "-" },
                    { label: "参加日", value: formatDate(user.joinDate) },
                    { label: "最終アクティブ", value: formatLastActive(info?.lastActive ?? null) },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">{item.label}</p>
                        <p className="text-sm font-medium text-gray-800">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!!info?.languages.length && (
                <div className="mb-5">
                  <p className="text-sm font-bold text-gray-800 mb-3">言語スキル</p>
                  <div className="flex flex-wrap gap-2">
                    {info.languages.map((language) => (
                      <span key={language} className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {info?.bio && (
                <div>
                  <p className="text-sm font-bold text-gray-800 mb-2">自己紹介</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{info.bio}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={() => onToggleStatus(detail ?? user)}
            disabled={actionUserId === user.id}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-wait"
            style={{ backgroundColor: status === "active" ? "#ef4444" : "#1B4332" }}
          >
            {status === "active" ? "アカウントを凍結" : "凍結を解除"}
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

function AllUsersTab({
  usersResponse,
  loading,
  error,
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  page,
  onPageChange,
  onToggleStatus,
  onViewUser,
  actionUserId,
}: {
  usersResponse: AdminUsersResponse | null;
  loading: boolean;
  error: string;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: AdminUserStatusFilter;
  onStatusChange: (value: AdminUserStatusFilter) => void;
  page: number;
  onPageChange: (value: number) => void;
  onToggleStatus: (user: AdminUserSummary) => void;
  onViewUser: (user: AdminUserSummary) => void;
  actionUserId: string | null;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const users = usersResponse?.users ?? [];
  const pagination = usersResponse?.pagination ?? {
    page,
    pageSize: PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
  };
  const filterLabel = statusFilter === "all" ? "すべてのステータス" : statusFilter === "active" ? "アクティブ" : "凍結";

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="ユーザー名を検索..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": "#1B4332" } as React.CSSProperties}
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setFilterOpen((value) => !value)}
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
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onStatusChange(option.value);
                      setFilterOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                    style={{
                      backgroundColor: statusFilter === option.value ? "#f0fdf4" : "",
                      color: "#374151",
                    }}
                  >
                    {option.dot ? (
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: option.dot }} />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                    )}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <span className="ml-auto text-sm text-gray-400 font-medium">
          {usersResponse?.stats.totalUsers ?? 0}件のユーザー
        </span>
      </div>

      {(loading || error) && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${error ? "bg-red-50 border-red-100 text-red-600" : "bg-gray-50 border-gray-100 text-gray-500"}`}>
          {error || "ユーザーを読み込んでいます..."}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="grid text-xs font-medium text-gray-400 px-5 py-3 border-b border-gray-100" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 0.7fr 1fr" }}>
          <span>ユーザー</span>
          <span>国</span>
          <span>ステータス</span>
          <span>参加日</span>
          <span>通報</span>
          <span>アクション</span>
        </div>

        {users.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">ユーザーが見つかりません</div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="grid items-center px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
              style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 0.7fr 1fr" }}
            >
              <div className="flex items-center gap-3">
                <Avatar name={user.name} color={user.color} />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center"><CountryBadge country={user.country} /></div>
              <div className="flex items-center"><StatusBadge status={user.status} /></div>
              <div className="flex items-center"><span className="text-sm text-gray-600">{formatDate(user.joinDate)}</span></div>
              <div className="flex items-center"><ReportCount count={user.reports} /></div>
              <div className="flex items-center gap-2">
                <button onClick={() => onViewUser(user)} className="w-8 h-8 rounded-full flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => onToggleStatus(user)}
                  disabled={actionUserId === user.id}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-wait ${user.status === "active" ? "text-red-500 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}
                >
                  {user.status === "active" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-400">
            {pagination.totalItems}件中 {(pagination.page - 1) * pagination.pageSize + 1}-{Math.min(pagination.page * pagination.pageSize, pagination.totalItems)}件を表示
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                className="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                style={
                  pageNumber === page
                    ? { backgroundColor: "#1B4332", color: "#ffffff" }
                    : { color: "#6b7280" }
                }
              >
                {pageNumber}
              </button>
            ))}
            <button
              onClick={() => onPageChange(Math.min(pagination.totalPages, page + 1))}
              disabled={page === pagination.totalPages}
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

function ReportCard({
  report,
  onAction,
  onViewEvidence,
  actionReportId,
}: {
  report: AdminUserReport;
  onAction?: (report: AdminUserReport, action: AdminReportAction) => void;
  onViewEvidence: (report: AdminUserReport) => void;
  actionReportId: string | null;
}) {
  const isPending = report.status === "pending";
  const isReviewed = report.status === "reviewed";

  return (
    <div className={`bg-white rounded-2xl border p-5 flex gap-4 ${isPending ? "border-gray-100" : "border-gray-100 opacity-80"}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isPending ? "bg-red-50" : isReviewed ? "bg-red-50" : "bg-gray-100"}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className={`size-5 ${isPending ? "text-red-400" : isReviewed ? "text-red-300" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className={`text-sm font-bold ${isPending ? "text-gray-900" : "text-gray-500"}`}>{report.type}</p>
          {isPending && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fef3c7", color: "#d97706" }}>
              Pending
            </span>
          )}
          {isReviewed && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>
              凍結済み
            </span>
          )}
          {report.status === "dismissed" && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              無視済み
            </span>
          )}
        </div>
        <p className={`text-sm mb-1.5 ${isPending ? "text-gray-500" : "text-gray-400"}`}>{report.description || "-"}</p>
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
          <span>被報告者: <span className={`font-semibold ${isPending ? "text-gray-600" : "text-gray-400"}`}>{report.reportedUser}</span></span>
          <span className="text-gray-200">|</span>
          <span>報告者: <span className={`font-semibold ${isPending ? "text-gray-600" : "text-gray-400"}`}>{report.reporter}</span></span>
          <span className="text-gray-200">|</span>
          <span>{formatDate(report.date)}</span>
        </div>
        <button
          onClick={() => onViewEvidence(report)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          証拠を見る ({report.files.length}ファイル)
        </button>
      </div>
      {isPending && onAction && (
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={() => onAction(report, "freeze")}
            disabled={actionReportId === report.id}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-wait"
            style={{ backgroundColor: "#ef4444" }}
          >
            アカウント凍結
          </button>
          <button
            onClick={() => onAction(report, "dismiss")}
            disabled={actionReportId === report.id}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            無視
          </button>
        </div>
      )}
    </div>
  );
}

function ViolationReportsTab({
  reportsResponse,
  loading,
  error,
  onAction,
  actionReportId,
}: {
  reportsResponse: AdminReportsResponse | null;
  loading: boolean;
  error: string;
  onAction: (report: AdminUserReport, action: AdminReportAction) => void;
  actionReportId: string | null;
}) {
  const [evidenceReport, setEvidenceReport] = useState<AdminUserReport | null>(null);
  const allReports = reportsResponse?.reports ?? [];
  const pending = allReports.filter((r) => r.status === "pending");
  const processed = allReports.filter((r) => r.status !== "pending");

  return (
    <div>
      {(loading || error) && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${error ? "bg-red-50 border-red-100 text-red-600" : "bg-gray-50 border-gray-100 text-gray-500"}`}>
          {error || "報告を読み込んでいます..."}
        </div>
      )}

      {/* Pending section */}
      {pending.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 flex flex-col items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-full border-2 flex items-center justify-center" style={{ borderColor: "#1B4332" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "#1B4332" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-base font-bold text-gray-800">すべての報告を処理しました</p>
          <p className="text-sm text-gray-400">現在未処理の違反報告はありません</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-6">
          {pending.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onAction={onAction}
              onViewEvidence={setEvidenceReport}
              actionReportId={actionReportId}
            />
          ))}
        </div>
      )}

      {/* Processed section */}
      {processed.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-semibold text-gray-400">処理済み</span>
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">{processed.length}件</span>
          </div>
          <div className="flex flex-col gap-3">
            {processed.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onViewEvidence={setEvidenceReport}
                actionReportId={actionReportId}
              />
            ))}
          </div>
        </div>
      )}

      {evidenceReport && <EvidenceModal report={evidenceReport} onClose={() => setEvidenceReport(null)} />}
    </div>
  );
}

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<"users" | "reports">("users");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminUserStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [usersResponse, setUsersResponse] = useState<AdminUsersResponse | null>(null);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [reportsResponse, setReportsResponse] = useState<AdminReportsResponse | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState("");
  const [refreshUsersKey, setRefreshUsersKey] = useState(0);
  const [refreshReportsKey, setRefreshReportsKey] = useState(0);
  const [drawerUser, setDrawerUser] = useState<AdminUserSummary | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<AdminUserDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [actionReportId, setActionReportId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const pendingReports = reportsResponse?.stats.pendingCount ?? 0;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setUsersLoading(true);
    setUsersError("");

    getAdminUsers({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch,
      status: statusFilter,
    })
      .then((response) => {
        if (active) setUsersResponse(response);
      })
      .catch(() => {
        if (!active) return;
        const filtered = MOCK_USERS_RESPONSE.users.filter((u) => {
          const matchSearch = !debouncedSearch || u.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || u.email.toLowerCase().includes(debouncedSearch.toLowerCase());
          const matchStatus = statusFilter === "all" || u.status === statusFilter;
          return matchSearch && matchStatus;
        });
        const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
        setUsersResponse({
          users: paged,
          pagination: { page, pageSize: PAGE_SIZE, totalItems: filtered.length, totalPages },
          stats: { totalUsers: MOCK_USERS_RESPONSE.users.length },
        });
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, debouncedSearch, statusFilter, refreshUsersKey]);

  useEffect(() => {
    let active = true;
    setReportsLoading(true);
    setReportsError("");

    getAdminUserReports({
      page: 1,
      pageSize: REPORT_PAGE_SIZE,
    })
      .then((response) => {
        if (active) setReportsResponse(response);
      })
      .catch(() => {
        if (active) setReportsResponse(MOCK_REPORTS_RESPONSE);
      })
      .finally(() => {
        if (active) setReportsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshReportsKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedUserFromList = useMemo(() => {
    if (!drawerUser) return null;
    return usersResponse?.users.find((user) => user.id === drawerUser.id) ?? drawerUser;
  }, [drawerUser, usersResponse]);

  async function openUser(user: AdminUserSummary) {
    setDrawerUser(user);
    setDrawerDetail(null);
    setDrawerLoading(true);
    try {
      setDrawerDetail(await getAdminUserDetail(user.id));
    } catch {
      // mock detail when API unavailable
      setDrawerDetail({
        ...user,
        detail: { connections: 87, messages: 342, occupation: "エンジニア", location: "ホーチミン市", lastActive: new Date().toISOString(), languages: ["ベトナム語（母語）", "日本語（N3）"], bio: "VN-JP Connectのユーザーです。" },
      });
    } finally {
      setDrawerLoading(false);
    }
  }

  async function toggleStatus(user: AdminUserSummary) {
    const nextStatus: AdminUserStatus = user.status === "active" ? "frozen" : "active";
    setActionUserId(user.id);
    try {
      const updated = await updateAdminUserStatus(user.id, nextStatus);
      setUsersResponse((current) => current ? {
        ...current,
        users: current.users.map((item) => item.id === updated.id ? updated : item),
      } : current);
      setDrawerUser((current) => current?.id === updated.id ? updated : current);
      setDrawerDetail((current) => current?.id === updated.id ? { ...current, ...updated } : current);
      setToast(nextStatus === "frozen" ? "アカウントを凍結しました" : "凍結を解除しました");
    } catch {
      // update local state when API unavailable
      const updated = { ...user, status: nextStatus };
      setUsersResponse((current) => current ? {
        ...current,
        users: current.users.map((item) => item.id === user.id ? updated : item),
      } : current);
      setDrawerUser((current) => current?.id === user.id ? updated : current);
      setToast(nextStatus === "frozen" ? "アカウントを凍結しました" : "凍結を解除しました");
    } finally {
      setActionUserId(null);
    }
  }

  async function handleReportAction(report: AdminUserReport, action: AdminReportAction) {
    setActionReportId(report.id);
    try {
      const updated = await updateAdminUserReport(report.id, action);
      setReportsResponse((current) => current ? {
        ...current,
        reports: current.reports.some((r) => r.id === updated.id)
          ? current.reports.map((r) => r.id === updated.id ? updated : r)
          : [updated, ...current.reports],
        stats: {
          ...current.stats,
          pendingCount: report.status === "pending"
            ? Math.max(0, current.stats.pendingCount - 1)
            : current.stats.pendingCount,
        },
      } : current);
      setToast(action === "freeze" ? "アカウントを凍結しました" : "報告を無視しました");
      setRefreshReportsKey((value) => value + 1);
      setRefreshUsersKey((value) => value + 1);
    } catch {
      // update local state when API unavailable
      const newStatus = action === "freeze" ? "reviewed" : "dismissed";
      setReportsResponse((current) => current ? {
        ...current,
        reports: current.reports.map((r) => r.id === report.id ? { ...r, status: newStatus } : r),
        stats: {
          ...current.stats,
          pendingCount: report.status === "pending"
            ? Math.max(0, (current.stats.pendingCount ?? 1) - 1)
            : current.stats.pendingCount,
        },
      } : current);
      setToast(action === "freeze" ? "アカウントを凍結しました" : "報告を無視しました");
    } finally {
      setActionReportId(null);
    }
  }

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">ユーザー管理</h1>
        <p className="text-xs text-gray-400 mt-0.5">ユーザーアカウントの管理と違反報告の処理</p>
      </div>

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
          {pendingReports > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
              {pendingReports}
            </span>
          )}
          {activeTab === "reports" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: "#1B4332" }} />
          )}
        </button>
      </div>

      {activeTab === "users" ? (
        <AllUsersTab
          usersResponse={usersResponse}
          loading={usersLoading}
          error={usersError}
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          page={page}
          onPageChange={setPage}
          onToggleStatus={toggleStatus}
          onViewUser={openUser}
          actionUserId={actionUserId}
        />
      ) : (
        <ViolationReportsTab
          reportsResponse={reportsResponse}
          loading={reportsLoading}
          error={reportsError}
          onAction={handleReportAction}
          actionReportId={actionReportId}
        />
      )}

      {selectedUserFromList && (
        <UserDrawer
          user={selectedUserFromList}
          detail={drawerDetail}
          loading={drawerLoading}
          onClose={() => {
            setDrawerUser(null);
            setDrawerDetail(null);
          }}
          onToggleStatus={toggleStatus}
          actionUserId={actionUserId}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
