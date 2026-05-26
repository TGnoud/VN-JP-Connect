"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearStoredUserId, getCurrentUser, getStoredUserId } from "@/lib/auth-api";

export default function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    const userId = getStoredUserId();

    if (!userId) {
      router.replace("/login");
      return;
    }

    getCurrentUser()
      .then((user) => {
        if (!active) return;

        if (user.status !== "active") {
          clearStoredUserId();
          router.replace("/login");
          return;
        }

        if (user.role !== "admin") {
          router.replace("/profile");
          return;
        }

        setAllowed(true);
      })
      .catch(() => {
        if (!active) return;
        clearStoredUserId();
        router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (!allowed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">
        Checking admin access...
      </div>
    );
  }

  return <>{children}</>;
}
