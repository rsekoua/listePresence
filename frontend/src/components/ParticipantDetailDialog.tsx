import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import {
  Avatar,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import { fetchParticipantPhoto, type Participant } from '../api/participants'

interface Props {
  activiteId: string
  participant: Participant | null
  open: boolean
  onClose: () => void
}

export function ParticipantDetailDialog({
  activiteId,
  participant,
  open,
  onClose,
}: Props) {
  const [recto, setRecto] = useState<string | null>(null)
  const [verso, setVerso] = useState<string | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !participant) return
    let urls: string[] = []
    setRecto(null)
    setVerso(null)
    Promise.all([
      fetchParticipantPhoto(activiteId, participant.id, 'recto'),
      fetchParticipantPhoto(activiteId, participant.id, 'verso'),
    ]).then(([r, v]) => {
      const ru = URL.createObjectURL(r)
      const vu = URL.createObjectURL(v)
      urls = [ru, vu]
      setRecto(ru)
      setVerso(vu)
    })
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [open, participant, activiteId])

  if (!participant) return null

  const rows: [string, string][] = [
    ['Structure', participant.structure],
    ['Fonction', participant.fonction],
    ['Téléphone', participant.telephone_wave],
    ['Email', participant.email],
    ['N° CNI', participant.numero_cni],
    ['Enregistré le', dayjs(participant.horodatage).format('DD/MM/YYYY à HH:mm')],
  ]

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {participant.prenom.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>
                {participant.prenom} {participant.nom}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {participant.structure}
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.25}>
            {rows.map(([label, value]) => (
              <Stack
                key={label}
                direction="row"
                sx={{ justifyContent: 'space-between', gap: 2 }}
              >
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
                  {value}
                </Typography>
              </Stack>
            ))}
          </Stack>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Pièce d'identité (cliquer pour agrandir)
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <CniThumb label="Recto" url={recto} onZoom={setZoom} />
            <CniThumb label="Verso" url={verso} onZoom={setZoom} />
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Zoom plein écran */}
      <Dialog open={Boolean(zoom)} onClose={() => setZoom(null)} maxWidth="lg">
        {zoom && (
          <Box
            component="img"
            src={zoom}
            alt="CNI"
            sx={{ display: 'block', maxWidth: '90vw', maxHeight: '85vh' }}
            onClick={() => setZoom(null)}
          />
        )}
      </Dialog>
    </>
  )
}

function CniThumb({
  label,
  url,
  onZoom,
}: {
  label: string
  url: string | null
  onZoom: (u: string) => void
}) {
  return (
    <Box sx={{ flex: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box
        sx={{
          mt: 0.5,
          height: 130,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          cursor: url ? 'zoom-in' : 'default',
        }}
        onClick={() => url && onZoom(url)}
      >
        {url ? (
          <Box
            component="img"
            src={url}
            alt={label}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Typography variant="caption" color="text.disabled">
            Chargement…
          </Typography>
        )}
      </Box>
    </Box>
  )
}
