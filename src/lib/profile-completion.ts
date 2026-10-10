// Required profile details (same ones the email sign-up form asks for).
// Used by the global guard (__root.tsx), the profile page and the onboarding window.

export type RequiredKey = "phone" | "age_range" | "gender" | "nationality";

export const REQUIRED_FIELDS: { key: RequiredKey; label: string }[] = [
  { key: "phone", label: "Phone number" },
  { key: "age_range", label: "Age range" },
  { key: "gender", label: "Gender" },
  { key: "nationality", label: "Nationality" },
];

/** Returns the required fields that are still empty (empty array = profile is complete). */
export function getMissingFields(profile: unknown): { key: RequiredKey; label: string }[] {
  if (!profile) return [];
  const p = profile as Record<string, unknown>;
  return REQUIRED_FIELDS.filter((f) => {
    const v = String(p[f.key] ?? "");
    if (f.key === "phone") return v.replace(/\D/g, "").length < 6;
    return v.trim() === "";
  });
}
