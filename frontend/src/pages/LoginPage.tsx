import { useState } from 'react'
import {
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'

/**
 * Page de connexion de l'organisateur.
 * Sprint 1 : affichage statique uniquement (la logique JWT arrive au Sprint 2).
 */
export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background:
          'linear-gradient(135deg, #1565c0 0%, #1e88e5 45%, #ef6c00 140%)',
      }}
    >
      <Container maxWidth="xs" disableGutters>
        <Paper
          elevation={8}
          sx={{ borderRadius: 3, overflow: 'hidden' }}
        >
          {/* Bandeau de marque */}
          <Box
            sx={{
              px: 4,
              pt: 4,
              pb: 5,
              textAlign: 'center',
              color: 'common.white',
              background:
                'linear-gradient(135deg, #1565c0 0%, #1e88e5 100%)',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 1.5,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <QrCode2RoundedIcon sx={{ fontSize: 38 }} />
            </Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              Gestion de Présence
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              Espace organisateur
            </Typography>
          </Box>

          {/* Formulaire */}
          <Box
            component="form"
            onSubmit={(e) => e.preventDefault()}
            sx={{ p: 4, mt: -2, bgcolor: 'background.paper', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
          >
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}
            >
              Connexion à votre compte
            </Typography>

            <Stack spacing={2.5}>
              <TextField
                label="Identifiant"
                name="username"
                fullWidth
                autoComplete="username"
                autoFocus
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                label="Mot de passe"
                name="password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                autoComplete="current-password"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={
                            showPassword
                              ? 'Masquer le mot de passe'
                              : 'Afficher le mot de passe'
                          }
                          onClick={() => setShowPassword((v) => !v)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? (
                            <VisibilityOffRoundedIcon fontSize="small" />
                          ) : (
                            <VisibilityRoundedIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Box sx={{ textAlign: 'right' }}>
                <Link href="#" underline="hover" variant="body2">
                  Mot de passe oublié&nbsp;?
                </Link>
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ py: 1.2, fontWeight: 600 }}
              >
                Se connecter
              </Button>
            </Stack>
          </Box>
        </Paper>

        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            mt: 2,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          MVP — Sprint 1 (interface sans logique d'authentification)
        </Typography>
      </Container>
    </Box>
  )
}
