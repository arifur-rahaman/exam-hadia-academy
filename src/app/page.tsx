import { redirect } from "next/navigation";
import { getProfile, isAdmin } from "@/lib/auth";

export default async function Home() {
  const p = await getProfile();
  if (!p) redirect("/login");
  redirect(isAdmin(p) ? "/admin" : "/dashboard");
}
