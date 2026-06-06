import { createTheme, type MantineColorsTuple } from '@mantine/core'

/**
 * Identité « shadcn/ui — Neutral ».
 * Base neutre zinc (gris froid), primaire quasi-noir sur les actions, bordures
 * fines gris clair, coins arrondis ~8px et ombres très subtiles. Look épuré,
 * beaucoup de blanc, à la https://ui.shadcn.com/.
 */

// Échelle neutre « zinc » (Tailwind) — sert à la fois de base (gris) et de
// couleur primaire quasi-noire (shade 9 = #18181b, texte blanc).
const zinc: MantineColorsTuple = [
  '#fafafa', // 0
  '#f4f4f5', // 1
  '#e4e4e7', // 2  ← bordures
  '#d4d4d8', // 3
  '#a1a1aa', // 4
  '#71717a', // 5  ← texte atténué
  '#52525b', // 6
  '#3f3f46', // 7
  '#27272a', // 8
  // '#0f0f8b', // 9  ← primaire (quasi-noir)
  '#18181b', // 9  ← primaire (quasi-noir)
]

export const theme = createTheme({
  primaryColor: 'brand',
  // Primaire quasi-noir en clair (boutons foncés, texte blanc), quasi-blanc en
  // sombre — exactement le comportement shadcn.
  primaryShade: { light: 9, dark: 0 },
  colors: { brand: zinc, gray: zinc },
  white: '#ffffff',
  black: '#09090b', // zinc-950 (texte principal)
  fontFamily:
    '"Inter Variable", Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  // Coins arrondis ~0.5rem (radius shadcn par défaut).
  defaultRadius: 'md',
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  // Ombres très douces (style shadcn shadow-sm).
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px -1px rgba(0, 0, 0, 0.07)',
  },
  fontSizes: {
    xs: '0.6875rem', // 11
    sm: '0.75rem', // 12
    md: '0.8125rem', // 13 (base)
    lg: '0.9375rem', // 15
    xl: '1.0625rem', // 17
  },
  lineHeights: {
    xs: '1.3',
    sm: '1.4',
    md: '1.45',
    lg: '1.5',
    xl: '1.55',
  },
  headings: {
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '1.5rem', fontWeight: '700', lineHeight: '1.25' },
      h2: { fontSize: '1.25rem', fontWeight: '600', lineHeight: '1.3' },
      h3: { fontSize: '1.0625rem', fontWeight: '600', lineHeight: '1.3' },
      h4: { fontSize: '0.9375rem', fontWeight: '600', lineHeight: '1.35' },
      h5: { fontSize: '0.85rem', fontWeight: '600', lineHeight: '1.4' },
      h6: { fontSize: '0.78rem', fontWeight: '600', lineHeight: '1.4' },
    },
  },
  cursorType: 'pointer',
  components: {
    // Surfaces : bordure fine zinc + ombre très douce (carte shadcn).
    Paper: {
      defaultProps: { radius: 'md', withBorder: true, shadow: 'xs' },
    },
    Card: {
      defaultProps: { radius: 'lg', withBorder: true, shadow: 'xs' },
    },
    Button: {
      defaultProps: { radius: 'md', size: 'sm' },
    },
    ActionIcon: {
      defaultProps: { radius: 'md' },
    },
    Badge: {
      defaultProps: { radius: 'sm' },
    },
    TextInput: { defaultProps: { size: 'sm' } },
    PasswordInput: { defaultProps: { size: 'sm' } },
    Select: { defaultProps: { size: 'sm' } },
    Textarea: { defaultProps: { size: 'sm' } },
    NumberInput: { defaultProps: { size: 'sm' } },
    Modal: {
      defaultProps: { radius: 'md' },
    },
  },
})
