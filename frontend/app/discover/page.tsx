import { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DiscoverClient from "./DiscoverClient";
import CardSkeleton from "@/components/discover/CardSkeleton";

export const metadata: Metadata = {
  title: "Discover Opportunities — CampusFind AI",
  description: "Search hackathons, internships, workshops, and student opportunities using AI-powered natural language search.",
};

/** Shown while the client component hydrates (SSR Suspense boundary) */
function DiscoverLoadingFallback() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Search bar skeleton */}
      <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar skeleton */}
          <aside className="hidden lg:block w-52 flex-shrink-0">
            <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-3.5 bg-slate-100 rounded w-3/4" />
              ))}
            </div>
          </aside>

          {/* Cards skeleton */}
          <div className="flex-1 min-w-0">
            <div className="h-8 w-48 bg-slate-100 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/30">
      <Navbar />
      <Suspense fallback={<DiscoverLoadingFallback />}>
        <DiscoverClient />
      </Suspense>
      <Footer />
    </div>
  );
}
