// Mobile number = student identity. Stored as +8801XXXXXXXXX.

export function normalizeMobile(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "").replace(/^0088/, "88");
  let local: string | null = null;
  if (/^8801[3-9]\d{8}$/.test(digits)) local = digits.slice(2);
  else if (/^01[3-9]\d{8}$/.test(digits)) local = digits;
  else if (/^1[3-9]\d{8}$/.test(digits)) local = "0" + digits;
  return local ? "+88" + local : null;
}

// Supabase Auth login id. Phone+password would need an SMS provider, so each mobile maps to a
// synthetic email; switching to SMS OTP later only changes the login screen.
export function mobileToAuthEmail(mobile: string): string {
  return `${mobile.replace("+", "")}@students.hadia.academy`;
}

// +8801712345245 → 017••-•••245
export function maskMobile(mobile: string): string {
  const local = mobile.replace(/^\+88/, "");
  return `${local.slice(0, 3)}••-•••${local.slice(-3)}`;
}

// +8801712345245 → 01712345245
export function displayMobile(mobile: string): string {
  return mobile.replace(/^\+88/, "");
}
