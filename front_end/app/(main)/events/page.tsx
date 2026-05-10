"use client";

import { useState } from "react";
import { MOCK_EVENTS } from "@/lib/mock-data";
import type { Event } from "@/types";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

interface EventCardProps {
  event: Event;
  onToggleInterest: (id: string) => void;
}

function EventCard({ event, onToggleInterest }: EventCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Image placeholder */}
      <div className="h-36 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <span className="text-5xl">🎌</span>
      </div>

      <div className="p-5">
        <h3 className="text-base font-bold text-gray-900 mb-1">{event.title}</h3>
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{event.description}</p>

        {/* Meta */}
        <div className="flex flex-col gap-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
            </svg>
            {formatDate(event.date)} {formatTime(event.date)}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 15.327 17 12.993 17 10a7 7 0 10-14 0c0 2.993 1.698 5.327 3.354 6.985a21.485 21.485 0 002.273 1.765 11.44 11.44 0 00.757.433 5.741 5.741 0 00.28.14l.019.008.006.002zM10 11.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z" clipRule="evenodd" />
            </svg>
            {event.location}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {event.interestedCount}人が興味あり
          </span>
          <button
            onClick={() => onToggleInterest(event.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={event.isInterested
              ? { backgroundColor: "#1B4332", color: "white" }
              : { backgroundColor: "transparent", color: "#1B4332", border: "1.5px solid #1B4332" }
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill={event.isInterested ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            {event.isInterested ? "興味あり ✓" : "興味あり"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);

  function handleToggleInterest(id: string) {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, isInterested: !e.isInterested, interestedCount: e.interestedCount + (e.isInterested ? -1 : 1) }
          : e
      )
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      {/* Top bar */}
      <div className="px-8 py-4 bg-white border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">イベント</h1>
        <p className="text-sm text-gray-500 mt-0.5">ベトナム・日本文化交流イベント</p>
      </div>

      {/* Event grid */}
      <div className="p-8">
        {events.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-center">
            <div>
              <p className="text-4xl mb-3">📅</p>
              <p className="text-gray-500 text-sm">現在イベントはありません</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onToggleInterest={handleToggleInterest}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
