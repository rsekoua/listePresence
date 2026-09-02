import { useLocation } from 'react-router-dom'
import { Anchor, Box, Breadcrumbs, Group, Text } from '@mantine/core'
import { NotificationBell } from '../components/NotificationBell'

const LABELS: { match: (path: string) => boolean; crumb: string }[] = [
  { match: (p) => p.startsWith('/dashboard'), crumb: "Vue d'ensemble" },
  { match: (p) => p.startsWith('/activites'), crumb: 'Détail activité' },
  { match: (p) => p.startsWith('/participants'), crumb: 'Participants' },
  { match: (p) => p.startsWith('/utilisateurs'), crumb: 'Utilisateurs' },
  { match: (p) => p.startsWith('/journal'), crumb: "Journal d'audit" },
  { match: (p) => p.startsWith('/parametres'), crumb: 'Paramètres' },
  { match: (p) => p.startsWith('/a-propos'), crumb: 'À propos' },
  { match: (p) => p.startsWith('/aide'), crumb: 'Aide' },
]

export function AppHeader() {
  const { pathname } = useLocation()
  const current = LABELS.find((l) => l.match(pathname))?.crumb ?? 'Accueil'

  return (
    <Box
      visibleFrom="md"
      mb="lg"
      pb="sm"
      style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
    >
      <Group justify="space-between" align="center" gap="md">
        <Breadcrumbs separator="/" styles={{ separator: { color: 'var(--mantine-color-gray-4)' } }}>
          <Anchor c="dimmed" size="xs" underline="never">
            Tableau de bord
          </Anchor>
          <Text size="xs" fw={600}>
            {current}
          </Text>
        </Breadcrumbs>

        <NotificationBell />
      </Group>
    </Box>
  )
}
