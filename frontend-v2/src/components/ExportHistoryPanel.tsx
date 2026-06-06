import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Badge, Box, Center, Group, Paper, Table, Text, ThemeIcon } from '@mantine/core'
import { IconHistory } from '@tabler/icons-react'
import { fetchExportHistory } from '../api/exports'

export function ExportHistoryPanel({ activiteId }: { activiteId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['export-history', activiteId],
    queryFn: () => fetchExportHistory(activiteId),
  })

  const logs = data ?? []

  return (
    <Box mt="xl">
      <Group gap="sm" mb="sm">
        <ThemeIcon variant="light" color="brand" radius="md">
          <IconHistory size={18} />
        </ThemeIcon>
        <Text fw={700} size="lg">
          Historique des exports
        </Text>
        <Badge color="brand">{logs.length}</Badge>
      </Group>

      <Paper radius="sm" withBorder style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <Center py="xl">
            <Text size="sm" c="dimmed">
              Chargement…
            </Text>
          </Center>
        ) : logs.length === 0 ? (
          <Center py="xl">
            <Text size="sm" c="dimmed">
              Aucun export généré pour le moment.
            </Text>
          </Center>
        ) : (
          <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Type</Table.Th>
                <Table.Th ta="center">Entrées</Table.Th>
                <Table.Th>Utilisateur</Table.Th>
                <Table.Th>Date</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {logs.map((log, i) => (
                <Table.Tr key={i}>
                  <Table.Td fw={600}>{log.type_label}</Table.Td>
                  <Table.Td ta="center">{log.nb_entrees}</Table.Td>
                  <Table.Td>{log.utilisateur ?? '—'}</Table.Td>
                  <Table.Td>{dayjs(log.created_at).format('DD/MM/YYYY HH:mm')}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
    </Box>
  )
}
