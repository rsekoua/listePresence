import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import dayjs from 'dayjs'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import NotesRoundedIcon from '@mui/icons-material/NotesRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import {
  cloneActivite,
  fetchActivite,
  fetchQrCode,
  updateActivite,
} from '../api/activites'
import type { StatutActivite } from '../api/types'
import { ActiviteFormDialog } from '../components/ActiviteFormDialog'
import { ParticipantsPanel } from '../components/ParticipantsPanel'

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
  const { enqueueSnackbar } = useSnackbar()
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

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
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['activite', id] })
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      enqueueSnackbar(
        updated.statut === 'ouvert'
          ? 'Collecte ouverte.'
          : 'Collecte fermée.',
        { variant: 'success' },
      )
    },
    onError: () => {
      enqueueSnackbar('Impossible de modifier le statut.', { variant: 'error' })
    },
  })

  const clone = useMutation({
    mutationFn: () => cloneActivite(id),
    onSuccess: (copie) => {
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      enqueueSnackbar(`Activité clonée : « ${copie.nom} ».`, { variant: 'success' })
      navigate(`/activites/${copie.id}`)
    },
    onError: () => enqueueSnackbar('Clonage impossible.', { variant: 'error' }),
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
      {/* Retour */}
      <Box sx={{ mb: 2 }}>
        <Button
          size="small"
          color="inherit"
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate('/dashboard')}
        >
          Retour aux activités
        </Button>
      </Box>

      {/* Titre + actions */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, mb: 3 }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexGrow: 1 }}>
          <Typography variant="h4" component="h1">
            {activite.nom}
          </Typography>
          <Chip size="small" label={statut.label} color={statut.color} />
        </Stack>
        <Stack direction="row" spacing={1}>
          {activite.can_edit && (
            <Button
              variant="outlined"
              startIcon={<EditRoundedIcon />}
              onClick={() => setEditOpen(true)}
            >
              Modifier
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<ContentCopyRoundedIcon />}
            disabled={clone.isPending}
            onClick={() => clone.mutate()}
          >
            Cloner
          </Button>
        </Stack>
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
            <Info
              icon={<PersonRoundedIcon fontSize="small" />}
              label="Organisateur"
              value={activite.created_by.username}
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
              disabled={
                !activite.can_edit ||
                toggleStatut.isPending ||
                activite.statut === 'archive'
              }
              onClick={() =>
                toggleStatut.mutate(activite.statut === 'ouvert' ? 'ferme' : 'ouvert')
              }
            >
              {activite.statut === 'ouvert'
                ? 'Fermer la collecte'
                : 'Ouvrir la collecte'}
            </Button>
            <Typography variant="body2" color="text.secondary">
              {!activite.can_edit
                ? 'Réservé au créateur de l’activité.'
                : activite.statut === 'ouvert'
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

      {/* Participants */}
      <Box sx={{ mt: 4 }}>
        <ParticipantsPanel activiteId={activite.id} />
      </Box>

      <ActiviteFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        activite={activite}
      />
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
