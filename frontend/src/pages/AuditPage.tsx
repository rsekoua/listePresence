import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Badge, Box, Center, Group, Paper, Select, Text, TextInput } from '@mantine/core'
import { DataTable } from 'mantine-datatable'
import { IconSearch } from '@tabler/icons-react'
import { fetchMe } from '../api/activites'
import { AUDIT_ACTIONS, fetchAuditLogs, type AuditEntry, type AuditFilters } from '../api/audit'
import { actionMeta } from '../components/auditMeta'
import { PageHeader } from '../components/PageHeader'

const PAGE_SIZES = [10, 25, 50]
type Row = AuditEntry & { _id: number }

export function AuditPage() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: fetchMe })
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<string | null>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const filters: AuditFilters = {
    ...(search ? { search } : {}),
    ...(action ? { action } : {}),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['audit', search, action],
    queryFn: () => fetchAuditLogs(filters),
    enabled: me?.role === 'admin',
  })

  const rows: Row[] = useMemo(() => (data ?? []).map((e, i) => ({ ...e, _id: i })), [data])
  const paginated = useMemo(() => {
    const from = (page - 1) * pageSize
    return rows.slice(from, from + pageSize)
  }, [rows, page, pageSize])

  if (me && me.role !== 'admin') {
    return (
      <Box>
        <PageHeader title="Journal d'audit" />
        <Paper p="xl" radius="sm">
          <Center>
            <Text c="dimmed">Accès réservé aux administrateurs.</Text>
          </Center>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title="Journal d'audit"
        subtitle="Actions des utilisateurs (500 entrées les plus récentes)"
      />

      <Group gap="sm" mb="md" wrap="wrap">
        <TextInput
          placeholder="Rechercher (utilisateur, détails…)"
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value)
            setPage(1)
          }}
          leftSection={<IconSearch size={16} />}
          style={{ flexGrow: 1, maxWidth: 360 }}
        />
        <Select
          placeholder="Toutes les actions"
          value={action}
          onChange={(v) => {
            setAction(v ?? '')
            setPage(1)
          }}
          clearable
          data={AUDIT_ACTIONS.map((a) => ({ value: a.value, label: a.label }))}
          w={240}
        />
      </Group>

      <Paper radius="sm" withBorder style={{ overflow: 'hidden' }}>
        <DataTable<Row>
          minHeight={160}
          withRowBorders
          fetching={isLoading}
          records={paginated}
          idAccessor="_id"
          noRecordsText="Aucune entrée"
          totalRecords={rows.length}
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
              accessor: 'created_at',
              title: 'Date',
              width: 150,
              render: (e) => dayjs(e.created_at).format('DD/MM/YYYY HH:mm'),
            },
            { accessor: 'username', title: 'Utilisateur', width: 140 },
            {
              accessor: 'action_label',
              title: 'Action',
              width: 220,
              render: (e) => {
                const meta = actionMeta(e.action)
                return (
                  <Badge
                    variant={meta.color === 'gray' ? 'outline' : 'light'}
                    color={meta.color}
                    leftSection={meta.icon}
                    style={{ textTransform: 'none' }}
                  >
                    {e.action_label}
                  </Badge>
                )
              },
            },
            { accessor: 'objet', title: 'Détails' },
            { accessor: 'ip_address', title: 'IP', width: 130 },
          ]}
        />
      </Paper>
    </Box>
  )
}
