import type { Metadata } from "next";
import OnboardingClient from "./OnboardingClient";

export const metadata: Metadata = {
  title: "Set up your profile — CampusFind AI",
  description: "Tell us about yourself so we can find the best opportunities for you.",
};

export default function OnboardingPage() {
  return <OnboardingClient />;
}
