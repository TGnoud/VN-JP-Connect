"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { forgotPassword, resetPassword } from "@/lib/auth-api";

type Step = "email" | "reset";

function ShieldIcon({ className = "size-8" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75 5.75 6v5.25c0 4.05 2.63 7.58 6.25 8.75 3.62-1.17 6.25-4.7 6.25-8.75V6L12 3.75Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
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
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.02 7.13A6.75 6.75 0 1 0 18.75 12m0-5.25v4.5h-4.5" />
    </svg>
  );
}

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const isReset = currentStep === "reset";

  return (
    <div className="flex items-center justify-center gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-[#1B4332] text-sm font-bold text-white">1</span>
        <span className="text-sm font-bold text-gray-900">メール確認</span>
      </div>
      <div className="h-px w-12 bg-gray-200" />
      <div className="flex items-center gap-3">
        <span className={clsx("flex size-9 items-center justify-center rounded-full text-sm font-bold", isReset ? "bg-[#1B4332] text-white" : "bg-gray-100 text-gray-500")}>2</span>
        <span className={clsx("text-sm font-bold", isReset ? "text-gray-900" : "text-gray-500")}>パスワード設定</span>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  function resetCode() {
    setCode(Array(6).fill(""));
    codeRefs.current[0]?.focus();
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
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
      await forgotPassword({ email: trimmed });
      setStep("reset");
      setCountdown(180);
      window.setTimeout(() => codeRefs.current[0]?.focus(), 0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "確認コードの送信に失敗しました。",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const codeStr = code.join("");
    if (codeStr.length !== 6) {
      setError("6桁の確認コードを入力してください。");
      return;
    }

    if (newPassword.length < 8) {
      setError("新しいパスワードは8文字以上で入力してください。");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("確認用パスワードが一致しません。");
      return;
    }

    setLoading(true);
    try {
      await resetPassword({
        email: email.trim(),
        code: codeStr,
        newPassword,
      });
      router.push("/login?reset=success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const lower = message.toLowerCase();
      if (lower.includes("not registered") || lower.includes("not found")) {
        setError("このメールアドレスは登録されていません。");
      } else {
        setError(message || "パスワードの変更に失敗しました。");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setCode((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });

    if (digit && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  }

  function handleCodeKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  }

  function formatCountdown(value: number) {
    const minutes = Math.floor(value / 60);
    const seconds = String(value % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <StepIndicator currentStep={step} />

        {step === "email" ? (
          <section className="mx-auto w-full max-w-xl rounded-2xl border-2 border-[#1B4332] bg-white px-12 py-12 shadow-sm">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-[#17663A] text-white">
                <ShieldIcon />
              </div>
              <p className="mb-8 text-xl font-bold text-gray-950">VN-JP Admin</p>
              <h1 className="mb-5 text-3xl font-bold tracking-tight text-gray-950">パスワードのリセット</h1>
              <p className="mb-10 text-sm font-medium leading-7 text-gray-500">
                登録したメールアドレスを入力してください。<br />
                6桁の確認コードを送信します。
              </p>

              <form onSubmit={handleSendCode} noValidate className="w-full text-left">
                <label htmlFor="email" className="mb-3 block text-sm font-bold text-gray-950">メールアドレス</label>
                <div className="relative mb-8">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <MailIcon />
                  </span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="h-14 w-full rounded-xl border border-gray-200 bg-white pl-14 pr-4 text-base text-gray-900 outline-none transition focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/15"
                  />
                </div>

                {step === "email" && error && <p className="-mt-5 mb-5 text-sm font-medium text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="h-14 w-full rounded-xl bg-[#17663A] text-base font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-[#14532d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading && step === "email" ? "送信中..." : "確認コードを送信"}
                </button>
              </form>

              <Link href="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900">
                <span className="text-xl leading-none">←</span>
                ログイン画面に戻る
              </Link>
            </div>
          </section>
        ) : (
          <section className="mx-auto w-full max-w-xl rounded-2xl border border-gray-100 bg-white px-12 py-12 shadow-sm">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-[#9BC1AD] text-white">
                <ShieldIcon />
              </div>
              <p className="mb-8 text-xl font-bold text-gray-500">VN-JP Admin</p>
              <h2 className="mb-5 text-3xl font-bold tracking-tight text-gray-600">新しいパスワードの設定</h2>
              <p className="mb-10 text-sm font-medium leading-7 text-gray-400">
                メールで届いた確認コードと、<br />
                新しいパスワードを入力してください。
              </p>

              <form onSubmit={handleResetPassword} noValidate className="w-full text-left">
                <label className="mb-3 block text-sm font-bold text-gray-500">確認コード</label>
                <div className="mb-8 grid grid-cols-6 gap-3">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(node) => {
                        codeRefs.current[index] = node;
                      }}
                      value={digit}
                      onChange={(event) => handleCodeChange(index, event.target.value)}
                      onKeyDown={(event) => handleCodeKeyDown(index, event)}
                      inputMode="numeric"
                      maxLength={1}
                      className="h-16 rounded-xl border border-gray-200 bg-white text-center text-2xl font-bold text-gray-900 outline-none transition focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/15"
                    />
                  ))}
                </div>

                <label htmlFor="new-password" className="mb-3 block text-sm font-bold text-gray-500">新しいパスワード</label>
                <div className="relative mb-8">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                    <LockIcon />
                  </span>
                  <input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="••••••••"
                    className="h-14 w-full rounded-xl border border-gray-200 bg-white pl-14 pr-14 text-base text-gray-900 outline-none transition focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/15"
                  />
                  <button type="button" onClick={() => setShowNewPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <EyeIcon />
                  </button>
                </div>

                <label htmlFor="confirm-password" className="mb-3 block text-sm font-bold text-gray-500">新しいパスワード（確認）</label>
                <div className="relative mb-8">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                    <LockIcon />
                  </span>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                    className="h-14 w-full rounded-xl border border-gray-200 bg-white pl-14 pr-14 text-base text-gray-900 outline-none transition focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/15"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <EyeIcon />
                  </button>
                </div>

                {step === "reset" && error && <p className="-mt-4 mb-5 text-sm font-medium text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#9BC1AD] text-base font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#7dac91] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShieldIcon className="size-5" />
                  {loading && step === "reset" ? "変更中..." : "パスワードを変更"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetCode();
                    setCountdown(180);
                  }}
                  className="mx-auto mt-7 flex items-center gap-2 text-sm font-medium text-gray-400 transition hover:text-gray-600"
                >
                  <RefreshIcon />
                  {countdown > 0 ? `再送信まで ${formatCountdown(countdown)}` : "コードが届きませんか？ 再送信する"}
                </button>
              </form>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
