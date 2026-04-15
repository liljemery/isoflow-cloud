/** Matches a valid empty-ish diagram for Isoflow (structural schema). */
export const defaultModelPayload = {
  title: 'Untitled',
  version: '',
  icons: [],
  colors: [{ id: '__DEFAULT__', value: '#a5b8f3' }],
  items: [],
  views: []
} as const;
