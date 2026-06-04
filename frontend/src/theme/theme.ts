import { createTheme, alpha } from '@mui/material/styles'
import { frFR } from '@mui/material/locale'

// Palette Ocean Cyan — Frais, Lumineux & Serein
const CYAN = '#0891b2'       // Cyan 600 (Couleur principale)
const CYAN_DARK = '#0e7490'  // Cyan 700 (Survol et accents foncés)
const TEAL = '#0d9488'       // Teal 600 (Couleur secondaire pour les flux/variations)
const INK = '#0f172a'        // Slate 900 (Texte principal haute lisibilité)
const MUTED = '#475569'      // Slate 600 (Texte secondaire — Conforme WCAG AA)
const LINE = '#e2e8f0'       // Slate 200 (Bordures fines et épurées)
const CANVAS = '#f0f4f8'     // Fond de l'application tirant sur le bleu givré
const BORDER_HOVER = '#cbd5e1' 

// Ombres douces, fluides et diffuses inspirées de l'eau
const softShadow = (a = 1) =>
  `0 1px 3px rgba(14,116,144,${0.03 * a}), 0 4px 16px rgba(14,116,144,${0.05 * a})`

export const theme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: {
        main: CYAN,
        dark: CYAN_DARK,
        light: '#a5f3fc', // Cyan 200
        contrastText: '#ffffff',
      },
      secondary: { 
        main: TEAL,
        dark: '#115e59',
        light: '#99f6e4',
      },
      success: { main: '#059669' },
      warning: { main: '#ea580c' }, // Orange plus vif et moderne que le marron/ambre
      error: { main: '#ef4444' },
      info: { main: CYAN },
      background: { default: CANVAS, paper: '#ffffff' },
      text: { primary: INK, secondary: MUTED },
      divider: LINE,
    },
    spacing: 7, // Densité globale : réduit tous les p/m/gap (8 → 7, -12,5 %)
    typography: {
      fontFamily: [
        '"Inter Variable"',
        'Inter',
        '-apple-system',
        'Segoe UI',
        'Roboto',
        'Helvetica',
        'Arial',
        'sans-serif',
      ].join(','),
      fontSize: 13,
      h1: { fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: INK },
      h2: { fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: INK },
      h3: { fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: INK },
      h4: { fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: INK },
      h5: { fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em', color: INK },
      h6: { fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.01em', color: INK },
      subtitle1: { fontWeight: 600, color: INK },
      subtitle2: { fontWeight: 600, color: MUTED },
      body2: { color: MUTED },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    },
    shape: { borderRadius: 10 }, // Équilibre parfait et harmonieux (Balanced border radii)
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: CANVAS,
            // Halo lumineux bleu/cyan en arrière-plan comme sur la maquette
            backgroundImage:
              'radial-gradient(1000px 600px at 100% -5%, rgba(8,145,178,0.05), transparent 50%),' +
              'radial-gradient(800px 500px at 0% 0%, rgba(13,148,136,0.04), transparent 45%)',
            backgroundAttachment: 'fixed',
          },
          '*::-webkit-scrollbar': { width: 8, height: 8 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: '#cbd5e1',
            borderRadius: 8,
            border: '2px solid transparent',
            backgroundClip: 'content-box',
          },
          '*::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#94a3b8',
          },
        },
      },
      // Configuration de la taille globale compacte
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiFormControl: { defaultProps: { size: 'small' } },
      MuiSelect: { defaultProps: { size: 'small' } },
      MuiInputBase: { defaultProps: { size: 'small' } },
      MuiAutocomplete: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: '#ffffff',
            transition: 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: LINE },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: BORDER_HOVER },
            '&.Mui-focused': {
              boxShadow: `0 0 0 4px ${alpha(CYAN, 0.12)}`,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: CYAN,
                borderWidth: '1px',
              },
            },
          },
        },
      },
      MuiButton: {
        defaultProps: { size: 'small', disableElevation: true },
        styleOverrides: {
          root: { 
            borderRadius: 10, 
            paddingInline: 18, 
            fontWeight: 600,
            transition: 'all 0.2s ease-in-out'
          },
          contained: ({ ownerState }) =>
            ownerState.color === 'primary'
              ? {
                  background: `linear-gradient(135deg, ${CYAN} 0%, ${CYAN_DARK} 100%)`,
                  boxShadow: `0 1px 2px rgba(14,116,144,0.08), 0 4px 12px ${alpha(CYAN, 0.25)}`,
                  '&:hover': {
                    background: CYAN_DARK,
                    boxShadow: `0 2px 4px rgba(14,116,144,0.12), 0 6px 16px ${alpha(CYAN, 0.35)}`,
                  },
                }
              : {},
          outlined: { 
            borderColor: LINE, 
            color: INK,
            '&:hover': { 
              borderColor: BORDER_HOVER, 
              backgroundColor: alpha(CYAN, 0.02) 
            } 
          },
          text: {
            '&:hover': { backgroundColor: alpha(CYAN, 0.04) }
          }
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${LINE}`,
            boxShadow: softShadow(),
          },
          elevation8: { border: 'none', boxShadow: '0 20px 48px rgba(15,23,42,0.12)' },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { 
            border: `1px solid ${LINE}`, 
            borderRadius: 12, 
            boxShadow: softShadow() 
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          colorDefault: {
            backgroundColor: alpha('#ffffff', 0.85),
            backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${LINE}`,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 6 },
          outlined: { borderColor: LINE },
          clickable: {
            '&:hover': { backgroundColor: alpha(CYAN, 0.05) }
          }
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: INK,
            borderRadius: 6,
            fontSize: 12,
            padding: '6px 10px',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            marginBlock: 2,
            transition: 'all 0.15s ease-in-out',
            '&.Mui-selected': {
              backgroundColor: alpha(CYAN, 0.08),
              color: CYAN_DARK,
              fontWeight: 600,
              '& .MuiListItemIcon-root': { color: CYAN },
              '&:hover': { backgroundColor: alpha(CYAN, 0.12) },
            },
          },
        },
      },
      MuiDivider: { styleOverrides: { root: { borderColor: LINE } } },
      MuiTableCell: {
        styleOverrides: { 
          head: { 
            fontWeight: 700, 
            color: MUTED,
            backgroundColor: alpha(CANVAS, 0.4),
            borderBottom: `2px solid ${LINE}`
          },
          root: {
            borderBottom: `1px solid ${LINE}`
          }
        },
      },
    },
  },
  frFR,
)