import { createTheme, alpha } from '@mui/material/styles'
import { frFR } from '@mui/material/locale'

// Palette indigo/violet — SaaS moderne épuré
const INDIGO = '#4f46e5' // indigo 600
const INDIGO_DARK = '#4338ca' // indigo 700
const INDIGO_LIGHT = '#a5b4fc' // indigo 300
const VIOLET = '#7c3aed'
const INK = '#0f172a' // slate 900
const MUTED = '#64748b' // slate 500
const LINE = '#e8eaf0'
const CANVAS = '#f6f7fb'

// Ombres douces en couches (remplacent les ombres MUI dures)
const soft = (a = 1) =>
  `0 1px 2px rgba(15,23,42,${0.04 * a}), 0 4px 12px rgba(15,23,42,${0.06 * a})`

export const theme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: {
        main: INDIGO,
        dark: INDIGO_DARK,
        light: INDIGO_LIGHT,
        contrastText: '#ffffff',
      },
      secondary: { main: VIOLET },
      success: { main: '#059669' },
      warning: { main: '#d97706' },
      error: { main: '#e11d48' },
      info: { main: INDIGO },
      background: { default: CANVAS, paper: '#ffffff' },
      text: { primary: INK, secondary: MUTED },
      divider: LINE,
    },
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
      fontSize: 14,
      h1: { fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' },
      h2: { fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' },
      h3: { fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' },
      h4: { fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.01em' },
      h6: { fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      body2: { color: MUTED },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: CANVAS,
            backgroundImage:
              'radial-gradient(1200px 600px at 100% -10%, rgba(124,58,237,0.06), transparent 60%),' +
              'radial-gradient(1000px 500px at -10% 0%, rgba(79,70,229,0.06), transparent 55%)',
            backgroundAttachment: 'fixed',
          },
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: '#cbd5e1',
            borderRadius: 8,
            border: '2px solid transparent',
            backgroundClip: 'content-box',
          },
        },
      },
      // Taille « small » par défaut pour tous les champs
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiFormControl: { defaultProps: { size: 'small' } },
      MuiSelect: { defaultProps: { size: 'small' } },
      MuiInputBase: { defaultProps: { size: 'small' } },
      MuiAutocomplete: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: '#fff',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: LINE },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: INDIGO,
              boxShadow: `0 0 0 4px ${alpha(INDIGO, 0.12)}`,
            },
          },
        },
      },
      MuiButton: {
        defaultProps: { size: 'small', disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 10, paddingInline: 16, fontWeight: 600 },
          contained: ({ ownerState }) =>
            ownerState.color === 'primary'
              ? {
                  background: `linear-gradient(180deg, ${INDIGO} 0%, ${INDIGO_DARK} 100%)`,
                  boxShadow: `0 1px 2px rgba(15,23,42,0.08), 0 6px 16px ${alpha(INDIGO, 0.3)}`,
                  '&:hover': {
                    background: INDIGO_DARK,
                    boxShadow: `0 2px 4px rgba(15,23,42,0.1), 0 8px 22px ${alpha(INDIGO, 0.36)}`,
                  },
                }
              : {},
          outlined: { borderColor: LINE, '&:hover': { borderColor: '#cbd5e1' } },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${LINE}`,
            boxShadow: soft(),
          },
          elevation8: { border: 'none', boxShadow: '0 24px 60px rgba(15,23,42,0.18)' },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { border: `1px solid ${LINE}`, borderRadius: 16, boxShadow: soft() },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          colorDefault: {
            backgroundColor: alpha('#ffffff', 0.8),
            backdropFilter: 'blur(10px)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 8 },
          outlined: { borderColor: LINE },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: INK,
            borderRadius: 8,
            fontSize: 12,
            padding: '6px 10px',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            '&.Mui-selected': {
              backgroundColor: alpha(INDIGO, 0.1),
              color: INDIGO_DARK,
              '& .MuiListItemIcon-root': { color: INDIGO },
              '&:hover': { backgroundColor: alpha(INDIGO, 0.16) },
            },
          },
        },
      },
      MuiDivider: { styleOverrides: { root: { borderColor: LINE } } },
      MuiTableCell: {
        styleOverrides: { head: { fontWeight: 700, color: MUTED } },
      },
    },
  },
  frFR,
)
