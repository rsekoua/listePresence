import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Badge,
  Box,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core'
import { DataTable } from 'mantine-datatable'
import { IconGauge, IconReceipt, IconSearch, IconWallet } from '@tabler/icons-react'
import { PageHeader } from '../components/PageHeader'
import {
  fetchJustifsConciliation,
  type ActiviteConciliation,
} from '../api/justificatifs'

function fmtMoney(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—'
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return `${n.toLocaleString('fr-FR')} FCFA`
}

/** Couleur du taux : rouge si dépassement/très bas, vert si (quasi) complet. */
function tauxColor(t: number | null): string {
  if (t == null) return 'gray'
  if (t > 100) return 'red'
  if (t >= 90) return 'teal'
  if (t >= 50) return 'yellow'
  return 'orange'
}

/** Cellule mettant en évidence le taux de conciliation. */
function TauxCell({ taux }: { taux: number | null }) {
  if (taux == null) {
    return (
      <Text size="xs" c="dimmed">
        Budget non défini
      </Text>
    )
  }
  const color = tauxColor(taux)
  return (
    <Group gap="sm" wrap="nowrap">
      <Progress
        value={Math.min(taux, 100)}
        color={color}
        size="lg"
        radius="sm"
        style={{ flexGrow: 1, minWidth: 90 }}
      />
      <Badge color={color} variant="filled" style={{ minWidth: 64 }}>
        {taux.toLocaleString('fr-FR')} %
      </Badge>
    </Group>
  )
}

export function JustifsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['justifs-conciliation'],
    queryFn: fetchJustifsConciliation,
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q
      ? rows.filter((r) => r.activite_nom.toLowerCase().includes(q))
      : rows
  }, [rows, search])

  // Agrégats globaux (sur les lignes filtrées).
  const totalJustifie = filtered.reduce(
    (s, r) => s + Number(r.montant_justifie || 0),
    0,
  )
  const totalBudget = filtered.reduce(
    (s, r) => s + Number(r.budget_alloue || 0),
    0,
  )
  const tauxGlobal =
    totalBudget > 0 ? Math.round((totalJustifie / totalBudget) * 1000) / 10 : null

  return (
    <Box>
      <PageHeader
        title="Justifs"
        subtitle="Taux de conciliation des justificatifs, par activité"
      />

      {/* Récapitulatif */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="lg">
        <Metric
          icon={<IconReceipt size={22} />}
          label="Activités concernées"
          value={String(filtered.length)}
          color="brand"
        />
        <Metric
          icon={<IconWallet size={22} />}
          label="Total justifié"
          value={fmtMoney(totalJustifie)}
          color="teal"
        />
        <Metric
          icon={<IconGauge size={22} />}
          label="Taux global"
          value={tauxGlobal != null ? `${tauxGlobal.toLocaleString('fr-FR')} %` : '—'}
          color={tauxGlobal != null ? tauxColor(tauxGlobal) : 'gray'}
        />
      </SimpleGrid>

      {/* Recherche */}
      <Group gap="sm" mb="md" wrap="wrap">
        <TextInput
          placeholder="Rechercher une activité…"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={280}
        />
      </Group>

      {/* Tableau par activité — clic = gestion des justificatifs de l'activité */}
      <Paper radius="sm" withBorder style={{ overflow: 'hidden' }}>
        <DataTable<ActiviteConciliation>
          minHeight={180}
          withRowBorders
          highlightOnHover
          fetching={isLoading}
          records={filtered}
          idAccessor="activite_id"
          noRecordsText="Aucune activité avec justificatifs"
          onRowClick={({ record }) => navigate(`/activites/${record.activite_id}`)}
          rowStyle={() => ({ cursor: 'pointer' })}
          columns={[
            {
              accessor: 'activite_nom',
              title: 'Activité',
              render: (r) => (
                <Group gap="xs" wrap="nowrap">
                  <Text size="sm" fw={600} truncate>
                    {r.activite_nom}
                  </Text>
                  <Badge
                    size="xs"
                    variant="light"
                    color={r.activite_type === 'terrain' ? 'orange' : 'blue'}
                    style={{ textTransform: 'none' }}
                  >
                    {r.activite_type === 'terrain' ? 'Terrain' : 'Salle'}
                  </Badge>
                </Group>
              ),
            },
            {
              accessor: 'taux',
              title: 'Taux de conciliation',
              width: 260,
              render: (r) => <TauxCell taux={r.taux} />,
            },
            {
              accessor: 'budget_alloue',
              title: 'Budget alloué',
              width: 150,
              textAlign: 'right',
              render: (r) => (
                <Text size="sm">{fmtMoney(r.budget_alloue)}</Text>
              ),
            },
            {
              accessor: 'montant_justifie',
              title: 'Justifié',
              width: 140,
              textAlign: 'right',
              render: (r) => (
                <Text size="sm" fw={600}>
                  {fmtMoney(r.montant_justifie)}
                </Text>
              ),
            },
            {
              accessor: 'reste_a_justifier',
              title: 'Reste à justifier',
              width: 150,
              textAlign: 'right',
              render: (r) => (
                <Text
                  size="sm"
                  c={
                    r.reste_a_justifier != null &&
                    Number(r.reste_a_justifier) < 0
                      ? 'red'
                      : undefined
                  }
                >
                  {fmtMoney(r.reste_a_justifier)}
                </Text>
              ),
            },
            {
              accessor: 'nb_postes',
              title: 'Postes',
              width: 80,
              textAlign: 'center',
              render: (r) => (
                <Badge size="sm" variant="outline" color="gray">
                  {r.nb_postes}
                </Badge>
              ),
            },
          ]}
        />
      </Paper>
    </Box>
  )
}

function Metric({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <Paper p="md" radius="sm" withBorder>
      <Group gap="sm" align="center" wrap="nowrap">
        <ThemeIcon size={42} radius="sm" variant="light" color={color}>
          {icon}
        </ThemeIcon>
        <Box>
          <Text fz={22} fw={800} lh={1}>
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
