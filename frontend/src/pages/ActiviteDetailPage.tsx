import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import { fetchActivite, fetchQrCode, updateActivite } from '../api/activites'
import type { StatutActivite } from '../api/types'

const STATUT: Record<StatutActivite, { label: string; color: 'success' | 'warning' | 'default' }> = {
  ouvert: { label: 'Ouverte', color: 'success' },
  ferme: { label: 'Fermée', color: 'warning' },
  archive: { label: 'Archivée', color: 'default' },
}

export function ActiviteDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [qrUrl, setQrUrl] = useState<string | null>(null)

  const { data: activite, isLoading } = useQuery({
    queryKey: ['activite', id],
    queryFn: () => fetchActivite(id),
    enabled: Boolean(id),
  })

  // Récupération du QR Code (endpoint protégé → blob → object URL)
  useEffect(() => {
    let revoke: string | null = null
    if (id) {
      fetchQrCode(id).then((blob) => {
        const url = URL.createObjectURL(blob)
        revoke = url
        setQrUrl(url)
      })
    }
    return () => {
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [id])

  const toggleStatut = useMutation({
    mutationFn: (statut: StatutActivite) => updateActivite(id, { statut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activite', id] })
      queryClient.invalidateQueries({ queryKey: ['activites'] })
    },
  })

  const downloadQr = () => {
    if (!qrUrl || !activite) return
    const a = document.createElement('a')
    a.href = qrUrl
    a.download = `qrcode_${activite.nom.replace(/\s+/g, '_')}.png`
    a.click()
  }

  if (isLoading || !activite) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  const statut = STATUT[activite.statut]

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Button
            color="inherit"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => navigate('/dashboard')}
          >
            Retour
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 4 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          sx={{ alignItems: 'flex-start' }}
        >
          {/* Informations */}
          <Paper sx={{ p: 3, flex: 1, width: '100%' }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
              }}
            >
              <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
                {activite.nom}
              </Typography>
              <Chip size="small" label={statut.label} color={statut.color} />
            </Box>

            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Info label="Lieu" value={activite.lieu} />
              <Info
                label="Début"
                value={dayjs(activite.date_debut).format('DD/MM/YYYY HH:mm')}
              />
              <Info
                label="Fin"
                value={dayjs(activite.date_fin).format('DD/MM/YYYY HH:mm')}
              />
              {activite.description && (
                <Info label="Description" value={activite.description} />
              )}
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Button
              variant="outlined"
              color={activite.statut === 'ouvert' ? 'warning' : 'success'}
              disabled={toggleStatut.isPending || activite.statut === 'archive'}
              onClick={() =>
                toggleStatut.mutate(
                  activite.statut === 'ouvert' ? 'ferme' : 'ouvert',
                )
              }
            >
              {activite.statut === 'ouvert'
                ? 'Fermer la collecte'
                : 'Ouvrir la collecte'}
            </Button>
          </Paper>

          {/* QR Code */}
          <Paper sx={{ p: 3, width: { xs: '100%', md: 320 }, textAlign: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              QR Code du formulaire
            </Typography>
            {qrUrl ? (
              <Box
                component="img"
                src={qrUrl}
                alt="QR Code de l'activité"
                sx={{ width: 220, height: 220, mx: 'auto', display: 'block' }}
              />
            ) : (
              <CircularProgress sx={{ my: 6 }} />
            )}
            <Typography
              variant="caption"
              sx={{ display: 'block', color: 'text.secondary', mt: 1, mb: 2 }}
            >
              {activite.form_url}
            </Typography>
            <Button
              variant="contained"
              startIcon={<DownloadRoundedIcon />}
              onClick={downloadQr}
              disabled={!qrUrl}
              fullWidth
            >
              Télécharger (PNG)
            </Button>
          </Paper>
        </Stack>
      </Container>
    </Box>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body1">{value}</Typography>
    </Box>
  )
}
