import { brandingFor } from "@/lib/branding";

// Uses this org's accent color (gold for FFA, light blue for District)
// rather than its primary -- primary is a dark navy/blue meant for text
// on a WHITE background (the kiosk's own branding isn't the admin
// console's background), which would be unreadable on this now-dark
// admin table. The accent colors are already the ones validated to read
// well on a dark background, since that's what the kiosk display itself
// uses them for.
export function BrandingBadge({ group }: { group: string }) {
  const brand = brandingFor(group);
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${brand.accent}26`, color: brand.accent }}
    >
      {brand.label}
    </span>
  );
}
