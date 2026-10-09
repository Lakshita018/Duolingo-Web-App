export function getLanguageFlag(language?: string | null): string {
  const normalized = (language || '').toLowerCase()
  if (normalized.includes('english') || normalized === 'en') return '🇺🇸'
  if (normalized.includes('hindi') || normalized === 'hi') return '🇮🇳'
  if (normalized.includes('french') || normalized === 'fr') return '🇫🇷'
  return '🇪🇸'
}

export function getLanguageName(language?: string | null): string {
  const normalized = (language || '').toLowerCase()
  if (normalized.includes('english') || normalized === 'en') return 'English'
  if (normalized.includes('hindi') || normalized === 'hi') return 'Hindi'
  if (normalized.includes('french') || normalized === 'fr') return 'French'
  return 'Spanish'
}