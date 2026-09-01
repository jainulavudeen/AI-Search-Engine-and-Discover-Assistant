/**
 * Adapter utilities to convert between the backend's ApiOpportunity (Prisma
 * enum casing: HACKATHON, ONLINE) and the frontend's Opportunity type
 * (lowercase: hackathon, online) used by OpportunityCard and filters.
 */

import type { ApiOpportunity } from "./api";
import type { Opportunity, Category, Mode } from "./mockData";

const CAT_MAP: Record<string, Category> = {
  HACKATHON: "hackathon",
  INTERNSHIP: "internship",
  WORKSHOP: "workshop",
  COMPETITION: "competition",
  CONFERENCE: "conference",
  SCHOLARSHIP: "scholarship",
};

const MODE_MAP: Record<string, Mode> = {
  ONLINE: "online",
  OFFLINE: "offline",
  HYBRID: "hybrid",
};

export function adaptApiOpportunity(a: ApiOpportunity): Opportunity {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    category: (CAT_MAP[a.category] ?? "hackathon") as Category,
    location: a.location,
    mode: (MODE_MAP[a.mode] ?? "offline") as Mode,
    startDate: a.startDate.slice(0, 10),
    endDate: a.endDate ? a.endDate.slice(0, 10) : undefined,
    registrationDeadline: a.registrationDeadline.slice(0, 10),
    organizer: a.organizer,
    eligibility: a.eligibility,
    tags: a.tags,
    featured: a.featured,
    relevanceScore: a.relevanceScore,
    registrationUrl: a.registrationUrl,
  };
}

export function adaptApiOpportunities(list: ApiOpportunity[]): Opportunity[] {
  return list.map(adaptApiOpportunity);
}
