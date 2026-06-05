import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import dayjs from 'dayjs'
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import { fetchUserAudit, updateUser, type AppUser } from '../api/users'
import type { Role } from '../api/types'
import { RoleSelect } from './RoleSelect'
import { actionMeta } from './auditMeta'

function errMsg(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
    fallback
  )
}

export function UserDetailDialog({
  user,
  onClose,
}: {
  user: AppUser | null
  onClose: () => void
}) {
  const [tab, setTab] = useState(0)

  useEffect(() => {
    if (user) setTab(0)
  }, [user])

  return (
    <Dialog open={Boolean(user)} onClose={onClose} fullWidth maxWidth="sm">
      {user && (
        <>
          <DialogTitle sx={{ pb: 0 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44, fontWeight: 700 }}>
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }} noWrap>
                  {user.username}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip
                    size="small"
                    label={user.role === 'admin' ? 'Administrateur' : 'Organisateur'}
                    color={user.role === 'admin' ? 'primary' : 'default'}
                    variant={user.role === 'admin' ? 'filled' : 'outlined'}
                    sx={{ height: 20, fontSize: 11, fontWeight: 600 }}
                  />
                  <Chip
                    size="small"
                    label={user.is_active ? 'Actif' : 'Inactif'}
                    color={user.is_active ? 'success' : 'default'}
                    variant={user.is_active ? 'filled' : 'outlined'}
                    sx={{ height: 20, fontSize: 11, fontWeight: 600 }}
                  />
                </Stack>
              </Box>
              <IconButton onClick={onClose} size="small">
                <CloseRoundedIcon />
              </IconButton>
            </Stack>
          </DialogTitle>

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ px: 3, mt: 1, borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Tab label="Profil" />
            <Tab label="Activité" />
          </Tabs>

          <DialogContent sx={{ minHeight: 320 }}>
            {tab === 0 ? (
              <ProfileTab user={user} onSaved={onClose} />
            ) : (
              <ActivityTab userId={user.id} />
            )}
          </DialogContent>
        </>
      )}
    </Dialog>
  )
}

// --- Onglet Profil ---------------------------------------------------------

function ProfileTab({ user, onSaved }: { user: AppUser; onSaved: () => void }) {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState<Role>(user.role)

  useEffect(() => {
    setUsername(user.username)
    setEmail(user.email)
    setRole(user.role)
  }, [user])

  const mutation = useMutation({
    mutationFn: () => updateUser(user.id, { username, email, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      enqueueSnackbar('Utilisateur modifié.', { variant: 'success' })
      onSaved()
    },
    onError: (e) => enqueueSnackbar(errMsg(e, 'Modification impossible.'), { variant: 'error' }),
  })

  const valid = username.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) mutation.mutate()
  }

  return (
    <Box component="form" onSubmit={onSubmit} sx={{ pt: 1 }}>
      <Stack spacing={2.5}>
        <TextField
          label="Nom d'utilisateur"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
        />
        <RoleSelect value={role} onChange={setRole} />
        <Box sx={{ textAlign: 'right' }}>
          <Button type="submit" variant="contained" disabled={!valid || mutation.isPending}>
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </Button>
        </Box>
      </Stack>
    </Box>
  )
}

// --- Onglet Activité (logs) ------------------------------------------------

function ActivityTab({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-audit', userId],
    queryFn: () => fetchUserAudit(userId),
  })

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    )
  }

  const logs = data ?? []
  if (logs.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 5 }}>
        Aucune activité enregistrée.
      </Typography>
    )
  }

  return (
    <Stack spacing={1.5} sx={{ pt: 1 }}>
      {logs.map((log, i) => {
        const meta = actionMeta(log.action)
        return (
          <Paper key={i} variant="outlined" sx={{ p: 1.75, borderRadius: 2, boxShadow: 'none' }}>
            <Stack direction="row" spacing={1.5}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: meta.color === 'default' ? 'text.secondary' : `${meta.color}.main`,
                  bgcolor: (t) =>
                    meta.color === 'default'
                      ? alpha(t.palette.text.primary, 0.06)
                      : alpha(t.palette[meta.color].main, 0.12),
                  '& svg': { fontSize: 20 },
                }}
              >
                {meta.icon}
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Chip
                    size="small"
                    label={log.action_label}
                    color={meta.color === 'default' ? undefined : meta.color}
                    variant={meta.color === 'default' ? 'outlined' : 'filled'}
                    sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {dayjs(log.created_at).format('DD/MM/YY HH:mm')}
                  </Typography>
                </Stack>
                {log.objet && (
                  <Typography variant="body2" sx={{ mt: 0.75 }}>
                    {log.objet}
                  </Typography>
                )}
                {log.ip_address && (
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ display: 'block', mt: 0.25 }}
                  >
                    IP {log.ip_address}
                  </Typography>
                )}
              </Box>
            </Stack>
          </Paper>
        )
      })}
    </Stack>
  )
}
