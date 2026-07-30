import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import dayjs from 'dayjs'
import {
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core'
import { DataTable } from 'mantine-datatable'
import {
  IconAlertTriangle,
  IconBuilding,
  IconDeviceMobile,
  IconFileSpreadsheet,
  IconFileTypePdf,
  IconFileZip,
  IconPaperclip,
  IconUserPlus,
  IconUsersGroup,
  IconUsersPlus,
} from '@tabler/icons-react'
import { fetchParticipants, type Participant } from '../api/participants'
import { exportCniZip, exportExcel, exportPresenceList } from '../api/exports'
import { useNotifications } from '../context/NotificationContext'
import { ParticipantDetailDialog } from './ParticipantDetailDialog'
import { AddParticipantDialog } from './AddParticipantDialog'
import { ImportListeDialog } from './ImportListeDialog'
import { notify } from '../lib/notify'

const REFRESH_MS = 5_000
const PAGE_SIZES = [10, 25, 50]

export function ParticipantsPanel({
  activiteId,
  activiteNom,
  canAdd,
}: {
  activiteId: string
  activiteNom: string
  canAdd: boolean
}) {
  const isDesktop = useMediaQuery('(min-width: 62em)')
  const queryClient = useQueryClient()
  const { addNotification } = useNotifications()
  const [selected, setSelected] = useState<Participant | null>(null)
  const [addOpen, { open: openAdd, close: closeAdd }] = useDisclosure(false)
  const [importOpen, { open: openImport, close: closeImport }] = useDisclosure(false)
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const runExport = async (fn: (id: string) => Promise<void>) => {
    setExporting(true)
    try {
      await fn(activiteId)
      queryClient.invalidateQueries({ queryKey: ['export-history', activiteId] })
    } catch {
      notify.error("L'export a échoué. Réessayez.")
    } finally {
      setExporting(false)
    }
  }

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['participants', activiteId],
    queryFn: () => fetchParticipants(activiteId),
    staleTime: 0,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
  })

  const participants = pageData?.items ?? []

  const storageKey = `presence_participant_ids_${activiteId}`
  const storedIds = localStorage.getItem(storageKey)
  const prevIdsRef = useRef<Set<string> | null>(
    storedIds ? new Set<string>(JSON.parse(storedIds)) : null,
  )
  useEffect(() => {
    if (!pageData?.items) return
    const currentIds = new Set(pageData.items.map((p) => p.id))
    const prev = prevIdsRef.current
    if (prev !== null) {
      const newParticipants = pageData.items.filter((p) => !prev.has(p.id))
      if (newParticipants.length > 0) {
        addNotification({
          activiteId,
          activiteNom,
          participants: newParticipants.map((p) => ({
            id: p.id,
            nom: p.nom,
            prenom: p.prenom,
            structure: p.structure,
            fonction: p.fonction,
          })),
        })
      }
    }
    prevIdsRef.current = currentIds
    localStorage.setItem(storageKey, JSON.stringify([...currentIds]))
  }, [pageData, addNotification, activiteId, activiteNom, storageKey])
  const paginated = useMemo(() => {
    const from = (page - 1) * pageSize
    return participants.slice(from, from + pageSize)
  }, [participants, page, pageSize])

  return (
    <Box>
      {/* En-tête + actions */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md" mb="md">
        <Group gap="sm" align="center">
          <ThemeIcon variant="light" color="brand" radius="md">
            <IconUsersGroup size={18} />
          </ThemeIcon>
          <Text fw={700} size="lg">
            Participants
          </Text>
          <Badge color="brand">{participants.length}</Badge>
          <Text size="xs" c="dimmed" visibleFrom="md">
            Actualisé toutes les 5 s
          </Text>
        </Group>
        <Group gap="sm" wrap="wrap">
          <Button
            variant="default"
            size="xs"
            leftSection={<IconFileSpreadsheet size={16} color="#059669" />}
            disabled={exporting || !participants.length}
            onClick={() => runExport(exportExcel)}
          >
            Export la liste en Excel
          </Button>
          <Button
            variant="default"
            size="xs"
            leftSection={<IconFileTypePdf size={16} color="#dc2626" />}
            disabled={exporting || !participants.length}
            onClick={() => runExport(exportPresenceList)}
          >
            Export la liste en PDF
          </Button>
          <Button
            variant="default"
            size="xs"
            leftSection={<IconFileZip size={16} color="#d97706" />}
            disabled={exporting || !participants.length}
            onClick={() => runExport(exportCniZip)}
          >
            Fiches CNI (ZIP)
          </Button>
          {canAdd && (
            <Button
              variant="default"
              size="xs"
              leftSection={<IconUsersPlus size={16} />}
              onClick={openImport}
            >
              Rattacher une liste existante
            </Button>
          )}
          {canAdd && (
            <Button leftSection={<IconUserPlus size={18} />} onClick={openAdd}>
              Nouveau participant
            </Button>
          )}
        </Group>
      </Group>

      {/* Liste */}
      <Paper radius="sm" withBorder style={{ overflow: 'hidden' }}>
        {!isDesktop ? (
          <ParticipantCards
            participants={participants}
            isLoading={isLoading}
            onSelect={setSelected}
          />
        ) : (
          <DataTable<Participant>
            minHeight={180}
            withRowBorders
            highlightOnHover
            fetching={isLoading}
            records={paginated}
            idAccessor="id"
            noRecordsText="Aucun participant"
            onRowClick={({ record }) => setSelected(record)}
            rowStyle={() => ({ cursor: 'pointer' })}
            totalRecords={participants.length}
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
                title: 'Participant',
                render: (p) => (
                  <Group gap="sm" wrap="nowrap">
                    <Avatar radius="xl" size={32} color="brand" variant="light">
                      {p.nom.charAt(0).toUpperCase()}{p.prenom.charAt(0).toUpperCase()}
                    </Avatar>
                    <Text size="sm" fw={600} truncate>
                      {p.nom.toUpperCase()}  {p.prenom.toUpperCase()}
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
                title: 'Téléphone Wave',
                width: 170,
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
                accessor: 'numero_cni',
                title: 'N° CNI',
                width: 160,
                render: (p) => (
                  <Group gap={6} wrap="nowrap">
                    <Text size="sm" truncate>
                      {p.numero_cni}
                    </Text>
                    {p.cni_complete ? (
                      <Tooltip label="Carte CNI chargée (recto + verso)">
                        <ThemeIcon variant="subtle" color="teal" size="sm">
                          <IconPaperclip size={14} />
                        </ThemeIcon>
                      </Tooltip>
                    ) : (
                      <Tooltip label="Photos CNI manquantes (saisie manuelle)">
                        <ThemeIcon variant="subtle" color="orange" size="sm">
                          <IconAlertTriangle size={14} />
                        </ThemeIcon>
                      </Tooltip>
                    )}
                  </Group>
                ),
              },
              {
                accessor: 'horodatage',
                title: 'Inscrit le',
                width: 150,
                render: (p) => dayjs(p.horodatage).format('DD/MM/YYYY HH:mm'),
              },
            ]}
          />
        )}
      </Paper>

      <ParticipantDetailDialog
        activiteId={activiteId}
        participant={selected}
        opened={Boolean(selected)}
        onClose={() => setSelected(null)}
        canEdit={canAdd}
      />
      <AddParticipantDialog activiteId={activiteId} opened={addOpen} onClose={closeAdd} />
      <ImportListeDialog
        activiteId={activiteId}
        opened={importOpen}
        onClose={closeImport}
      />
    </Box>
  )
}

function ParticipantCards({
  participants,
  isLoading,
  onSelect,
}: {
  participants: Participant[]
  isLoading: boolean
  onSelect: (p: Participant) => void
}) {
  if (isLoading) {
    return (
      <Center py={48}>
        <Loader />
      </Center>
    )
  }
  if (!participants.length) {
    return (
      <Text c="dimmed" ta="center" py={48}>
        Aucun participant
      </Text>
    )
  }
  return (
    <Stack gap={0}>
      {participants.map((p, idx) => (
        <Box key={p.id}>
          {idx > 0 && <Divider />}
          <Box p="md" onClick={() => onSelect(p)} style={{ cursor: 'pointer' }}>
            <Group gap="sm" align="center" mb={4} wrap="nowrap">
              <Avatar color="brand" variant="light">
                {p.prenom.charAt(0).toUpperCase()}
              </Avatar>
              <Box style={{ minWidth: 0, flexGrow: 1 }}>
                <Text fw={600} truncate>
                  {p.prenom} {p.nom}
                </Text>
                <Text size="sm" c="dimmed" truncate>
                  {p.fonction} · {p.structure}
                </Text>
              </Box>
              {!p.cni_complete && (
                <Tooltip label="Photos CNI manquantes">
                  <ThemeIcon variant="subtle" color="orange" size="sm">
                    <IconAlertTriangle size={16} />
                  </ThemeIcon>
                </Tooltip>
              )}
            </Group>
            <Group gap="md" pl={48}>
              <Text size="xs" c="dimmed">
                📞 {p.telephone_wave}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                CNI : {p.numero_cni}
              </Text>
            </Group>
          </Box>
        </Box>
      ))}
    </Stack>
  )
}
