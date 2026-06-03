import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import {
  Alert,
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
import { loginRequest } from '../api/activites'
import { useAuth } from '../auth/AuthContext'

const schema = z.object({
  username: z.string().min(1, "L'identifiant est requis"),
  password: z.string().min(1, 'Le mot de passe est requis'),
})

type LoginForm = z.infer<typeof schema>

/**
 * Page de connexion de l'organisateur (AUTH-01).
 */
export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (data: LoginForm) => loginRequest(data.username, data.password),
    onSuccess: (tokens) => {
      login(tokens.access, tokens.refresh)
      navigate('/dashboard', { replace: true })
    },
  })

  const errorMessage = mutation.isError
    ? isAxiosError(mutation.error) && mutation.error.response?.status === 401
      ? 'Identifiant ou mot de passe incorrect.'
      : 'Une erreur est survenue. Réessayez.'
    : null

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="xs" disableGutters>
        <Paper elevation={8} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {/* Bandeau de marque */}
          <Box
            sx={{
              px: 4,
              pt: 4,
              pb: 5,
              textAlign: 'center',
              color: 'common.white',
              bgcolor: 'primary.main',
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
            onSubmit={handleSubmit((data) => mutation.mutate(data))}
            sx={{
              p: 4,
              mt: -2,
              bgcolor: 'background.paper',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}
            >
              Connexion à votre compte
            </Typography>

            <Stack spacing={2.5}>
              {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

              <TextField
                label="Identifiant"
                fullWidth
                autoComplete="username"
                autoFocus
                error={Boolean(errors.username)}
                helperText={errors.username?.message}
                {...register('username')}
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
                type={showPassword ? 'text' : 'password'}
                fullWidth
                autoComplete="current-password"
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
                {...register('password')}
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
                disabled={mutation.isPending}
                sx={{ py: 1.2, fontWeight: 600 }}
              >
                {mutation.isPending ? 'Connexion…' : 'Se connecter'}
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
            color: 'text.secondary',
          }}
        >
          MVP — Sprint 2 (authentification JWT)
        </Typography>
      </Container>
    </Box>
  )
}
