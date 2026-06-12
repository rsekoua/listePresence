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
  Progress,
  SimpleGrid,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { DataTable, type DataTableSortStatus } from 'mantine-datatable'
import {
  IconAlertTriangle,
  IconChartLine,
  IconClipboardList,
  IconId,
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
import { InscriptionsChart } from '../components/InscriptionsChart'
import { STATUT_META } from '../lib/activiteStatut'

const PAGE_SIZES = [10, 25, 50]

function StatCard({
  icon,
  label,
  value,
  color,
  hint,
  progress,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  color: string
  hint?: string
  progress?: number
}) {
  return (
    <Paper p="md" radius="sm" withBorder>
      <Group gap="sm" align="center" wrap="nowrap">
        <ThemeIcon size={42} radius="sm" variant="light" color={color}>
          {icon}
        </ThemeIcon>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fz={24} fw={800} lh={1} c={color === 'orange' ? 'orange.7' : undefined}>
            {value}
          </Text>
          <Text size="xs" c="dimmed" mt={4} truncate>
            {hint ?? label}
          </Text>
          {progress !== undefined && (
            <Progress value={progress} color={color} size="sm" radius="xl" mt={8} />
          )}
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
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Activite>>({
    columnAccessor: 'date_debut',
    direction: 'desc',
  })

  const { data, isLoading } = useQuery({ queryKey: ['activites'], queryFn: fetchActivites })
  const { data: globalStats } = useQuery({
    queryKey: ['stats-globales'],
    queryFn: fetchGlobalStats,
  })

  const activites = data ?? []
  const total = activites.length
  const ouvertes = activites.filter((a) => a.statut === 'ouvert').length
  const fermees = activites.filter((a) => a.statut !== 'ouvert').length
  const aVenir = activites.filter((a) => dayjs(a.date_debut).isAfter(dayjs())).length
  const aCloturer = activites.filter(
    (a) => a.statut === 'ouvert' && dayjs(a.date_fin).isBefore(dayjs()),
  )
  const participantsUniques = globalStats?.nb_participants_uniques ?? 0
  const totalInscriptions = globalStats?.nb_inscriptions ?? 0
  const cniTotal = globalStats?.cni_total ?? 0
  const completudePct = cniTotal
    ? Math.round(((globalStats?.cni_completes ?? 0) / cniTotal) * 100)
    : 0

  // Tri client de la liste complète, avant pagination.
  const sorted = useMemo(() => {
    const all = [...(data ?? [])]
    const { columnAccessor, direction } = sortStatus
    const getVal = (a: Activite): string | number => {
      switch (columnAccessor) {
        case 'nb_participants':
          return a.nb_participants
        case 'date_debut':
          return a.date_debut // ISO → comparable chronologiquement
        case 'created_by':
          return a.created_by?.username?.toLowerCase() ?? ''
        case 'nom':
          return a.nom.toLowerCase()
        case 'ville':
          return a.ville.toLowerCase()
        case 'statut':
          return a.statut
        default:
          return ''
      }
    }
    all.sort((a, b) => {
      const va = getVal(a)
      const vb = getVal(b)
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'fr')
      return direction === 'desc' ? -cmp : cmp
    })
    return all
  }, [data, sortStatus])

  const paginated = useMemo(() => {
    const from = (page - 1) * pageSize
    return sorted.slice(from, from + pageSize)
  }, [sorted, page, pageSize])

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

      {/* Indicateurs principaux */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="md">
        <StatCard
          icon={<IconUsersGroup size={26} />}
          label="Participants uniques"
          hint="par numéro de CNI"
          value={participantsUniques}
          color="brand"
        />
        <StatCard
          icon={<IconClipboardList size={26} />}
          label="Total des inscriptions"
          hint="toutes activités"
          value={totalInscriptions}
          color="indigo"
        />
        <StatCard
          icon={<IconId size={26} />}
          label="Complétude CNI"
          hint={`${globalStats?.cni_completes ?? 0}/${cniTotal} fiches complètes`}
          value={`${completudePct}%`}
          color="teal"
          progress={completudePct}
        />
        <StatCard
          icon={<IconAlertTriangle size={26} />}
          label="À clôturer"
          hint="date de fin dépassée"
          value={aCloturer.length}
          color="orange"
        />
      </SimpleGrid>

      {/* Compteurs d'activités */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="xl">
        {[
          { label: 'Activités', value: total, c: undefined },
          { label: 'Ouvertes', value: ouvertes, c: 'teal.7' },
          { label: 'Fermées', value: fermees, c: undefined },
          { label: 'À venir', value: aVenir, c: undefined },
        ].map((s) => (
          <Paper key={s.label} p="sm" px="md" radius="sm" withBorder>
            <Text size="xs" c="dimmed">
              {s.label}
            </Text>
            <Text fz={20} fw={700} c={s.c}>
              {s.value}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Courbe des inscriptions (30 jours) */}
      <Paper radius="sm" withBorder mb="xl">
        <Group
          justify="space-between"
          px="lg"
          py="sm"
          style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
        >
          <Group gap={6}>
            <IconChartLine size={16} color="var(--mantine-color-gray-6)" />
            <Text size="sm" c="dimmed">
              Inscriptions · 30 derniers jours
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            total {totalInscriptions}
          </Text>
        </Group>
        <Box px="md" py="sm">
          <InscriptionsChart data={globalStats?.inscriptions_30j ?? []} />
        </Box>
      </Paper>

      {/* Activités à clôturer */}
      {aCloturer.length > 0 && (
        <Paper radius="sm" withBorder mb="xl" style={{ overflow: 'hidden' }}>
          <Group
            gap={6}
            px="lg"
            py="sm"
            style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
          >
            <IconLockOpen size={16} color="var(--mantine-color-orange-6)" />
            <Text size="sm" c="dimmed">
              Activités à clôturer ({aCloturer.length})
            </Text>
          </Group>
          {aCloturer.map((a) => (
            <Group
              key={a.id}
              justify="space-between"
              wrap="nowrap"
              px="lg"
              py="sm"
              style={{
                borderTop: '1px solid var(--mantine-color-gray-1)',
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/activites/${a.id}`)}
            >
              <Box style={{ minWidth: 0 }}>
                <Text size="sm" fw={600} truncate>
                  {a.nom}
                </Text>
                <Text size="xs" c="dimmed">
                  fin le {dayjs(a.date_fin).format('DD/MM/YYYY')} · {a.nb_participants} participants
                </Text>
              </Box>
              <Badge color="orange" variant="light" style={{ textTransform: 'none' }}>
                Ouverte
              </Badge>
            </Group>
          ))}
        </Paper>
      )}

      {/* Tableau */}
      <Paper radius="sm" withBorder style={{ overflow: 'hidden' }}>
        <Box px="lg" py="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
          <Text fw={600}>Liste des activités</Text>
        </Box>
        {!isDesktop ? (
          <ActiviteCardList activites={sorted} isLoading={isLoading} />
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
            sortStatus={sortStatus}
            onSortStatusChange={(status) => {
              setSortStatus(status)
              setPage(1)
            }}
            columns={[
              {
                accessor: 'nom',
                title: "Libellé de l'activité",
                sortable: true,
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
                sortable: true,
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
                sortable: true,
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
                sortable: true,
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
                sortable: true,
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
                sortable: true,
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
