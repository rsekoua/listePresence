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
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded'
import { exportQrPdf } from '../api/exports'
import {
  cloneActivite,
  fetchActivite,
  fetchQrCode,
  updateActivite,
} from '../api/activites'
import type { StatutActivite } from '../api/types'
import { ActiviteFormDialog } from '../components/ActiviteFormDialog'
import { ParticipantsPanel } from '../components/ParticipantsPanel'
import { ExportHistoryPanel } from '../components/ExportHistoryPanel'

const STATUT: Record<
  StatutActivite,
  { label: string; color: 'success' | 'warning' | 'default'; icon: React.ReactElement }
> = {
  ouvert: { label: 'Ouverte', color: 'success', icon: <LockOpenRoundedIcon /> },
  ferme: { label: 'Fermée', color: 'warning', icon: <LockRoundedIcon /> },
  archive: { label: 'Archivée', color: 'default', icon: <Inventory2RoundedIcon /> },
}

export function ActiviteDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [qrPdfLoading, setQrPdfLoading] = useState(false)

  const { data: activite, isLoading, isError } = useQuery({
    queryKey: ['activite', id],
    queryFn: () => fetchActivite(id),
    enabled: Boolean(id),
    retry: false,
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

  const downloadQrPdf = async () => {
    setQrPdfLoading(true)
    try {
      await exportQrPdf(id)
    } catch {
      enqueueSnackbar('Téléchargement du PDF impossible.', { variant: 'error' })
    } finally {
      setQrPdfLoading(false)
    }
  }

  const downloadQr = () => {
    if (!qrUrl || !activite) return
    const a = document.createElement('a')
    a.href = qrUrl
    a.download = `qrcode_${activite.nom.replace(/\s+/g, '_')}.png`
    a.click()
  }

  if (isError) {
    return (
      <Box sx={{ maxWidth: 460, mx: 'auto', mt: 8, textAlign: 'center' }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Activité introuvable
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Cette activité n'existe pas ou vous n'avez pas l'autorisation d'y accéder.
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => navigate('/dashboard')}
          >
            Retour au tableau de bord
          </Button>
        </Paper>
      </Box>
    )
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
        sx={{ alignItems: { sm: 'flex-start' }, mb: 3 }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h4" component="h1">
              {activite.nom}
            </Typography>
            <Chip
              size="small"
              icon={statut.icon}
              label={statut.label}
              color={statut.color}
              variant="outlined"
              sx={{
                fontWeight: 600,
                fontSize: 12,
                height: 24,
                '& .MuiChip-icon': { fontSize: 14, ml: 0.5 },
              }}
            />
          </Stack>
          <Stack
            direction="row"
            spacing={2}
            sx={{ mt: 0.75, color: 'text.secondary', flexWrap: 'wrap' }}
          >
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <PlaceRoundedIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2" sx={{ fontSize: 12}}>
                {activite.ville} · {activite.lieu}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <ScheduleRoundedIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2" sx={{ fontSize: 12}}>
                {dayjs(activite.date_debut).format('DD/MM/YYYY')}
              </Typography>
            </Stack>
          </Stack>
        </Box>
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

      {/* Bloc unique : informations + QR + action */}
      <Paper sx={{ p: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          divider={
            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: 'none', md: 'block' } }}
            />
          }
        >
          {/* Informations en grille 2 colonnes */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Informations
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                rowGap: 2.5,
                columnGap: 3,
              }}
            >
              <Info
                icon={<PlaceRoundedIcon fontSize="small" />}
                label="Ville"
                value={activite.ville}
              />
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
                <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                  <Info
                    icon={<NotesRoundedIcon fontSize="small" />}
                    label="Description"
                    value={activite.description}
                  />
                </Box>
              )}
            </Box>
          </Box>

          {/* QR Code compact à droite */}
          <Stack
            spacing={1.5}
            sx={{
              alignItems: 'center',
              flexShrink: 0,
              width: { xs: '100%', md: 220 },
            }}
          >
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                display: 'inline-flex',
              }}
            >
              {qrUrl ? (
                <Box
                  component="img"
                  src={qrUrl}
                  alt="QR Code de l'activité"
                  sx={{ width: 150, height: 150, display: 'block' }}
                />
              ) : (
                <CircularProgress sx={{ m: 6 }} />
              )}
            </Box>
            <Link
              href={activite.form_url}
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
              underline="hover"
              sx={{ textAlign: 'center', wordBreak: 'break-all' }}
            >
              {activite.form_url}
            </Link>
            <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadRoundedIcon />}
                onClick={downloadQr}
                disabled={!qrUrl}
                fullWidth
              >
                PNG
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={
                  qrPdfLoading ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <PictureAsPdfRoundedIcon />
                  )
                }
                onClick={downloadQrPdf}
                disabled={qrPdfLoading}
                fullWidth
              >
                PDF
              </Button>
            </Stack>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2.5 }} />

        {/* Action ouvrir / fermer */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { sm: 'center' } }}
        >
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
            sx={{ flexShrink: 0 }}
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

      {/* Participants */}
      <Box sx={{ mt: 4 }}>
        <ParticipantsPanel
          activiteId={activite.id}
          canAdd={activite.can_edit && activite.statut === 'ouvert'}
        />
      </Box>

      {/* Historique des exports (EXP-06) */}
      <ExportHistoryPanel activiteId={activite.id} />

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
