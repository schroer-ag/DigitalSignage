import { brandingFor } from "@/lib/branding";

export function BrandingBadge({ group }: { group: string }) {
  const brand = brandingFor(group);
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${brand.primary}1A`, color: brand.primary }}
    >
      {brand.label}
    </span>
  );
}
