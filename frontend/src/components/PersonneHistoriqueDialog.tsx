import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  Stack,
  Typography,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import EventRoundedIcon from '@mui/icons-material/EventRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import { fetchPersonneHistorique } from '../api/participants'

interface Props {
  numeroCni: string | null
  open: boolean
  onClose: () => void
}

export function PersonneHistoriqueDialog({ numeroCni, open, onClose }: Props) {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['personne-historique', numeroCni],
    queryFn: () => fetchPersonneHistorique(numeroCni as string),
    enabled: open && Boolean(numeroCni),
  })

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {data?.prenom?.charAt(0).toUpperCase() ?? '?'}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }} noWrap>
              {data ? `${data.prenom} ${data.nom}` : 'Chargement…'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {data?.structure}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {isLoading || !data ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Identité */}
            <Stack spacing={1.25}>
              {(
                [
                  ['Fonction', data.fonction],
                  ['Téléphone', data.telephone_wave],
                  ['Email', data.email],
                  ['N° CNI', data.numero_cni],
                ] as [string, string][]
              ).map(([label, value]) => (
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

            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', mb: 1 }}
            >
              <Typography variant="subtitle2">Participations</Typography>
              <Chip size="small" color="primary" label={data.nb_activites} />
            </Stack>

            <List disablePadding>
              {data.participations.map((p) => (
                <ListItemButton
                  key={p.participant_id}
                  onClick={() => {
                    navigate(`/activites/${p.activite_id}`)
                    onClose()
                  }}
                  sx={{ borderRadius: 2, mb: 0.5 }}
                >
                  <EventRoundedIcon
                    fontSize="small"
                    sx={{ color: 'text.disabled', mr: 1.5 }}
                  />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {p.activite_nom}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{ color: 'text.secondary', mt: 0.25 }}
                    >
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <PlaceRoundedIcon sx={{ fontSize: 13 }} />
                        <Typography variant="caption" noWrap>
                          {p.activite_lieu}
                        </Typography>
                      </Stack>
                      <Typography variant="caption">
                        {dayjs(p.horodatage).format('DD/MM/YYYY HH:mm')}
                      </Typography>
                    </Stack>
                  </Box>
                  <ChevronRightRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
