import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { modals } from '@mantine/modals'
import {
  ActionIcon,
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  FileInput,
  Group,
  NumberInput,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconDownload,
  IconEye,
  IconPaperclip,
  IconPencil,
  IconPlus,
  IconReceipt,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react'
import {
  CATEGORIES_MULTI_RECU,
  addPiece,
  deleteJustificatif,
  deletePiece,
  downloadCollationCni,
  fetchConciliation,
  fetchJustificatifs,
  fetchPieceFichier,
  type CategorieJustif,
  type Justificatif,
  type PieceJointe,
} from '../api/justificatifs'
import { JustificatifFormDialog } from './JustificatifFormDialog'
import { notify, errorMessage } from '../lib/notify'

interface Props {
  activiteId: string
  canEdit: boolean
}

const CATEGORIE_COLOR: Record<CategorieJustif, string> = {
  carburant: 'orange',
  peage: 'grape',
  communication: 'cyan',
  perdiem: 'teal',
  presence: 'indigo',
  collation: 'pink',
}

function fmtMoney(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—'
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return `${n.toLocaleString('fr-FR')} FCFA`
}

async function openBlobInNewTab(blob: Blob) {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  // Laisse le temps au navigateur d'ouvrir avant de révoquer.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function JustificatifsPanel({ activiteId, canEdit }: Props) {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Justificatif | undefined>(undefined)

  const { data: justificatifs = [], isLoading } = useQuery({
    queryKey: ['justificatifs', activiteId],
    queryFn: () => fetchJustificatifs(activiteId),
  })
  const { data: conciliation } = useQuery({
    queryKey: ['conciliation', activiteId],
    queryFn: () => fetchConciliation(activiteId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['justificatifs', activiteId] })
    queryClient.invalidateQueries({ queryKey: ['conciliation', activiteId] })
  }

  const removePoste = useMutation({
    mutationFn: (id: string) => deleteJustificatif(activiteId, id),
    onSuccess: () => {
      invalidate()
      notify.success('Poste supprimé.')
    },
    onError: (err) => notify.error(errorMessage(err, 'Suppression impossible.')),
  })

  const confirmRemovePoste = (j: Justificatif) =>
    modals.openConfirmModal({
      title: 'Supprimer ce poste ?',
      children: (
        <Text size="sm">
          Le poste « {j.categorie_label} » et ses {j.pieces.length} pièce(s)
          seront définitivement supprimés.
        </Text>
      ),
      labels: { confirm: 'Supprimer', cancel: 'Annuler' },
      confirmProps: { color: 'red' },
      onConfirm: () => removePoste.mutate(j.id),
    })

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }
  const openEdit = (j: Justificatif) => {
    setEditing(j)
    setFormOpen(true)
  }

  const taux = conciliation?.taux ?? null

  return (
    <Paper p="lg" radius="sm" mt="xl">
      <Group justify="space-between" align="center" mb="md" wrap="wrap">
        <Group gap="xs">
          <IconReceipt size={22} />
          <Title order={4}>Dépenses & justificatifs</Title>
        </Group>
        {canEdit && (
          <Button leftSection={<IconPlus size={18} />} onClick={openCreate}>
            Ajouter un poste
          </Button>
        )}
      </Group>

      {/* Conciliation */}
      {conciliation && (
        <Paper withBorder p="md" radius="sm" mb="lg">
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
            <Metric label="Budget alloué" value={fmtMoney(conciliation.budget_alloue)} />
            <Metric
              label="Montant justifié"
              value={fmtMoney(conciliation.montant_justifie)}
            />
            <Metric
              label="Reste à justifier"
              value={fmtMoney(conciliation.reste_a_justifier)}
              color={
                conciliation.reste_a_justifier != null &&
                Number(conciliation.reste_a_justifier) < 0
                  ? 'red'
                  : undefined
              }
            />
          </SimpleGrid>
          {taux != null ? (
            <Box>
              <Group justify="space-between" mb={4}>
                <Text size="sm" c="dimmed">
                  Taux de conciliation
                </Text>
                <Text size="sm" fw={600}>
                  {taux.toLocaleString('fr-FR')} %
                </Text>
              </Group>
              <Progress
                value={Math.min(taux, 100)}
                color={taux > 100 ? 'red' : taux >= 90 ? 'teal' : 'orange'}
                size="lg"
                radius="sm"
              />
            </Box>
          ) : (
            <Text size="sm" c="dimmed">
              Renseignez le budget alloué de la mission pour calculer le taux de
              conciliation.
            </Text>
          )}
          {conciliation.par_categorie.length > 0 && (
            <Group gap="xs" mt="md" wrap="wrap">
              {conciliation.par_categorie.map((c) => (
                <Badge
                  key={c.categorie}
                  variant="light"
                  color={CATEGORIE_COLOR[c.categorie]}
                  style={{ textTransform: 'none' }}
                >
                  {c.categorie_label} : {fmtMoney(c.montant_justifie)}
                </Badge>
              ))}
            </Group>
          )}
        </Paper>
      )}

      {/* Liste des postes */}
      {isLoading ? (
        <Text c="dimmed" size="sm">
          Chargement…
        </Text>
      ) : justificatifs.length === 0 ? (
        <Alert color="gray" variant="light" icon={<IconAlertCircle size={18} />}>
          Aucun justificatif pour l’instant. Ajoutez un poste (carburant, perdiem,
          péage, communication, présence ou collation).
        </Alert>
      ) : (
        <Accordion variant="separated" multiple>
          {justificatifs.map((j) => (
            <Accordion.Item key={j.id} value={j.id}>
              <Accordion.Control>
                <Group justify="space-between" wrap="wrap" pr="sm">
                  <Group gap="sm">
                    <Badge
                      color={CATEGORIE_COLOR[j.categorie]}
                      variant="light"
                      style={{ textTransform: 'none' }}
                    >
                      {j.categorie_label}
                    </Badge>
                    {j.equipe && (
                      <Group gap={4} c="dimmed">
                        <IconUsers size={14} />
                        <Text size="sm">{j.equipe}</Text>
                      </Group>
                    )}
                  </Group>
                  <Group gap="sm">
                    <Text size="sm" fw={600}>
                      {fmtMoney(j.montant_justifie)}
                    </Text>
                    <Badge size="sm" variant="outline" color="gray">
                      {j.pieces.length} pièce{j.pieces.length > 1 ? 's' : ''}
                    </Badge>
                  </Group>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <PosteContent
                  activiteId={activiteId}
                  justificatif={j}
                  canEdit={canEdit}
                  onChanged={invalidate}
                  onEdit={() => openEdit(j)}
                  onDelete={() => confirmRemovePoste(j)}
                />
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}

      <JustificatifFormDialog
        opened={formOpen}
        onClose={() => setFormOpen(false)}
        activiteId={activiteId}
        justificatif={editing}
      />
    </Paper>
  )
}

function Metric({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <Box>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={600} c={color}>
        {value}
      </Text>
    </Box>
  )
}

// --- Contenu d'un poste (pièces + ajout) -----------------------------------

function PosteContent({
  activiteId,
  justificatif,
  canEdit,
  onChanged,
  onEdit,
  onDelete,
}: {
  activiteId: string
  justificatif: Justificatif
  canEdit: boolean
  onChanged: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const isMulti = CATEGORIES_MULTI_RECU.includes(justificatif.categorie)
  const [file, setFile] = useState<File | null>(null)
  const [montant, setMontant] = useState<number | string>('')

  const add = useMutation({
    mutationFn: () =>
      addPiece(activiteId, justificatif.id, file as File, {
        montant: isMulti ? montant : null,
      }),
    onSuccess: () => {
      setFile(null)
      setMontant('')
      onChanged()
      notify.success('Pièce ajoutée.')
    },
    onError: (err) => notify.error(errorMessage(err, 'Ajout de la pièce impossible.')),
  })

  const removePiece = useMutation({
    mutationFn: (pieceId: string) => deletePiece(activiteId, justificatif.id, pieceId),
    onSuccess: () => {
      onChanged()
      notify.success('Pièce supprimée.')
    },
    onError: (err) => notify.error(errorMessage(err, 'Suppression impossible.')),
  })

  const cniDownload = useMutation({
    mutationFn: () => downloadCollationCni(activiteId, justificatif.id),
    onSuccess: (blob) => triggerDownload(blob, 'cni_collation.zip'),
    onError: (err) => notify.error(errorMessage(err, 'Téléchargement impossible.')),
  })

  const viewPiece = async (piece: PieceJointe) => {
    try {
      const blob = await fetchPieceFichier(piece.fichier_url)
      await openBlobInNewTab(blob)
    } catch (err) {
      notify.error(errorMessage(err, 'Ouverture du fichier impossible.'))
    }
  }

  const canSubmit = Boolean(file) && (!isMulti || montant !== '')

  return (
    <Stack gap="md">
      {/* Collation : téléchargement des CNI de l'activité liée */}
      {justificatif.categorie === 'collation' && justificatif.activite_collation_id && (
        <Alert color="pink" variant="light" icon={<IconUsers size={18} />}>
          <Group justify="space-between" wrap="wrap">
            <Text size="sm">
              Bénéficiaires : participants de « {justificatif.activite_collation_nom} ».
            </Text>
            <Button
              size="xs"
              variant="light"
              color="pink"
              leftSection={<IconDownload size={14} />}
              loading={cniDownload.isPending}
              onClick={() => cniDownload.mutate()}
            >
              Télécharger les CNI (ZIP)
            </Button>
          </Group>
        </Alert>
      )}

      {/* Liste des pièces */}
      {justificatif.pieces.length === 0 ? (
        <Text size="sm" c="dimmed">
          Aucune pièce jointe pour ce poste.
        </Text>
      ) : (
        <Stack gap="xs">
          {justificatif.pieces.map((p) => (
            <Group
              key={p.id}
              justify="space-between"
              wrap="nowrap"
              px="sm"
              py={6}
              style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 6 }}
            >
              <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                <IconPaperclip size={16} />
                <Text size="sm" truncate>
                  {p.libelle || (p.content_type.includes('pdf') ? 'Document PDF' : 'Image')}
                </Text>
                {p.montant != null && (
                  <Badge size="sm" variant="light" color="gray">
                    {fmtMoney(p.montant)}
                  </Badge>
                )}
              </Group>
              <Group gap={4} wrap="nowrap">
                <Tooltip label="Ouvrir">
                  <ActionIcon variant="subtle" onClick={() => viewPiece(p)}>
                    <IconEye size={18} />
                  </ActionIcon>
                </Tooltip>
                {canEdit && (
                  <Tooltip label="Supprimer">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      loading={removePiece.isPending}
                      onClick={() => removePiece.mutate(p.id)}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            </Group>
          ))}
        </Stack>
      )}

      {/* Ajout d'une pièce */}
      {canEdit && (
        <Group align="flex-end" gap="sm" wrap="wrap">
          <FileInput
            label="Joindre une pièce (PDF ou image)"
            placeholder="Choisir un fichier"
            accept="application/pdf,image/*"
            value={file}
            onChange={setFile}
            clearable
            style={{ flexGrow: 1, minWidth: 200 }}
          />
          {isMulti && (
            <NumberInput
              label="Montant (FCFA)"
              min={0}
              thousandSeparator=" "
              hideControls
              value={montant}
              onChange={setMontant}
              w={160}
            />
          )}
          <Button
            leftSection={<IconPlus size={16} />}
            loading={add.isPending}
            disabled={!canSubmit}
            onClick={() => add.mutate()}
          >
            Ajouter
          </Button>
        </Group>
      )}

      {/* Actions du poste */}
      {canEdit && (
        <Group justify="flex-end" gap="sm">
          <Button
            variant="subtle"
            size="compact-sm"
            leftSection={<IconPencil size={16} />}
            onClick={onEdit}
          >
            Modifier
          </Button>
          <Button
            variant="subtle"
            color="red"
            size="compact-sm"
            leftSection={<IconTrash size={16} />}
            onClick={onDelete}
          >
            Supprimer le poste
          </Button>
        </Group>
      )}
    </Stack>
  )
}
