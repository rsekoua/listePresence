import { createTheme, type MantineColorsTuple } from '@mantine/core'

/**
 * Identité « Émeraude — Flat & Dense ».
 * Style administrateur/données : accent vert émeraude, bordures fines,
 * pas d'ombres, coins peu arrondis, typographie compacte (≈ 13 px).
 */
const brand: MantineColorsTuple = [
  '#ecfdf5', // 0
  '#d1fae5', // 1
  '#a7f3d0', // 2
  '#6ee7b7', // 3
  '#34d399', // 4
  '#10b981', // 5
  '#059669', // 6 ← principal (émeraude 600)
  '#047857', // 7
  '#065f46', // 8
  '#064e3b', // 9
]

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  colors: { brand },
  fontFamily:
    '"Inter Variable", Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  // Coins peu arrondis (look flat).
  defaultRadius: 'sm',
  radius: {
    xs: '3px',
    sm: '5px',
    md: '7px',
    lg: '9px',
    xl: '12px',
  },
  // Typographie compacte (base ≈ 13 px).
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
    // Surfaces plates : bordure fine, aucune ombre.
    Paper: {
      defaultProps: { radius: 'sm', withBorder: true, shadow: undefined },
    },
    Card: {
      defaultProps: { radius: 'sm', withBorder: true, shadow: undefined },
    },
    Button: {
      defaultProps: { radius: 'sm', size: 'sm' },
    },
    ActionIcon: {
      defaultProps: { radius: 'sm' },
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
      defaultProps: { radius: 'sm' },
    },
  },
})
