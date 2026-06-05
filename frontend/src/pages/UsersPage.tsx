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
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Radio,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { frFR } from '@mui/x-data-grid/locales'
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded'
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded'
import ToggleOnRoundedIcon from '@mui/icons-material/ToggleOnRounded'
import ToggleOffRoundedIcon from '@mui/icons-material/ToggleOffRounded'
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import { fetchMe } from '../api/activites'
import {
  createUser,
  deleteUser,
  fetchUsers,
  resetUserPassword,
  updateUser,
  type AppUser,
} from '../api/users'
import type { Role } from '../api/types'

function errMsg(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
    fallback
  )
}

export function UsersPage() {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: fetchMe })
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled: me?.role === 'admin',
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [resetFor, setResetFor] = useState<AppUser | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuUser, setMenuUser] = useState<AppUser | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] })

  const toggleActive = useMutation({
    mutationFn: (u: AppUser) => updateUser(u.id, { is_active: !u.is_active }),
    onSuccess: (u) => {
      invalidate()
      enqueueSnackbar(u.is_active ? 'Compte activé.' : 'Compte désactivé.', {
        variant: 'success',
      })
    },
    onError: (e) => enqueueSnackbar(errMsg(e, 'Action impossible.'), { variant: 'error' }),
  })

  const remove = useMutation({
    mutationFn: (u: AppUser) => deleteUser(u.id),
    onSuccess: () => {
      invalidate()
      enqueueSnackbar('Compte supprimé.', { variant: 'success' })
    },
    onError: (e) => enqueueSnackbar(errMsg(e, 'Suppression impossible.'), { variant: 'error' }),
  })

  const closeMenu = () => {
    setMenuAnchor(null)
    setMenuUser(null)
  }

  if (me && me.role !== 'admin') {
    return (
      <Box>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          Utilisateurs
        </Typography>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Accès réservé aux administrateurs.
          </Typography>
        </Paper>
      </Box>
    )
  }

  const columns: GridColDef<AppUser>[] = [
    {
      field: 'username',
      headerName: 'Utilisateur',
      flex: 1.3,
      minWidth: 200,
      renderCell: (params) => (
        <Stack
          direction="row"
          spacing={1.5}
          onClick={() => setEditUser(params.row)}
          sx={{
            alignItems: 'center',
            height: '100%',
            cursor: 'pointer',
            '&:hover .username': { color: 'primary.main', textDecoration: 'underline' },
          }}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.dark,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {params.row.username.charAt(0).toUpperCase()}
          </Avatar>
          <Typography className="username" variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {params.row.username}
          </Typography>
        </Stack>
      ),
    },
    { field: 'email', headerName: 'Email', flex: 1.4, minWidth: 200 },
    {
      field: 'role',
      headerName: 'Rôle',
      width: 140,
      renderCell: (params) => (
        <Stack sx={{ height: '100%', justifyContent: 'center' }}>
          <Chip
            size="small"
            label={params.row.role === 'admin' ? 'Administrateur' : 'Organisateur'}
            color={params.row.role === 'admin' ? 'primary' : 'default'}
            variant={params.row.role === 'admin' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      ),
    },
    {
      field: 'nb_activites',
      headerName: 'Activités',
      width: 100,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'is_active',
      headerName: 'Statut',
      width: 110,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Stack sx={{ height: '100%', justifyContent: 'center', alignItems: 'center' }}>
          <Chip
            size="small"
            label={params.row.is_active ? 'Actif' : 'Inactif'}
            color={params.row.is_active ? 'success' : 'default'}
            variant={params.row.is_active ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Créé le',
      width: 130,
      valueFormatter: (value) => dayjs(value as string).format('DD/MM/YYYY'),
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      filterable: false,
      align: 'right',
      renderCell: (params) => (
        <IconButton
          size="small"
          onClick={(e) => {
            setMenuAnchor(e.currentTarget)
            setMenuUser(params.row)
          }}
        >
          <MoreVertRoundedIcon fontSize="small" />
        </IconButton>
      ),
    },
  ]

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3 }}
      >
        <Box>
          <Typography variant="h4" component="h1">
            Utilisateurs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gérez les comptes organisateurs et administrateurs
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddRoundedIcon />}
          onClick={() => setCreateOpen(true)}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Nouvel utilisateur
        </Button>
      </Stack>

      <Paper sx={{ overflow: 'hidden' }}>
        <DataGrid
          rows={users ?? []}
          columns={columns}
          loading={isLoading}
          getRowId={(r) => r.id}
          disableRowSelectionOnClick
          disableColumnMenu
          rowHeight={56}
          columnHeaderHeight={48}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          pageSizeOptions={[25, 50, 100]}
          sx={{
            border: 0,
            height: 520,
            fontSize: 13,
            '--DataGrid-rowBorderColor': '#eef0f4',
            '& .MuiDataGrid-columnHeader': { bgcolor: '#f8fafc' },
            '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc' },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 700,
              color: 'text.secondary',
              textTransform: 'uppercase',
              fontSize: 11,
              letterSpacing: 0.4,
            },
            '& .MuiDataGrid-cell': { borderColor: '#eef0f4' },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
              outline: 'none',
            },
            '& .MuiDataGrid-footerContainer': { borderColor: '#eef0f4' },
          }}
          localeText={{
            ...frFR.components.MuiDataGrid.defaultProps.localeText,
            noRowsLabel: 'Aucun utilisateur',
          }}
        />
      </Paper>

      {/* Menu d'actions par ligne */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            setEditUser(menuUser)
            closeMenu()
          }}
        >
          <ListItemIcon>
            <EditRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Modifier</ListItemText>
        </MenuItem>
        <MenuItem
          disabled={menuUser?.id === me?.id}
          onClick={() => {
            if (menuUser) toggleActive.mutate(menuUser)
            closeMenu()
          }}
        >
          <ListItemIcon>
            {menuUser?.is_active ? (
              <ToggleOffRoundedIcon fontSize="small" />
            ) : (
              <ToggleOnRoundedIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>{menuUser?.is_active ? 'Désactiver' : 'Activer'}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setResetFor(menuUser)
            closeMenu()
          }}
        >
          <ListItemIcon>
            <LockResetRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Réinitialiser le mot de passe</ListItemText>
        </MenuItem>
        <MenuItem
          disabled={menuUser?.id === me?.id}
          onClick={() => {
            if (
              menuUser &&
              window.confirm(`Supprimer définitivement « ${menuUser.username} » ?`)
            ) {
              remove.mutate(menuUser)
            }
            closeMenu()
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteOutlineRoundedIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Supprimer</ListItemText>
        </MenuItem>
      </Menu>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditUserDialog user={editUser} onClose={() => setEditUser(null)} />
      <ResetPasswordDialog user={resetFor} onClose={() => setResetFor(null)} />
    </Box>
  )
}

// --- Dialogs ---------------------------------------------------------------

const ROLE_OPTIONS: { value: Role; label: string; desc: string }[] = [
  {
    value: 'organisateur',
    label: 'Organisateur',
    desc: 'Crée et gère ses propres activités.',
  },
  {
    value: 'admin',
    label: 'Administrateur',
    desc: 'Accès complet : toutes les activités et la gestion des comptes.',
  },
]

function RoleSelect({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
        Rôle
      </Typography>
      <Stack spacing={1.25}>
        {ROLE_OPTIONS.map((opt) => {
          const selected = value === opt.value
          return (
            <Box
              key={opt.value}
              role="button"
              onClick={() => onChange(opt.value)}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                p: 1.5,
                borderRadius: 2,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: (t) =>
                  selected ? alpha(t.palette.primary.main, 0.06) : 'transparent',
                boxShadow: (t) =>
                  selected ? `0 0 0 1px ${t.palette.primary.main}` : 'none',
                transition: 'all .15s ease',
                '&:hover': { borderColor: selected ? 'primary.main' : 'text.disabled' },
              }}
            >
              <Radio checked={selected} size="small" sx={{ p: 0, mt: 0.25 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {opt.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {opt.desc}
                </Typography>
              </Box>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}

function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('organisateur')

  const reset = () => {
    setUsername('')
    setEmail('')
    setPassword('')
    setRole('organisateur')
  }

  const mutation = useMutation({
    mutationFn: () => createUser({ username, email, password, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      enqueueSnackbar('Utilisateur créé.', { variant: 'success' })
      reset()
      onClose()
    },
    onError: (e) => enqueueSnackbar(errMsg(e, 'Création impossible.'), { variant: 'error' }),
  })

  const valid = username.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && password.length >= 8

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) mutation.mutate()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Nouvel utilisateur</DialogTitle>
      <form onSubmit={onSubmit}>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <TextField
              label="Mot de passe initial"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={password.length > 0 && password.length < 8}
              helperText={
                password.length > 0 && password.length < 8 ? 'Au moins 8 caractères.' : ' '
              }
              fullWidth
            />
            <RoleSelect value={role} onChange={setRole} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">
            Annuler
          </Button>
          <Button type="submit" variant="contained" disabled={!valid || mutation.isPending}>
            {mutation.isPending ? 'Création…' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function EditUserDialog({ user, onClose }: { user: AppUser | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('organisateur')

  useEffect(() => {
    if (user) {
      setUsername(user.username)
      setEmail(user.email)
      setRole(user.role)
    }
  }, [user])

  const mutation = useMutation({
    mutationFn: () => updateUser(user!.id, { username, email, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      enqueueSnackbar('Utilisateur modifié.', { variant: 'success' })
      onClose()
    },
    onError: (e) => enqueueSnackbar(errMsg(e, 'Modification impossible.'), { variant: 'error' }),
  })

  const valid = username.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) mutation.mutate()
  }

  return (
    <Dialog open={Boolean(user)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Modifier l'utilisateur</DialogTitle>
      <form onSubmit={onSubmit}>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <RoleSelect value={role} onChange={setRole} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">
            Annuler
          </Button>
          <Button type="submit" variant="contained" disabled={!valid || mutation.isPending}>
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function ResetPasswordDialog({
  user,
  onClose,
}: {
  user: AppUser | null
  onClose: () => void
}) {
  const { enqueueSnackbar } = useSnackbar()
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => resetUserPassword(user!.id, password),
    onSuccess: () => {
      enqueueSnackbar('Mot de passe réinitialisé.', { variant: 'success' })
      setPassword('')
      onClose()
    },
    onError: (e) => enqueueSnackbar(errMsg(e, 'Réinitialisation impossible.'), { variant: 'error' }),
  })

  return (
    <Dialog open={Boolean(user)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Nouveau mot de passe pour <strong>{user?.username}</strong> (8 caractères min.).
        </Typography>
        <TextField
          label="Nouveau mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          autoFocus
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Annuler
        </Button>
        <Button
          variant="contained"
          disabled={password.length < 8 || mutation.isPending}
          onClick={() => mutation.mutate()}
          startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Réinitialiser
        </Button>
      </DialogActions>
    </Dialog>
  )
}
