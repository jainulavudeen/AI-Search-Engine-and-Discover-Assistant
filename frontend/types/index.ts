// Shared TypeScript types for the frontend application

export type OpportunityCategory =
  | "hackathon"
  | "internship"
  | "competition"
  | "workshop"
  | "conference"
  | "scholarship"
  | "student-program"
  | "tech-event";

export interface Opportunity {
  id: string;
  title: string;
  category: OpportunityCategory;
  description: string;
  location: string;
  startDate: string;
  endDate?: string;
  eligibility: string[];
  tags: string[];
  url: string;
  createdAt: string;
}

export interface SearchQuery {
  query: string;
  category?: OpportunityCategory;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  studentType?: string;
}

export interface ApiStatus {
  connected: boolean;
  service?: string;
  version?: string;
  environment?: string;
}
