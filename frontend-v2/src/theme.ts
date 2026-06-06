import { createTheme, type MantineColorsTuple } from '@mantine/core'

/**
 * Identité « Graphite & Ambre — Premium / Éditorial ».
 * Base neutre ardoise (graphite) reposante pour les tableaux denses, relevée
 * par un unique accent ambre chaud sur les actions. Bordures fines, pas
 * d'ombres, coins modérément arrondis, typographie compacte (≈ 13 px).
 */

// Accent ambre (couleur primaire « brand »).
const brand: MantineColorsTuple = [
  '#fffbeb', // 0
  '#fef3c7', // 1
  '#fde68a', // 2
  '#fcd34d', // 3
  '#fbbf24', // 4
  '#f59e0b', // 5
  '#d97706', // 6 ← accent vif
  '#b45309', // 7 ← principal (ambre brûlé, contraste AA sur blanc)
  '#92400e', // 8
  '#78350f', // 9
]

// Base neutre ardoise : remplace le gris Mantine (texte atténué, bordures,
// fonds clairs) pour une tonalité graphite cohérente.
const slate: MantineColorsTuple = [
  '#f8fafc', // 0
  '#f1f5f9', // 1
  '#e2e8f0', // 2
  '#cbd5e1', // 3
  '#94a3b8', // 4
  '#64748b', // 5
  '#475569', // 6
  '#334155', // 7
  '#1e293b', // 8
  '#0f172a', // 9
]

export const theme = createTheme({
  primaryColor: 'brand',
  // Ambre brûlé (shade 7) comme couleur de remplissage : contraste suffisant
  // avec le texte blanc des boutons, rendu plus « premium » que l'orange vif.
  primaryShade: 7,
  colors: { brand, gray: slate },
  // Encre graphite plutôt que noir pur (ton éditorial).
  black: '#0f172a',
  fontFamily:
    '"Inter Variable", Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  // Coins modérément arrondis (un peu plus aéré que le flat émeraude).
  defaultRadius: 'md',
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '11px',
    xl: '14px',
  },
  // Typographie compacte (base ≈ 13 px) — app de données dense.
  fontSizes: {
    xs: '0.6875rem', // 11
    sm: '0.75rem', // 12
    md: '0.8125rem', // 13 (base)
    lg: '0.9375rem', // 15
    xl: '1.0625rem', // 17
  },
  lineHeights: {
    xs: '1.3',
    sm: '1.35',
    md: '1.4',
    lg: '1.45',
    xl: '1.5',
  },
  headings: {
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '1.5rem', fontWeight: '700', lineHeight: '1.25' },
      h2: { fontSize: '1.25rem', fontWeight: '700', lineHeight: '1.3' },
      h3: { fontSize: '1.0625rem', fontWeight: '700', lineHeight: '1.3' },
      h4: { fontSize: '0.9375rem', fontWeight: '700', lineHeight: '1.35' },
      h5: { fontSize: '0.85rem', fontWeight: '700', lineHeight: '1.4' },
      h6: { fontSize: '0.78rem', fontWeight: '700', lineHeight: '1.4' },
    },
  },
  cursorType: 'pointer',
  components: {
    // Surfaces plates : bordure fine, aucune ombre, coins un peu plus doux.
    Paper: {
      defaultProps: { radius: 'md', withBorder: true, shadow: undefined },
    },
    Card: {
      defaultProps: { radius: 'md', withBorder: true, shadow: undefined },
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
