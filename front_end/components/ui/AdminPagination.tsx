"use client";

import { useMemo, useState } from "react";

type PageItem = number | "ellipsis-left" | "ellipsis-right";

type AdminPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  label?: string;
};

function clampPage(value: number, totalPages: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(1, Math.trunc(value)), Math.max(1, totalPages));
}

function getPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-right", totalPages];
  }

  if (page >= totalPages - 3) {
    return [1, "ellipsis-left", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis-left", page - 1, page, page + 1, "ellipsis-right", totalPages];
}

export default function AdminPagination({
  page,
  totalPages,
  onPageChange,
  className = "",
  label,
}: AdminPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = clampPage(page, safeTotalPages);
  const [inputValue, setInputValue] = useState("");
  const pageItems = useMemo(
    () => getPageItems(safePage, safeTotalPages),
    [safePage, safeTotalPages],
  );

  if (safeTotalPages <= 1) {
    return null;
  }

  function goToPage(nextPage: number) {
    setInputValue("");
    onPageChange(clampPage(nextPage, safeTotalPages));
  }

  function submitInput() {
    if (!inputValue.trim()) return;
    goToPage(Number(inputValue));
  }

  return (
    <div className={`flex flex-wrap items-center justify-end gap-2 ${className}`}>
      {label && <span className="mr-auto text-sm text-gray-400">{label}</span>}

      <button
        type="button"
        onClick={() => goToPage(safePage - 1)}
        disabled={safePage === 1}
        className="w-10 h-10 rounded-xl border border-gray-100 bg-white flex items-center justify-center text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {pageItems.map((item) => (
        typeof item === "number" ? (
          <button
            key={item}
            type="button"
            onClick={() => goToPage(item)}
            className="w-10 h-10 rounded-xl border text-sm font-semibold transition-colors"
            style={
              item === safePage
                ? { backgroundColor: "#1B4332", borderColor: "#1B4332", color: "#ffffff" }
                : { backgroundColor: "#ffffff", borderColor: "#f3f4f6", color: "#6b7280" }
            }
            aria-current={item === safePage ? "page" : undefined}
          >
            {item}
          </button>
        ) : (
          <span key={item} className="w-8 text-center text-sm font-semibold text-gray-400">
            ...
          </span>
        )
      ))}

      <button
        type="button"
        onClick={() => goToPage(safePage + 1)}
        disabled={safePage === safeTotalPages}
        className="w-10 h-10 rounded-xl border border-gray-100 bg-white flex items-center justify-center text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      <div className="flex h-10 overflow-hidden rounded-xl border border-gray-100 bg-white">
        <input
          type="number"
          min={1}
          max={safeTotalPages}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submitInput();
          }}
          placeholder="Trang..."
          className="w-28 px-3 text-sm text-gray-600 outline-none placeholder:text-gray-400"
          aria-label="Go to page"
        />
        <button
          type="button"
          onClick={submitInput}
          className="w-11 border-l border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
          aria-label="Go"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>

      <span className="h-10 min-w-20 rounded-xl border border-gray-100 bg-white px-4 flex items-center justify-center text-sm font-medium text-gray-500">
        {safePage} / {safeTotalPages}
      </span>
    </div>
  );
}
