import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from '@mantine/core'

/**
 * Portage fidèle d'un thème shadcn/ui (base « stone », primaire indigo,
 * --radius: 0.45rem) vers Mantine. Les valeurs oklch du thème source ont été
 * converties en sRGB : elles retombent exactement sur les échelles Tailwind v4
 * `stone` et `indigo`, ce qui confirme la conversion.
 */

// Primaire indigo — échelle Tailwind v4 indigo-50…900 sur les nuances 0…9.
// Les --chart-1..5 du thème source tombent sur 3, 5, 6, 7 et 8.
const indigo: MantineColorsTuple = [
  '#eef2ff', // 0  ← indigo-50 / --primary-foreground
  '#e0e7ff', // 1  ← indigo-100
  '#c6d2ff', // 2  ← indigo-200
  '#a3b3ff', // 3  ← indigo-300 / chart-1
  '#7c86ff', // 4  ← indigo-400
  '#615fff', // 5  ← indigo-500 / chart-2
  '#4f39f6', // 6  ← indigo-600 / chart-3
  '#432dd7', // 7  ← indigo-700 / chart-4 / --primary (clair)
  '#372aac', // 8  ← indigo-800 / chart-5 / --primary (sombre)
  '#312c85', // 9  ← indigo-900
]

// Neutre chaud « stone » — fonds, bordures, texte atténué.
const stone: MantineColorsTuple = [
  '#fafaf9', // 0  ← --sidebar
  '#f5f5f4', // 1  ← --muted / --accent
  '#e7e5e4', // 2  ← --border / --input
  '#d6d3d1', // 3
  '#a6a09b', // 4  ← --ring
  '#79716b', // 5  ← --muted-foreground
  '#57534d', // 6
  '#44403b', // 7
  '#292524', // 8  ← --muted / --accent (sombre)
  '#1c1917', // 9  ← --card / --popover (sombre)
]

// Échelle « dark » de Mantine (0 = texte le plus clair, 9 = fond le plus sombre),
// alimentée par les tokens de la section .dark du thème source.
const stoneDark: MantineColorsTuple = [
  '#fafaf9', // 0  ← --foreground (sombre)
  '#e7e5e4', // 1
  '#d6d3d1', // 2
  '#a6a09b', // 3  ← --muted-foreground (sombre)
  '#79716b', // 4  ← --ring (sombre)
  '#44403b', // 5
  '#292524', // 6  ← --muted / --accent (sombre)
  '#1c1917', // 7  ← --card / --popover (sombre)
  '#131110', // 8
  '#0c0a09', // 9  ← --background (sombre)
]

export const theme = createTheme({
  primaryColor: 'brand',
  // Le thème source assombrit le primaire en mode sombre (chart-5 = indigo-800)
  // au lieu de l'éclaircir — d'où dark: 8 plutôt que la convention Mantine.
  primaryShade: { light: 7, dark: 8 },
  colors: { brand: indigo, gray: stone, dark: stoneDark },
  white: '#ffffff', // --background
  black: '#0c0a09', // --foreground
  fontFamily:
    '"Inter Variable", Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  // --radius: 0.45rem (7.2px). shadcn en dérive sm/md/lg/xl à -4/-2/+0/+4px ;
  // les noms Mantine sont décalés d'un cran pour rester alignés sur les usages
  // (bouton/input = sm, dialogue/surface = md, carte = lg).
  defaultRadius: 'sm',
  radius: {
    xs: '3px', // shadcn --radius-sm
    sm: '5px', // shadcn --radius-md — boutons, champs, badges
    md: '7px', // shadcn --radius-lg — dialogues, Paper
    lg: '11px', // shadcn --radius-xl — cartes
    xl: '999px', // « rounded-full » — utilisé pour les avatars et pastilles
  },
  // Échelle d'ombres Tailwind (shadow-xs → shadow-xl).
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  },
  fontSizes: {
    xs: '0.75rem', // 12
    sm: '0.8125rem', // 13
    md: '0.875rem', // 14 (base = text-sm)
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
  // Anneau de focus shadcn (3px, teinte --ring neutre) — styles dans index.css.
  focusClassName: 'app-focus',
  components: {
    // Surfaces : bordure fine + ombre très douce (carte shadcn).
    Paper: {
      defaultProps: { radius: 'md', withBorder: true, shadow: 'xs' },
    },
    Card: {
      defaultProps: { radius: 'lg', withBorder: true, shadow: 'xs' },
    },
    Button: {
      defaultProps: { radius: 'sm', size: 'sm' },
      // shadcn utilise font-medium (500) sur les boutons, Mantine 600.
      styles: { root: { fontWeight: 500 } },
    },
    ActionIcon: {
      defaultProps: { radius: 'sm' },
    },
    Badge: {
      defaultProps: { radius: 'sm' },
      // Écart visuel le plus marqué : Mantine passe les badges en MAJUSCULES
      // graisse 700, shadcn les laisse en casse normale, graisse 500.
      styles: { root: { textTransform: 'none', fontWeight: 500, letterSpacing: 0 } },
    },
    // Champs : légère ombre portée (shadow-xs) comme les inputs shadcn.
    Input: {
      styles: { input: { boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' } },
    },
    TextInput: { defaultProps: { size: 'sm' } },
    PasswordInput: { defaultProps: { size: 'sm' } },
    Select: { defaultProps: { size: 'sm' } },
    Textarea: { defaultProps: { size: 'sm' } },
    NumberInput: { defaultProps: { size: 'sm' } },
    Modal: {
      // Voile plat noir 50 % sans flou (bg-black/50 du Dialog shadcn).
      defaultProps: {
        radius: 'md',
        shadow: 'lg',
        overlayProps: { backgroundOpacity: 0.5, blur: 0 },
      },
      styles: { title: { fontWeight: 600, fontSize: '1rem' } },
    },
  },
})

/**
 * Mappe les tokens sémantiques shadcn (--background, --foreground, --border,
 * --muted-foreground, --ring) sur les variables CSS de Mantine, pour les deux
 * schémas de couleur.
 */
export const cssVariablesResolver: CSSVariablesResolver = (t) => ({
  variables: {},
  light: {
    '--mantine-color-body': t.white, // --background
    '--mantine-color-text': t.black, // --foreground
    '--mantine-color-dimmed': t.colors.gray[5], // --muted-foreground
    '--mantine-color-default-border': t.colors.gray[2], // --border
    '--app-surface': t.white, // --card / --popover
    '--app-ring': t.colors.gray[4], // --ring
  },
  dark: {
    '--mantine-color-body': t.colors.dark[9], // --background
    '--mantine-color-text': t.colors.dark[0], // --foreground
    '--mantine-color-dimmed': t.colors.dark[3], // --muted-foreground
    '--mantine-color-default-border': 'rgba(255, 255, 255, 0.1)', // --border
    '--app-surface': t.colors.dark[7], // --card / --popover
    '--app-ring': t.colors.dark[4], // --ring
  },
})
