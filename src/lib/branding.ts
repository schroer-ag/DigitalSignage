export type BrandingGroup = "ffa" | "district";

// FFA colors are the real National FFA brand palette (brand.ffa.org):
// National FFA Blue and Corn Gold. District colors are sampled directly
// from crockerschools.org itself (its headings, nav accent, and icon bar
// all use the same #112B9C) -- there's no separate official brand guide,
// but this is the district's actual color, confirmed with Matt, not a
// placeholder.
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
    primary: "#112B9C", // crockerschools.org's actual blue
    accent: "#7C93E0", // lighter tint of the same blue, for contrast on dark backgrounds
    background: "#0A1033",
  },
};

export function brandingFor(group: string) {
  return group === "ffa" ? BRANDING.ffa : BRANDING.district;
}
