export function normalizeHost(rawHost: string): string {
  return rawHost
    .split(":")[0]
    .replace(/^www\./, "");
}
