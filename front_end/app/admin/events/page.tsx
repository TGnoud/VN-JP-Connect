"use client";

import { useState } from "react";
import Image from "next/image";
import { clsx } from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventStatus = "published" | "draft";
type EventFormat = "in-person" | "online" | "hybrid";

interface AdminEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  format: EventFormat;
  location: string;
  onlineUrl: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  capacity: number | null;
  currentParticipants: number;
  coverImageUrl: string;
  status: EventStatus;
}

// Form for the create page (full-page)
interface CreateForm {
  title: string;
  description: string;
  category: string;
  language: string;
  format: EventFormat;
  location: string;
  onlineUrl: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  capacity: string;
  coverImageUrl: string;
}

// Form for the edit modal (simplified)
interface EditForm {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  format: EventFormat;
  category: string;
  status: EventStatus;
  locationOrLink: string;
  capacity: string;
  coverImageUrl: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_CREATE: CreateForm = {
  title: "", description: "", category: "", language: "",
  format: "in-person", location: "", onlineUrl: "",
  startDate: "", startTime: "", endDate: "", endTime: "",
  capacity: "", coverImageUrl: "",
};

const CATEGORIES = ["言語学習", "料理", "ネットワーキング", "文化交流", "スポーツ", "音楽", "その他"];
const LANGUAGES  = ["日本語", "ベトナム語", "日本語・ベトナム語", "英語"];

const FORMAT_OPTIONS: { value: EventFormat; label: string; sublabel: string; icon: React.ReactNode }[] = [
  {
    value: "in-person", label: "対面", sublabel: "In-Person",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
  {
    value: "online", label: "オンライン", sublabel: "Online",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M3 12a8.959 8.959 0 00.284 2.253" />
      </svg>
    ),
  },
  {
    value: "hybrid", label: "ハイブリッド", sublabel: "Hybrid",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
];

const FORMAT_LABELS: Record<EventFormat, string> = { "in-person": "対面", online: "オンライン", hybrid: "ハイブリッド" };

const INITIAL_EVENTS: AdminEvent[] = [
  {
    id: "e1",
    title: "日越言語交換ミートアップ",
    description: "ベトナム人と日本人が集まり、お互いの言語を練習する交流イベントです。初心者から上級者まで参加可能です。",
    category: "言語学習", language: "日本語・ベトナム語",
    format: "in-person",
    location: "ハノイ文化センター, チャンフンダオ通り123番地", onlineUrl: "",
    startDate: "2024-04-15", startTime: "14:00", endDate: "2024-04-15", endTime: "17:00",
    capacity: 30, currentParticipants: 24,
    coverImageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=280&fit=crop",
    status: "published",
  },
  {
    id: "e2",
    title: "オンライン日本料理教室",
    description: "日本の家庭料理を一緒に作りましょう。今回のテーマは「お好み焼き」と「たこ焼き」です。",
    category: "料理", language: "日本語",
    format: "online",
    location: "", onlineUrl: "https://zoom.us/j/123456789",
    startDate: "2024-04-20", startTime: "19:00", endDate: "2024-04-20", endTime: "21:00",
    capacity: 50, currentParticipants: 38,
    coverImageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=280&fit=crop",
    status: "published",
  },
  {
    id: "e3",
    title: "日越ビジネス交流会",
    description: "日本とベトナムのビジネスパーソンによるネットワーキングイベント。新しいビジネスチャンスを見つけましょう。",
    category: "ネットワーキング", language: "日本語・ベトナム語",
    format: "hybrid",
    location: "さくらホテル, ホーチミン市", onlineUrl: "https://zoom.us/j/987654321",
    startDate: "2024-04-25", startTime: "18:00", endDate: "2024-04-25", endTime: "21:00",
    capacity: null, currentParticipants: 45,
    coverImageUrl: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=280&fit=crop",
    status: "draft",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateJa(dateStr: string) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

// ─── Shared sub-components (create form) ─────────────────────────────────────

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#d1fae5" }}>
          <span style={{ color: "#1B4332" }}>{icon}</span>
        </div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

const inputCls  = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 bg-white";
const selectCls = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white appearance-none";

// ─── Main page ────────────────────────────────────────────────────────────────

type View = "list" | "create";

export default function AdminEventsPage() {
  const [view, setView]           = useState<View>("list");
  const [events, setEvents]       = useState<AdminEvent[]>(INITIAL_EVENTS);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [editModal, setEditModal] = useState<AdminEvent | null>(null);
  const [editForm, setEditForm]   = useState<EditForm | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function getCreateErrors(f: CreateForm) {
    const e: Partial<Record<keyof CreateForm, string>> = {};
    if (!f.title.trim())       e.title       = "イベント名を入力してください";
    if (!f.description.trim()) e.description = "詳細説明を入力してください";
    if (!f.category)           e.category    = "カテゴリーを選択してください";
    if (!f.language)           e.language    = "言語を選択してください";
    if (!f.startDate)          e.startDate   = "開始日を入力してください";
    if (!f.startTime)          e.startTime   = "開始時間を入力してください";
    if (!f.endDate)            e.endDate     = "終了日を入力してください";
    if (!f.endTime)            e.endTime     = "終了時間を入力してください";
    if ((f.format === "in-person" || f.format === "hybrid") && !f.location.trim())
      e.location  = "開催場所を入力してください";
    if ((f.format === "online" || f.format === "hybrid") && !f.onlineUrl.trim())
      e.onlineUrl = "オンラインURLを入力してください";
    return e;
  }

  const publishedCount = events.filter((e) => e.status === "published").length;
  const draftCount     = events.filter((e) => e.status === "draft").length;

  // ── Create ────────────────────────────────────────────────────────────────

  function openCreate() {
    setCreateForm(EMPTY_CREATE);
    setSubmitted(false);
    setView("create");
  }

  function setCreateField<K extends keyof CreateForm>(k: K, v: CreateForm[K]) {
    setCreateForm((f) => ({ ...f, [k]: v }));
  }

  function saveCreate(status: EventStatus) {
    setSubmitted(true);
    const errs = getCreateErrors(createForm);
    if (Object.keys(errs).length > 0) {
      showToast("入力内容にエラーがあります", false);
      return;
    }
    const capacity = createForm.capacity ? parseInt(createForm.capacity, 10) : null;
    const newEvent: AdminEvent = {
      id: `e${Date.now()}`,
      title: createForm.title, description: createForm.description,
      category: createForm.category, language: createForm.language,
      format: createForm.format,
      location: createForm.location, onlineUrl: createForm.onlineUrl,
      startDate: createForm.startDate, startTime: createForm.startTime,
      endDate: createForm.endDate || createForm.startDate, endTime: createForm.endTime,
      capacity, currentParticipants: 0,
      coverImageUrl: createForm.coverImageUrl,
      status,
    };
    setEvents((prev) => [newEvent, ...prev]);
    setView("list");
    showToast(status === "draft" ? "下書きとして保存しました" : "イベントを公開しました");
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function openEdit(event: AdminEvent) {
    setEditModal(event);
    setEditForm({
      title: event.title,
      description: event.description,
      date: event.startDate,
      startTime: event.startTime,
      endTime: event.endTime,
      format: event.format,
      category: event.category,
      status: event.status,
      locationOrLink: event.format === "online" ? event.onlineUrl : event.location,
      capacity: event.capacity !== null ? String(event.capacity) : "",
      coverImageUrl: event.coverImageUrl,
    });
  }

  function setEditField<K extends keyof EditForm>(k: K, v: EditForm[K]) {
    setEditForm((f) => f ? { ...f, [k]: v } : f);
  }

  function saveEdit() {
    if (!editModal || !editForm) return;
    const capacity = editForm.capacity ? parseInt(editForm.capacity, 10) : null;
    setEvents((prev) =>
      prev.map((e) =>
        e.id === editModal.id
          ? {
              ...e,
              title: editForm.title,
              description: editForm.description,
              startDate: editForm.date,
              startTime: editForm.startTime,
              endDate: editForm.date,
              endTime: editForm.endTime,
              format: editForm.format,
              category: editForm.category,
              status: editForm.status,
              location: editForm.format !== "online" ? editForm.locationOrLink : e.location,
              onlineUrl: editForm.format !== "in-person" ? editForm.locationOrLink : e.onlineUrl,
              capacity,
              coverImageUrl: editForm.coverImageUrl,
            }
          : e
      )
    );
    setEditModal(null);
    setEditForm(null);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete() {
    if (!deleteId) return;
    setEvents((prev) => prev.filter((e) => e.id !== deleteId));
    setDeleteId(null);
  }

  // ── Create page ───────────────────────────────────────────────────────────

  if (view === "create") {
    const f = createForm;
    const set = setCreateField;
    const errs = submitted ? getCreateErrors(f) : {};
    const errInput = (field: keyof CreateForm) =>
      errs[field] ? "border-red-300 bg-red-50/40 focus:ring-red-200" : "";
    const errSelect = (field: keyof CreateForm) =>
      errs[field] ? "border-red-300 bg-red-50/40 focus:ring-red-200" : "";
    const ErrMsg = ({ field }: { field: keyof CreateForm }) =>
      errs[field] ? (
        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
          {errs[field]}
        </p>
      ) : null;
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-8 flex flex-col gap-5">
          {/* Page title */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">イベント作成</h1>
            <p className="text-sm text-gray-500 mt-1">ユーザーが閲覧および参加するためのイベントを作成・管理します</p>
          </div>
          {/* Toolbar card */}
          <div className="bg-white rounded-2xl border border-gray-100 px-5 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-sm font-semibold text-gray-700">新規イベント</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowPreview(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                プレビュー
              </button>
              <button onClick={() => setView("list")} className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors">キャンセル</button>
              <button onClick={() => saveCreate("draft")} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                下書き保存
              </button>
              <button onClick={() => saveCreate("published")} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: "#1B4332" }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                イベントを公開
              </button>
            </div>
          </div>
          {/* 基本情報 */}
          <SectionCard title="基本情報" icon={<svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}>
            <div className="flex flex-col gap-4">
              <div>
                <FormLabel required>イベント名</FormLabel>
                <input type="text" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="イベントの魅力的なタイトルを入力してください" className={`${inputCls} ${errInput("title")}`} />
                <ErrMsg field="title" />
              </div>
              <div>
                <FormLabel required>詳細説明</FormLabel>
                <textarea value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="イベントの内容、参加者が期待できること、必要な条件などを記述してください" rows={4} className={`${inputCls} resize-y ${errInput("description")}`} />
                <ErrMsg field="description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FormLabel required>カテゴリー</FormLabel>
                  <div className="relative">
                    <select value={f.category} onChange={(e) => set("category", e.target.value)} className={`${selectCls} ${errSelect("category")}`}>
                      <option value="">カテゴリーを選択</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </div>
                  <ErrMsg field="category" />
                </div>
                <div>
                  <FormLabel required>言語</FormLabel>
                  <div className="relative">
                    <select value={f.language} onChange={(e) => set("language", e.target.value)} className={`${selectCls} ${errSelect("language")}`}>
                      <option value="">言語を選択</option>
                      {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </div>
                  <ErrMsg field="language" />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* 形式と場所 */}
          <SectionCard title="形式と場所" icon={<svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M3 12a8.959 8.959 0 00.284 2.253" /></svg>}>
            <div className="flex flex-col gap-4">
              <div>
                <FormLabel required>イベント形式</FormLabel>
                <div className="grid grid-cols-3 gap-3 mt-1">
                  {FORMAT_OPTIONS.map((opt) => {
                    const sel = f.format === opt.value;
                    return (
                      <button key={opt.value} type="button" onClick={() => set("format", opt.value)} className={clsx("flex flex-col items-center gap-2 py-5 px-3 rounded-xl border-2 transition-all", sel ? "border-green-700 bg-green-50" : "border-gray-200 hover:border-gray-300 bg-white")}>
                        <div className="w-11 h-11 rounded-full flex items-center justify-center" style={sel ? { backgroundColor: "#1B4332" } : { backgroundColor: "#f3f4f6" }}>
                          <span className={sel ? "text-white" : "text-gray-500"}>{opt.icon}</span>
                        </div>
                        <span className={clsx("text-sm font-semibold", sel ? "text-green-800" : "text-gray-600")}>{opt.label}</span>
                        <span className="text-xs text-gray-400">{opt.sublabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {(f.format === "in-person" || f.format === "hybrid") && (
                <div>
                  <FormLabel required>開催場所</FormLabel>
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    <input type="text" value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="開催場所の住所を入力してください" className={`${inputCls} pl-11 ${errInput("location")}`} />
                  </div>
                  <ErrMsg field="location" />
                </div>
              )}
              {(f.format === "online" || f.format === "hybrid") && (
                <div>
                  <FormLabel required>オンラインURL</FormLabel>
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                    <input type="url" value={f.onlineUrl} onChange={(e) => set("onlineUrl", e.target.value)} placeholder="https://zoom.us/j/..." className={`${inputCls} pl-11 ${errInput("onlineUrl")}`} />
                  </div>
                  <ErrMsg field="onlineUrl" />
                </div>
              )}
            </div>
          </SectionCard>

          {/* 日時 */}
          <SectionCard title="日時" icon={<svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel required>開始日</FormLabel>
                <input type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} className={`${inputCls} ${errInput("startDate")}`} />
                <ErrMsg field="startDate" />
              </div>
              <div>
                <FormLabel required>開始時間</FormLabel>
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <input type="time" value={f.startTime} onChange={(e) => set("startTime", e.target.value)} className={`${inputCls} pl-11 ${errInput("startTime")}`} />
                </div>
                <ErrMsg field="startTime" />
              </div>
              <div>
                <FormLabel required>終了日</FormLabel>
                <input type="date" value={f.endDate} onChange={(e) => set("endDate", e.target.value)} className={`${inputCls} ${errInput("endDate")}`} />
                <ErrMsg field="endDate" />
              </div>
              <div>
                <FormLabel required>終了時間</FormLabel>
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <input type="time" value={f.endTime} onChange={(e) => set("endTime", e.target.value)} className={`${inputCls} pl-11 ${errInput("endTime")}`} />
                </div>
                <ErrMsg field="endTime" />
              </div>
            </div>
          </SectionCard>

          {/* キャパシティと画像 */}
          <SectionCard title="キャパシティと画像" icon={<svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}>
            <div className="flex flex-col gap-4">
              <div>
                <FormLabel>最大参加人数</FormLabel>
                <input type="number" value={f.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="未入力で無制限" min={1} className={inputCls} />
                <p className="text-xs text-gray-400 mt-1.5">イベントに登録できる人数を設定します</p>
              </div>
              <div>
                <FormLabel>カバー画像URL</FormLabel>
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                  <input type="url" value={f.coverImageUrl} onChange={(e) => set("coverImageUrl", e.target.value)} placeholder="https://example.com/image.jpg" className={`${inputCls} pl-11`} />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">カバー画像のURLを入力してください（推奨：1920x1080）</p>
              </div>
            </div>
          </SectionCard>

        </div>

        {/* Preview modal */}
        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] relative">
              {/* Close button — top-right of modal */}
              <button
                onClick={() => setShowPreview(false)}
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white border border-gray-100 shadow flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Scrollable content */}
              <div className="overflow-y-auto rounded-2xl">
                {/* Cover image */}
                <div className="w-full h-52 bg-gray-100 rounded-t-2xl overflow-hidden flex flex-col items-center justify-center shrink-0 relative">
                  {f.coverImageUrl ? (
                    <Image src={f.coverImageUrl} alt="cover" fill className="object-cover" unoptimized />
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="size-12 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      <p className="text-sm text-gray-400">カバー画像未設定</p>
                    </>
                  )}
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                      {FORMAT_LABELS[f.format]}
                    </span>
                    {f.category && <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{f.category}</span>}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    {f.title || "（タイトル未設定）"}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4 shrink-0" style={{ color: "#1B4332" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                    <span>{f.startDate ? `${formatDateJa(f.startDate)}${f.startTime ? ` ${f.startTime}` : ""}${f.endTime ? ` - ${f.endTime}` : ""}` : "未設定"}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-2">イベント詳細</h3>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {f.description || "（説明未設定）"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={clsx("fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full text-white text-sm font-semibold shadow-lg whitespace-nowrap")} style={{ backgroundColor: "#1B4332" }}>
            {toast.ok ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {toast.msg}
          </div>
        )}
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-5xl mx-auto px-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">イベント作成</h1>
            <p className="text-sm text-gray-500 mt-1">ユーザーが閲覧および参加するためのイベントを作成・管理します</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity shrink-0" style={{ backgroundColor: "#1B4332" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            新規イベント作成
          </button>
        </div>

        <div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
            </div>
            <div><p className="text-2xl font-bold text-gray-900">{events.length}</p><p className="text-xs text-gray-500">全イベント数</p></div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div><p className="text-2xl font-bold text-gray-900">{publishedCount}</p><p className="text-xs text-gray-500">公開済み</p></div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            </div>
            <div><p className="text-2xl font-bold text-gray-900">{draftCount}</p><p className="text-xs text-gray-500">下書き</p></div>
          </div>
        </div>

        {/* Event list */}
        <h2 className="text-base font-bold text-gray-900 mb-4">すべてのイベント</h2>
        <div className="flex flex-col gap-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} onEdit={() => openEdit(event)} onDelete={() => setDeleteId(event.id)} />
          ))}
          {events.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-sm text-gray-500 mb-4">イベントはまだありません</p>
              <button onClick={openCreate} className="text-sm font-semibold underline underline-offset-2" style={{ color: "#1B4332" }}>最初のイベントを作成する</button>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* ── Edit modal ────────────────────────────────────────────────────────── */}
      {editModal && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#d1fae5" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "#1B4332" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-gray-900">イベントを編集</h2>
              </div>
              <button onClick={() => { setEditModal(null); setEditForm(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
              {/* イベント名 */}
              <div>
                <FormLabel required>イベント名</FormLabel>
                <input type="text" value={editForm.title} onChange={(e) => setEditField("title", e.target.value)} className={inputCls} />
              </div>

              {/* 説明 */}
              <div>
                <FormLabel>説明</FormLabel>
                <textarea value={editForm.description} onChange={(e) => setEditField("description", e.target.value)} rows={3} className={`${inputCls} resize-none`} />
              </div>

              {/* 日付 | 開始 | 終了 */}
              <div className="grid grid-cols-3 gap-3">
                <div><FormLabel required>日付</FormLabel><input type="date" value={editForm.date} onChange={(e) => setEditField("date", e.target.value)} className={inputCls} /></div>
                <div><FormLabel required>開始</FormLabel><input type="time" value={editForm.startTime} onChange={(e) => setEditField("startTime", e.target.value)} className={inputCls} /></div>
                <div><FormLabel>終了</FormLabel><input type="time" value={editForm.endTime} onChange={(e) => setEditField("endTime", e.target.value)} className={inputCls} /></div>
              </div>

              {/* 形式 | カテゴリ | ステータス */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <FormLabel>形式</FormLabel>
                  <div className="relative">
                    <select value={editForm.format} onChange={(e) => setEditField("format", e.target.value as EventFormat)} className={selectCls}>
                      <option value="in-person">対面</option>
                      <option value="online">オンライン</option>
                      <option value="hybrid">ハイブリッド</option>
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </div>
                </div>
                <div>
                  <FormLabel required>カテゴリ</FormLabel>
                  <div className="relative">
                    <select value={editForm.category} onChange={(e) => setEditField("category", e.target.value)} className={selectCls}>
                      <option value="">選択</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </div>
                </div>
                <div>
                  <FormLabel>ステータス</FormLabel>
                  <div className="relative">
                    <select value={editForm.status} onChange={(e) => setEditField("status", e.target.value as EventStatus)} className={selectCls}>
                      <option value="published">公開済み</option>
                      <option value="draft">下書き</option>
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </div>
                </div>
              </div>

              {/* 場所 / リンク */}
              <div>
                <FormLabel required>場所 / リンク</FormLabel>
                <input type="text" value={editForm.locationOrLink} onChange={(e) => setEditField("locationOrLink", e.target.value)} className={inputCls} />
              </div>

              {/* 定員 */}
              <div>
                <FormLabel>定員</FormLabel>
                <input type="number" value={editForm.capacity} onChange={(e) => setEditField("capacity", e.target.value)} placeholder="未入力で無制限" min={1} className="px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 bg-white w-36" />
              </div>

              {/* サムネイル画像 */}
              <div>
                <FormLabel>サムネイル画像</FormLabel>
                <div className="border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 cursor-pointer hover:border-gray-300 transition-colors bg-gray-50/50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm text-gray-400">クリックまたはドラッグして画像をアップロード</p>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100 shrink-0">
              <button onClick={() => { setEditModal(null); setEditForm(null); }} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">キャンセル</button>
              <button onClick={saveEdit} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: "#1B4332" }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                変更を保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full text-white text-sm font-semibold shadow-lg whitespace-nowrap" style={{ backgroundColor: "#1B4332" }}>
          {toast.ok ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          {toast.msg}
        </div>
      )}

      {/* ── Delete dialog ─────────────────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 flex flex-col items-center text-center">
            {/* Warning icon */}
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">イベントを削除しますか？</h3>
            <p className="text-sm text-gray-500 mb-5">以下のイベントを完全に削除します。<br />この操作は元に戻せません。</p>
            {/* Event name box */}
            <div className="w-full px-4 py-3 rounded-xl bg-red-50 border border-red-100 mb-6">
              <p className="text-sm font-semibold text-red-600 text-left">{events.find((e) => e.id === deleteId)?.title}</p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-full text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">キャンセル</button>
              <button onClick={handleDelete} className="flex-1 py-3 rounded-full text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">削除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event, onEdit, onDelete }: { event: AdminEvent; onEdit: () => void; onDelete: () => void }) {
  const progressPct = event.capacity && event.capacity > 0
    ? Math.min(100, Math.round((event.currentParticipants / event.capacity) * 100))
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 flex overflow-hidden">
      {/* Image */}
      <div className="w-44 shrink-0 relative bg-gray-100">
        {event.coverImageUrl ? (
          <Image src={event.coverImageUrl} alt={event.title} fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl bg-gradient-to-br from-green-50 to-emerald-100">🎌</div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
        <div>
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-semibold", event.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
              {event.status === "published" ? "公開済み" : "下書き"}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{FORMAT_LABELS[event.format]}</span>
            {event.category && <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{event.category}</span>}
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-gray-900 mb-2">{event.title}</h3>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
              {formatDateJa(event.startDate)}
            </span>
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {event.startTime}{event.endTime ? ` - ${event.endTime}` : ""}
            </span>
            {(event.format === "in-person" || event.format === "hybrid") && event.location && (
              <span className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                <span className="truncate max-w-xs">{event.location}</span>
              </span>
            )}
            {(event.format === "online" || event.format === "hybrid") && event.onlineUrl && (
              <span className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                <span className="truncate max-w-xs">{event.onlineUrl}</span>
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {progressPct !== null && (
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden w-full max-w-xs">
              <div className="h-full rounded-full" style={{ width: `${progressPct}%`, backgroundColor: "#1B4332" }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{event.currentParticipants}/{event.capacity}人</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center justify-center gap-2 px-5">
        <button onClick={onEdit} title="編集" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
        </button>
        <button onClick={onDelete} title="削除" className="p-2 rounded-lg hover:bg-red-50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
        </button>
      </div>
    </div>
  );
}
