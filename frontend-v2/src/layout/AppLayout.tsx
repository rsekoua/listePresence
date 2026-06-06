import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useDisclosure } from '@mantine/hooks'
import {
  AppShell,
  Avatar,
  Badge,
  Box,
  Burger,
  Divider,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  rem,
} from '@mantine/core'
import {
  IconDotsVertical,
  IconHelpCircle,
  IconHistory,
  IconInfoCircle,
  IconLayoutDashboard,
  IconLogout,
  IconQrcode,
  IconSettings,
  IconUserCog,
  IconUsersGroup,
} from '@tabler/icons-react'
import type { Icon } from '@tabler/icons-react'
import { fetchMe } from '../api/activites'
import { useAuth } from '../auth/AuthContext'
import { AppHeader } from './AppHeader'

interface NavItem {
  label: string
  icon: Icon
  path: string
  adminOnly?: boolean
}

const MAIN_NAV: NavItem[] = [
  { label: "Vue d'ensemble", icon: IconLayoutDashboard, path: '/dashboard' },
  { label: 'Participants', icon: IconUsersGroup, path: '/participants' },
  { label: 'Utilisateurs', icon: IconUserCog, path: '/utilisateurs', adminOnly: true },
  
]

const SECONDARY_NAV: NavItem[] = [
  { label: 'Paramètres', icon: IconSettings, path: '/parametres' },
  // { label: 'Aide', icon: IconHelpCircle, path: '/aide' },
  { label: "Journal d'audit", icon: IconHistory, path: '/journal', adminOnly: true },
  { label: 'À propos', icon: IconInfoCircle, path: '/a-propos' },
]

// Style flat des entrées de nav : accent latéral gauche quand actif.
const navLinkStyles = {
  root: {
    borderRadius: rem(4),
    marginBottom: rem(1),
    paddingTop: rem(7),
    paddingBottom: rem(7),
    borderLeft: '2px solid transparent',
  },
  label: { fontSize: rem(13) },
}

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: fetchMe })

  const isActive = (path: string) => location.pathname.startsWith(path)

  const go = (path: string) => {
    navigate(path)
    close()
  }

  const renderNav = (items: NavItem[]) =>
    items
      .filter((item) => !item.adminOnly || me?.role === 'admin')
      .map((item) => {
        const active = isActive(item.path)
        return (
          <NavLink
            key={item.path}
            active={active}
            label={item.label}
            leftSection={<item.icon size={17} stroke={1.7} />}
            onClick={() => go(item.path)}
            variant="light"
            styles={{
              ...navLinkStyles,
              root: {
                ...navLinkStyles.root,
                borderLeftColor: active ? 'var(--mantine-color-brand-6)' : 'transparent',
              },
            }}
          />
        )
      })

  return (
    <AppShell
      header={{ height: { base: 52, md: 0 } }}
      navbar={{ width: 232, breakpoint: 'md', collapsed: { mobile: !opened } }}
      padding={{ base: 'md', md: 'lg' }}
    >
      {/* En-tête mobile (burger + marque) — masqué en desktop */}
      <AppShell.Header hiddenFrom="md">
        <Group h="100%" px="md" gap="sm">
          <Burger opened={opened} onClick={toggle} size="sm" />
          <ThemeIcon color="brand" radius="sm" size={28}>
            <IconQrcode size={17} />
          </ThemeIcon>
          <Text fw={700} size="sm">
            Présence
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar>
        {/* Bloc marque — flat */}
        <Group gap="sm" wrap="nowrap" px="md" py="sm">
          <ThemeIcon color="brand" radius="sm" size={32}>
            <IconQrcode size={19} />
          </ThemeIcon>
          <Box style={{ minWidth: 0, flexGrow: 1 }}>
            <Text fw={700} size="sm" truncate lh={1.2}>
              Liste de Présence
            </Text>
            <Text size="xs" c="dimmed" truncate>
              Espace organisateur
            </Text>
          </Box>
        </Group>
        <Divider />

        {/* Navigation principale */}
        <AppShell.Section grow component={ScrollArea} px="xs" py="sm">
          <Text size="xs" c="dimmed" fw={600} px="xs" mb={6} tt="uppercase" style={{ letterSpacing: 0.4 }}>
            Menu
          </Text>
          {renderNav(MAIN_NAV)}

          <Text size="xs" c="dimmed" fw={600} px="xs" mb={6} mt="md" tt="uppercase" style={{ letterSpacing: 0.4 }}>
            Système
          </Text>
          {renderNav(SECONDARY_NAV)}
        </AppShell.Section>
        <Divider />

        {/* Carte utilisateur */}
        <AppShell.Section px="sm" py="xs">
          <Group gap="sm" wrap="nowrap">
            <Avatar color="brand" radius="sm" size={32}>
              {(me?.username ?? '?').charAt(0).toUpperCase()}
            </Avatar>
            <Box style={{ minWidth: 0, flexGrow: 1 }}>
              <Group gap={6} wrap="nowrap">
                <Text size="sm" fw={600} truncate>
                  {me?.username ?? '—'}
                </Text>
                {me?.role && (
                  <Badge size="xs" variant={me.role === 'admin' ? 'filled' : 'light'} color="brand">
                    {me.role === 'admin' ? 'Admin' : 'Orga'}
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed" truncate>
                {me?.email}
              </Text>
            </Box>
            <Menu position="top-end" withinPortal shadow="md">
              <Menu.Target>
                <Box component="button" style={menuButtonStyle} aria-label="Menu utilisateur">
                  <IconDotsVertical size={17} />
                </Box>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  <Stack gap={0}>
                    <Text size="sm" fw={600}>
                      {me?.username}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {me?.email}
                    </Text>
                  </Stack>
                </Menu.Label>
                <Menu.Divider />
                <Menu.Item leftSection={<IconLogout size={16} />} onClick={logout}>
                  Déconnexion
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box style={{ maxWidth: rem(1320), marginInline: 'auto' }}>
          <AppHeader />
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  )
}

const menuButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  borderRadius: 'var(--mantine-radius-sm)',
  color: 'var(--mantine-color-gray-6)',
  flexShrink: 0,
}
