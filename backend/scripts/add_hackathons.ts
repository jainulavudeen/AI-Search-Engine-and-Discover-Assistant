/**
 * add_hackathons.ts — Adds a diverse batch of hackathon opportunities for
 * demo purposes (filtering by location/mode/domain/deadline/registration).
 *
 * Purely additive: never deletes or modifies existing rows (unlike
 * prisma/seed.ts, which wipes the table). Safe to re-run — skips any title
 * that already exists so it won't create duplicates.
 *
 * Run (from backend/):
 *   npx ts-node-dev --transpile-only --exit-child scripts/add_hackathons.ts
 */
import { PrismaClient, Category, Mode } from "@prisma/client";

const prisma = new PrismaClient();

const hackathons = [
  {
    title: "FinTech Forward Hackathon 2026",
    description:
      "Build the next generation of digital payments and banking experiences. Teams work with real sandbox APIs from leading Indian fintech platforms to prototype UPI-integrated, credit-scoring, and wealth-management solutions in 24 hours.",
    category: Category.HACKATHON,
    location: "Bangalore",
    mode: Mode.OFFLINE,
    startDate: new Date("2026-09-06"),
    endDate: new Date("2026-09-07"),
    registrationDeadline: new Date("2026-09-05"),
    organizer: "Razorpay FinTech Labs",
    eligibility: "Engineering students (all years)",
    skills: ["FinTech", "Payments", "React", "Node.js"],
    tags: ["FinTech", "₹1.5L prize", "24 hours"],
    registrationUrl: "https://example.com/register/fintech-forward-hackathon",
    relevanceScore: 84,
    featured: true,
    isFree: true,
  },
  {
    title: "CyberShield Hackathon 2026",
    description:
      "A 36-hour capture-the-flag style hackathon for students passionate about cybersecurity. Tracks include network defense, ethical hacking, and secure application design, mentored by industry security researchers.",
    category: Category.HACKATHON,
    location: "Hyderabad",
    mode: Mode.HYBRID,
    startDate: new Date("2026-09-19"),
    endDate: new Date("2026-09-20"),
    registrationDeadline: new Date("2026-09-12"),
    organizer: "CERT-In Student Chapter",
    eligibility: "Undergraduate students (CS/IT/ECE)",
    skills: ["Cybersecurity", "Ethical Hacking", "Network Security", "CTF"],
    tags: ["Cybersecurity", "₹80K prize", "CTF"],
    registrationUrl: "https://example.com/register/cybershield-hackathon",
    relevanceScore: 81,
    featured: false,
    isFree: true,
  },
  {
    title: "CloudNative Build-a-thon",
    description:
      "Design and deploy scalable, containerized applications on the cloud. Participants get free AWS/GCP credits and work directly with cloud solutions architects to ship a production-style microservices project.",
    category: Category.HACKATHON,
    location: "Online",
    mode: Mode.ONLINE,
    startDate: new Date("2026-09-26"),
    endDate: new Date("2026-09-28"),
    registrationDeadline: new Date("2026-09-22"),
    organizer: "AWS Educate India",
    eligibility: "All engineering students",
    skills: ["Cloud Computing", "AWS", "Kubernetes", "DevOps"],
    tags: ["Cloud", "AWS credits", "Remote"],
    registrationUrl: "https://example.com/register/cloudnative-buildathon",
    relevanceScore: 79,
    featured: false,
    isFree: true,
  },
  {
    title: "HealthTech AI Hackathon",
    description:
      "Apply machine learning to real healthcare datasets — diagnostic imaging, patient triage, and clinical text mining — under the guidance of doctors and ML researchers. Winning teams get a fast-track interview with a healthtech unicorn.",
    category: Category.HACKATHON,
    location: "Mumbai",
    mode: Mode.OFFLINE,
    startDate: new Date("2026-10-03"),
    endDate: new Date("2026-10-04"),
    registrationDeadline: new Date("2026-09-28"),
    organizer: "Practo × IIT Bombay",
    eligibility: "Engineering students (CS/IT/Biomedical)",
    skills: ["AI", "Machine Learning", "HealthTech", "Python"],
    tags: ["AI", "HealthTech", "₹2L prize"],
    registrationUrl: "https://example.com/register/healthtech-ai-hackathon",
    relevanceScore: 90,
    featured: true,
    isFree: true,
  },
  {
    title: "Climate Data Hackathon",
    description:
      "Use open climate and satellite datasets to build tools that help communities respond to extreme weather. A hybrid hackathon combining an in-person kickoff with two weeks of remote build time before final judging.",
    category: Category.HACKATHON,
    location: "Delhi",
    mode: Mode.HYBRID,
    startDate: new Date("2026-10-10"),
    endDate: new Date("2026-10-24"),
    registrationDeadline: new Date("2026-10-05"),
    organizer: "Ministry of Earth Sciences & GDG Delhi",
    eligibility: "All undergraduate students",
    skills: ["Data Science", "Python", "Sustainability", "Analytics"],
    tags: ["Data Science", "Climate", "Social Impact"],
    registrationUrl: "https://example.com/register/climate-data-hackathon",
    relevanceScore: 76,
    featured: false,
    isFree: true,
  },
  {
    title: "IoT Smart Campus Challenge",
    description:
      "Prototype connected-hardware solutions for smart classrooms, energy monitoring, and campus safety. Arduino and Raspberry Pi kits are provided on-site — no need to bring your own hardware.",
    category: Category.HACKATHON,
    location: "Chennai",
    mode: Mode.OFFLINE,
    startDate: new Date("2026-10-17"),
    endDate: new Date("2026-10-18"),
    registrationDeadline: new Date("2026-10-10"),
    organizer: "IIT Madras Robotics Club",
    eligibility: "Engineering students (ECE/EEE/Mechanical/CS)",
    skills: ["IoT", "Embedded Systems", "Arduino", "Sensors"],
    tags: ["IoT", "Hardware provided", "₹1L prize"],
    registrationUrl: "https://example.com/register/iot-smart-campus",
    relevanceScore: 77,
    featured: false,
    isFree: true,
  },
  {
    title: "Web3 Builders Sprint",
    description:
      "A fully remote hackathon for students exploring blockchain, smart contracts, and decentralized applications. Mentorship sessions run daily over two weeks before a final live demo day.",
    category: Category.HACKATHON,
    location: "Online",
    mode: Mode.ONLINE,
    startDate: new Date("2026-10-20"),
    endDate: new Date("2026-11-02"),
    registrationDeadline: new Date("2026-10-15"),
    organizer: "Polygon Student Ambassadors",
    eligibility: "All students",
    skills: ["Blockchain", "Web3", "Solidity", "Smart Contracts"],
    tags: ["Web3", "Remote", "$2000 prize"],
    registrationUrl: "https://example.com/register/web3-builders-sprint",
    relevanceScore: 72,
    featured: false,
    isFree: false,
  },
  {
    title: "DevFest Open Source Hackathon",
    description:
      "Contribute to real open-source projects curated by maintainers, or start your own. Judged on code quality, documentation, and community impact rather than just a working demo.",
    category: Category.HACKATHON,
    location: "Pune",
    mode: Mode.OFFLINE,
    startDate: new Date("2026-11-07"),
    endDate: new Date("2026-11-08"),
    registrationDeadline: new Date("2026-11-01"),
    organizer: "GDG Pune",
    eligibility: "All undergraduate and postgraduate students",
    skills: ["Open Source", "Git", "Web Development", "JavaScript"],
    tags: ["Open Source", "Web Development", "Swag + certificate"],
    registrationUrl: "https://example.com/register/devfest-open-source",
    relevanceScore: 70,
    featured: false,
    isFree: true,
  },
];

async function main() {
  console.log(`🌱 Adding ${hackathons.length} hackathon opportunities...\n`);

  let created = 0;
  let skipped = 0;

  for (const h of hackathons) {
    const existing = await prisma.opportunity.findFirst({ where: { title: h.title } });
    if (existing) {
      console.log(`  ⏭️  Skipped (already exists) — ${h.title}`);
      skipped++;
      continue;
    }
    await prisma.opportunity.create({ data: h });
    console.log(`  ✅ Created — ${h.title}`);
    created++;
  }

  console.log(`\n🎉 Done — ${created} created, ${skipped} skipped (already existed).`);
}

main()
  .catch((err) => {
    console.error("❌ Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
