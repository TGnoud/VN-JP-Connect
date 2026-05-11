"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  addPhotoUrls,
  getMyProfile,
  replaceInterests,
  replaceLanguages,
  resolveMediaUrl,
  searchInterestTags,
  updateAvatarUrl,
  updateBio,
  updateCoverUrl,
  updatePersonalProfile,
  uploadAvatar,
  uploadCover,
  uploadPhotos,
  MAX_PROFILE_BIO_LENGTH,
  type ProfileData,
  type ProfileTag,
} from "@/lib/profile-api";

/* ── Constants ── */
const PROFILE = {
  fullName: "Nguyen Van Minh",
  email: "minh.nguyen@example.com",
  age: 26,
  gender: "男性",
  nationality: "ベトナム",
  city: "ハノイ市, ベトナム",
  occupation: "ソフトウェア開発者",
  school: "ハノイ工科大学",
  joinedAt: "2024年6月",
  likeRate: 94,
  connectionsCount: 128,
  bio: "ハノイ出身のソフトウェア開発者です。日本語を勉強して2年になります。日本の文化、特にアニメ、料理、テクノロジーに深い興味があります。言語交換パートナーを探しています。一緒に楽しく学びましょう！",
  avatarUrl: "https://api.dicebear.com/7.x/personas/svg?seed=minh",
  coverUrl: "https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=900&q=80",
  photos: [
    "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=300&q=80",
    "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=300&q=80",
    "https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=300&q=80",
  ],
  interests: ["言語交換", "アニメ", "テクノロジー", "ベトナム料理", "旅行", "写真", "コーヒー", "読書"],
};

const LANGUAGES = [
  { useFlag: true,  flagSrc: "https://flagcdn.com/20x15/vn.png", dotColor: "",        name: "ベトナム語", level: "母語" },
  { useFlag: false, flagSrc: "",                                  dotColor: "#ef4444", name: "日本語",    level: "N3" },
  { useFlag: true,  flagSrc: "https://flagcdn.com/20x15/gb.png", dotColor: "",        name: "英語",      level: "IELTS 7.0" },
];

const ALL_INTERESTS = [
  "言語交換", "アニメ", "テクノロジー", "ベトナム料理", "旅行", "写真", "コーヒー", "読書",
  "マンガ", "J-POP", "K-POP", "ゲーム", "サッカー", "映画", "音楽", "ダンス",
  "ファッション", "料理", "ヨガ", "ランニング", "書道", "茶道", "剣道", "柔道",
  "カラオケ", "ボランティア", "バイク", "ハイキング", "アウトドア", "料理教室",
];

const GALLERY_PHOTOS = [
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=300&q=80",
  "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=300&q=80",
  "https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=300&q=80",
  "https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=300&q=80",
  "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=300&q=80",
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=300&q=80",
  "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=300&q=80",
  "https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?w=300&q=80",
];

const COVER_PHOTOS = [
  "https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=400&q=80",
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=80",
  "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=400&q=80",
  "https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=400&q=80",
  "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&q=80",
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=80",
];

const AVATAR_OPTIONS = [
  "https://api.dicebear.com/7.x/personas/svg?seed=minh",
  "https://api.dicebear.com/7.x/personas/svg?seed=hiroshi",
  "https://api.dicebear.com/7.x/personas/svg?seed=tanaka",
  "https://api.dicebear.com/7.x/personas/svg?seed=yuki",
  "https://api.dicebear.com/7.x/personas/svg?seed=anh",
];

/* ── Icons ── */
function PencilIcon({ size = 3.5 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={`size-${size}`} viewBox="0 0 20 20" fill="currentColor">
      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
    </svg>
  );
}
function CameraIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
    </svg>
  );
}
function UploadIcon({ className = "size-8 text-gray-300" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-white" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  );
}
function UserIcon() {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md shrink-0" style={{ backgroundColor: "#ecfdf5" }}>
      <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    </span>
  );
}
function LanguageIcon() {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md shrink-0" style={{ backgroundColor: "#ecfdf5" }}>
      <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    </span>
  );
}
function StarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

/* ── Shared components ── */
function SectionCard({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border border-gray-200 p-4">{children}</div>;
}
function SectionHeader({ icon, title, action }: { icon?: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-1.5">{icon}<h2 className="text-sm font-semibold text-gray-900">{title}</h2></div>
      {action}
    </div>
  );
}
function EditBtn({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-xs font-medium text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50 transition-colors">
      <PencilIcon /> 編集
    </button>
  );
}
function AddBtn({ label = "+ 追加", onClick }: { label?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-0.5 text-xs font-semibold text-white px-3 py-1 rounded-full transition-colors" style={{ backgroundColor: "#1B4332" }}>
      {label}
    </button>
  );
}

/* ── Modal base ── */
function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] w-full ${wide ? "max-w-lg" : "max-w-md"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors"><XIcon /></button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "保存に失敗しました。";
}

function ModalFooter({ onCancel, onSave, saveLabel, saveDisabled = false }: { onCancel: () => void; onSave: () => void | Promise<void>; saveLabel: string; saveDisabled?: boolean }) {
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (saving || saveDisabled) return;

    setSaving(true);
    try {
      await onSave();
    } catch (error) {
      console.error(error);
      alert(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
      <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">キャンセル</button>
      <button onClick={handleSave} disabled={saveDisabled || saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors" style={{ backgroundColor: "#1B4332" }}>
        <CheckIcon /> {saveLabel}
      </button>
    </div>
  );
}

/* ── Modal: プロフィール編集 ── */
function EditBioModal({ current, onClose, onSave }: { current: string; onClose: () => void; onSave: (v: string) => void | Promise<void> }) {
  const [text, setText] = useState(current.slice(0, MAX_PROFILE_BIO_LENGTH));
  return (
    <Modal title="プロフィールを編集" onClose={onClose} wide>
      <div className="px-5 py-4">
        <label className="text-xs font-medium text-gray-600 mb-1.5 block">自己紹介</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_PROFILE_BIO_LENGTH))}
          maxLength={MAX_PROFILE_BIO_LENGTH}
          rows={6}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
          placeholder="自己紹介を入力してください..."
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{text.length}/{MAX_PROFILE_BIO_LENGTH} 文字</p>
      </div>
      <ModalFooter onCancel={onClose} onSave={() => Promise.resolve(onSave(text)).then(onClose)} saveLabel="保存する" saveDisabled={text.length > MAX_PROFILE_BIO_LENGTH} />
    </Modal>
  );
}

/* ── Modal: 言語スキルを編集 ── */
const LANG_OPTIONS = [
  { name: "日本語",     useFlag: false, flagSrc: "",                                  dotColor: "#ef4444" },
  { name: "ベトナム語", useFlag: true,  flagSrc: "https://flagcdn.com/20x15/vn.png",  dotColor: "" },
  { name: "英語",       useFlag: true,  flagSrc: "https://flagcdn.com/20x15/gb.png",  dotColor: "" },
  { name: "中国語",     useFlag: true,  flagSrc: "https://flagcdn.com/20x15/cn.png",  dotColor: "" },
  { name: "韓国語",     useFlag: true,  flagSrc: "https://flagcdn.com/20x15/kr.png",  dotColor: "" },
  { name: "フランス語", useFlag: true,  flagSrc: "https://flagcdn.com/20x15/fr.png",  dotColor: "" },
  { name: "スペイン語", useFlag: true,  flagSrc: "https://flagcdn.com/20x15/es.png",  dotColor: "" },
];
const LEVEL_OPTIONS = ["母語", "N1", "N2", "N3", "N4", "N5", "Basic", "A1", "A2", "B1", "B2", "C1", "C2", "IELTS 7.0", "IELTS 6.5"];

type LangEntry = typeof LANGUAGES[0];
type UiProfile = Omit<typeof PROFILE, "age"> & { age: number | null };
const EMPTY_PROFILE: UiProfile = {
  fullName: "",
  email: "",
  age: null,
  gender: "",
  nationality: "",
  city: "",
  occupation: "",
  school: "",
  joinedAt: "",
  likeRate: 100,
  connectionsCount: 0,
  bio: "",
  avatarUrl: "",
  coverUrl: "",
  photos: [],
  interests: [],
};
type PersonalForm = {
  fullName: string;
  email: string;
  age: string;
  gender: string;
  nationality: string;
  city: string;
  occupation: string;
  school: string;
  instagram: string;
  facebook: string;
  line: string;
};

const LANGUAGE_API_NAMES: Record<string, string> = {
  Japanese: "日本語",
  Vietnamese: "ベトナム語",
  English: "英語",
  Chinese: "中国語",
  Korean: "韓国語",
  French: "フランス語",
  Spanish: "スペイン語",
};

const LANGUAGE_UI_NAMES = Object.fromEntries(
  Object.entries(LANGUAGE_API_NAMES).map(([apiName, uiName]) => [uiName, apiName]),
);

const LEVEL_API_NAMES: Record<string, string> = {
  Native: "母語",
  Beginner: "Basic",
};

const LEVEL_UI_NAMES = Object.fromEntries(
  Object.entries(LEVEL_API_NAMES).map(([apiName, uiName]) => [uiName, apiName]),
);

function formatJoinedAt(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long" }).format(
    new Date(value),
  );
}

function shortEmail(value: string) {
  return value.length > 14 ? `${value.slice(0, 13)}...` : value;
}

function languageFromApi(language: string, level: string): LangEntry {
  const uiName = LANGUAGE_API_NAMES[language] ?? language;
  const option =
    LANG_OPTIONS.find((item) => item.name === uiName) ??
    { name: uiName, useFlag: false, flagSrc: "", dotColor: "#6b7280" };

  return { ...option, level: LEVEL_API_NAMES[level] ?? level };
}

function languageToApi(language: string) {
  return LANGUAGE_UI_NAMES[language] ?? language;
}

function levelToApi(level: string) {
  return LEVEL_UI_NAMES[level] ?? level;
}

function defaultAvatarUrlFromSeed(seedValue: string) {
  const seed = encodeURIComponent(seedValue || "user");
  return `https://api.dicebear.com/7.x/personas/svg?seed=${seed}`;
}

function defaultAvatarUrl(profile: ProfileData) {
  return defaultAvatarUrlFromSeed(profile.id || profile.email || profile.fullName || "user");
}

function profileFromApi(profile: ProfileData): UiProfile {
  return {
    fullName: profile.fullName,
    email: profile.email,
    age: profile.age ?? null,
    gender:
      profile.gender === "female"
        ? "女性"
        : profile.gender === "other"
          ? "その他"
          : profile.gender === "male"
            ? "男性"
            : "",
    nationality: profile.nationality === "JP" ? "日本" : "ベトナム",
    city: profile.location,
    occupation: profile.occupation,
    school: profile.education,
    joinedAt: profile.joinedAt ? formatJoinedAt(profile.joinedAt) : "",
    likeRate: profile.likeRate ?? 100,
    connectionsCount: profile.connectionsCount ?? 0,
    bio: profile.bio.slice(0, MAX_PROFILE_BIO_LENGTH),
    avatarUrl: resolveMediaUrl(profile.avatarUrl, 256) || defaultAvatarUrl(profile),
    coverUrl: resolveMediaUrl(profile.coverUrl, 1400) || COVER_PHOTOS[0],
    photos: profile.photos.map((photo) => resolveMediaUrl(photo.url, 700)),
    interests: profile.interests.map((interest) => interest.name),
  };
}

function socialLinksFromApi(profile: ProfileData) {
  return {
    instagram: profile.socialLinks.instagram,
    facebook: profile.socialLinks.facebook,
    line: profile.socialLinks.line,
  };
}

function EditLanguagesModal({ current, onClose, onSave }: { current: LangEntry[]; onClose: () => void; onSave: (langs: LangEntry[]) => void | Promise<void> }) {
  const [list, setList] = useState<LangEntry[]>([...current]);
  const [newLang, setNewLang] = useState("");
  const [newLevel, setNewLevel] = useState("");

  function removeLang(name: string) {
    setList((arr) => arr.filter((l) => l.name !== name));
  }

  function addLang() {
    if (!newLang || !newLevel) return;
    const opt = LANG_OPTIONS.find((o) => o.name === newLang);
    if (!opt) return;
    setList((arr) => [...arr, { ...opt, level: newLevel }]);
    setNewLang("");
    setNewLevel("");
  }

  const selectCls = "w-full border border-gray-200 rounded-xl px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:border-transparent appearance-none bg-white";

  return (
    <Modal title="言語スキルを編集" onClose={onClose} wide>
      <div className="px-5 py-4">
        {/* Current list */}
        <div className="flex flex-col gap-2 mb-4">
          {list.map((l) => (
            <div key={l.name} className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5">
              {l.useFlag ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.flagSrc} alt={l.name} className="w-5 h-auto rounded-sm shrink-0" />
              ) : (
                <span style={{ color: l.dotColor }} className="text-sm leading-none shrink-0">●</span>
              )}
              <span className="text-sm font-semibold text-gray-800">{l.name}</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded border" style={{ color: "#1B4332", borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" }}>
                {l.level}
              </span>
              <span className="flex-1" />
              <button onClick={() => removeLang(l.name)} className="ml-1 p-1 rounded hover:bg-red-50 text-red-500 transition-colors">
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>

        {/* Add new language form */}
        <div className="bg-gray-50 rounded-xl p-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">言語</label>
            <div className="relative">
              <select value={newLang} onChange={(e) => setNewLang(e.target.value)} className={`${selectCls} ${!newLang ? "text-gray-400" : "text-gray-800"}`}>
                <option value="">選択...</option>
                {LANG_OPTIONS.filter((o) => !list.some((l) => l.name === o.name)).map((o) => (
                  <option key={o.name} value={o.name}>{o.name}</option>
                ))}
              </select>
              <ChevronDownIcon />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">レベル</label>
            <div className="relative">
              <select value={newLevel} onChange={(e) => setNewLevel(e.target.value)} className={`${selectCls} ${!newLevel ? "text-gray-400" : "text-gray-800"}`}>
                <option value="">選択...</option>
                {LEVEL_OPTIONS.map((lv) => (
                  <option key={lv} value={lv}>{lv}</option>
                ))}
              </select>
              <ChevronDownIcon />
            </div>
          </div>
        </div>

        {/* Inline add/cancel buttons */}
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={() => { setNewLang(""); setNewLevel(""); }}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={addLang}
            disabled={!newLang || !newLevel}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-colors"
            style={{ backgroundColor: (!newLang || !newLevel) ? "#9ca3af" : "#1B4332" }}
          >
            + 追加
          </button>
        </div>
        </div>
      </div>
      <ModalFooter onCancel={onClose} onSave={() => Promise.resolve(onSave(list)).then(onClose)} saveLabel="保存する" />
    </Modal>
  );
}

/* ── Modal 29: 個人情報を編集 ── */
function EditInfoModal({ current, socialLinks, onClose, onSave }: { current: UiProfile; socialLinks: { instagram: string; facebook: string; line: string }; onClose: () => void; onSave: (form: PersonalForm) => void | Promise<void> }) {
  const [form, setForm] = useState({
    fullName: current.fullName, email: current.email, age: current.age == null ? "" : String(current.age),
    gender: current.gender, nationality: current.nationality, city: current.city,
    occupation: current.occupation, school: current.school,
    instagram: socialLinks.instagram, facebook: socialLinks.facebook, line: socialLinks.line,
  });

  const fields: { key: keyof typeof form; label: string; icon: React.ReactNode }[] = [
    { key: "fullName",   label: "名前",      icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" /></svg> },
    { key: "email",      label: "メール",    icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" /><path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" /></svg> },
    { key: "age",        label: "年齢",      icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg> },
    { key: "gender",     label: "性別",      icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" /></svg> },
    { key: "nationality",label: "国籍",      icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 7l2.55 2.4A1 1 0 0116 11H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" /></svg> },
    { key: "city",       label: "所在地",    icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 15.327 17 12.993 17 10a7 7 0 10-14 0c0 2.993 1.698 5.327 3.354 6.985a21.485 21.485 0 002.273 1.765 11.44 11.44 0 00.757.433 5.741 5.741 0 00.28.14l.019.008.006.002zM10 11.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z" clipRule="evenodd" /></svg> },
    { key: "occupation", label: "職業",      icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" /></svg> },
    { key: "school",     label: "学歴",      icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" /></svg> },
    { key: "instagram",  label: "Instagram", icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
    { key: "facebook",   label: "Facebook",  icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    { key: "line",       label: "LINE",      icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg> },
  ];

  const inputCls = "w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent hover:border-gray-300 transition-all";

  return (
    <Modal title="個人情報を編集" onClose={onClose} wide>
      <div className="px-5 py-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{f.label}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">{f.icon}</span>
              <input
                value={form[f.key]}
                readOnly={f.key === "age"}
                aria-readonly={f.key === "age"}
                onChange={(e) => {
                  if (f.key === "age") return;
                  setForm((prev) => ({ ...prev, [f.key]: e.target.value }));
                }}
                className={inputCls}
              />
            </div>
          </div>
        ))}
      </div>
      <ModalFooter onCancel={onClose} onSave={() => Promise.resolve(onSave(form)).then(onClose)} saveLabel="保存する" />
    </Modal>
  );
}

/* ── Modal 31: 写真を追加 ── */
function AddPhotoModal({ currentCount, onClose, onSave }: { currentCount: number; onClose: () => void; onSave: (urls: string[], files: File[]) => void | Promise<void> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const remaining = 9 - currentCount;

  function toggle(p: string) {
    setSelected((arr) =>
      arr.includes(p) ? arr.filter((x) => x !== p) : arr.length < remaining ? [...arr, p] : arr
    );
  }

  return (
    <Modal title="写真を追加" onClose={onClose}>
      <div className="px-5 py-4">
        <p className="text-sm text-gray-600 mb-1">ギャラリーから写真を選択するか、ファイルをアップロードしてください。</p>
        <p className="text-xs font-semibold mb-4" style={{ color: "#1B4332" }}>
          あと{remaining}枚追加できます（{selected.length}枚選択中）
        </p>

        {/* Upload area */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            const pickedFiles = Array.from(e.target.files ?? []).slice(0, remaining);
            setFiles(pickedFiles);
          }}
        />
        <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center py-8 mb-5 cursor-pointer hover:bg-gray-50 transition-colors">
          <UploadIcon className="size-8 text-green-200" />
          <p className="text-sm font-semibold text-gray-700 mt-2">クリックしてアップロード</p>
          <p className="text-xs text-gray-400">またはドラッグ&amp;ドロップ</p>
          <p className="text-xs text-gray-300 mt-1">JPG, PNG, WEBP（最大5MB）</p>
        </div>

        {/* Gallery */}
        <p className="text-sm font-semibold text-gray-700 mb-2">ギャラリーから選択</p>
        <div className="grid grid-cols-4 gap-2">
          {GALLERY_PHOTOS.map((p) => (
            <button key={p} onClick={() => toggle(p)} className="relative aspect-square rounded-lg overflow-hidden">
              <Image src={p} alt="" fill className="object-cover" unoptimized />
              {selected.includes(p) && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(27,67,50,0.5)" }}>
                  <CheckIcon />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      <ModalFooter
        onCancel={onClose}
        onSave={() => Promise.resolve(onSave(selected, files)).then(onClose)}
        saveLabel={`追加する (${selected.length + files.length})`}
        saveDisabled={selected.length === 0 && files.length === 0}
      />
    </Modal>
  );
}

/* ── Modal 32: 趣味を選択 ── */
function SelectInterestsModal({ current, onClose, onSave }: { current: string[]; onClose: () => void; onSave: (v: string[]) => void | Promise<void> }) {
  const [selected, setSelected] = useState<string[]>([...current]);
  const [query, setQuery] = useState("");

  const filtered = ALL_INTERESTS.filter((i) => i.includes(query));

  function toggle(i: string) {
    setSelected((arr) => arr.includes(i) ? arr.filter((x) => x !== i) : [...arr, i]);
  }

  return (
    <Modal title="趣味を選択" onClose={onClose} wide>
      <div className="px-5 py-4">
        <p className="text-sm text-gray-600 mb-3">あなたの趣味や興味を選んでください。共通の趣味がある人とマッチングしやすくなります。</p>

        {/* Search */}
        <div className="relative mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="趣味を検索..."
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
          />
        </div>

        <p className="text-xs text-gray-500 mb-2">選択中: {selected.length}</p>

        <div className="flex flex-wrap gap-2">
          {filtered.map((i) => {
            const active = selected.includes(i);
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-all"
                style={active
                  ? { backgroundColor: "#1B4332", borderColor: "#1B4332", color: "#fff" }
                  : { backgroundColor: "#fff", borderColor: "#d1d5db", color: "#374151" }
                }
              >
                {active ? <><CheckIcon /> {i}</> : <>+ {i}</>}
              </button>
            );
          })}
        </div>
      </div>
      <ModalFooter onCancel={onClose} onSave={() => Promise.resolve(onSave(selected)).then(onClose)} saveLabel={`保存する (${selected.length})`} />
    </Modal>
  );
}

/* ── Modal 33: プロフィール写真を変更 ── */
function ChangeAvatarModal({ current, onClose, onSave }: { current: string; onClose: () => void; onSave: (url: string, file: File | null) => void | Promise<void> }) {
  const [selected, setSelected] = useState(current || AVATAR_OPTIONS[0]);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const preview = file ? URL.createObjectURL(file) : selected;

  return (
    <Modal title="プロフィール写真を変更" onClose={onClose}>
      <div className="px-5 py-4">
        <p className="text-sm text-gray-600 mb-4">プロフィール写真として使用する画像を選択してください。</p>

        {/* Large preview */}
        <div className="flex justify-center mb-4">
          <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-green-600">
            <Image src={preview} alt="selected" fill className="object-cover" unoptimized />
          </div>
        </div>

        {/* Options row */}
        <div className="flex gap-3 justify-center mb-4">
          {AVATAR_OPTIONS.map((a) => (
            <button key={a} onClick={() => { setSelected(a); setFile(null); }} className={`relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all ${selected === a && !file ? "border-green-600" : "border-gray-200"}`}>
              <Image src={a} alt="" fill className="object-cover" unoptimized />
              {selected === a && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(27,67,50,0.3)" }}>
                  <CheckIcon />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Upload area */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const nextFile = e.target.files?.[0] ?? null;
            setFile(nextFile);
          }}
        />
        <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center py-5 cursor-pointer hover:bg-gray-50 transition-colors">
          <CameraIcon className="size-6 text-gray-300" />
          <p className="text-sm font-medium text-gray-600 mt-1">ファイルをアップロード</p>
          <p className="text-xs text-gray-400">JPG, PNG（最大2MB）</p>
        </div>
      </div>
      <ModalFooter onCancel={onClose} onSave={() => Promise.resolve(onSave(selected, file)).then(onClose)} saveLabel="保存する" />
    </Modal>
  );
}

/* ── Modal 34: カバー写真を変更 ── */
function ChangeCoverModal({ current, onClose, onSave }: { current: string; onClose: () => void; onSave: (url: string, file: File | null) => void | Promise<void> }) {
  const [selected, setSelected] = useState(current || COVER_PHOTOS[0]);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Modal title="カバー写真を変更" onClose={onClose} wide>
      <div className="px-5 py-4">
        <p className="text-sm text-gray-600 mb-4">カバー画像を選択してください。プロフィールの上部に表示されます。</p>

        {/* Photo grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {COVER_PHOTOS.map((p) => (
            <button key={p} onClick={() => { setSelected(p); setFile(null); }} className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${selected === p && !file ? "border-green-600" : "border-transparent"}`}>
              <Image src={p} alt="" fill className="object-cover" unoptimized />
              {selected === p && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(27,67,50,0.35)" }}>
                  <div className="bg-green-600 rounded-full p-1"><CheckIcon /></div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Upload area */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const nextFile = e.target.files?.[0] ?? null;
            setFile(nextFile);
          }}
        />
        <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center py-5 cursor-pointer hover:bg-gray-50 transition-colors">
          <UploadIcon className="size-6 text-gray-300" />
          <p className="text-xs text-gray-500 mt-1">またはファイルをアップロード</p>
          <p className="text-xs text-gray-400">JPG, PNG（最大5MB）</p>
        </div>
      </div>
      <ModalFooter onCancel={onClose} onSave={() => Promise.resolve(onSave(selected, file)).then(onClose)} saveLabel="保存する" />
    </Modal>
  );
}

/* ── Main Page ── */
type ModalType = "editInfo" | "addPhoto" | "selectInterests" | "changeAvatar" | "changeCover" | "editBio" | "editLanguages";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UiProfile>(EMPTY_PROFILE);
  const [socialLinks, setSocialLinks] = useState({
    instagram: "",
    facebook: "",
    line: "",
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState<LangEntry[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalType | null>(null);
  const [failedMedia, setFailedMedia] = useState({ avatarUrl: "", coverUrl: "" });

  function close() { setModal(null); }

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const apiProfile = await getMyProfile();

        if (!active) return;

        const uiProfile = profileFromApi(apiProfile);
        setProfile(uiProfile);
        setBio(uiProfile.bio);
        setInterests(uiProfile.interests);
        setLanguages(apiProfile.languages.map((item) => languageFromApi(item.language, item.level)));
        setPhotos(uiProfile.photos);
        setSocialLinks(socialLinksFromApi(apiProfile));
      } catch (error) {
        if (error instanceof Error && error.message.includes("Login is required")) {
          return;
        }

        console.warn(errorMessage(error));
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  function applyApiProfile(apiProfile: ProfileData) {
    const uiProfile = profileFromApi(apiProfile);
    setProfile(uiProfile);
    setBio(uiProfile.bio);
    setInterests(uiProfile.interests);
    setLanguages(apiProfile.languages.map((item) => languageFromApi(item.language, item.level)));
    setPhotos(uiProfile.photos);
    setSocialLinks(socialLinksFromApi(apiProfile));
  }

  async function savePersonal(form: PersonalForm) {
    const apiProfile = await updatePersonalProfile({
      fullName: form.fullName,
      email: form.email,
      gender: form.gender === "女性" ? "female" : form.gender === "その他" ? "other" : "male",
      nationality: form.nationality === "日本" ? "JP" : "VN",
      location: form.city,
      occupation: form.occupation,
      education: form.school,
      socialLinks: {
        instagram: form.instagram,
        facebook: form.facebook,
        line: form.line,
      },
    });
    applyApiProfile(apiProfile);
  }

  async function saveBio(nextBio: string) {
    if (nextBio.length > MAX_PROFILE_BIO_LENGTH) {
      throw new Error(`bio must be at most ${MAX_PROFILE_BIO_LENGTH} characters`);
    }

    applyApiProfile(await updateBio(nextBio));
  }

  async function saveLanguages(nextLanguages: LangEntry[]) {
    applyApiProfile(await replaceLanguages(nextLanguages.map((item) => ({
      language: languageToApi(item.name),
      level: levelToApi(item.level),
    }))));
  }

  async function saveInterests(nextInterests: string[]) {
    const tags = await searchInterestTags();
    const missingInterests = nextInterests.filter(
      (name) => !tags.some((tag: ProfileTag) => tag.name === name),
    );

    if (missingInterests.length > 0) {
      throw new Error(`Missing interest tags in backend: ${missingInterests.join(", ")}`);
    }

    const tagIds = nextInterests
      .map((name) => tags.find((tag: ProfileTag) => tag.name === name)?.id)
      .filter((id): id is string => Boolean(id));
    applyApiProfile(await replaceInterests(tagIds));
  }

  async function removeInterest(interest: string) {
    await saveInterests(interests.filter((item) => item !== interest));
  }

  async function addRecommendedInterest(interest: string) {
    if (interests.includes(interest)) return;
    await saveInterests([...interests, interest]);
  }

  async function saveAvatar(url: string, file: File | null) {
    applyApiProfile(file ? await uploadAvatar(file) : await updateAvatarUrl(resolveMediaUrl(url, 256)));
  }

  async function saveCover(url: string, file: File | null) {
    applyApiProfile(file ? await uploadCover(file) : await updateCoverUrl(resolveMediaUrl(url, 1400)));
  }

  async function savePhotos(urls: string[], files: File[]) {
    let apiProfile: ProfileData | null = null;

    if (urls.length > 0) {
      apiProfile = await addPhotoUrls(urls.map((url) => resolveMediaUrl(url, 700)));
    }

    if (files.length > 0) {
      apiProfile = await uploadPhotos(files);
    }

    if (apiProfile) {
      applyApiProfile(apiProfile);
    }
  }

  const INFO_FIELDS = [
    { label: "名前",  value: profile.fullName, icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" /></svg> },
    { label: "メール", value: shortEmail(profile.email), icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" /><path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" /></svg> },
    { label: "年齢",  value: profile.age == null ? "-" : `${profile.age}歳`, icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg> },
    { label: "性別",  value: profile.gender, icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" /></svg> },
    { label: "国籍",  value: profile.nationality, icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 7l2.55 2.4A1 1 0 0116 11H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" /></svg> },
    { label: "所在地", value: profile.city, icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 15.327 17 12.993 17 10a7 7 0 10-14 0c0 2.993 1.698 5.327 3.354 6.985a21.485 21.485 0 002.273 1.765 11.44 11.44 0 00.757.433 5.741 5.741 0 00.28.14l.019.008.006.002zM10 11.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z" clipRule="evenodd" /></svg> },
    { label: "職業",  value: profile.occupation, icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" /></svg> },
    { label: "学歴",  value: profile.school, icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" /></svg> },
  ];

  const SNS_FIELDS = [
    { label: "Instagram", value: socialLinks.instagram, icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
    { label: "Facebook",  value: socialLinks.facebook, icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    { label: "LINE",      value: socialLinks.line, icon: <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg> },
  ];

  const avatarSrc = !profile.avatarUrl || failedMedia.avatarUrl === profile.avatarUrl
    ? defaultAvatarUrlFromSeed(profile.email || profile.fullName || "user")
    : profile.avatarUrl;
  const coverSrc = !profile.coverUrl || failedMedia.coverUrl === profile.coverUrl ? COVER_PHOTOS[0] : profile.coverUrl;

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-5 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold leading-tight text-gray-900">マイプロフィール</h1>
          <p className="mt-1 text-xs font-medium text-gray-400">個人情報の管理</p>
        </div>

        {/* ── Hero card ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="relative h-40 bg-gradient-to-br from-emerald-100 to-gray-200">
            <Image
              src={coverSrc}
              alt="cover"
              fill
              className="object-cover"
              unoptimized
              onError={() => setFailedMedia((current) => ({ ...current, coverUrl: profile.coverUrl }))}
            />
            <button onClick={() => setModal("changeCover")} className="absolute bottom-3 right-3 bg-white/80 rounded-full p-2 shadow hover:bg-white transition-colors text-gray-600">
              <CameraIcon />
            </button>
          </div>

          <div className="px-5 pb-5">
            <div className="relative -mt-10 mb-3 inline-block">
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100">
                <Image
                  src={avatarSrc}
                  alt={profile.fullName}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                  unoptimized
                  onError={() => setFailedMedia((current) => ({ ...current, avatarUrl: profile.avatarUrl }))}
                />
              </div>
              <button onClick={() => setModal("changeAvatar")} className="absolute bottom-0.5 right-0.5 rounded-full p-1.5 shadow transition-colors text-white" style={{ backgroundColor: "#1B4332" }}>
                <CameraIcon className="size-3.5" />
              </button>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{profile.fullName}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 15.327 17 12.993 17 10a7 7 0 10-14 0c0 2.993 1.698 5.327 3.354 6.985a21.485 21.485 0 002.273 1.765 11.44 11.44 0 00.757.433 5.741 5.741 0 00.28.14l.019.008.006.002zM10 11.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z" clipRule="evenodd" /></svg>
                    {profile.city}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" /></svg>
                    {profile.occupation}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                    {profile.joinedAt}に参加
                  </span>
                </div>
                <div className="flex gap-2 mt-2.5">
                  <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-3" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" /></svg>
                    {profile.likeRate}% マッチ率
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-3" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                    {profile.connectionsCount} コネクション
                  </span>
                </div>
              </div>
              <button onClick={() => setModal("editInfo")} className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
                <PencilIcon size={3.5} /> プロフィールを編集
              </button>
            </div>
          </div>
        </div>

        {/* ── プロフィール ── */}
        <SectionCard>
          <SectionHeader title="プロフィール" action={<EditBtn onClick={() => setModal("editBio")} />} />
          <p className="text-sm text-gray-600 leading-relaxed">{bio}</p>
        </SectionCard>

        {/* ── 個人情報 ── */}
        <SectionCard>
          <SectionHeader icon={<UserIcon />} title="個人情報" action={<EditBtn onClick={() => setModal("editInfo")} />} />
          <div className="grid grid-cols-4 gap-2 mb-3">
            {INFO_FIELDS.map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-lg p-2.5 min-w-0">
                <div className="flex items-center gap-1 mb-1">{item.icon}<p className="text-xs text-gray-400">{item.label}</p></div>
                <p className="text-xs font-medium text-gray-800 truncate">{item.value}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">SNSリンク</p>
            <div className="grid grid-cols-3 gap-2">
              {SNS_FIELDS.map((s) => (
                <div key={s.label} className="bg-gray-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1 mb-1">{s.icon}<p className="text-xs text-gray-400">{s.label}</p></div>
                  <p className="text-xs font-medium text-gray-800">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ── 言語スキル ── */}
        <SectionCard>
          <SectionHeader icon={<LanguageIcon />} title="言語スキル" action={<AddBtn onClick={() => setModal("editLanguages")} />} />
          <div className="flex flex-wrap gap-2">
            {languages.map((l) => (
              <div key={l.name} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                {l.useFlag ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.flagSrc} alt={l.name} className="w-5 h-auto rounded-sm shrink-0" />
                ) : (
                  <span style={{ color: l.dotColor }} className="text-sm leading-none shrink-0">●</span>
                )}
                <span className="text-xs font-semibold text-gray-800">{l.name}</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded border" style={{ color: "#1B4332", borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" }}>
                  {l.level}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── 趣味 ── */}
        <SectionCard>
          <SectionHeader title="趣味" action={<EditBtn onClick={() => setModal("selectInterests")} />} />
          <p className="text-xs text-gray-500 mb-2">選択されている趣味({interests.length}):</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {interests.map((i) => (
              <span key={i} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: "#1B4332" }}>
                {i}
                <button onClick={() => { void removeInterest(i).catch((error) => { console.error(error); alert(errorMessage(error)); }); }} className="ml-0.5 opacity-80 hover:opacity-100 leading-none">×</button>
              </span>
            ))}
            <button onClick={() => setModal("selectInterests")} className="text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">+ 追加</button>
          </div>
          <p className="text-xs text-gray-500 mb-2">おすすめ</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_INTERESTS.slice(8, 13).filter((s) => !interests.includes(s)).map((s) => (
              <button key={s} onClick={() => { void addRecommendedInterest(s).catch((error) => { console.error(error); alert(errorMessage(error)); }); }} className="text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                + {s}
              </button>
            ))}
          </div>
        </SectionCard>

        {/* ── 写真 ── */}
        <SectionCard>
          <SectionHeader title={`写真(${photos.length}/9)`} action={<AddBtn onClick={() => setModal("addPhoto")} />} />
          <div className="grid grid-cols-4 gap-2">
            {photos.map((p, i) => (
              <div key={p} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                <Image src={p} alt={`photo-${i}`} fill className="object-cover" unoptimized />
                {i === 0 && (
                  <span className="absolute top-1 left-1 text-xs bg-white/90 text-gray-700 font-medium px-1.5 py-0.5 rounded leading-tight">メイン</span>
                )}
              </div>
            ))}
            <button onClick={() => setModal("addPhoto")} className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 hover:bg-gray-50 transition-colors">
              <UploadIcon className="size-6 text-gray-300" />
              <span className="text-xs text-gray-400 text-center leading-tight">写真を<br />アップロード</span>
            </button>
          </div>
        </SectionCard>

      </div>

      {/* ── Modals ── */}
      {modal === "editInfo"         && <EditInfoModal current={profile} socialLinks={socialLinks} onClose={close} onSave={savePersonal} />}
      {modal === "editBio"          && <EditBioModal current={bio} onClose={close} onSave={saveBio} />}
      {modal === "editLanguages"     && <EditLanguagesModal current={languages} onClose={close} onSave={saveLanguages} />}
      {modal === "addPhoto"         && <AddPhotoModal currentCount={photos.length} onClose={close} onSave={savePhotos} />}
      {modal === "selectInterests"  && <SelectInterestsModal current={interests} onClose={close} onSave={saveInterests} />}
      {modal === "changeAvatar"     && <ChangeAvatarModal current={profile.avatarUrl} onClose={close} onSave={saveAvatar} />}
      {modal === "changeCover"      && <ChangeCoverModal current={profile.coverUrl} onClose={close} onSave={saveCover} />}
    </div>
  );
}
