import { createTheme } from '@mui/material/styles'
import { frFR } from '@mui/material/locale'

/**
 * Thème MUI de l'application.
 * Interface entièrement en français (cf. cahier des charges §3.4).
 */
export const theme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: { main: '#1565c0' },
      secondary: { main: '#ef6c00' },
      background: { default: '#f5f6fa' },
    },
    typography: {
      fontFamily: [
        'Roboto',
        '-apple-system',
        'Segoe UI',
        'Helvetica',
        'Arial',
        'sans-serif',
      ].join(','),
      // Min 16px pour éviter le zoom auto iOS (cf. FORM-09)
      fontSize: 16,
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiButton: {
        styleOverrides: {
          // Cibles tactiles min 48px (cf. accessibilité mobile)
          root: { minHeight: 48 },
        },
      },
    },
  },
  frFR,
)
