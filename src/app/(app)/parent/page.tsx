import { redirect } from "next/navigation";

export default function ParentPage() {
  // Redirect to the new dashboard
  redirect("/parent/dashboard");
}
