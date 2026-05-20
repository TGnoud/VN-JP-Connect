"use client";

import { useEffect } from "react";
import { updatePresence } from "@/lib/auth-api";

const PRESENCE_HEARTBEAT_MS = 30 * 1000;

export default function PresenceHeartbeat() {
  useEffect(() => {
    let stopped = false;

    function sendHeartbeat() {
      if (stopped) {
        return;
      }

      void updatePresence().catch((error) => {
        console.error(error);
      });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    }

    sendHeartbeat();
    const intervalId = window.setInterval(sendHeartbeat, PRESENCE_HEARTBEAT_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
