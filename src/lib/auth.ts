// Allowed-domain + role helpers for the signage app's Google Sign-In gate.
// Mirrors the pattern used in the FFA safety-testing app.

const ALLOWED_DOMAINS = (process.env.ALLOWED_SIGN_IN_DOMAINS ?? "crockerffa.com,crockerschools.org")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function emailDomainAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && ALLOWED_DOMAINS.includes(domain);
}

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}
