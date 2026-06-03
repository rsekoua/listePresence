import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import type { Activite, StatutActivite } from '../api/types'
import { ActiviteRowActions } from './ActiviteRowActions'

const STATUT: Record<
  StatutActivite,
  { label: string; color: 'success' | 'warning' | 'default' }
> = {
  ouvert: { label: 'Ouverte', color: 'success' },
  ferme: { label: 'Fermée', color: 'warning' },
  archive: { label: 'Archivée', color: 'default' },
}

/** Liste d'activités en cartes — utilisée sur mobile (la DataGrid est réservée au desktop). */
export function ActiviteCardList({
  activites,
  isLoading,
}: {
  activites: Activite[]
  isLoading: boolean
}) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (activites.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ textAlign: 'center', py: 5 }}>
        Aucune activité pour le moment
      </Typography>
    )
  }

  return (
    <Stack divider={<Divider />}>
      {activites.map((a) => {
        const s = STATUT[a.statut]
        return (
          <Box
            key={a.id}
            onClick={() => navigate(`/activites/${a.id}`)}
            sx={{
              p: 2,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'center', mb: 1 }}
            >
              <Avatar
                sx={{
                  width: 38,
                  height: 38,
                  bgcolor: 'primary.light',
                  color: 'primary.dark',
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                {a.nom.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography sx={{ fontWeight: 600 }} noWrap>
                  {a.nom}
                </Typography>
                <Chip size="small" label={s.label} color={s.color} sx={{ mt: 0.5 }} />
              </Box>
              <Box onClick={(e) => e.stopPropagation()}>
                <ActiviteRowActions activite={a} />
              </Box>
            </Stack>

            <Stack spacing={0.5} sx={{ pl: 0.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <PlaceRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary" noWrap>
                  {a.lieu}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <ScheduleRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {dayjs(a.date_debut).format('DD/MM/YYYY HH:mm')} →{' '}
                  {dayjs(a.date_fin).format('DD/MM/YYYY HH:mm')}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        )
      })}
    </Stack>
  )
}
