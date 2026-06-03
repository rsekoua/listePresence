import { Box, Container, Paper, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'

/**
 * Formulaire public de collecte accessible via QR Code (route non protégée).
 * Sprint 1 : placeholder. Le formulaire complet arrive au Sprint 3.
 */
export function PublicFormPage() {
  const { token } = useParams<{ token: string }>()
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Formulaire de présence
          </Typography>
          <Typography color="text.secondary">
            Activité&nbsp;: <code>{token}</code>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Le formulaire de collecte sera disponible au Sprint 3.
          </Typography>
        </Paper>
      </Container>
    </Box>
  )
}
