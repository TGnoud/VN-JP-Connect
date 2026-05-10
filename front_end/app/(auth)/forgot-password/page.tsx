"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type Step = "request" | "otp" | "new-password";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startCountdown() {
    setCountdown(180);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!identifier.trim()) errs.identifier = "Vui lòng nhập email hoặc số điện thoại.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    setStep("otp");
    startCountdown();
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!otp.trim()) errs.otp = "Vui lòng nhập mã OTP.";
    else if (!/^\d{6}$/.test(otp)) errs.otp = "Mã OTP phải gồm đúng 6 chữ số.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    setStep("new-password");
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!newPassword) errs.newPassword = "Vui lòng nhập mật khẩu mới.";
    else if (newPassword.length < 8) errs.newPassword = "Mật khẩu phải có ít nhất 8 ký tự.";
    else if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword))
      errs.newPassword = "Mật khẩu phải chứa ít nhất 1 chữ cái và 1 số.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    router.push("/login");
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-8 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Quay lại đăng nhập
        </Link>

        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-full bg-rose-600 flex items-center justify-center text-white font-bold">VJ</div>
          <span className="font-bold text-lg text-slate-900">VN-JP Connect</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">Quên mật khẩu</h1>
        <p className="text-sm text-slate-500 mb-8">
          {step === "request" && "Nhập email hoặc số điện thoại để nhận mã OTP."}
          {step === "otp" && `Nhập mã OTP đã gửi đến ${identifier}.`}
          {step === "new-password" && "Tạo mật khẩu mới cho tài khoản của bạn."}
        </p>

        {step === "request" && (
          <form onSubmit={handleRequestOtp} noValidate className="flex flex-col gap-4">
            <Input
              id="identifier"
              label="Email hoặc số điện thoại"
              type="text"
              placeholder="name@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              error={errors.identifier}
            />
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? "Đang gửi..." : "Gửi mã OTP"}
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} noValidate className="flex flex-col gap-4">
            <Input
              id="otp"
              label="Mã OTP (6 chữ số)"
              type="text"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              error={errors.otp}
            />
            {countdown > 0 ? (
              <p className="text-sm text-slate-500 text-center">
                Mã hết hạn sau{" "}
                <span className="font-semibold text-rose-600">{formatTime(countdown)}</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => { startCountdown(); }}
                className="text-sm text-rose-600 font-medium text-center hover:underline"
              >
                Gửi lại mã OTP
              </button>
            )}
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? "Đang xác thực..." : "Xác nhận OTP"}
            </Button>
          </form>
        )}

        {step === "new-password" && (
          <form onSubmit={handleResetPassword} noValidate className="flex flex-col gap-4">
            <Input
              id="newPassword"
              label="Mật khẩu mới"
              type="password"
              placeholder="Tối thiểu 8 ký tự, có chữ và số"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={errors.newPassword}
            />
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
