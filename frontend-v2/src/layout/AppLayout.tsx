import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Box,
  Burger,
  Center,
  Divider,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
  rem,
} from '@mantine/core'
import {
  IconDotsVertical,
  IconHistory,
  IconInfoCircle,
  IconLayoutDashboard,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
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
import { NotificationBell } from '../components/NotificationBell'

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

// Style des entrées de nav : pill à fond atténué arrondi quand actif (shadcn).
const navLinkStyles = {
  root: {
    borderRadius: rem(8),
    marginBottom: rem(2),
    paddingTop: rem(7),
    paddingBottom: rem(7),
  },
  label: { fontSize: rem(13) },
}

// Variante repliée : l'icône seule, centrée dans la largeur du rail.
const navLinkStylesRail = {
  root: {
    borderRadius: rem(8),
    marginBottom: rem(2),
    paddingTop: rem(9),
    paddingBottom: rem(9),
    justifyContent: 'center',
  },
  section: { marginInlineEnd: 0 },
  body: { display: 'none' },
}

// Gabarit du corps de page (figé après tests visuels).
const BODY_MAX_WIDTH = 1320 // px — largeur max centrée du contenu
const BODY_PADDING = 24 // px — marge bord ↔ contenu en desktop

// Largeurs de la barre latérale en desktop.
const NAVBAR_WIDTH = 232
const NAVBAR_RAIL_WIDTH = 68

const COLLAPSE_KEY = 'presence_sidebar_collapsed'

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()

  // Le repli ne concerne que le desktop : sur mobile la barre est un tiroir,
  // qui doit toujours s'ouvrir en pleine largeur avec les libellés.
  // getInitialValueInEffect: false → lecture synchrone, sinon la barre s'affiche
  // dépliée au premier rendu puis se replie, ce qui saute aux yeux.
  const isDesktop = useMediaQuery('(min-width: 62em)', true, {
    getInitialValueInEffect: false,
  })
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* stockage indisponible (navigation privée) : le choix ne survit pas au rechargement */
    }
  }, [collapsed])

  const rail = isDesktop && collapsed

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: fetchMe })

  const isActive = (path: string) => location.pathname.startsWith(path)

  const go = (path: string) => {
    navigate(path)
    close()
  }

  // Contenu du menu compte, partagé par les deux dispositions de la carte
  // utilisateur (pleine largeur et rail).
  const menuCompte = (
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
  )

  const renderNav = (items: NavItem[]) =>
    items
      .filter((item) => !item.adminOnly || me?.role === 'admin')
      .map((item) => {
        const active = isActive(item.path)
        const lien = (
          <NavLink
            active={active}
            label={rail ? undefined : item.label}
            leftSection={<item.icon size={17} stroke={1.7} />}
            onClick={() => go(item.path)}
            variant="light"
            styles={rail ? navLinkStylesRail : navLinkStyles}
            aria-label={rail ? item.label : undefined}
          />
        )
        // Replié, le libellé n'est plus visible : le tooltip le restitue.
        return rail ? (
          <Tooltip key={item.path} label={item.label} position="right" withArrow>
            {lien}
          </Tooltip>
        ) : (
          <Box key={item.path}>{lien}</Box>
        )
      })

  return (
    <AppShell
      header={{ height: { base: 52, md: 0 } }}
      navbar={{
        width: rail ? NAVBAR_RAIL_WIDTH : NAVBAR_WIDTH,
        breakpoint: 'md',
        collapsed: { mobile: !opened },
      }}
      padding={{ base: 'md', md: BODY_PADDING }}
      styles={{ navbar: { transition: 'width 200ms ease' } }}
    >
      {/* En-tête mobile (burger + marque) — masqué en desktop */}
      <AppShell.Header hiddenFrom="md">
        <Group h="100%" px="md" gap="sm">
          <Burger opened={opened} onClick={toggle} size="sm" />
          <ThemeIcon color="brand" radius="sm" size={28}>
            <IconQrcode size={17} />
          </ThemeIcon>
          <Text fw={700} size="sm" style={{ flexGrow: 1 }}>
            Présence
          </Text>
          <NotificationBell />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar>
        {/* Bloc marque — flat. Replié, seul le logo reste, et la bascule passe
            dessous pour rester centrée dans le rail. */}
        {rail ? (
          <Stack gap={6} align="center" px="xs" py="sm">
            <ThemeIcon color="brand" radius="sm" size={32}>
              <IconQrcode size={19} />
            </ThemeIcon>
            <Tooltip label="Déplier le menu" position="right" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => setCollapsed(false)}
                aria-label="Déplier le menu"
              >
                <IconLayoutSidebarLeftExpand size={18} />
              </ActionIcon>
            </Tooltip>
          </Stack>
        ) : (
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
            {/* Bascule réservée au desktop : sur mobile, c'est le burger qui pilote. */}
            {isDesktop && (
              <Tooltip label="Replier le menu" position="right" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => setCollapsed(true)}
                  aria-label="Replier le menu"
                >
                  <IconLayoutSidebarLeftCollapse size={18} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        )}
        <Divider />

        {/* Navigation principale (zone défilante qui occupe l'espace libre) */}
        <AppShell.Section grow component={ScrollArea} px="xs" py="sm">
          {!rail && (
            <Text size="xs" c="dimmed" fw={600} px="xs" mb={6} tt="uppercase" style={{ letterSpacing: 0.4 }}>
              Menu
            </Text>
          )}
          {renderNav(MAIN_NAV)}
        </AppShell.Section>

        {/* Système — ancré en bas, juste au-dessus de la carte utilisateur */}
        <Divider />
        <AppShell.Section px="xs" py="sm">
          {!rail && (
            <Text size="xs" c="dimmed" fw={600} px="xs" mb={6} tt="uppercase" style={{ letterSpacing: 0.4 }}>
              Système
            </Text>
          )}
          {renderNav(SECONDARY_NAV)}
        </AppShell.Section>
        <Divider />

        {/* Carte utilisateur — réduite à l'avatar dans le rail, le menu restant
            accessible en cliquant dessus. */}
        <AppShell.Section px={rail ? 'xs' : 'sm'} py="xs">
          {rail ? (
            <Center>
              <Menu position="right-end" withinPortal shadow="md">
                <Menu.Target>
                  <Tooltip label={me?.username ?? 'Compte'} position="right" withArrow>
                    <UnstyledButton aria-label="Menu utilisateur">
                      <Avatar color="brand" radius="sm" size={32}>
                        {(me?.username ?? '?').charAt(0).toUpperCase()}
                      </Avatar>
                    </UnstyledButton>
                  </Tooltip>
                </Menu.Target>
                {menuCompte}
              </Menu>
            </Center>
          ) : (
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
                {menuCompte}
              </Menu>
            </Group>
          )}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box style={{ maxWidth: rem(BODY_MAX_WIDTH), marginInline: 'auto' }}>
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
