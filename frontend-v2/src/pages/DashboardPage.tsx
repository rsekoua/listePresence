import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import dayjs from 'dayjs'
import {
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { DataTable } from 'mantine-datatable'
import {
  IconCalendarEvent,
  IconLock,
  IconLockOpen,
  IconPlus,
  IconUser,
  IconUsersGroup,
} from '@tabler/icons-react'
import { fetchActivites, fetchGlobalStats } from '../api/activites'
import type { Activite } from '../api/types'
import { ActiviteFormDialog } from '../components/ActiviteFormDialog'
import { ActiviteRowActions } from '../components/ActiviteRowActions'
import { ActiviteCardList } from '../components/ActiviteCardList'
import { STATUT_META } from '../lib/activiteStatut'

const PAGE_SIZES = [10, 25, 50]

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode
  label: string
  value: number
  color: string
}) {
  return (
    <Paper p="md" radius="sm" withBorder>
      <Group gap="sm" align="center" wrap="nowrap">
        <ThemeIcon size={42} radius="sm" variant="light" color={color}>
          {icon}
        </ThemeIcon>
        <Box>
          <Text fz={24} fw={800} lh={1}>
            {value}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {label}
          </Text>
        </Box>
      </Group>
    </Paper>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const isDesktop = useMediaQuery('(min-width: 62em)')
  const [dialogOpen, { open, close }] = useDisclosure(false)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const { data, isLoading } = useQuery({ queryKey: ['activites'], queryFn: fetchActivites })
  const { data: globalStats } = useQuery({
    queryKey: ['stats-globales'],
    queryFn: fetchGlobalStats,
  })

  const activites = data ?? []
  const total = activites.length
  const ouvertes = activites.filter((a) => a.statut === 'ouvert').length
  const fermees = activites.filter((a) => a.statut !== 'ouvert').length
  const participantsUniques = globalStats?.nb_participants_uniques ?? 0

  const paginated = useMemo(() => {
    const all = data ?? []
    const from = (page - 1) * pageSize
    return all.slice(from, from + pageSize)
  }, [data, page, pageSize])

  return (
    <Box>
      {/* En-tête de page */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md" mb="lg">
        <Box>
          <Title order={2}>Vue d'ensemble</Title>
          <Text size="sm" c="dimmed">
            Gérez la liste des participants aux activités
          </Text>
        </Box>
        <Button leftSection={<IconPlus size={18} />} onClick={open}>
          Nouvelle activité
        </Button>
      </Group>

      {/* Statistiques */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="xl">
        <StatCard
          icon={<IconUsersGroup size={26} />}
          label="Participants uniques"
          value={participantsUniques}
          color="brand"
        />
        <StatCard
          icon={<IconCalendarEvent size={26} />}
          label="Activités au total"
          value={total}
          color="indigo"
        />
        <StatCard
          icon={<IconLockOpen size={26} />}
          label="Collectes ouvertes"
          value={ouvertes}
          color="teal"
        />
        <StatCard
          icon={<IconLock size={26} />}
          label="Collectes fermées"
          value={fermees}
          color="orange"
        />
      </SimpleGrid>

      {/* Tableau */}
      <Paper radius="sm" withBorder style={{ overflow: 'hidden' }}>
        <Box px="lg" py="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
          <Text fw={600}>Liste des activités</Text>
        </Box>
        {!isDesktop ? (
          <ActiviteCardList activites={activites} isLoading={isLoading} />
        ) : (
          <DataTable<Activite>
            minHeight={180}
            withRowBorders
            highlightOnHover
            fetching={isLoading}
            records={paginated}
            idAccessor="id"
            noRecordsText="Aucune activité pour le moment"
            onRowClick={({ record }) => navigate(`/activites/${record.id}`)}
            rowStyle={() => ({ cursor: 'pointer' })}
            totalRecords={total}
            recordsPerPage={pageSize}
            page={page}
            onPageChange={setPage}
            recordsPerPageOptions={PAGE_SIZES}
            onRecordsPerPageChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
            columns={[
              {
                accessor: 'nom',
                title: "Libellé de l'activité",
                render: (a) => (
                  <Group gap="sm" wrap="nowrap">
                    <Avatar radius="xl" size={34} color="brand" variant="light">
                      {a.nom.charAt(0).toUpperCase()}
                    </Avatar>
                    <Text size="sm" fw={600} truncate>
                      {a.nom}
                    </Text>
                  </Group>
                ),
              },
              {
                accessor: 'nb_participants',
                title: 'Participants',
                width: 130,
                textAlign: 'center',
                render: (a) => (
                  <Group gap={6} justify="center" wrap="nowrap">
                    <IconUsersGroup size={16} color="var(--mantine-color-gray-6)" />
                    <Text size="sm" fw={600}>
                      {a.nb_participants}
                    </Text>
                  </Group>
                ),
              },
              {
                accessor: 'ville',
                title: 'Ville / Lieu',
                render: (a) => (
                  <Box>
                    <Text size="sm" fw={600} truncate>
                      {a.ville}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {a.lieu}
                    </Text>
                  </Box>
                ),
              },
              {
                accessor: 'created_by',
                title: 'Organisateur',
                render: (a) => (
                  <Group gap={6} wrap="nowrap">
                    <IconUser size={16} color="var(--mantine-color-gray-5)" />
                    <Text size="sm" c="dimmed" truncate>
                      {a.created_by?.username || 'N/A'}
                    </Text>
                  </Group>
                ),
              },
              {
                accessor: 'date_debut',
                title: 'Période',
                width: 170,
                render: (a) => (
                  <Box>
                    <Text size="sm" fw={500}>
                      {dayjs(a.date_debut).format('DD/MM/YYYY HH:mm')}
                    </Text>
                    <Text size="xs" c="dimmed">
                      au {dayjs(a.date_fin).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </Box>
                ),
              },
              {
                accessor: 'statut',
                title: 'Statut',
                width: 120,
                textAlign: 'center',
                render: (a) => {
                  const s = STATUT_META[a.statut]
                  return (
                    <Badge
                      variant="light"
                      color={s.color}
                      leftSection={s.icon}
                      style={{ textTransform: 'none' }}
                    >
                      {s.label}
                    </Badge>
                  )
                },
              },
              {
                accessor: 'actions',
                title: '',
                width: 90,
                textAlign: 'right',
                render: (a) => (
                  <Group justify="flex-end">
                    <ActiviteRowActions activite={a} />
                  </Group>
                ),
              },
            ]}
          />
        )}
      </Paper>

      <ActiviteFormDialog opened={dialogOpen} onClose={close} />
    </Box>
  )
}
