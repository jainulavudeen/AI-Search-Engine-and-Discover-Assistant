export type Category =
  | "hackathon"
  | "internship"
  | "workshop"
  | "competition"
  | "conference"
  | "scholarship";

export type Mode = "online" | "offline" | "hybrid";

export interface Opportunity {
  id: string;
  title: string;
  organizer: string;
  category: Category;
  location: string;
  mode: Mode;
  startDate: string;
  endDate?: string;
  registrationDeadline: string;
  eligibility: string;
  tags: string[];
  description: string;
  featured?: boolean;
  relevanceScore: number; // 0–100
  /** Present for backend-sourced opportunities; the 14 bundled demo entries
   *  below rely on lib/opportunityDetails.ts's per-id EXTRAS map instead. */
  registrationUrl?: string;
}

export const OPPORTUNITIES: Opportunity[] = [
  {
    id: "1",
    title: "AI Innovation Hackathon 2026",
    organizer: "IIT Madras",
    category: "hackathon",
    location: "Chennai",
    mode: "offline",
    startDate: "2026-09-14",
    endDate: "2026-09-15",
    registrationDeadline: "2026-09-10",
    eligibility: "Engineering students",
    tags: ["AI", "ML", "₹2L prize"],
    description: "Build cutting-edge AI solutions in 36 hours. Open to all engineering disciplines.",
    featured: true,
    relevanceScore: 96,
  },
  {
    id: "2",
    title: "Google Student Developer Workshop",
    organizer: "Google",
    category: "workshop",
    location: "Bangalore",
    mode: "offline",
    startDate: "2026-09-20",
    registrationDeadline: "2026-09-16",
    eligibility: "Undergraduate & Postgraduate",
    tags: ["Google Cloud", "Android", "Flutter"],
    description: "Hands-on sessions covering Google Cloud, Android Studio, and Flutter development.",
    featured: true,
    relevanceScore: 88,
  },
  {
    id: "3",
    title: "Cloud Computing Challenge",
    organizer: "AWS Educate",
    category: "competition",
    location: "Online",
    mode: "online",
    startDate: "2026-09-25",
    endDate: "2026-09-27",
    registrationDeadline: "2026-09-22",
    eligibility: "All students",
    tags: ["AWS", "Cloud", "Serverless"],
    description: "Design scalable cloud architectures and compete globally for ₹3L in prizes.",
    featured: true,
    relevanceScore: 82,
  },
  {
    id: "4",
    title: "Microsoft Intern Hiring — India",
    organizer: "Microsoft",
    category: "internship",
    location: "Hyderabad",
    mode: "hybrid",
    startDate: "2026-10-01",
    registrationDeadline: "2026-09-18",
    eligibility: "3rd & 4th year CS/IT students",
    tags: ["SDE", "Paid", "6 months"],
    description: "Software engineering internship at Microsoft India Development Center with PPO possibility.",
    featured: true,
    relevanceScore: 90,
  },
  {
    id: "5",
    title: "National Coding Championship",
    organizer: "HackerEarth",
    category: "competition",
    location: "Online",
    mode: "online",
    startDate: "2026-10-05",
    registrationDeadline: "2026-10-03",
    eligibility: "All engineering students",
    tags: ["DSA", "Algorithms", "₹5L prize"],
    description: "India's largest online coding championship with algorithmic challenges and cash prizes.",
    featured: false,
    relevanceScore: 75,
  },
  {
    id: "6",
    title: "DevFest Chennai 2026",
    organizer: "GDG Chennai",
    category: "conference",
    location: "Chennai",
    mode: "offline",
    startDate: "2026-10-12",
    registrationDeadline: "2026-10-08",
    eligibility: "Students & professionals",
    tags: ["Google", "Keynotes", "Networking"],
    description: "Annual developer festival with talks on AI, Web, and mobile technologies.",
    featured: false,
    relevanceScore: 70,
  },
  {
    id: "7",
    title: "Flipkart Grid 6.0",
    organizer: "Flipkart",
    category: "competition",
    location: "Online",
    mode: "online",
    startDate: "2026-09-28",
    endDate: "2026-10-20",
    registrationDeadline: "2026-09-25",
    eligibility: "Engineering students (CS, IT, ECE)",
    tags: ["E-commerce", "ML", "PPO offer"],
    description: "Flipkart's flagship engineering challenge. Top performers receive Pre-Placement Offers.",
    featured: false,
    relevanceScore: 85,
  },
  {
    id: "8",
    title: "AICTE Internship Scheme 2026",
    organizer: "AICTE",
    category: "internship",
    location: "Chennai",
    mode: "offline",
    startDate: "2026-10-01",
    registrationDeadline: "2026-09-20",
    eligibility: "Undergraduate (3rd year)",
    tags: ["Government", "Stipend", "8 weeks"],
    description: "Government-funded internship with AICTE-approved organizations. Stipend provided.",
    featured: false,
    relevanceScore: 78,
  },
  {
    id: "9",
    title: "Smart India Hackathon 2026",
    organizer: "Ministry of Education",
    category: "hackathon",
    location: "Chennai",
    mode: "offline",
    startDate: "2026-10-15",
    endDate: "2026-10-16",
    registrationDeadline: "2026-09-30",
    eligibility: "All undergraduate students",
    tags: ["Government", "Social Impact", "₹1L prize"],
    description: "India's biggest hackathon for solving real problems faced by government ministries.",
    featured: false,
    relevanceScore: 94,
  },
  {
    id: "10",
    title: "TechTalks India Summit",
    organizer: "NASSCOM",
    category: "conference",
    location: "Hyderabad",
    mode: "hybrid",
    startDate: "2026-10-18",
    registrationDeadline: "2026-10-14",
    eligibility: "Students & professionals",
    tags: ["Industry", "Networking", "Career"],
    description: "Premier technology summit featuring industry leaders and dedicated student career tracks.",
    featured: false,
    relevanceScore: 65,
  },
  {
    id: "11",
    title: "Adobe Women in Tech Scholarship",
    organizer: "Adobe",
    category: "scholarship",
    location: "Online",
    mode: "online",
    startDate: "2026-10-01",
    registrationDeadline: "2026-09-22",
    eligibility: "Female undergraduate CS/IT students",
    tags: ["Women in Tech", "₹50K", "Mentorship"],
    description: "Adobe's scholarship supporting women in technology with cash award and mentorship.",
    featured: false,
    relevanceScore: 72,
  },
  {
    id: "12",
    title: "Data Science Bootcamp — IIT Series",
    organizer: "Coursera × IIT Delhi",
    category: "workshop",
    location: "Online",
    mode: "online",
    startDate: "2026-09-22",
    endDate: "2026-09-24",
    registrationDeadline: "2026-09-19",
    eligibility: "All students",
    tags: ["Data Science", "Python", "Free"],
    description: "Free 3-day intensive bootcamp covering data science and ML fundamentals with IIT faculty.",
    featured: false,
    relevanceScore: 80,
  },
];

// ── Labels & styles ────────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<Category, string> = {
  hackathon: "Hackathon",
  internship: "Internship",
  workshop: "Workshop",
  competition: "Competition",
  conference: "Conference",
  scholarship: "Scholarship",
};

export const CATEGORY_BADGE_CLASS: Record<Category, string> = {
  hackathon: "badge-hackathon",
  internship: "badge-internship",
  workshop: "badge-workshop",
  competition: "badge-competition",
  conference: "badge-conference",
  scholarship: "badge-scholarship",
};

export const MODE_LABELS: Record<Mode, string> = {
  online: "Online",
  offline: "In-Person",
  hybrid: "Hybrid",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
