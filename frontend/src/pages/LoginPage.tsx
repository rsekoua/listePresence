import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'

/**
 * Page de connexion de l'organisateur.
 * Sprint 1 : affichage statique uniquement (la logique JWT arrive au Sprint 2).
 */
export function LoginPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="xs">
        <Paper elevation={3} sx={{ p: 4 }}>
          <Stack spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
            <Box
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                width: 56,
                height: 56,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LockOutlinedIcon />
            </Box>
            <Typography variant="h5" component="h1" sx={{ textAlign: 'center' }}>
              Gestion de Présence
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: 'center' }}
            >
              Connexion organisateur
            </Typography>
          </Stack>

          <Box component="form" onSubmit={(e) => e.preventDefault()}>
            <Stack spacing={2}>
              <TextField
                label="Identifiant"
                name="username"
                fullWidth
                autoComplete="username"
              />
              <TextField
                label="Mot de passe"
                name="password"
                type="password"
                fullWidth
                autoComplete="current-password"
              />
              <Button type="submit" variant="contained" size="large" fullWidth>
                Se connecter
              </Button>
            </Stack>
          </Box>
        </Paper>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 2 }}
        >
          MVP — Sprint 1 (interface sans logique d'authentification)
        </Typography>
      </Container>
    </Box>
  )
}
