/**
 * Maps the country names onboarding stores to the ISO 3166-1 alpha-2 codes
 * `occupation_salary_bands.country_code` uses.
 *
 * Keys must match the strings written by app/onboarding/country.tsx exactly.
 * "Other" has no code, so it resolves to null and salary lookups are skipped
 * rather than defaulted to a country the user did not choose.
 */
const COUNTRY_CODES: Record<string, string> = {
  "united kingdom": "GB",
  "united states": "US",
  canada: "CA",
  australia: "AU",
};

/** Returns null for an unmapped or unset country, never a fallback code. */
export function toCountryCode(country: string | null): string | null {
  if (!country) {
    return null;
  }

  return COUNTRY_CODES[country.trim().toLowerCase()] ?? null;
}

const CURRENCY_CODES: Record<string, string> = {
  GB: "GBP",
  US: "USD",
  CA: "CAD",
  AU: "AUD",
};

/**
 * ISO 4217 currency for a country code, so the user's own stated salary can
 * be labelled even when no market band exists to borrow a currency from.
 * Null for an unmapped country — the figure then renders with no currency
 * label rather than a guessed one.
 */
export function toCurrencyCode(countryCode: string | null): string | null {
  if (!countryCode) {
    return null;
  }

  return CURRENCY_CODES[countryCode] ?? null;
}
