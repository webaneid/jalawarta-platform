export function formatTenantDate(
  dateStringOrDate: string | Date | null | undefined,
  schemaConfig?: any
) {
  if (!dateStringOrDate) return "-";
  
  const date = typeof dateStringOrDate === "string" 
    ? new Date(dateStringOrDate) 
    : dateStringOrDate;

  // Defaults
  const timezone = schemaConfig?.timezone || "Asia/Jakarta";
  const language = schemaConfig?.language || "id-ID";

  return date.toLocaleString(language.replace('_', '-'), {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}
