import type { Metadata } from "next";
import SavedPageClient from "./SavedPageClient";

export const metadata: Metadata = {
  title: "Saved Opportunities | CampusFind AI",
  description: "View and manage opportunities you have saved on CampusFind AI.",
};

export default function SavedPage() {
  return <SavedPageClient />;
}
