import { createTheme, type MantineColorsTuple } from '@mantine/core'

/**
 * Identité inspirée d'Anthropic/Claude : fond crème chaud (pas blanc froid),
 * accent terracotta/argile signature, gris chauds (« stone ») plutôt que
 * froids. Structure (polices, rayons ~8px, ombres douces) reprise du thème
 * précédent — seule la palette change.
 */

// Argile/terracotta — couleur de marque Anthropic (base ≈ #D97757).
const clay: MantineColorsTuple = [
  '#fcf1ec', // 0
  '#f8e1d6', // 1
  '#f1c4af', // 2  ← bordures/fonds teintés
  '#e8a484', // 3
  '#e08b65', // 4
  '#dd7f57', // 5
  '#d97757', // 6  ← primaire (argile)
  '#b5613f', // 7
  '#8f4c33', // 8
  '#6b3a29', // 9  ← le plus foncé
]

// Neutre chaud « stone » — remplace le zinc froid pour les fonds/bordures/texte.
const stone: MantineColorsTuple = [
  '#faf9f5', // 0  ← fond de page (crème)
  '#f4f2ec', // 1
  '#e8e4da', // 2  ← bordures
  '#d8d3c4', // 3
  '#b8b2a0', // 4
  '#8f897a', // 5  ← texte atténué
  '#6e6a5d', // 6
  '#524e44', // 7
  '#38352e', // 8
  '#262421', // 9  ← quasi-noir chaud (texte principal)
]

export const theme = createTheme({
  primaryColor: 'brand',
  // Boutons en argile pleine teinte (shade 6) en clair, légèrement éclairci en sombre.
  primaryShade: { light: 6, dark: 4 },
  colors: { brand: clay, gray: stone },
  white: '#ffffff',
  black: '#262421', // stone-9 (texte principal, chaud plutôt que noir froid)
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
    xs: '0.75rem', // 12
    sm: '0.8125rem', // 13
    md: '0.875rem', // 14 (base)
    lg: '1rem', // 16
    xl: '1.125rem', // 18
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
      h1: { fontSize: '1.75rem', fontWeight: '700', lineHeight: '1.25' },
      h2: { fontSize: '1.5rem', fontWeight: '600', lineHeight: '1.3' },
      h3: { fontSize: '1.25rem', fontWeight: '600', lineHeight: '1.3' },
      h4: { fontSize: '1.0625rem', fontWeight: '600', lineHeight: '1.35' },
      h5: { fontSize: '0.9375rem', fontWeight: '600', lineHeight: '1.4' },
      h6: { fontSize: '0.875rem', fontWeight: '600', lineHeight: '1.4' },
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
