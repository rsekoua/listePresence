import { Box, Container, Paper, Stack, Typography } from '@mui/material'
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded'
import { useParams } from 'react-router-dom'

/**
 * Formulaire public de collecte accessible via QR Code (route non protégée).
 * Sprint 1/2 : placeholder. Le formulaire complet arrive au Sprint 3.
 */
export function PublicFormPage() {
  const { token } = useParams<{ token: string }>()
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Container maxWidth="sm" disableGutters>
        <Paper elevation={8} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box
            sx={{
              bgcolor: 'primary.main',
              color: 'common.white',
              px: 4,
              py: 3,
              textAlign: 'center',
            }}
          >
            <QrCode2RoundedIcon sx={{ fontSize: 36 }} />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mt: 1 }}>
              Formulaire de présence
            </Typography>
          </Box>
          <Stack spacing={2} sx={{ p: 4 }}>
            <Typography color="text.secondary">
              Activité&nbsp;:
            </Typography>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'background.default',
                border: '1px solid',
                borderColor: 'divider',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: 13,
              }}
            >
              {token}
            </Box>
            <Typography color="text.secondary">
              Le formulaire de collecte (informations + photos CNI) sera
              disponible au Sprint 3.
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}
