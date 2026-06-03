import { useLocation } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  Box,
  Breadcrumbs,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded'
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded'

const LABELS: { match: (path: string) => boolean; crumb: string }[] = [
  { match: (p) => p.startsWith('/dashboard'), crumb: "Vue d'ensemble" },
  { match: (p) => p.startsWith('/activites'), crumb: 'Détail activité' },
]

/**
 * En-tête de contenu (style template MUI Dashboard) :
 * fil d'Ariane à gauche, recherche / date / notifications à droite.
 * Masqué sous le point de rupture md (l'AppBar mobile prend le relais).
 */
export function AppHeader() {
  const { pathname } = useLocation()
  const current = LABELS.find((l) => l.match(pathname))?.crumb ?? 'Accueil'

  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'flex' },
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        mb: 3,
      }}
    >
      <Breadcrumbs separator={<NavigateNextRoundedIcon fontSize="small" />}>
        <Typography variant="body2" color="text.secondary">
          Tableau de bord
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {current}
        </Typography>
      </Breadcrumbs>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <TextField
          placeholder="Rechercher…"
          sx={{ width: 220, display: { xs: 'none', lg: 'block' } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            height: 36,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.secondary',
          }}
        >
          <CalendarTodayRoundedIcon fontSize="small" />
          <Typography variant="body2">
            {dayjs().format('DD MMM YYYY')}
          </Typography>
        </Box>
        <Tooltip title="Notifications">
          <IconButton
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
          >
            <NotificationsRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  )
}
