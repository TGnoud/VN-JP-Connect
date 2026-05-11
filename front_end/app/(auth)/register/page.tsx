"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { INTERESTS, PURPOSES, JAPANESE_LEVELS, VIETNAMESE_LEVELS, CITIES } from "@/lib/mock-data";

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 60 }, (_, i) => String(currentYear - 18 - i));

function SectionHeader({ num, title }: { num: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{ backgroundColor: "#1B4332" }}
      >
        {String(num).padStart(2, "0")}
      </div>
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500 mt-1">{msg}</p>;
}

function Req() {
  return <span className="text-red-500 ml-0.5">*</span>;
}

const INPUT_CLS = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 focus:border-transparent placeholder:text-gray-400";
const SELECT_CLS = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-800 cursor-pointer";
function selectCls(value: string, extra?: string) {
  return clsx(SELECT_CLS, !value && "text-gray-400", extra);
}

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [gender, setGender] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [nationality, setNationality] = useState("");
  const [occupation, setOccupation] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [japaneseLevel, setJapaneseLevel] = useState("");
  const [vietnameseLevel, setVietnameseLevel] = useState("");
  const [purposes, setPurposes] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function toggleArr(arr: string[], set: (v: string[]) => void, val: string) {
    set(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "氏名を入力してください。";
    if (!email.trim()) e.email = "メールアドレスを入力してください。";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "有効なメールアドレスを入力してください。";
    if (!password) e.password = "パスワードを入力してください。";
    else if (password.length < 8) e.password = "英数字を含む8文字以上必要です。";
    if (!gender) e.gender = "性別を選択してください。";
    if (!birthDay || !birthMonth || !birthYear) e.birthDate = "生年月日を選択してください。";
    if (!nationality) e.nationality = "国籍を選択してください。";
    if (!city) e.city = "都市を選択してください。";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    // TODO: call API POST /auth/register
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-white sticky top-0 z-10 border-b border-gray-200">
        {/* 1 - Back */}
        <Link href="/" className="flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          戻る
        </Link>
        {/* 2 - Logo */}
        <span className="text-sm font-semibold text-gray-900">Connect VN-JP</span>
        {/* 3 - Login link */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">既にアカウントをお持ちですか？</span>
          <Link href="/login" className="text-sm font-bold text-gray-900 hover:underline">
            ログイン
          </Link>
        </div>
      </header>

      {/* Card */}
      <div className="flex-1 flex justify-center px-4 py-8">
        <div className="w-full max-w-lg bg-white rounded-xl shadow-md px-10 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">アカウント作成</h1>
          <p className="text-sm text-gray-500 mb-8">
            マッチングを最適化するために、あなたについて教えてください。
          </p>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">

            {/* ① 基本情報 */}
            <section>
              <SectionHeader num={1} title="基本情報" />
              <div className="flex flex-col gap-4">

                {/* 4 - 氏名 */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    氏名<Req />
                  </label>
                  <input
                    type="text"
                    placeholder="フルネームを入力してください"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={50}
                    className={clsx(INPUT_CLS, errors.fullName && "border-red-400 bg-red-50")}
                  />
                  <FieldError msg={errors.fullName} />
                </div>

                {/* 5 & 6 - メールアドレス + 電話番号 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">
                      メールアドレス<Req />
                    </label>
                    <input
                      type="email"
                      placeholder="メールアドレスを入力"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={255}
                      className={clsx(INPUT_CLS, errors.email && "border-red-400 bg-red-50")}
                    />
                    <FieldError msg={errors.email} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">電話番号</label>
                    <input
                      type="tel"
                      placeholder="電話番号を入力"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={clsx(INPUT_CLS, errors.phone && "border-red-400 bg-red-50")}
                    />
                    <FieldError msg={errors.phone} />
                  </div>
                </div>

                {/* 7 - パスワード */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    パスワード<Req />
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="強力なパスワードを作成してください"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={clsx(INPUT_CLS, "pr-10", errors.password && "border-red-400 bg-red-50")}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">英数字を含む8文字以上</p>
                  <FieldError msg={errors.password} />
                </div>
              </div>
            </section>

            <hr className="border-t border-gray-200 -my-4" />

            {/* ② 個人詳細 */}
            <section>
              <SectionHeader num={2} title="個人詳細" />
              <div className="flex flex-col gap-4">

                {/* 8 - 性別 pill buttons */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-2 block">
                    性別<Req />
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {["男性", "女性", "その他", "回答しない"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setGender(opt)}
                        className={clsx(
                          "px-5 py-2 rounded-full text-sm border transition-all",
                          gender === opt
                            ? "text-white border-transparent"
                            : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
                        )}
                        style={gender === opt ? { backgroundColor: "#1B4332", borderColor: "#1B4332" } : undefined}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <FieldError msg={errors.gender} />
                </div>

                {/* 9 - 生年月日 */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-2 block">
                    生年月日<Req />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={birthDay}
                      onChange={(e) => setBirthDay(e.target.value)}
                      className={selectCls(birthDay, errors.birthDate ? "border-red-400" : "")}
                    >
                      <option value="">日</option>
                      {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select
                      value={birthMonth}
                      onChange={(e) => setBirthMonth(e.target.value)}
                      className={selectCls(birthMonth, errors.birthDate ? "border-red-400" : "")}
                    >
                      <option value="">月</option>
                      {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      className={selectCls(birthYear, errors.birthDate ? "border-red-400" : "")}
                    >
                      <option value="">年</option>
                      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <FieldError msg={errors.birthDate} />
                </div>

                {/* 10 - 国籍 pill buttons */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-2 block">
                    国籍<Req />
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {["ベトナム", "日本", "その他"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setNationality(opt)}
                        className={clsx(
                          "px-5 py-2 rounded-full text-sm border transition-all",
                          nationality === opt
                            ? "text-white border-transparent"
                            : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
                        )}
                        style={nationality === opt ? { backgroundColor: "#1B4332", borderColor: "#1B4332" } : undefined}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <FieldError msg={errors.nationality} />
                </div>

                {/* 11 - 職業 */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">職業</label>
                  <input
                    type="text"
                    placeholder="例: 学生、エンジニア、教師..."
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    maxLength={50}
                    className={INPUT_CLS}
                  />
                </div>
              </div>
            </section>

            <hr className="border-t border-gray-200 -my-4" />

            {/* ③ 場所 */}
            <section>
              <SectionHeader num={3} title="場所" />
              {/* 12 - 都市 + 地区 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    都市<Req />
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={selectCls(city, errors.city ? "border-red-400" : "")}
                  >
                    <option value="">都市を選択</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <FieldError msg={errors.city} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">地区</label>
                  <input
                    type="text"
                    placeholder="例: カウジャイ、ドンダ..."
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className={INPUT_CLS}
                  />
                </div>
              </div>
            </section>

            <hr className="border-t border-gray-200 -my-4" />

            {/* ④ 言語スキル */}
            <section>
              <SectionHeader num={4} title="言語スキル" />
              {/* 13 - 日本語レベル + ベトナム語レベル */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">日本語レベル</label>
                  <select
                    value={japaneseLevel}
                    onChange={(e) => setJapaneseLevel(e.target.value)}
                    className={selectCls(japaneseLevel, errors.japaneseLevel ? "border-red-400" : "")}
                  >
                    <option value="">レベルを選択</option>
                    {JAPANESE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <FieldError msg={errors.japaneseLevel} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">ベトナム語レベル</label>
                  <select
                    value={vietnameseLevel}
                    onChange={(e) => setVietnameseLevel(e.target.value)}
                    className={selectCls(vietnameseLevel, errors.vietnameseLevel ? "border-red-400" : "")}
                  >
                    <option value="">レベルを選択</option>
                    {VIETNAMESE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <FieldError msg={errors.vietnameseLevel} />
                </div>
              </div>
            </section>

            <hr className="border-t border-gray-200 -my-4" />

            {/* ⑤ 目的 */}
            <section>
              <SectionHeader num={5} title="目的" />
              {/* 14 - Purpose tags */}
              <div className="flex gap-2">
                {PURPOSES.map((p) => {
                  const active = purposes.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => toggleArr(purposes, setPurposes, p.value)}
                      className={clsx(
                        "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border transition-all whitespace-nowrap shrink-0",
                        active
                          ? "text-white border-transparent"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
                      )}
                      style={active ? { backgroundColor: "#1B4332", borderColor: "#1B4332" } : undefined}
                    >
                      {active && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                      )}
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <hr className="border-t border-gray-200 -my-4" />

            {/* ⑥ 興味 */}
            <section>
              <SectionHeader num={6} title="興味" />
              {/* 15 - Interest tags */}
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((interest) => {
                  const active = interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleArr(interests, setInterests, interest)}
                      className={clsx(
                        "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border transition-all",
                        active
                          ? "text-white border-transparent"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
                      )}
                      style={active ? { backgroundColor: "#1B4332", borderColor: "#1B4332" } : undefined}
                    >
                      {active && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                      )}
                      {interest}
                    </button>
                  );
                })}
              </div>
            </section>

            <hr className="border-t border-gray-200 -my-4" />

            {/* ⑦ 自己紹介 */}
            <section>
              <SectionHeader num={7} title="自己紹介" />
              {/* 16 - Bio */}
              <textarea
                placeholder="趣味や探しているものなど、自己紹介を書いてください..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-800 focus:border-transparent placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{bio.length}/500</p>
            </section>

            {/* 17 - Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#1B4332" }}
            >
              {loading ? "登録中..." : "登録を完了する"}
            </button>

            {/* 18 - Login link */}
            <p className="text-center text-sm text-gray-400 -mt-4 pb-4">
              既にアカウントをお持ちですか？{" "}
              <Link href="/login" className="font-bold text-gray-900 hover:underline">
                ログイン
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
