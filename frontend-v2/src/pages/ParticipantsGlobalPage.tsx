import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Avatar, Badge, Box, Group, Paper, Select, Text, TextInput, ThemeIcon } from '@mantine/core'
import { DataTable } from 'mantine-datatable'
import {
  IconBuilding,
  IconDeviceMobile,
  IconPaperclip,
  IconAlertTriangle,
  IconSearch,
} from '@tabler/icons-react'
import {
  fetchPersonnes,
  type ParticipantFilters,
  type Personne,
} from '../api/participants'
import { PersonneHistoriqueDialog } from '../components/PersonneHistoriqueDialog'
import { PageHeader } from '../components/PageHeader'

const PAGE_SIZES = [10, 25, 50]

export function ParticipantsGlobalPage() {
  const [search, setSearch] = useState('')
  const [cni, setCni] = useState<'' | 'complete' | 'incomplete'>('')
  const [selected, setSelected] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const filters: ParticipantFilters = {
    ...(search ? { search } : {}),
    ...(cni ? { cni } : {}),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['personnes', search, cni],
    queryFn: () => fetchPersonnes(filters),
  })

  const personnes = data ?? []
  const paginated = useMemo(() => {
    const all = data ?? []
    const from = (page - 1) * pageSize
    return all.slice(from, from + pageSize)
  }, [data, page, pageSize])

  return (
    <Box>
      <PageHeader
        title="Gestion des listes de personnes"
        subtitle={`Annuaire des personnes distinctes (${personnes.length}) — regroupées par CNI`}
      />

      {/* Filtres */}
      <Group gap="sm" mb="md" wrap="wrap">
        <TextInput
          placeholder="Rechercher (nom, email, CNI…)"
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value)
            setPage(1)
          }}
          leftSection={<IconSearch size={16} />}
          style={{ flexGrow: 1, maxWidth: 360 }}
        />
        <Select
          placeholder="CNI : toutes"
          value={cni}
          onChange={(v) => {
            setCni((v as typeof cni) ?? '')
            setPage(1)
          }}
          clearable
          data={[
            { value: 'complete', label: 'Complètes' },
            { value: 'incomplete', label: 'Incomplètes' },
          ]}
          w={200}
        />
      </Group>

      <Paper radius="sm" withBorder style={{ overflow: 'hidden' }}>
        <DataTable<Personne>
          minHeight={180}
          withRowBorders
          highlightOnHover
          fetching={isLoading}
          records={paginated}
          idAccessor="numero_cni"
          noRecordsText="Aucune personne"
          onRowClick={({ record }) => setSelected(record.numero_cni)}
          rowStyle={() => ({ cursor: 'pointer' })}
          totalRecords={personnes.length}
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
              title: 'Personne',
              render: (p) => (
                <Group gap="sm" wrap="nowrap">
                  <Avatar radius="xl" size={32} color="brand" variant="light">
                    {p.prenom.charAt(0).toUpperCase()}
                  </Avatar>
                  <Text size="sm" fw={600} truncate>
                    {p.prenom} {p.nom}
                  </Text>
                </Group>
              ),
            },
            {
              accessor: 'structure',
              title: 'Structure',
              render: (p) => (
                <Group gap={8} wrap="nowrap">
                  <IconBuilding size={16} color="var(--mantine-color-gray-5)" />
                  <Text size="sm" truncate>
                    {p.structure}
                  </Text>
                </Group>
              ),
            },
            { accessor: 'fonction', title: 'Fonction' },
            {
              accessor: 'telephone_wave',
              title: 'Téléphone',
              width: 160,
              render: (p) => (
                <Group gap={8} wrap="nowrap">
                  <IconDeviceMobile size={16} color="var(--mantine-color-gray-5)" />
                  <Text size="sm" truncate>
                    {p.telephone_wave}
                  </Text>
                </Group>
              ),
            },
            {
              accessor: 'nb_activites',
              title: 'Activités',
              width: 110,
              textAlign: 'center',
              render: (p) => (
                <Badge
                  variant={p.nb_activites > 1 ? 'filled' : 'outline'}
                  color="brand"
                  miw={36}
                >
                  {p.nb_activites}
                </Badge>
              ),
            },
            {
              accessor: 'cni_complete',
              title: 'CNI',
              width: 80,
              textAlign: 'center',
              render: (p) =>
                p.cni_complete ? (
                  <ThemeIcon variant="light" color="teal" size="sm" radius="xl">
                    <IconPaperclip size={14} />
                  </ThemeIcon>
                ) : (
                  <ThemeIcon variant="light" color="orange" size="sm" radius="xl">
                    <IconAlertTriangle size={14} />
                  </ThemeIcon>
                ),
            },
            {
              accessor: 'derniere_participation',
              title: 'Dernière participation',
              width: 180,
              render: (p) => dayjs(p.derniere_participation).format('DD/MM/YYYY HH:mm'),
            },
          ]}
        />
      </Paper>

      <PersonneHistoriqueDialog
        numeroCni={selected}
        opened={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </Box>
  )
}
