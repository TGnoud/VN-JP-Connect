"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearStoredUserId,
  getCurrentUser,
  logout,
  updatePresence,
} from "@/lib/auth-api";

const PRESENCE_HEARTBEAT_MS = 30 * 1000;
const FROZEN_LOGOUT_DELAY_SECONDS = 30;

export default function PresenceHeartbeat() {
  const router = useRouter();
  const blockedRef = useRef(false);
  const [frozenCountdown, setFrozenCountdown] = useState<number | null>(null);

  function startFrozenLogout() {
    if (blockedRef.current) {
      return;
    }

    blockedRef.current = true;
    setFrozenCountdown(FROZEN_LOGOUT_DELAY_SECONDS);
  }

  useEffect(() => {
    let stopped = false;

    async function sendHeartbeat() {
      if (stopped || blockedRef.current) {
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        if (stopped) {
          return;
        }

        if (currentUser.status === "frozen") {
          startFrozenLogout();
          return;
        }

        await updatePresence();
      } catch (error) {
        console.error(error);
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
      }
    }

    void sendHeartbeat();
    const intervalId = window.setInterval(() => {
      void sendHeartbeat();
    }, PRESENCE_HEARTBEAT_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (frozenCountdown === null) {
      return;
    }

    if (frozenCountdown <= 0) {
      let active = true;

      void (async () => {
        try {
          await logout();
        } catch (error) {
          console.error(error);
        } finally {
          clearStoredUserId();
          if (active) {
            router.push("/login");
          }
        }
      })();

      return () => {
        active = false;
      };
    }

    const timeoutId = window.setTimeout(() => {
      setFrozenCountdown((current) =>
        current === null ? null : Math.max(0, current - 1),
      );
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [frozenCountdown, router]);

  if (frozenCountdown === null) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 pointer-events-auto">
      <div
        className="w-full max-w-md rounded-2xl bg-white px-7 py-6 text-center shadow-2xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="frozen-account-title"
        aria-describedby="frozen-account-description"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </div>
        <h2 id="frozen-account-title" className="text-xl font-bold text-gray-900">
          アカウントが凍結されました
        </h2>
        <p id="frozen-account-description" className="mt-3 text-sm leading-6 text-gray-600">
          このアカウントは管理者により凍結されました。30秒後に自動的にログアウトします。
        </p>
        <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
          ログアウトまで {frozenCountdown} 秒
        </div>
      </div>
    </div>
  );
}
