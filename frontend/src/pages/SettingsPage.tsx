import { useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded'
import { changePassword, fetchMe } from '../api/activites'

export function SettingsPage() {
  const { enqueueSnackbar } = useSnackbar()
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: fetchMe })

  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const mutation = useMutation({
    mutationFn: () => changePassword(ancien, nouveau),
    onSuccess: () => {
      enqueueSnackbar('Mot de passe mis à jour.', { variant: 'success' })
      setAncien('')
      setNouveau('')
      setConfirmation('')
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Impossible de changer le mot de passe.'
      enqueueSnackbar(detail, { variant: 'error' })
    },
  })

  const erreurConfirmation = confirmation.length > 0 && nouveau !== confirmation
  const peutValider =
    ancien.length > 0 &&
    nouveau.length >= 8 &&
    nouveau === confirmation &&
    !mutation.isPending

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (peutValider) mutation.mutate()
  }

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          Paramètres
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Votre profil et la sécurité de votre compte
        </Typography>
      </Box>

      {/* Profil */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Profil
        </Typography>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 22 }}>
            {me?.username.charAt(0).toUpperCase() ?? '?'}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{me?.username ?? '—'}</Typography>
            <Typography variant="body2" color="text.secondary">
              {me?.email ?? '—'}
            </Typography>
            {me?.role && (
              <Chip
                size="small"
                label={me.role === 'admin' ? 'Administrateur' : 'Organisateur'}
                color={me.role === 'admin' ? 'primary' : 'default'}
                sx={{ mt: 0.5 }}
              />
            )}
          </Box>
        </Stack>
      </Paper>

      {/* Changement de mot de passe */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Changer le mot de passe
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          8 caractères minimum.
        </Typography>
        <Divider sx={{ mb: 2.5 }} />
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              type="password"
              label="Mot de passe actuel"
              value={ancien}
              onChange={(e) => setAncien(e.target.value)}
              autoComplete="current-password"
              fullWidth
            />
            <TextField
              type="password"
              label="Nouveau mot de passe"
              value={nouveau}
              onChange={(e) => setNouveau(e.target.value)}
              autoComplete="new-password"
              error={nouveau.length > 0 && nouveau.length < 8}
              helperText={
                nouveau.length > 0 && nouveau.length < 8
                  ? 'Au moins 8 caractères.'
                  : ' '
              }
              fullWidth
            />
            <TextField
              type="password"
              label="Confirmer le nouveau mot de passe"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="new-password"
              error={erreurConfirmation}
              helperText={erreurConfirmation ? 'Les mots de passe ne correspondent pas.' : ' '}
              fullWidth
            />
            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={!peutValider}
                startIcon={
                  mutation.isPending ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <LockResetRoundedIcon />
                  )
                }
              >
                Mettre à jour le mot de passe
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  )
}
