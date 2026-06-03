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
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import { fetchMe } from '../api/activites'
import { useAuth } from '../auth/AuthContext'

const DRAWER_WIDTH = 248

interface NavItem {
  label: string
  icon: ReactNode
  path?: string
  soon?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', icon: <DashboardRoundedIcon />, path: '/dashboard' },
  { label: 'Participants', icon: <GroupsRoundedIcon />, soon: true },
  { label: 'Exports', icon: <FileDownloadRoundedIcon />, soon: true },
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

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 2.5,
          height: 64,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'common.white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <QrCode2RoundedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }}>
            Présence
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Espace organisateur
          </Typography>
        </Box>
      </Box>
      <Divider />

      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {NAV_ITEMS.map((item) => (
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

      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          MVP — Sprint 2
        </Typography>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Barre supérieure */}
      <AppBar
        position="fixed"
        color="default"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          {!isDesktop && (
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 1 }}
            >
              <MenuRoundedIcon />
            </IconButton>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Compte">
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 15 }}>
                {(me?.username ?? '?').charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
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
        </Toolbar>
      </AppBar>

      {/* Navigation latérale */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
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
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Contenu */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
