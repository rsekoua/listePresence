import { Box, Button, Container, Typography } from '@mui/material'
import { useAuth } from '../auth/AuthContext'

/**
 * Tableau de bord de l'organisateur (placeholder Sprint 1).
 * La liste des activités (MUI DataGrid) sera implémentée au Sprint 2.
 */
export function DashboardPage() {
  const { logout } = useAuth()
  return (
    <Container sx={{ py: 4 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h4" component="h1">
          Tableau de bord
        </Typography>
        <Button variant="outlined" onClick={logout}>
          Se déconnecter
        </Button>
      </Box>
      <Typography color="text.secondary" sx={{ mt: 2 }}>
        La liste des activités sera disponible au Sprint 2.
      </Typography>
    </Container>
  )
}
