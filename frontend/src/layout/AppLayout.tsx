import { useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded'
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded'
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import InfoRoundedIcon from '@mui/icons-material/InfoRounded'
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded'
import { fetchMe } from '../api/activites'
import { useAuth } from '../auth/AuthContext'
import { AppHeader } from './AppHeader'

const DRAWER_WIDTH = 252

interface NavItem {
  label: string
  icon: ReactNode
  path?: string
  soon?: boolean
  adminOnly?: boolean
}

const MAIN_NAV: NavItem[] = [
  { label: "Vue d'ensemble", icon: <DashboardRoundedIcon />, path: '/dashboard' },
  { label: 'Participants', icon: <GroupsRoundedIcon />, path: '/participants' },
  {
    label: 'Utilisateurs',
    icon: <ManageAccountsRoundedIcon />,
    path: '/utilisateurs',
    adminOnly: true,
  },
  {
    label: "Journal d'audit",
    icon: <HistoryRoundedIcon />,
    path: '/journal',
    adminOnly: true,
  },
  // { label: 'Exports', icon: <FileDownloadRoundedIcon />, soon: true },
]

const SECONDARY_NAV: NavItem[] = [
  { label: 'Paramètres', icon: <SettingsRoundedIcon />, path: '/parametres' },
  { label: 'À propos', icon: <InfoRoundedIcon />, path: '/a-propos' },
  { label: 'Aide', icon: <HelpOutlineRoundedIcon />, path: '/aide' },
]

export function AppLayout() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: fetchMe })

  const isActive = (path?: string) =>
    Boolean(path && location.pathname.startsWith(path))

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Bloc marque (style sélecteur du template) */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          m: 1.5,
          p: 1,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: 'common.white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 6px 16px rgba(79,70,229,0.35)',
          }}
        >
          <QrCode2RoundedIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }} noWrap>
            Liste de Présence
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Espace organisateur
          </Typography>
        </Box>
        <UnfoldMoreRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
      </Box>
      <Divider />

      {/* Navigation principale */}
      <List sx={{ px: 1.5, py: 1.5, flexGrow: 1 }}>
        {MAIN_NAV.filter((item) => !item.adminOnly || me?.role === 'admin').map((item) => (
          <ListItemButton
            key={item.label}
            selected={isActive(item.path)}
            disabled={item.soon}
            onClick={() => {
              if (item.path) {
                navigate(item.path)
                setMobileOpen(false)
              }
            }}
            sx={{ mb: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 600 } } }}
            />
            {item.soon && <Chip label="Bientôt" size="small" variant="outlined" />}
          </ListItemButton>
        ))}
      </List>

      {/* Navigation secondaire */}
      <List sx={{ px: 1.5 }}>
        {SECONDARY_NAV.map((item) => (
          <ListItemButton
            key={item.label}
            selected={isActive(item.path)}
            disabled={item.soon}
            onClick={() => {
              if (item.path) {
                navigate(item.path)
                setMobileOpen(false)
              }
            }}
            sx={{ mb: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              slotProps={{ primary: { sx: { fontSize: 14 } } }}
            />
          </ListItemButton>
        ))}
      </List>

      <Divider />

      {/* Carte utilisateur */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1.5 }}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 15 }}>
          {(me?.username ?? '?').charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
              {me?.username ?? '—'}
            </Typography>
            {me?.role && (
              <Chip
                size="small"
                label={me.role === 'admin' ? 'Admin' : 'Organisateur'}
                color={me.role === 'admin' ? 'primary' : 'default'}
                sx={{ height: 18, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
              />
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" noWrap>
            {me?.email}
          </Typography>
        </Box>
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <MoreVertRoundedIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* AppBar mobile */}
      {!isDesktop && (
        <AppBar position="fixed" color="default" elevation={0}
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Toolbar sx={{ gap: 1 }}>
            <IconButton edge="start" onClick={() => setMobileOpen(true)}>
              <MenuRoundedIcon />
            </IconButton>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: 1.5,
                bgcolor: 'primary.main',
                color: 'common.white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <QrCode2RoundedIcon fontSize="small" />
            </Box>
            <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>Présence</Typography>
            <IconButton>
              <NotificationsRoundedIcon fontSize="small" />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Menu déconnexion */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontWeight: 600 }}>{me?.username}</Typography>
          <Typography variant="caption" color="text.secondary">
            {me?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={logout}>
          <ListItemIcon>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
          Déconnexion
        </MenuItem>
      </Menu>

      {/* Navigation latérale */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isDesktop ? 'permanent' : 'temporary'}
          open={isDesktop ? true : mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              border: 'none',
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Contenu */}
      <Box
        component="main"
        sx={{ flexGrow: 1, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}
      >
        {!isDesktop && <Toolbar />}
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
          <AppHeader />
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
