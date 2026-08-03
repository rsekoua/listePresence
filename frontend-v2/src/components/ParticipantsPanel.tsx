import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import dayjs from 'dayjs'
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { DataTable } from 'mantine-datatable'
import {
  IconAlertTriangle,
  IconBuilding,
  IconDeviceMobile,
  IconFileSpreadsheet,
  IconFileTypePdf,
  IconFileZip,
  IconFilterOff,
  IconPaperclip,
  IconSearch,
  IconUserPlus,
  IconUsersGroup,
  IconX,
} from '@tabler/icons-react'
import { fetchParticipants, type Participant } from '../api/participants'
import { nomCompletMajuscules } from '../lib/participantName'
import { exportCniZip, exportExcel, exportPresenceList } from '../api/exports'
import { useNotifications } from '../context/NotificationContext'
import { ParticipantDetailDialog } from './ParticipantDetailDialog'
import { AddParticipantDialog } from './AddParticipantDialog'
import { notify } from '../lib/notify'

const REFRESH_MS = 5_000
const PAGE_SIZES = [10, 25, 50]

/** Compare sans tenir compte de la casse ni des accents (Duékoué ≡ duekoue). */
function norm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Champ de filtre d'une colonne, avec bouton d'effacement. */
function ColumnFilter({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <TextInput
      label={label}
      placeholder="Filtrer…"
      leftSection={<IconSearch size={16} />}
      rightSection={
        value ? (
          <ActionIcon size="sm" variant="transparent" c="dimmed" onClick={() => onChange('')}>
            <IconX size={14} />
          </ActionIcon>
        ) : null
      }
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
    />
  )
}

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
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  // Recherche globale par nom + un filtre par colonne. Tout est client : la
  // liste complète est déjà chargée (fetchParticipants), donc aucun aller-retour
  // serveur n'est nécessaire et le filtrage reste instantané.
  const [search, setSearch] = useState('')
  const [fStructure, setFStructure] = useState('')
  const [fFonction, setFFonction] = useState('')
  const [fTelephone, setFTelephone] = useState('')
  const [fCni, setFCni] = useState('')
  const [fCniStatut, setFCniStatut] = useState<string | null>(null)
  const [fPeriode, setFPeriode] = useState<[string | null, string | null]>([null, null])

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

  // Mémoïsé : sans cela, le tableau serait recréé à chaque rendu et invaliderait
  // le useMemo de filtrage (qui en dépend) systématiquement.
  const participants = useMemo(() => pageData?.items ?? [], [pageData])

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
  const filtreActif =
    Boolean(search || fStructure || fFonction || fTelephone || fCni || fCniStatut) ||
    Boolean(fPeriode[0] || fPeriode[1])

  const reinitialiserFiltres = () => {
    setSearch('')
    setFStructure('')
    setFFonction('')
    setFTelephone('')
    setFCni('')
    setFCniStatut(null)
    setFPeriode([null, null])
  }

  const filtered = useMemo(() => {
    const contient = (champ: string, requete: string) =>
      !requete || norm(champ).includes(norm(requete))

    return participants.filter((p) => {
      // La recherche globale porte sur le nom complet, dans les deux ordres :
      // « ezekiel konan » comme « konan ezekiel » doivent aboutir.
      if (search) {
        const requete = norm(search)
        const direct = norm(`${p.prenom} ${p.nom}`)
        const inverse = norm(`${p.nom} ${p.prenom}`)
        if (!direct.includes(requete) && !inverse.includes(requete)) return false
      }
      if (!contient(p.structure, fStructure)) return false
      if (!contient(p.fonction, fFonction)) return false
      if (!contient(p.telephone_wave, fTelephone)) return false
      if (!contient(p.numero_cni, fCni)) return false
      if (fCniStatut === 'complete' && !p.cni_complete) return false
      if (fCniStatut === 'incomplete' && p.cni_complete) return false
      if (fPeriode[0] && dayjs(p.horodatage).isBefore(dayjs(fPeriode[0]).startOf('day'))) {
        return false
      }
      if (fPeriode[1] && dayjs(p.horodatage).isAfter(dayjs(fPeriode[1]).endOf('day'))) {
        return false
      }
      return true
    })
  }, [participants, search, fStructure, fFonction, fTelephone, fCni, fCniStatut, fPeriode])

  // Un filtre (ou une actualisation qui retire des lignes) peut rendre la page
  // courante vide. Plutôt que de corriger `page` dans un effet — ce qui provoque
  // un rendu en cascade — on la borne au moment du rendu.
  const nbPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageCourante = Math.min(page, nbPages)

  const paginated = useMemo(() => {
    const from = (pageCourante - 1) * pageSize
    return filtered.slice(from, from + pageSize)
  }, [filtered, pageCourante, pageSize])

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
          <Badge color="brand">
            {filtreActif ? `${filtered.length} / ${participants.length}` : participants.length}
          </Badge>
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
            <Button leftSection={<IconUserPlus size={18} />} onClick={openAdd}>
              Nouveau participant
            </Button>
          )}
        </Group>
      </Group>

      {/* Recherche par nom — les filtres par colonne sont dans les en-têtes du
          tableau ; sur mobile (cartes), cette recherche est le seul filtre. */}
      <Group gap="sm" mb="md" wrap="wrap">
        <TextInput
          placeholder="Rechercher un participant par nom…"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          rightSection={
            search ? (
              <ActionIcon
                size="sm"
                variant="transparent"
                c="dimmed"
                aria-label="Effacer la recherche"
                onClick={() => setSearch('')}
              >
                <IconX size={14} />
              </ActionIcon>
            ) : null
          }
          style={{ flexGrow: 1, maxWidth: 360 }}
        />
        {filtreActif && (
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconFilterOff size={16} />}
            onClick={reinitialiserFiltres}
          >
            Réinitialiser les filtres
          </Button>
        )}
      </Group>

      {/* Liste */}
      <Paper radius="sm" withBorder style={{ overflow: 'hidden' }}>
        {!isDesktop ? (
          <ParticipantCards
            participants={filtered}
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
            noRecordsText={filtreActif ? 'Aucun participant ne correspond' : 'Aucun participant'}
            onRowClick={({ record }) => setSelected(record)}
            rowStyle={() => ({ cursor: 'pointer' })}
            totalRecords={filtered.length}
            recordsPerPage={pageSize}
            page={pageCourante}
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
                filter: (
                  <ColumnFilter label="Nom ou prénom" value={search} onChange={setSearch} />
                ),
                filtering: search !== '',
                render: (p) => (
                  <Group gap="sm" wrap="nowrap">
                    <Avatar radius="xl" size={32} color="brand" variant="light">
                      {p.nom.charAt(0).toUpperCase()}{p.prenom.charAt(0).toUpperCase()}
                    </Avatar>
                    <Text size="sm" fw={600} truncate>
                      {nomCompletMajuscules(p)}
                    </Text>
                  </Group>
                ),
              },
              {
                accessor: 'structure',
                title: 'Structure',
                filter: (
                  <ColumnFilter label="Structure" value={fStructure} onChange={setFStructure} />
                ),
                filtering: fStructure !== '',
                render: (p) => (
                  <Group gap={8} wrap="nowrap">
                    <IconBuilding size={16} color="var(--mantine-color-gray-5)" />
                    <Text size="sm" truncate>
                      {p.structure}
                    </Text>
                  </Group>
                ),
              },
              {
                accessor: 'fonction',
                title: 'Fonction',
                filter: (
                  <ColumnFilter label="Fonction" value={fFonction} onChange={setFFonction} />
                ),
                filtering: fFonction !== '',
              },
              {
                accessor: 'telephone_wave',
                title: 'Téléphone Wave',
                width: 170,
                filter: (
                  <ColumnFilter label="Téléphone" value={fTelephone} onChange={setFTelephone} />
                ),
                filtering: fTelephone !== '',
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
                filter: (
                  <Stack gap="sm">
                    <ColumnFilter label="N° CNI" value={fCni} onChange={setFCni} />
                    <Select
                      label="Photos de la CNI"
                      placeholder="Toutes"
                      clearable
                      value={fCniStatut}
                      onChange={setFCniStatut}
                      data={[
                        { value: 'complete', label: 'Complètes (recto + verso)' },
                        { value: 'incomplete', label: 'Manquantes' },
                      ]}
                    />
                  </Stack>
                ),
                filtering: fCni !== '' || fCniStatut !== null,
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
                filter: (
                  <DatePickerInput
                    type="range"
                    label="Période d'inscription"
                    placeholder="Du… au…"
                    clearable
                    value={fPeriode}
                    onChange={setFPeriode}
                  />
                ),
                filtering: Boolean(fPeriode[0] || fPeriode[1]),
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
                {p.nom.charAt(0).toUpperCase()}
              </Avatar>
              <Box style={{ minWidth: 0, flexGrow: 1 }}>
                <Text fw={600} truncate>
                  {nomCompletMajuscules(p)}
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
