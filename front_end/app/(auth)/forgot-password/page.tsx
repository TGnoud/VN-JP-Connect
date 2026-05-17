"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  completePasswordReset,
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
} from "@/lib/auth-api";

/** Two-pane layout: メール確認 → パスワード設定（OTP + 新パスワードは同一画面） */
type Step = "email" | "reset";

const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const PW_COMPLEXITY_JA =
  "パスワードは8文字以上で、英大文字・英小文字・数字をそれぞれ1文字以上含めてください。";

function ShieldIcon({ className = "size-8" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75 5.75 6v5.25c0 4.05 2.63 7.58 6.25 8.75 3.62-1.17 6.25-4.7 6.25-8.75V6L12 3.75Z" />
    </svg>
  );
}

function MailIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 7.5v9a2.25 2.25 0 0 1-2.25 2.25h-15A2.25 2.25 0 0 1 2.25 16.5v-9m19.5 0A2.25 2.25 0 0 0 19.5 5.25h-15A2.25 2.25 0 0 0 2.25 7.5m19.5 0-8.57 5.27a2.25 2.25 0 0 1-2.36 0L2.25 7.5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7.5a4.5 4.5 0 0 0-9 0v3m-.75 0h10.5A2.25 2.25 0 0 1 19.5 12.75v5.25a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 18v-5.25A2.25 2.25 0 0 1 6.75 10.5Z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4 fill-none stroke-currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.02 7.13A6.75 6.75 0 1 0 18.75 12m0-5.25v4.5h-4.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const isReset = currentStep === "reset";
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#1B4332] text-white">
          {isReset ? <CheckIcon /> : <span className="text-sm font-bold">1</span>}
        </span>
        <span className="text-sm font-semibold text-gray-700">メール確認</span>
      </div>
      <div className="w-14 h-px bg-gray-300" />
      <div className="flex items-center gap-2.5">
        <span
          className="flex size-8 items-center justify-center rounded-full text-sm font-bold"
          style={isReset ? { backgroundColor: "#1B4332", color: "white" } : { backgroundColor: "#e5e7eb", color: "#9ca3af" }}
        >
          2
        </span>
        <span className={`text-sm font-semibold ${isReset ? "text-gray-900" : "text-gray-400"}`}>
          パスワード設定
        </span>
      </div>
    </div>
  );
}

function AppLogo({ muted = false }: { muted?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 mb-6">
      <div
        className={`flex size-16 items-center justify-center rounded-2xl text-white transition ${
          muted ? "bg-[#9BC1AD]" : "bg-[#1B4332]"
        }`}
      >
        <ShieldIcon />
      </div>
      <p className={`text-base font-bold ${muted ? "text-gray-400" : "text-gray-900"}`}>VN-JP Admin</p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(() => Array(6).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  function resetDigits() {
    setCode(Array(6).fill(""));
    window.setTimeout(() => codeRefs.current[0]?.focus(), 0);
  }

  async function dispatchSendCode() {
    setError("");
    const trimmed = email.trim();
    if (!trimmed) {
      setError("メールアドレスを入力してください。");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("有効なメールアドレスを入力してください。");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetOtp({ email: trimmed });
      setStep("reset");
      resetDigits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "確認コードの送信に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    await dispatchSendCode();
  }

  /**
   * UI は1フォーム；API は verify（OTP消費・resetToken発行）→ complete の順で不変。
   */
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const codeStr = code.join("");
    if (codeStr.length !== 6) {
      setError("6桁の確認コードを入力してください。");
      return;
    }
    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      setError(PW_COMPLEXITY_JA);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("確認用パスワードが一致しません。");
      return;
    }

    setLoading(true);
    try {
      const verified = await verifyPasswordResetOtp({
        email: email.trim(),
        otp: codeStr,
      });
      await completePasswordReset({
        email: email.trim(),
        resetToken: verified.resetToken,
        newPassword,
      });
      router.push("/login?reset=success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "パスワードの変更に失敗しました。",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setCode((curr) => {
      const next = [...curr];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) codeRefs.current[index + 1]?.focus();
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  }

  const inputBase =
    "h-14 w-full rounded-xl border border-gray-200 bg-white text-base text-gray-900 outline-none transition focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/15";

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <StepIndicator currentStep={step} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
          {/* 左：メール */}
          <section
            className="relative rounded-2xl bg-white px-10 py-10 shadow-sm transition-all"
            style={{
              border: step === "email" ? "2px solid #1B4332" : "1px solid #e5e7eb",
              opacity: step === "reset" ? 0.75 : 1,
            }}
          >
            {step === "reset" ? (
              <div className="absolute top-4 right-4 flex items-center gap-1 text-xs font-semibold text-[#1B4332]">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                完了
              </div>
            ) : null}

            <div className="flex flex-col items-center text-center">
              <AppLogo muted={step === "reset"} />
              <h1 className="mb-3 text-2xl font-bold text-gray-900">パスワードのリセット</h1>
              <p className="mb-8 text-sm leading-6 text-gray-500">
                登録したメールアドレスを入力してください。
                <br />
                6桁の確認コードを送信します。
              </p>

              <form onSubmit={handleSendCode} noValidate className="w-full text-left">
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">
                  メールアドレス
                </label>
                <div className="relative mb-6">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <MailIcon />
                  </span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={step === "reset"}
                    placeholder="admin@example.com"
                    className={`${inputBase} pl-12 pr-4 ${step === "reset" ? "bg-gray-50 text-gray-400" : ""}`}
                  />
                </div>
                {step === "email" && error ? (
                  <p className="-mt-3 mb-4 text-sm text-red-500">{error}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={loading || step === "reset"}
                  className="h-14 w-full rounded-xl text-base font-bold text-white transition disabled:cursor-default"
                  style={{ backgroundColor: step === "reset" ? "#9BC1AD" : "#1B4332" }}
                >
                  {loading && step === "email" ? "送信中..." : "確認コードを送信"}
                </button>
              </form>

              <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-800">
                <span>←</span> ログイン画面に戻る
              </Link>
            </div>
          </section>

          {/* 右：確認コード + 新パスワード（同一フォーム） */}
          <section
            className="rounded-2xl bg-white px-10 py-10 shadow-sm transition-all"
            style={{
              border: step === "reset" ? "2px solid #1B4332" : "1px solid #e5e7eb",
              opacity: step === "email" ? 0.5 : 1,
              pointerEvents: step === "email" ? "none" : "auto",
            }}
          >
            <div className="flex flex-col items-center text-center">
              <AppLogo muted={step === "email"} />
              <h2 className="mb-3 text-2xl font-bold text-gray-900">新しいパスワードの設定</h2>
              <p className="mb-4 text-sm leading-6 text-gray-500">
                メールで届いた確認コードと、
                <br />
                新しいパスワードを入力してください。
              </p>
              <div className="mb-6 flex items-center gap-2 rounded-full bg-gray-100 px-4 py-1.5 text-sm text-gray-600">
                <MailIcon className="size-4" />
                {email || "—"}
              </div>

              <form onSubmit={handleResetPassword} noValidate className="w-full text-left">
                <label className="mb-2 block text-sm font-semibold text-gray-700">確認コード</label>
                <div className="mb-6 grid grid-cols-6 gap-2">
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={(node) => {
                        codeRefs.current[i] = node;
                      }}
                      value={digit}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      disabled={step === "email"}
                      className="h-14 rounded-xl border border-gray-200 bg-white text-center text-2xl font-bold text-gray-900 outline-none transition focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/15 disabled:bg-gray-50 disabled:text-gray-300"
                    />
                  ))}
                </div>

                <label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-gray-700">
                  新しいパスワード
                </label>
                <div className="relative mb-5">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <LockIcon />
                  </span>
                  <input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={step === "email"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={`${inputBase} pl-12 pr-12 ${step === "email" ? "bg-gray-50" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    tabIndex={-1}
                  >
                    <EyeIcon />
                  </button>
                </div>

                <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-gray-700">
                  新しいパスワード（確認）
                </label>
                <div className="relative mb-6">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <LockIcon />
                  </span>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={step === "email"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={`${inputBase} pl-12 pr-12 ${step === "email" ? "bg-gray-50" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    tabIndex={-1}
                  >
                    <EyeIcon />
                  </button>
                </div>

                {step === "reset" && error ? (
                  <p className="-mt-2 mb-4 text-sm text-red-500">{error}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || step === "email"}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#1B4332] text-base font-bold text-white transition hover:bg-[#14532d] disabled:opacity-60"
                >
                  <ShieldIcon className="size-5" />
                  {loading ? "変更中..." : "パスワードを変更"}
                </button>

                <div className="mt-5 text-center">
                  {step === "reset" ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetDigits();
                        setError("");
                        void dispatchSendCode();
                      }}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1B4332] hover:underline"
                    >
                      <RefreshIcon />
                      コードが届きませんか？ 再送信する
                    </button>
                  ) : null}
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
