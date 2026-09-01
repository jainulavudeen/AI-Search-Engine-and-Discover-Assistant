import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard — CampusFind AI",
  description: "Your personalised student opportunity dashboard.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
