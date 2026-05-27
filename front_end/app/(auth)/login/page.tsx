"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentUser, login, setStoredUserId } from "@/lib/auth-api";

interface FormErrors {
  identifier?: string;
  password?: string;
  submit?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const e: FormErrors = {};
    if (!identifier.trim()) e.identifier = "メールアドレスまたは電話番号を入力してください。";
    if (!password) e.password = "パスワードを入力してください。";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    try {
      const response = await login({
        identifier: identifier.trim(),
        password,
      });
      setStoredUserId(response.userId);
      const currentUser = await getCurrentUser();
      router.push(currentUser.role === "admin" ? "/admin" : "/profile");
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : "ログインに失敗しました。";
      const lower = rawMessage.toLowerCase();

      if (lower.includes("invalid credentials")) {
        setErrors({
          submit:
            "メールアドレス（または電話番号）もしくはパスワードが正しくありません。",
        });
      } else if (lower.includes("account is frozen")) {
        setErrors({
          submit: "このアカウントは凍結されています。管理者にお問い合わせください。",
        });
      } else if (
        lower.includes("identifier") ||
        (lower.includes("email") && lower.includes("valid"))
      ) {
        setErrors({
          identifier: "メールアドレスまたは電話番号の形式が正しくありません。",
        });
      } else {
        setErrors({ submit: rawMessage });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-gray-100">
        {/* 1 - Back */}
        <Link href="/" className="flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          戻る
        </Link>
        {/* 2, 3 - Register link */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">初めてですか？</span>
          <Link href="/register" className="text-sm font-bold text-gray-900 hover:underline">
            新規登録
          </Link>
        </div>
      </header>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-xl shadow-md px-10 py-10">
          {/* Logo text */}
          <p className="text-center text-sm text-gray-500 mb-2">VN-JP Connect</p>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
            お帰りなさい
          </h1>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {/* 4 - Email / Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                メールアドレスまたは電話番号
              </label>
              <input
                type="text"
                placeholder="name@example.com または 09012345678"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-800 focus:border-transparent placeholder:text-gray-400"
              />
              {errors.identifier && (
                <p className="text-xs text-red-500">{errors.identifier}</p>
              )}
            </div>

            {/* 5 - Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">パスワード</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="パスワードを入力してください"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-4 py-2.5 text-sm pr-11 focus:outline-none focus:ring-2 focus:ring-green-800 focus:border-transparent placeholder:text-gray-400"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password}</p>
              )}
            </div>

            {/* 6 - Login button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              style={{ backgroundColor: "#1B4332" }}
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
            {errors.submit && (
              <p className="text-xs text-red-500 text-center">{errors.submit}</p>
            )}
          </form>

          {/* 7 - Forgot password */}
          <div className="text-center mt-4">
            <Link href="/forgot-password" className="text-sm text-gray-500 hover:text-gray-700">
              パスワードを忘れましたか？
            </Link>
          </div>

          {/* Divider */}
          <hr className="border-t border-gray-300 mt-6 mx-2" />

          {/* 8 - Register link */}
          <p className="text-center text-sm text-gray-600 mt-6">
            アカウントをお持ちでないですか？{" "}
            <Link href="/register" className="font-bold text-gray-900 hover:underline">
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
