import type { Opportunity } from "./mockData";

export interface GainItem {
  icon: string;
  title: string;
  desc: string;
}

export interface TimelineItem {
  label: string;
  date: string;
  highlight?: boolean; // e.g. deadline
}

export interface OpportunityExtra {
  detailedDescription: string;
  eligibilityDetails: string[];
  gains: GainItem[];
  skills: string[];
  teamSize?: string;
  registrationUrl: string;
  aiMatchReasons: string[];
  timeline: TimelineItem[];
}

// ── Detailed data for each opportunity ────────────────────────────────────────

const EXTRAS: Record<string, OpportunityExtra> = {
  "1": {
    detailedDescription:
      "The AI Innovation Hackathon 2026, organised by IIT Madras, is one of India's premier student hackathons focused on artificial intelligence and machine learning. Over 36 intensive hours, teams will ideate, prototype, and present AI-powered solutions to real-world problems across healthcare, education, agriculture, and smart cities. Industry mentors from Google, Microsoft, and NVIDIA will guide participants throughout the event. Top teams win cash prizes and receive fast-track internship opportunities at partner organisations. This is your chance to build something that matters.",
    eligibilityDetails: [
      "Currently enrolled in a B.E. / B.Tech or M.E. / M.Tech programme",
      "Students from any recognised college or university across India",
      "Any engineering discipline — CS, IT, ECE, EEE, Mechanical, and more",
      "Team size: 2–4 members (solo participation not allowed)",
      "No prior hackathon experience required",
    ],
    gains: [
      { icon: "🧠", title: "Build real AI projects", desc: "Work on AI/ML solutions with guidance from industry mentors." },
      { icon: "🤝", title: "Network with professionals", desc: "Connect with recruiters and engineers from top tech companies." },
      { icon: "🏆", title: "Win ₹2 lakh prize pool", desc: "Cash prizes across multiple tracks and a special AI innovation award." },
      { icon: "🎓", title: "Certificate of excellence", desc: "Participation and winner certificates from IIT Madras." },
      { icon: "💼", title: "Internship opportunities", desc: "Top teams get fast-tracked interviews at partner companies." },
    ],
    skills: ["Artificial Intelligence", "Machine Learning", "Python", "Generative AI", "Cloud Computing", "Data Science"],
    teamSize: "2–4 members",
    registrationUrl: "https://example.com/register/ai-innovation-hackathon-2026",
    aiMatchReasons: [
      "Matches your interest in AI and machine learning technologies",
      "Located in Chennai — your preferred location",
      "Open to engineering students at all year levels",
    ],
    timeline: [
      { label: "Registrations open", date: "2026-08-20" },
      { label: "Registration deadline", date: "2026-09-10", highlight: true },
      { label: "Team finalisation", date: "2026-09-12" },
      { label: "Event begins", date: "2026-09-14" },
      { label: "Final presentations", date: "2026-09-15" },
    ],
  },
  "2": {
    detailedDescription:
      "The Google Student Developer Workshop is a full-day, hands-on learning experience organised by Google in Bangalore. Participants will attend technical sessions on Google Cloud Platform, Android development with Jetpack Compose, and cross-platform apps with Flutter. Google engineers lead every session, and participants leave with project samples, cloud credits, and direct access to the GDG community. Limited seats ensure a high-quality, interactive experience.",
    eligibilityDetails: [
      "Undergraduate (B.E./B.Tech) or Postgraduate (M.E./M.Tech/MBA) students",
      "Basic programming knowledge in any language",
      "Students from any stream — CS, IT, or non-technical",
      "Individual participation (no team formation needed)",
    ],
    gains: [
      { icon: "☁️", title: "Google Cloud credits", desc: "Each participant receives $200 in Google Cloud credits to continue learning." },
      { icon: "📱", title: "Real Android project", desc: "Build and take home a fully functional Android or Flutter app." },
      { icon: "🎓", title: "Google certificate", desc: "Earn an official certificate of participation from Google." },
      { icon: "🤝", title: "GDG community access", desc: "Join the Google Developer Group and connect with 5000+ developers." },
    ],
    skills: ["Google Cloud", "Android", "Flutter", "Kotlin", "Dart", "Firebase"],
    registrationUrl: "https://example.com/register/google-student-workshop",
    aiMatchReasons: [
      "Matches your interest in mobile and cloud development",
      "Bangalore event with hybrid learning resources available",
      "Open to all undergraduate and postgraduate students",
    ],
    timeline: [
      { label: "Registration opens", date: "2026-09-01" },
      { label: "Registration deadline", date: "2026-09-16", highlight: true },
      { label: "Confirmation emails sent", date: "2026-09-18" },
      { label: "Workshop day", date: "2026-09-20" },
    ],
  },
  "3": {
    detailedDescription:
      "The AWS Educate Cloud Computing Challenge is a globally accessible competition where student teams design, deploy, and defend scalable cloud architectures on AWS. Over three days, teams tackle real infrastructure problems — cost optimisation, disaster recovery, serverless functions, and microservices. Judged by AWS solutions architects, winning teams receive cloud certifications, cash prizes, and AWS job placement support.",
    eligibilityDetails: [
      "Students currently enrolled in any degree programme worldwide",
      "Basic understanding of networking and programming preferred",
      "Teams of 1–3 members",
      "Must have a valid AWS Educate account (free to create)",
    ],
    gains: [
      { icon: "☁️", title: "AWS certification vouchers", desc: "Winners receive vouchers for AWS Associate-level certification exams." },
      { icon: "🏆", title: "Cash prizes up to ₹3L", desc: "Top 3 teams globally share the prize pool." },
      { icon: "🧠", title: "Real cloud architecture skills", desc: "Practical experience designing production-grade AWS systems." },
      { icon: "💼", title: "AWS job placement", desc: "Top performers enter the AWS talent pool for internships and jobs." },
    ],
    skills: ["AWS", "Cloud Architecture", "Serverless", "Microservices", "DevOps", "Infrastructure as Code"],
    teamSize: "1–3 members",
    registrationUrl: "https://example.com/register/cloud-computing-challenge",
    aiMatchReasons: [
      "Matches your interest in cloud and backend technologies",
      "Fully online — participate from anywhere",
      "Open to all students regardless of year or branch",
    ],
    timeline: [
      { label: "Registration opens", date: "2026-09-15" },
      { label: "Registration deadline", date: "2026-09-22", highlight: true },
      { label: "Challenge begins", date: "2026-09-25" },
      { label: "Submission deadline", date: "2026-09-27" },
      { label: "Results announced", date: "2026-10-01" },
    ],
  },
  "4": {
    detailedDescription:
      "Microsoft India's Internship Hiring Programme offers 6-month placements at the Microsoft India Development Center (MSIDC) in Hyderabad. Interns work alongside full-time engineers on products used by millions — Azure, Teams, GitHub, and Xbox. The programme features structured mentorship, weekly tech talks, and a Pre-Placement Offer (PPO) evaluation at the end. This is one of India's most competitive and rewarding student internship opportunities.",
    eligibilityDetails: [
      "3rd or 4th year students pursuing B.E./B.Tech in CS, IT, or related fields",
      "Strong DSA and problem-solving skills (LeetCode Medium proficiency recommended)",
      "Familiarity with at least one: C++, Java, C#, Python, or TypeScript",
      "CGPA 7.0+ preferred (not mandatory)",
      "Available for 6 months starting October 2026",
    ],
    gains: [
      { icon: "💼", title: "Paid internship (₹80K/month)", desc: "Industry-leading stipend at Microsoft's flagship India campus." },
      { icon: "🧠", title: "Real product impact", desc: "Work on Azure, GitHub, Teams, or Windows code used globally." },
      { icon: "🤝", title: "Senior engineer mentorship", desc: "Dedicated mentor from Microsoft's principal engineering team." },
      { icon: "⭐", title: "Pre-Placement Offer", desc: "Top performers receive a full-time return offer before graduation." },
      { icon: "🎓", title: "Microsoft certification", desc: "Sponsored Azure Fundamentals or Developer Associate certification." },
    ],
    skills: ["DSA", "System Design", "C++", "Java", "TypeScript", "Distributed Systems", "Azure"],
    registrationUrl: "https://example.com/register/microsoft-internship",
    aiMatchReasons: [
      "Matches your profile as a 3rd/4th year engineering student",
      "Paid opportunity in a top tech company",
      "Hyderabad placement with hybrid work flexibility",
    ],
    timeline: [
      { label: "Applications open", date: "2026-09-01" },
      { label: "Application deadline", date: "2026-09-18", highlight: true },
      { label: "Online assessments", date: "2026-09-22" },
      { label: "Technical interviews", date: "2026-09-28" },
      { label: "Internship begins", date: "2026-10-01" },
    ],
  },
};

// ── Fallback generator ─────────────────────────────────────────────────────────

function generateFallback(o: Opportunity): OpportunityExtra {
  return {
    detailedDescription: o.description,
    eligibilityDetails: [o.eligibility, "Students from any recognised institution", "Refer to the official registration page for complete criteria"],
    gains: [
      { icon: "🧠", title: "Practical experience", desc: "Gain hands-on experience in a real-world setting." },
      { icon: "🤝", title: "Network building", desc: "Meet peers, mentors, and industry professionals." },
      { icon: "🎓", title: "Certificate", desc: "Receive a certificate of participation." },
    ],
    skills: o.tags,
    teamSize: undefined,
    registrationUrl: o.registrationUrl || "https://example.com/register",
    aiMatchReasons: [
      `Matches your interest in ${o.category} opportunities`,
      `Available in ${o.location}`,
      `Open to ${o.eligibility.toLowerCase()}`,
    ],
    timeline: [
      { label: "Registration deadline", date: o.registrationDeadline, highlight: true },
      { label: "Event date", date: o.startDate },
    ],
  };
}

export function getOpportunityExtra(id: string, opportunity: Opportunity): OpportunityExtra {
  return EXTRAS[id] ?? generateFallback(opportunity);
}
