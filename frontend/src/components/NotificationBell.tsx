import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/fr'
import {
  Avatar,
  Badge,
  Box,
  Chip,
  IconButton,
  MenuItem,
  Popover,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded'
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded'
import { useNotifications, type AppNotification } from '../context/NotificationContext'

dayjs.extend(relativeTime)
dayjs.locale('fr')

const shakeKeyframes = `
@keyframes bell-shake {
  0%,100% { transform: rotate(0deg); }
  15%      { transform: rotate(18deg); }
  30%      { transform: rotate(-16deg); }
  45%      { transform: rotate(12deg); }
  60%      { transform: rotate(-8deg); }
  75%      { transform: rotate(4deg); }
}
`

export function NotificationBell({ sx }: { sx?: object }) {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications()
  const [open, setOpen] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [filterActiviteId, setFilterActiviteId] = useState('')
  const anchorRef = useRef<HTMLButtonElement>(null)
  const prevUnread = useRef(unreadCount)
  const navigate = useNavigate()

  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      setShaking(true)
      const t = setTimeout(() => setShaking(false), 700)
      return () => clearTimeout(t)
    }
    prevUnread.current = unreadCount
  }, [unreadCount])

  function handleOpen() {
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setFilterActiviteId('')
    if (unreadCount > 0) markAllRead()
  }

  function handleNavigate(activiteId: string) {
    handleClose()
    navigate(`/activites/${activiteId}`)
  }

  return (
    <>
      <style>{shakeKeyframes}</style>
      <Tooltip title="Notifications">
        <IconButton ref={anchorRef} onClick={handleOpen} sx={sx}>
          <Badge badgeContent={unreadCount} color="error" max={99} invisible={unreadCount === 0}>
            <NotificationsRoundedIcon
              fontSize="small"
              sx={shaking ? { animation: 'bell-shake 0.7s ease' } : undefined}
            />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 320, mt: 1, overflow: 'hidden' } } }}
      >
        <Stack
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            gap: 1,
          }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Notifications
            </Typography>
            {notifications.length > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ cursor: 'pointer', '&:hover': { color: 'text.primary' } }}
                onClick={clearAll}
              >
                Effacer tout
              </Typography>
            )}
          </Stack>
          {(() => {
            const activites = Array.from(
              new Map(notifications.map((n) => [n.activiteId, n.activiteNom])).entries(),
            )
            if (activites.length < 2) return null
            return (
              <Select
                size="small"
                value={filterActiviteId}
                onChange={(e) => setFilterActiviteId(e.target.value)}
                displayEmpty
                sx={{ fontSize: 12, height: 28 }}
              >
                <MenuItem value=""><em>Toutes les activités</em></MenuItem>
                {activites.map(([id, nom]) => (
                  <MenuItem key={id} value={id} sx={{ fontSize: 12 }}>{nom}</MenuItem>
                ))}
              </Select>
            )
          })()}
        </Stack>

        <DailySummary notifications={notifications} />

        {notifications.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <NotificationsRoundedIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Aucune notification
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifications
              .filter((n) => !filterActiviteId || n.activiteId === filterActiviteId)
              .map((n) => (
                <NotificationItem key={n.id} n={n} onNavigate={handleNavigate} />
              ))}
          </Box>
        )}
      </Popover>
    </>
  )
}

function DailySummary({ notifications }: { notifications: AppNotification[] }) {
  const today = dayjs().startOf('day')
  const todayNotifs = notifications.filter((n) => dayjs(n.timestamp).isAfter(today))
  if (todayNotifs.length === 0) return null

  const totalInscrits = todayNotifs.reduce((acc, n) => acc + n.participants.length, 0)
  const activites = new Set(todayNotifs.map((n) => n.activiteId)).size

  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        bgcolor: (t) => t.palette.primary.main + '14',
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <PersonAddRoundedIcon sx={{ fontSize: 15, color: 'primary.main' }} />
      <Typography variant="caption" sx={{ color: 'primary.dark', fontWeight: 600 }}>
        Aujourd'hui :
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {totalInscrits} inscrit{totalInscrits > 1 ? 's' : ''} sur{' '}
        {activites} activité{activites > 1 ? 's' : ''}
      </Typography>
    </Box>
  )
}

function NotificationItem({
  n,
  onNavigate,
}: {
  n: AppNotification
  onNavigate: (activiteId: string) => void
}) {
  const MAX_SHOWN = 2
  const shown = n.participants.slice(0, MAX_SHOWN)
  const rest = n.participants.length - MAX_SHOWN

  return (
    <Box
      onClick={() => onNavigate(n.activiteId)}
      sx={{
        px: 2,
        py: 1.5,
        cursor: 'pointer',
        bgcolor: n.read ? 'transparent' : 'action.hover',
        borderBottom: '1px solid',
        borderColor: 'divider',
        transition: 'background-color 0.15s',
        '&:hover': { bgcolor: 'action.selected' },
        '&:last-child': { borderBottom: 0 },
      }}
    >
      <Stack direction="row" spacing={1.5}>
        <Avatar
          sx={{ width: 34, height: 34, bgcolor: 'primary.light', color: 'primary.dark', flexShrink: 0 }}
        >
          <PersonAddRoundedIcon sx={{ fontSize: 18 }} />
        </Avatar>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              {n.participants.length === 1
                ? '1 nouveau participant'
                : `${n.participants.length} nouveaux participants`}
            </Typography>
            {!n.read && (
              <Box
                sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'error.main', flexShrink: 0 }}
              />
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mb: 0.75 }}>
            {n.activiteNom}
          </Typography>

          <Stack spacing={0.5}>
            {shown.map((p) => (
              <Stack key={p.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: 'grey.200', color: 'grey.700' }}>
                  {p.prenom.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="caption" sx={{ fontWeight: 600 }} noWrap>
                  {p.prenom} {p.nom}
                </Typography>
                <Chip
                  label={p.structure}
                  size="small"
                  variant="outlined"
                  sx={{ height: 16, fontSize: 10, '& .MuiChip-label': { px: 0.75 } }}
                />
              </Stack>
            ))}
            {rest > 0 && (
              <Typography variant="caption" color="text.disabled">
                + {rest} autre{rest > 1 ? 's' : ''}
              </Typography>
            )}
          </Stack>

          <Tooltip title={dayjs(n.timestamp).format('DD/MM/YYYY HH:mm:ss')} placement="bottom-start">
            <Typography variant="caption" color="text.disabled" sx={{ display: 'inline-block', mt: 0.5 }}>
              {dayjs(n.timestamp).fromNow()}
            </Typography>
          </Tooltip>
        </Box>
      </Stack>
    </Box>
  )
}
