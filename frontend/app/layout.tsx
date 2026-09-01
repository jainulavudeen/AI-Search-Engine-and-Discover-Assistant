import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "CampusFind AI — Student Opportunity Discovery",
  description:
    "Discover AI hackathons, internships, competitions, workshops, and tech opportunities tailored for college students — powered by AI.",
  keywords: ["hackathon", "internship", "AI", "student opportunities", "coding competitions"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased bg-white text-slate-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
