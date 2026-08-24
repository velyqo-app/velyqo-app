export function formatSalary(value?: number | string) {
  if (!value) return "Not available";

  return `£${Number(value).toLocaleString()}`;
}
