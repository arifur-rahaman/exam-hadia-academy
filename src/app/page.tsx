import { redirect } from "next/navigation";

// Step 4 will send logged-in students to /dashboard instead.
export default function Home() {
  redirect("/login");
}
