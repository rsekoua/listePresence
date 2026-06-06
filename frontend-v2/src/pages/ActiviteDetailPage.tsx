import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Divider,
  Grid,
  Group,
  Image,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconCopy,
  IconDownload,
  IconFileTypePdf,
  IconMapPin,
  IconNote,
  IconPencil,
  IconUser,
  IconClock,
} from '@tabler/icons-react'
import { exportQrPdf } from '../api/exports'
import { cloneActivite, fetchActivite, fetchQrCode, updateActivite } from '../api/activites'
import type { StatutActivite } from '../api/types'
import { ActiviteFormDialog } from '../components/ActiviteFormDialog'
import { ParticipantsPanel } from '../components/ParticipantsPanel'
import { ExportHistoryPanel } from '../components/ExportHistoryPanel'
import { STATUT_META } from '../lib/activiteStatut'
import { notify } from '../lib/notify'

export function ActiviteDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [qrPdfLoading, setQrPdfLoading] = useState(false)

  const { data: activite, isLoading, isError } = useQuery({
    queryKey: ['activite', id],
    queryFn: () => fetchActivite(id),
    enabled: Boolean(id),
    retry: false,
  })

  useEffect(() => {
    let revoke: string | null = null
    if (id) {
      fetchQrCode(id).then((blob) => {
        const url = URL.createObjectURL(blob)
        revoke = url
        setQrUrl(url)
      })
    }
    return () => {
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [id])

  const toggleStatut = useMutation({
    mutationFn: (statut: StatutActivite) => updateActivite(id, { statut }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['activite', id] })
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      notify.success(updated.statut === 'ouvert' ? 'Collecte ouverte.' : 'Collecte fermée.')
    },
    onError: () => notify.error('Impossible de modifier le statut.'),
  })

  const clone = useMutation({
    mutationFn: () => cloneActivite(id),
    onSuccess: (copie) => {
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      notify.success(`Activité clonée : « ${copie.nom} ».`)
      navigate(`/activites/${copie.id}`)
    },
    onError: () => notify.error('Clonage impossible.'),
  })

  const downloadQrPdf = async () => {
    setQrPdfLoading(true)
    try {
      await exportQrPdf(id)
    } catch {
      notify.error('Téléchargement du PDF impossible.')
    } finally {
      setQrPdfLoading(false)
    }
  }

  const downloadQr = () => {
    if (!qrUrl || !activite) return
    const a = document.createElement('a')
    a.href = qrUrl
    a.download = `qrcode_${activite.nom.replace(/\s+/g, '_')}.png`
    a.click()
  }

  if (isError) {
    return (
      <Box maw={460} mx="auto" mt={64} ta="center">
        <Paper p="xl" radius="sm">
          <Title order={5} mb="xs">
            Activité introuvable
          </Title>
          <Text c="dimmed" mb="lg">
            Cette activité n'existe pas ou vous n'avez pas l'autorisation d'y accéder.
          </Text>
          <Button leftSection={<IconArrowLeft size={18} />} onClick={() => navigate('/dashboard')}>
            Retour au tableau de bord
          </Button>
        </Paper>
      </Box>
    )
  }

  if (isLoading || !activite) {
    return (
      <Center mt={80}>
        <Loader />
      </Center>
    )
  }

  const statut = STATUT_META[activite.statut]
  const isOpen = activite.statut === 'ouvert'

  return (
    <Box>
      {/* Retour */}
      <Button
        variant="subtle"
        color="gray"
        size="compact-sm"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => navigate('/dashboard')}
        mb="sm"
      >
        Retour aux activités
      </Button>

      {/* Titre + actions */}
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md" mb="lg">
        <Box style={{ flexGrow: 1, minWidth: 0 }}>
          <Group gap="sm" align="center" wrap="wrap">
            <Title order={2}>{activite.nom}</Title>
            <Badge
              variant="light"
              color={statut.color}
              leftSection={statut.icon}
              style={{ textTransform: 'none' }}
            >
              {statut.label}
            </Badge>
          </Group>
          <Group gap="md" mt={6} c="dimmed" wrap="wrap">
            <Group gap={4} wrap="nowrap">
              <IconMapPin size={16} />
              <Text size="xs">
                {activite.ville} · {activite.lieu}
              </Text>
            </Group>
            <Group gap={4} wrap="nowrap">
              <IconClock size={16} />
              <Text size="xs">{dayjs(activite.date_debut).format('DD/MM/YYYY')}</Text>
            </Group>
          </Group>
        </Box>
        <Group gap="sm">
          {activite.can_edit && (
            <Button
              variant="default"
              leftSection={<IconPencil size={18} />}
              onClick={() => setEditOpen(true)}
            >
              Modifier
            </Button>
          )}
          <Button
            variant="default"
            leftSection={<IconCopy size={18} />}
            loading={clone.isPending}
            onClick={() => clone.mutate()}
          >
            Cloner
          </Button>
        </Group>
      </Group>

      {/* Bloc unique : informations + QR + action */}
      <Paper p="lg" radius="sm">
        <Grid>
          {/* Informations */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Title order={5} mb="md">
              Informations
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="md">
              <Info icon={<IconMapPin size={18} />} label="Ville de l'activité" value={activite.ville} />
              <Info icon={<IconMapPin size={18} />} label="Lieu de l'activité" value={activite.lieu} />
              <Info
                icon={<IconClock size={18} />}
                label="Période de  l'activité"
                value={`${dayjs(activite.date_debut).format('DD/MM/YYYY HH:mm')} → ${dayjs(
                  activite.date_fin,
                ).format('DD/MM/YYYY HH:mm')}`}
                
              />
              <Info
                icon={<IconUser size={18} />}
                label="Agent administrateur"
                value={activite.created_by.username}
              />
              {activite.description && (
                <Box style={{ gridColumn: '1 / -1' }}>
                  <Info
                    icon={<IconNote size={18} />}
                    label="Description"
                    value={activite.description}
                  />
                </Box>
              )}
            </SimpleGrid>
          </Grid.Col>

          {/* QR Code */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack align="center" gap="sm">
              <Card withBorder padding="sm" radius="md">
                {qrUrl ? (
                  <Image src={qrUrl} alt="QR Code de l'activité" w={150} h={150} />
                ) : (
                  <Center w={150} h={150}>
                    <Loader />
                  </Center>
                )}
              </Card>
              <Anchor
                href={activite.form_url}
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                ta="center"
                style={{ wordBreak: 'break-all' }}
              >
                {activite.form_url}
              </Anchor>
              <Group gap="sm" w="100%" grow>
                <Button
                  variant="default"
                  size="xs"
                  leftSection={<IconDownload size={14} />}
                  onClick={downloadQr}
                  disabled={!qrUrl}
                >
                  PNG
                </Button>
                <Button
                  size="xs"
                  leftSection={<IconFileTypePdf size={14} />}
                  loading={qrPdfLoading}
                  onClick={downloadQrPdf}
                >
                  PDF
                </Button>
              </Group>
            </Stack>
          </Grid.Col>
        </Grid>

        <Divider my="lg" />

        {/* Action ouvrir / fermer */}
        <Group align="center" wrap="wrap" gap="md">
          <Button
            color={isOpen ? 'orange' : 'teal'}
            disabled={!activite.can_edit || activite.statut === 'archive'}
            loading={toggleStatut.isPending}
            onClick={() => toggleStatut.mutate(isOpen ? 'ferme' : 'ouvert')}
          >
            {isOpen ? 'Fermer la collecte' : 'Ouvrir la collecte'}
          </Button>
          <Text size="sm" c="dimmed">
            {!activite.can_edit
              ? "Réservé au créateur de l'activité."
              : isOpen
                ? "Les participants peuvent s'enregistrer."
                : 'Le formulaire public est désactivé.'}
          </Text>
        </Group>
      </Paper>

      {/* Participants */}
      <Box mt="xl">
        <ParticipantsPanel
          activiteId={activite.id}
          canAdd={activite.can_edit && activite.statut === 'ouvert'}
        />
      </Box>

      {/* Historique des exports (EXP-06) */}
      <ExportHistoryPanel activiteId={activite.id} />

      <ActiviteFormDialog
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        activite={activite}
      />
    </Box>
  )
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Group gap="sm" align="flex-start" wrap="nowrap">
      <Box c="dimmed" mt={2}>
        {icon}
      </Box>
      <Box>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text fw={500}>{value}</Text>
      </Box>
    </Group>
  )
}
