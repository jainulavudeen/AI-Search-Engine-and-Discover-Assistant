"use client";

import type { Category, Mode } from "@/lib/mockData";
import { CATEGORY_LABELS } from "@/lib/mockData";
import type { FilterState } from "@/lib/filters";
import { DEFAULT_FILTERS, hasActiveFilters } from "@/lib/filters";

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}

const CATEGORIES: Category[] = [
  "hackathon", "internship", "workshop", "competition", "conference", "scholarship",
];
const LOCATIONS = ["Chennai", "Bangalore", "Hyderabad", "Mumbai", "Delhi", "Pune", "Online", "Other"];
const ELIGIBILITY_OPTIONS = [
  "Engineering Students", "Undergraduate", "Postgraduate", "All Students",
];
const DATE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "next_month", label: "Next month" },
];
const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "offline", label: "In-Person" },
  { value: "hybrid", label: "Hybrid" },
];
const DOMAIN_OPTIONS = [
  "AI", "Machine Learning", "Web Development", "Cloud", "Cybersecurity", "Data Science", "IoT", "Other",
];
const REGISTRATION_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-4 border-b border-slate-100 last:border-0">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function CheckItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 py-0.5 cursor-pointer group select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
      />
      <span className="text-[13px] text-slate-600 group-hover:text-slate-900 transition-colors">
        {label}
      </span>
    </label>
  );
}

export default function FilterPanel({ filters, onChange }: Props) {
  function toggleArr<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  return (
    <div className="w-full">
      {/* Header row */}
      <div className="flex items-center justify-between py-2 mb-1">
        <p className="text-[13px] font-semibold text-slate-900">Filters</p>
        {hasActiveFilters(filters) && (
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="text-[12px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Category */}
      <FilterSection title="Category">
        <div className="flex flex-col gap-1">
          {CATEGORIES.map((cat) => (
            <CheckItem
              key={cat}
              label={CATEGORY_LABELS[cat]}
              checked={filters.categories.includes(cat)}
              onChange={() =>
                onChange({ ...filters, categories: toggleArr(filters.categories, cat) })
              }
            />
          ))}
        </div>
      </FilterSection>

      {/* Location */}
      <FilterSection title="Location">
        <div className="flex flex-col gap-1">
          {LOCATIONS.map((loc) => (
            <CheckItem
              key={loc}
              label={loc}
              checked={filters.locations.includes(loc)}
              onChange={() =>
                onChange({ ...filters, locations: toggleArr(filters.locations, loc) })
              }
            />
          ))}
        </div>
      </FilterSection>

      {/* Eligibility */}
      <FilterSection title="Eligibility">
        <div className="flex flex-col gap-1">
          {ELIGIBILITY_OPTIONS.map((e) => (
            <CheckItem
              key={e}
              label={e}
              checked={filters.eligibility.includes(e)}
              onChange={() =>
                onChange({ ...filters, eligibility: toggleArr(filters.eligibility, e) })
              }
            />
          ))}
        </div>
      </FilterSection>

      {/* Date */}
      <FilterSection title="Date">
        <div className="flex flex-col gap-1">
          {DATE_OPTIONS.map(({ value, label }) => (
            <label
              key={value}
              className="flex items-center gap-2.5 py-0.5 cursor-pointer group select-none"
            >
              <input
                type="radio"
                name="date-filter"
                checked={filters.date === value}
                onChange={() =>
                  onChange({ ...filters, date: filters.date === value ? "" : value })
                }
                className="w-3.5 h-3.5 border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-[13px] text-slate-600 group-hover:text-slate-900 transition-colors">
                {label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Mode */}
      <FilterSection title="Mode">
        <div className="flex flex-col gap-1">
          {MODE_OPTIONS.map(({ value, label }) => (
            <CheckItem
              key={value}
              label={label}
              checked={filters.modes.includes(value)}
              onChange={() =>
                onChange({ ...filters, modes: toggleArr(filters.modes, value) })
              }
            />
          ))}
        </div>
      </FilterSection>

      {/* Domain */}
      <FilterSection title="Domain">
        <div className="flex flex-col gap-1">
          {DOMAIN_OPTIONS.map((d) => (
            <label key={d} className="flex items-center gap-2.5 py-0.5 cursor-pointer group select-none">
              <input
                type="radio"
                name="domain-filter"
                checked={filters.domain === d}
                onChange={() => onChange({ ...filters, domain: filters.domain === d ? "" : d })}
                className="w-3.5 h-3.5 border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-[13px] text-slate-600 group-hover:text-slate-900 transition-colors">
                {d}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Registration */}
      <FilterSection title="Registration">
        <div className="flex flex-col gap-1">
          {REGISTRATION_OPTIONS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2.5 py-0.5 cursor-pointer group select-none">
              <input
                type="radio"
                name="registration-filter"
                checked={filters.registration === value}
                onChange={() =>
                  onChange({ ...filters, registration: filters.registration === value ? "" : value })
                }
                className="w-3.5 h-3.5 border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-[13px] text-slate-600 group-hover:text-slate-900 transition-colors">
                {label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}
