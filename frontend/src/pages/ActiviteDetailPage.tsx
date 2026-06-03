import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import NotesRoundedIcon from '@mui/icons-material/NotesRounded'
import { fetchActivite, fetchQrCode, updateActivite } from '../api/activites'
import type { StatutActivite } from '../api/types'

const STATUT: Record<
  StatutActivite,
  { label: string; color: 'success' | 'warning' | 'default' }
> = {
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
    <Box>
      {/* Fil d'Ariane + retour */}
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: 'center', mb: 2 }}
      >
        <Button
          size="small"
          color="inherit"
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate('/dashboard')}
        >
          Retour
        </Button>
        <Breadcrumbs>
          <Link
            component="button"
            underline="hover"
            color="inherit"
            onClick={() => navigate('/dashboard')}
          >
            Tableau de bord
          </Link>
          <Typography color="text.primary">{activite.nom}</Typography>
        </Breadcrumbs>
      </Stack>

      {/* Titre */}
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: 'center', mb: 3, flexWrap: 'wrap' }}
      >
        <Typography variant="h4" component="h1">
          {activite.nom}
        </Typography>
        <Chip size="small" label={statut.label} color={statut.color} />
      </Stack>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        sx={{ alignItems: 'flex-start' }}
      >
        {/* Informations */}
        <Paper sx={{ p: 3, flex: 1, width: '100%' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Informations
          </Typography>
          <Stack spacing={2.5}>
            <Info
              icon={<PlaceRoundedIcon fontSize="small" />}
              label="Lieu"
              value={activite.lieu}
            />
            <Info
              icon={<ScheduleRoundedIcon fontSize="small" />}
              label="Période"
              value={`${dayjs(activite.date_debut).format('DD/MM/YYYY HH:mm')} → ${dayjs(
                activite.date_fin,
              ).format('DD/MM/YYYY HH:mm')}`}
            />
            {activite.description && (
              <Info
                icon={<NotesRoundedIcon fontSize="small" />}
                label="Description"
                value={activite.description}
              />
            )}
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Button
              variant="contained"
              color={activite.statut === 'ouvert' ? 'warning' : 'success'}
              disabled={toggleStatut.isPending || activite.statut === 'archive'}
              onClick={() =>
                toggleStatut.mutate(activite.statut === 'ouvert' ? 'ferme' : 'ouvert')
              }
            >
              {activite.statut === 'ouvert'
                ? 'Fermer la collecte'
                : 'Ouvrir la collecte'}
            </Button>
            <Typography variant="body2" color="text.secondary">
              {activite.statut === 'ouvert'
                ? 'Les participants peuvent s’enregistrer.'
                : 'Le formulaire public est désactivé.'}
            </Typography>
          </Stack>
        </Paper>

        {/* QR Code */}
        <Paper sx={{ p: 3, width: { xs: '100%', md: 320 }, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            QR Code du formulaire
          </Typography>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              display: 'inline-flex',
              mb: 1.5,
            }}
          >
            {qrUrl ? (
              <Box
                component="img"
                src={qrUrl}
                alt="QR Code de l'activité"
                sx={{ width: 200, height: 200, display: 'block' }}
              />
            ) : (
              <CircularProgress sx={{ m: 8 }} />
            )}
          </Box>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: 'text.secondary',
              mb: 2,
              wordBreak: 'break-all',
            }}
          >
            {activite.form_url}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<DownloadRoundedIcon />}
            onClick={downloadQr}
            disabled={!qrUrl}
            fullWidth
          >
            Télécharger (PNG)
          </Button>
        </Paper>
      </Stack>
    </Box>
  )
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
      <Box sx={{ color: 'text.secondary', mt: 0.25 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
        <Typography variant="body1">{value}</Typography>
      </Box>
    </Stack>
  )
}
