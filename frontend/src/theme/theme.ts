import { createTheme, alpha } from '@mui/material/styles'
import { frFR } from '@mui/material/locale'

/**
 * Thème MUI de l'application — design professionnel et sobre.
 * Interface entièrement en français (cf. cahier des charges §3.4).
 */
export const theme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: {
        main: '#2563eb',
        dark: '#1e40af',
        light: '#60a5fa',
        contrastText: '#ffffff',
      },
      secondary: { main: '#0f766e' },
      success: { main: '#16a34a' },
      warning: { main: '#d97706' },
      error: { main: '#dc2626' },
      info: { main: '#2563eb' },
      background: {
        default: '#f4f6fb',
        paper: '#ffffff',
      },
      text: {
        primary: '#1f2937',
        secondary: '#6b7280',
      },
      divider: '#e5e7eb',
    },
    typography: {
      fontFamily: [
        '"Inter"',
        'Roboto',
        '-apple-system',
        'Segoe UI',
        'Helvetica',
        'Arial',
        'sans-serif',
      ].join(','),
      fontSize: 14,
      h1: { fontSize: '2rem', fontWeight: 700 },
      h2: { fontSize: '1.6rem', fontWeight: 700 },
      h3: { fontSize: '1.4rem', fontWeight: 700 },
      h4: { fontSize: '1.25rem', fontWeight: 700 },
      h5: { fontSize: '1.125rem', fontWeight: 700 },
      h6: { fontSize: '1rem', fontWeight: 600 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 10 },
    components: {
      // Taille « small » par défaut pour tous les champs du projet.
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiFormControl: { defaultProps: { size: 'small' } },
      MuiSelect: { defaultProps: { size: 'small' } },
      MuiInputBase: { defaultProps: { size: 'small' } },
      MuiAutocomplete: { defaultProps: { size: 'small' } },
      MuiButton: {
        defaultProps: { size: 'small', disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 8, paddingInline: 16 },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: '1px solid #e5e7eb',
          },
          elevation8: {
            border: 'none',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { border: '1px solid #e5e7eb', borderRadius: 14 },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          colorDefault: { backgroundColor: '#ffffff' },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 600 } },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            '&.Mui-selected': {
              backgroundColor: alpha('#2563eb', 0.12),
              '&:hover': { backgroundColor: alpha('#2563eb', 0.18) },
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 700, color: '#6b7280' },
        },
      },
    },
  },
  frFR,
)
