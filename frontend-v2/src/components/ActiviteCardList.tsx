import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { Avatar, Badge, Box, Center, Divider, Group, Loader, Stack, Text } from '@mantine/core'
import { IconClock, IconMapPin, IconUser, IconUsersGroup } from '@tabler/icons-react'
import type { Activite } from '../api/types'
import { ActiviteRowActions } from './ActiviteRowActions'
import { STATUT_META } from '../lib/activiteStatut'

/** Liste d'activités en cartes — utilisée sur mobile (la DataTable est réservée au desktop). */
export function ActiviteCardList({
  activites,
  isLoading,
}: {
  activites: Activite[]
  isLoading: boolean
}) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <Center py={48}>
        <Loader />
      </Center>
    )
  }

  if (activites.length === 0) {
    return (
      <Text c="dimmed" ta="center" py={48}>
        Aucune activité pour le moment
      </Text>
    )
  }

  return (
    <Stack gap={0}>
      {activites.map((a, idx) => {
        const s = STATUT_META[a.statut]
        return (
          <Box key={a.id}>
            {idx > 0 && <Divider />}
            <Box
              onClick={() => navigate(`/activites/${a.id}`)}
              p="md"
              style={{ cursor: 'pointer' }}
            >
              <Group gap="sm" align="center" mb="xs" wrap="nowrap">
                <Avatar radius="md" color="brand" variant="light">
                  {a.nom.charAt(0).toUpperCase()}
                </Avatar>
                <Box style={{ minWidth: 0, flexGrow: 1 }}>
                  <Text fw={600} truncate>
                    {a.nom}
                  </Text>
                  <Badge mt={4} size="sm" color={s.color} variant="light">
                    {s.label}
                  </Badge>
                </Box>
                <ActiviteRowActions activite={a} />
              </Group>

              <Stack gap={6} pl={4}>
                <Group gap={8} wrap="nowrap">
                  <IconMapPin size={16} color="var(--mantine-color-gray-6)" />
                  <Text size="sm" c="dimmed" truncate>
                    {a.ville} · {a.lieu}
                  </Text>
                </Group>
                <Group gap={8} wrap="nowrap">
                  <IconClock size={16} color="var(--mantine-color-gray-6)" />
                  <Text size="sm" c="dimmed">
                    {dayjs(a.date_debut).format('DD/MM/YYYY HH:mm')} →{' '}
                    {dayjs(a.date_fin).format('DD/MM/YYYY HH:mm')}
                  </Text>
                </Group>
                <Group gap="md">
                  <Group gap={8} wrap="nowrap">
                    <IconUser size={16} color="var(--mantine-color-gray-6)" />
                    <Text size="sm" c="dimmed" truncate>
                      {a.created_by.username}
                    </Text>
                  </Group>
                  <Group gap={6} wrap="nowrap">
                    <IconUsersGroup size={16} color="var(--mantine-color-gray-6)" />
                    <Text size="sm" c="dimmed">
                      {a.nb_participants} participant{a.nb_participants > 1 ? 's' : ''}
                    </Text>
                  </Group>
                </Group>
              </Stack>
            </Box>
          </Box>
        )
      })}
    </Stack>
  )
}
