import "server-only";
import { adminDb } from "@/lib/supabase/admin";
import { createAccount, MIN_PASSWORD, type NewAccount } from "./accounts";

export function createStudent(s: NewAccount) {
  return createAccount(adminDb(), { ...s, role: "student" });
}

export async function setPassword(studentId: string, password: string) {
  if (password.length < MIN_PASSWORD) throw new Error(`Password কমপক্ষে ${MIN_PASSWORD} অক্ষর হতে হবে`);
  const { error } = await adminDb().auth.admin.updateUserById(studentId, { password });
  if (error) throw new Error(error.message);
}
