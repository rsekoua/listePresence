import { useRef, useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/fr'
import {
  Avatar,
  Badge,
  Box,
  IconButton,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded'
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded'
import { useNotifications } from '../context/NotificationContext'

dayjs.extend(relativeTime)
dayjs.locale('fr')

export function NotificationBell({ sx }: { sx?: object }) {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications()
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  function handleOpen() {
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    if (unreadCount > 0) markAllRead()
  }

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton ref={anchorRef} onClick={handleOpen} sx={sx}>
          <Badge
            badgeContent={unreadCount}
            color="primary"
            max={99}
            invisible={unreadCount === 0}
          >
            <NotificationsRoundedIcon fontSize="small" />
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
        {/* En-tête */}
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
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

        {/* Liste */}
        {notifications.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <NotificationsRoundedIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Aucune notification
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.map((n) => (
              <Stack
                key={n.id}
                direction="row"
                spacing={1.5}
                sx={{
                  px: 2,
                  py: 1.5,
                  bgcolor: n.read ? 'transparent' : 'action.hover',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 0 },
                }}
              >
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: 'primary.light',
                    color: 'primary.dark',
                    flexShrink: 0,
                  }}
                >
                  <PersonAddRoundedIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                    {n.count === 1
                      ? '1 nouveau participant inscrit'
                      : `${n.count} nouveaux participants inscrits`}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{ display: 'block' }}
                  >
                    {n.activiteNom}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {dayjs(n.timestamp).fromNow()}
                  </Typography>
                </Box>
                {!n.read && (
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      mt: 0.75,
                      flexShrink: 0,
                    }}
                  />
                )}
              </Stack>
            ))}
          </Box>
        )}
      </Popover>
    </>
  )
}
