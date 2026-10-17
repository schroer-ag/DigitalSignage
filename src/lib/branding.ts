export type BrandingGroup = "ffa" | "district";

// FFA colors are the real National FFA brand palette (brand.ffa.org):
// National FFA Blue and Corn Gold. District colors have no official brand
// guide yet -- Matt asked for "blue" as the primary for crockerschools.org
// projects, but this exact shade is a placeholder until he confirms one.
export const BRANDING: Record<
  BrandingGroup,
  { label: string; primary: string; accent: string; background: string }
> = {
  ffa: {
    label: "FFA",
    primary: "#004C97", // National FFA Blue
    accent: "#FFCD00", // FFA Corn Gold
    background: "#00264d",
  },
  district: {
    label: "District",
    primary: "#1D4ED8", // placeholder -- confirm Crocker R-II's exact shade
    accent: "#93C5FD",
    background: "#0f1f3d",
  },
};

export function brandingFor(group: string) {
  return group === "ffa" ? BRANDING.ffa : BRANDING.district;
}
