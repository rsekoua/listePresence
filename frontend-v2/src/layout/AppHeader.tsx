import { useLocation } from 'react-router-dom'
import { ActionIcon, Anchor, Box, Breadcrumbs, Group, Text, Tooltip } from '@mantine/core'
import { IconBell } from '@tabler/icons-react'

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

/**
 * Bandeau de contenu (flat) : fil d'Ariane à gauche, notifications à droite,
 * séparé du contenu par un trait fin. Masqué sous md (l'en-tête mobile prend le relais).
 */
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

        <Tooltip label="Notifications">
          <ActionIcon variant="default" size="md" aria-label="Notifications">
            <IconBell size={16} stroke={1.7} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  )
}
