"use client";

import { useState, useEffect, useCallback } from "react";
import {
  addBookmark,
  removeBookmark,
  fetchBookmarkIds,
} from "@/lib/api";

interface BookmarkButtonProps {
  opportunityId: string;
  /** If true, show a larger, pill-shaped button with text */
  variant?: "icon" | "pill";
  className?: string;
}

/**
 * BookmarkButton — persists bookmark state to PostgreSQL via the backend API.
 *
 * - Optimistic UI: toggles immediately, then syncs with server
 * - Auto-loads the initial state from /api/bookmarks/ids on mount
 * - Works silently if not logged in (no-op)
 */
export default function BookmarkButton({
  opportunityId,
  variant = "icon",
  className = "",
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Load initial bookmark state
  useEffect(() => {
    fetchBookmarkIds()
      .then((ids) => {
        if (ids) setIsBookmarked(ids.includes(opportunityId));
      })
      .finally(() => setInitialized(true));
  }, [opportunityId]);

  const toggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault(); // prevent card link navigation
      e.stopPropagation();

      if (isLoading) return;

      // Optimistic update
      const next = !isBookmarked;
      setIsBookmarked(next);
      setIsLoading(true);

      try {
        if (next) {
          await addBookmark(opportunityId);
        } else {
          await removeBookmark(opportunityId);
        }
      } catch {
        // Revert on failure
        setIsBookmarked(!next);
      } finally {
        setIsLoading(false);
      }
    },
    [isBookmarked, isLoading, opportunityId]
  );

  if (!initialized) {
    if (variant === "pill") {
      return (
        <div className={`h-9 w-28 bg-slate-100 rounded-lg animate-pulse ${className}`} />
      );
    }
    return (
      <div className={`w-8 h-8 bg-slate-100 rounded-full animate-pulse ${className}`} />
    );
  }

  if (variant === "pill") {
    return (
      <button
        id={`bookmark-btn-${opportunityId}`}
        onClick={toggle}
        disabled={isLoading}
        aria-label={isBookmarked ? "Remove bookmark" : "Save opportunity"}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold border transition-all
          ${isBookmarked
            ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200"
            : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:text-indigo-700"
          } ${isLoading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"} ${className}`}
      >
        <BookmarkIcon filled={isBookmarked} />
        {isBookmarked ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      id={`bookmark-icon-${opportunityId}`}
      onClick={toggle}
      disabled={isLoading}
      aria-label={isBookmarked ? "Remove bookmark" : "Save opportunity"}
      className={`group w-8 h-8 flex items-center justify-center rounded-full border transition-all
        ${isBookmarked
          ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700"
          : "bg-white border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-600"
        } ${isLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${className}`}
    >
      <BookmarkIcon filled={isBookmarked} className="w-3.5 h-3.5" />
    </button>
  );
}

function BookmarkIcon({
  filled,
  className = "w-4 h-4",
}: {
  filled: boolean;
  className?: string;
}) {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
      />
    </svg>
  );
}
