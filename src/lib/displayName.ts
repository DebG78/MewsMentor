/** Convert "Debora Gallo" → "Debora G." */
export function toDisplayName(fullName: string | undefined | null): string {
  if (!fullName?.trim()) return 'Unknown';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0];
  return `${firstName} ${lastInitial}.`;
}
