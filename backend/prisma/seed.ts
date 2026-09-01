import { PrismaClient, Category, Mode } from "@prisma/client";

const prisma = new PrismaClient();

const opportunities = [
  {
    title: "AI Innovation Hackathon 2026",
    description:
      "Build cutting-edge AI solutions in 36 hours at IIT Madras. Teams tackle real problems across healthcare, education, and smart cities using AI/ML. Mentored by Google, Microsoft, and NVIDIA engineers. ₹2L prize pool.",
    category: Category.HACKATHON,
    location: "Chennai",
    mode: Mode.OFFLINE,
    startDate: new Date("2026-09-14"),
    endDate: new Date("2026-09-15"),
    registrationDeadline: new Date("2026-09-10"),
    organizer: "IIT Madras",
    eligibility: "Engineering students",
    skills: ["AI", "Machine Learning", "Python", "Generative AI"],
    tags: ["AI", "ML", "₹2L prize"],
    registrationUrl: "https://example.com/register/ai-innovation-hackathon",
    relevanceScore: 96,
    featured: true,
  },
  {
    title: "Google Student Developer Workshop",
    description:
      "Full-day hands-on workshop by Google covering Google Cloud Platform, Android development with Jetpack Compose, and Flutter. Includes $200 cloud credits and a certificate.",
    category: Category.WORKSHOP,
    location: "Bangalore",
    mode: Mode.OFFLINE,
    startDate: new Date("2026-09-20"),
    registrationDeadline: new Date("2026-09-16"),
    organizer: "Google",
    eligibility: "Undergraduate & Postgraduate",
    skills: ["Google Cloud", "Android", "Flutter", "Kotlin"],
    tags: ["Google Cloud", "Android", "Flutter"],
    registrationUrl: "https://example.com/register/google-workshop",
    relevanceScore: 88,
    featured: true,
  },
  {
    title: "Cloud Computing Challenge",
    description:
      "Global online competition where student teams design scalable AWS cloud architectures over three days. Judged by AWS solutions architects. Winners get certification vouchers and ₹3L in prizes.",
    category: Category.COMPETITION,
    location: "Online",
    mode: Mode.ONLINE,
    startDate: new Date("2026-09-25"),
    endDate: new Date("2026-09-27"),
    registrationDeadline: new Date("2026-09-22"),
    organizer: "AWS Educate",
    eligibility: "All students",
    skills: ["AWS", "Cloud Architecture", "Serverless", "DevOps"],
    tags: ["AWS", "Cloud", "Serverless"],
    registrationUrl: "https://example.com/register/cloud-challenge",
    relevanceScore: 82,
    featured: true,
  },
  {
    title: "Microsoft Intern Hiring — India",
    description:
      "6-month paid internship at Microsoft India Development Center (MSIDC), Hyderabad. Work on Azure, Teams, or GitHub. Includes mentorship, weekly tech talks, and Pre-Placement Offer evaluation. Stipend ₹80K/month.",
    category: Category.INTERNSHIP,
    location: "Hyderabad",
    mode: Mode.HYBRID,
    startDate: new Date("2026-10-01"),
    registrationDeadline: new Date("2026-09-18"),
    organizer: "Microsoft",
    eligibility: "3rd & 4th year CS/IT students",
    skills: ["DSA", "System Design", "TypeScript", "Azure"],
    tags: ["SDE", "Paid", "6 months"],
    registrationUrl: "https://example.com/register/microsoft-internship",
    relevanceScore: 90,
    featured: true,
  },
  {
    title: "National Coding Championship",
    description:
      "India's largest online coding championship with algorithmic challenges across beginner, intermediate, and advanced tracks. ₹5L prize pool with special awards for college toppers.",
    category: Category.COMPETITION,
    location: "Online",
    mode: Mode.ONLINE,
    startDate: new Date("2026-10-05"),
    registrationDeadline: new Date("2026-10-03"),
    organizer: "HackerEarth",
    eligibility: "All engineering students",
    skills: ["DSA", "Algorithms", "Competitive Programming"],
    tags: ["DSA", "Algorithms", "₹5L prize"],
    registrationUrl: "https://example.com/register/national-coding",
    relevanceScore: 75,
    featured: false,
  },
  {
    title: "DevFest Chennai 2026",
    description:
      "Annual developer festival organised by GDG Chennai featuring keynotes, workshops, and networking sessions on AI, Web, and mobile technologies. Free for students.",
    category: Category.CONFERENCE,
    location: "Chennai",
    mode: Mode.OFFLINE,
    startDate: new Date("2026-10-12"),
    registrationDeadline: new Date("2026-10-08"),
    organizer: "GDG Chennai",
    eligibility: "Students & professionals",
    skills: ["Google", "Web", "Mobile", "AI"],
    tags: ["Google", "Keynotes", "Networking"],
    registrationUrl: "https://example.com/register/devfest-chennai",
    relevanceScore: 70,
    featured: false,
  },
  {
    title: "Flipkart Grid 6.0",
    description:
      "Flipkart's flagship engineering challenge for students. Top performers receive Pre-Placement Offers. Problem statements span e-commerce, ML recommendations, and supply chain optimization.",
    category: Category.COMPETITION,
    location: "Online",
    mode: Mode.ONLINE,
    startDate: new Date("2026-09-28"),
    endDate: new Date("2026-10-20"),
    registrationDeadline: new Date("2026-09-25"),
    organizer: "Flipkart",
    eligibility: "Engineering students (CS, IT, ECE)",
    skills: ["ML", "System Design", "Python", "Java"],
    tags: ["E-commerce", "ML", "PPO offer"],
    registrationUrl: "https://example.com/register/flipkart-grid",
    relevanceScore: 85,
    featured: false,
  },
  {
    title: "AICTE Internship Scheme 2026",
    description:
      "Government-funded 8-week internship programme placing students in AICTE-approved organisations across India. Stipend provided. Open to 3rd year engineering students.",
    category: Category.INTERNSHIP,
    location: "Chennai",
    mode: Mode.OFFLINE,
    startDate: new Date("2026-10-01"),
    registrationDeadline: new Date("2026-09-20"),
    organizer: "AICTE",
    eligibility: "Undergraduate (3rd year)",
    skills: ["Engineering", "Industry Training"],
    tags: ["Government", "Stipend", "8 weeks"],
    registrationUrl: "https://example.com/register/aicte-internship",
    relevanceScore: 78,
    featured: false,
  },
  {
    title: "Smart India Hackathon 2026",
    description:
      "India's biggest national hackathon organised by the Ministry of Education. Teams solve real problems submitted by central government ministries and PSUs. ₹1L prize per track.",
    category: Category.HACKATHON,
    location: "Chennai",
    mode: Mode.OFFLINE,
    startDate: new Date("2026-10-15"),
    endDate: new Date("2026-10-16"),
    registrationDeadline: new Date("2026-09-30"),
    organizer: "Ministry of Education",
    eligibility: "All undergraduate students",
    skills: ["Problem Solving", "Software Development", "Innovation"],
    tags: ["Government", "Social Impact", "₹1L prize"],
    registrationUrl: "https://example.com/register/smart-india-hackathon",
    relevanceScore: 94,
    featured: false,
  },
  {
    title: "TechTalks India Summit 2026",
    description:
      "NASSCOM's premier technology summit with student-specific career tracks, panel discussions, and networking with C-suite executives from India's top tech companies. Hybrid format.",
    category: Category.CONFERENCE,
    location: "Hyderabad",
    mode: Mode.HYBRID,
    startDate: new Date("2026-10-18"),
    registrationDeadline: new Date("2026-10-14"),
    organizer: "NASSCOM",
    eligibility: "Students & professionals",
    skills: ["Industry Knowledge", "Networking"],
    tags: ["Industry", "Networking", "Career"],
    registrationUrl: "https://example.com/register/techtalks-summit",
    relevanceScore: 65,
    featured: false,
  },
  {
    title: "Adobe Women in Tech Scholarship",
    description:
      "Adobe's annual scholarship supporting women pursuing careers in technology. Includes ₹50,000 cash award, 6-month mentorship with an Adobe engineer, and fast-track internship consideration.",
    category: Category.SCHOLARSHIP,
    location: "Online",
    mode: Mode.ONLINE,
    startDate: new Date("2026-10-01"),
    registrationDeadline: new Date("2026-09-22"),
    organizer: "Adobe",
    eligibility: "Female undergraduate CS/IT students",
    skills: ["Computer Science", "Technology"],
    tags: ["Women in Tech", "₹50K", "Mentorship"],
    registrationUrl: "https://example.com/register/adobe-scholarship",
    relevanceScore: 72,
    featured: false,
  },
  {
    title: "Data Science Bootcamp — IIT Series",
    description:
      "Free 3-day intensive bootcamp covering data science and ML fundamentals, taught by IIT Delhi faculty via Coursera. Includes Python, Pandas, Scikit-Learn, and a capstone project.",
    category: Category.WORKSHOP,
    location: "Online",
    mode: Mode.ONLINE,
    startDate: new Date("2026-09-22"),
    endDate: new Date("2026-09-24"),
    registrationDeadline: new Date("2026-09-19"),
    organizer: "Coursera × IIT Delhi",
    eligibility: "All students",
    skills: ["Data Science", "Python", "Machine Learning", "Pandas"],
    tags: ["Data Science", "Python", "Free"],
    registrationUrl: "https://example.com/register/data-science-bootcamp",
    relevanceScore: 80,
    featured: false,
  },
  {
    title: "Goldman Sachs Engineering Campus Hire",
    description:
      "Full-time engineering programme for final year students. Roles across risk technology, quantitative strategies, and platform engineering. Competitive salary with relocation support.",
    category: Category.INTERNSHIP,
    location: "Bangalore",
    mode: Mode.OFFLINE,
    startDate: new Date("2026-11-01"),
    registrationDeadline: new Date("2026-10-05"),
    organizer: "Goldman Sachs",
    eligibility: "Final year CS/IT/Math students",
    skills: ["Java", "Python", "SQL", "Algorithms", "Finance"],
    tags: ["Finance Tech", "Campus Hire", "Full-time"],
    registrationUrl: "https://example.com/register/goldman-sachs",
    relevanceScore: 83,
    featured: false,
  },
  {
    title: "HackWithInfy — Infosys Hackathon",
    description:
      "Infosys's annual student hackathon inviting engineering teams to build digital transformation solutions. Top 100 teams get Infosys mentorship; top 10 get internship offers.",
    category: Category.HACKATHON,
    location: "Online",
    mode: Mode.ONLINE,
    startDate: new Date("2026-10-10"),
    endDate: new Date("2026-11-30"),
    registrationDeadline: new Date("2026-10-07"),
    organizer: "Infosys",
    eligibility: "Engineering students (2nd–4th year)",
    skills: ["Full Stack", "Cloud", "AI", "Java", "React"],
    tags: ["Infosys", "Digital Transformation", "Internship offer"],
    registrationUrl: "https://example.com/register/hackwithinfy",
    relevanceScore: 88,
    featured: false,
  },
  {
    title: "CBSE Atal Innovation Mission Scholarship",
    description:
      "Government scholarship for school and college students building innovative technology solutions. Provides ₹1L seed funding, 3-month incubation support, and mentorship from IIT alumni.",
    category: Category.SCHOLARSHIP,
    location: "Online",
    mode: Mode.ONLINE,
    startDate: new Date("2026-10-15"),
    registrationDeadline: new Date("2026-10-01"),
    organizer: "Atal Innovation Mission",
    eligibility: "All students with innovative projects",
    skills: ["Innovation", "Entrepreneurship", "Technology"],
    tags: ["Government", "₹1L seed", "Incubation"],
    registrationUrl: "https://example.com/register/aim-scholarship",
    relevanceScore: 68,
    featured: false,
  },
];

async function main() {
  console.log("🌱 Seeding database with 15 opportunities...\n");

  // Wipe existing opportunities (safe for dev)
  await prisma.opportunity.deleteMany();

  for (const opp of opportunities) {
    const created = await prisma.opportunity.create({ data: opp });
    console.log(`  ✅ ${created.category.padEnd(12)} — ${created.title}`);
  }

  console.log(`\n🎉 Seeded ${opportunities.length} opportunities successfully.`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
