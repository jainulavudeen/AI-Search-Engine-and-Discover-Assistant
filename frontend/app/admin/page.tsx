import { redirect } from "next/navigation";

// The admin area lives at /admin/events (dashboard + opportunity
// management + sync all in one place) — this just gives admins a
// predictable /admin entry point.
export default function AdminRootPage() {
  redirect("/admin/events");
}
