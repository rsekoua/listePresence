import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { useQueryClient } from '@tanstack/react-query'
import {
  Avatar,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Image,
  Modal,
  Stack,
  Text,
} from '@mantine/core'
import { IconFileTypePdf } from '@tabler/icons-react'
import { fetchParticipantPhoto, type Participant } from '../api/participants'
import { exportParticipantPdf } from '../api/exports'
import { notify } from '../lib/notify'

interface Props {
  activiteId: string
  participant: Participant | null
  opened: boolean
  onClose: () => void
}

export function ParticipantDetailDialog({ activiteId, participant, opened, onClose }: Props) {
  const [recto, setRecto] = useState<string | null>(null)
  const [verso, setVerso] = useState<string | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const queryClient = useQueryClient()

  const downloadPdf = async () => {
    if (!participant) return
    setDownloading(true)
    try {
      await exportParticipantPdf(participant.id)
      queryClient.invalidateQueries({ queryKey: ['export-history', activiteId] })
    } catch {
      notify.error('Téléchargement de la fiche impossible.')
    } finally {
      setDownloading(false)
    }
  }

  useEffect(() => {
    if (!opened || !participant) return
    let urls: string[] = []
    setRecto(null)
    setVerso(null)
    Promise.all([
      fetchParticipantPhoto(activiteId, participant.id, 'recto'),
      fetchParticipantPhoto(activiteId, participant.id, 'verso'),
    ]).then(([r, v]) => {
      const ru = URL.createObjectURL(r)
      const vu = URL.createObjectURL(v)
      urls = [ru, vu]
      setRecto(ru)
      setVerso(vu)
    })
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [opened, participant, activiteId])

  if (!participant) return null

  const rows: [string, string][] = [
    ['Structure', participant.structure],
    ['Fonction', participant.fonction],
    ['Téléphone', participant.telephone_wave],
    ['Email', participant.email],
    ['N° CNI', participant.numero_cni],
    ['Enregistré le', dayjs(participant.horodatage).format('DD/MM/YYYY à HH:mm')],
  ]

  return (
    <>
      <Modal opened={opened} onClose={onClose} size="lg" centered title={null}>
        <Group gap="md" align="center" wrap="nowrap" mb="md">
          <Avatar color="brand" radius="md">
            {participant.prenom.charAt(0).toUpperCase()}
          </Avatar>
          <Box style={{ flexGrow: 1, minWidth: 0 }}>
            <Text fw={700} truncate>
              {participant.prenom} {participant.nom}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {participant.structure}
            </Text>
          </Box>
        </Group>

        <Stack gap="xs">
          {rows.map(([label, value]) => (
            <Group key={label} justify="space-between" gap="md" wrap="nowrap">
              <Text size="sm" c="dimmed">
                {label}
              </Text>
              <Text size="sm" fw={600} ta="right">
                {value}
              </Text>
            </Group>
          ))}
        </Stack>

        <Divider my="md" />
        <Text fw={600} size="sm" mb="sm">
          Pièce d'identité (cliquer pour agrandir)
        </Text>
        <Group grow align="flex-start">
          <CniThumb label="Recto" url={recto} onZoom={setZoom} />
          <CniThumb label="Verso" url={verso} onZoom={setZoom} />
        </Group>

        <Group justify="flex-end" mt="lg">
          <Button
            leftSection={<IconFileTypePdf size={18} />}
            loading={downloading}
            onClick={downloadPdf}
          >
            Télécharger la fiche PDF
          </Button>
        </Group>
      </Modal>

      {/* Zoom plein écran */}
      <Modal opened={Boolean(zoom)} onClose={() => setZoom(null)} size="auto" centered withCloseButton={false} padding={0}>
        {zoom && (
          <Image
            src={zoom}
            alt="CNI"
            onClick={() => setZoom(null)}
            style={{ maxWidth: '90vw', maxHeight: '85vh', cursor: 'zoom-out' }}
          />
        )}
      </Modal>
    </>
  )
}

function CniThumb({
  label,
  url,
  onZoom,
}: {
  label: string
  url: string | null
  onZoom: (u: string) => void
}) {
  return (
    <Box>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Box
        mt={4}
        h={130}
        onClick={() => url && onZoom(url)}
        style={{
          borderRadius: 'var(--mantine-radius-md)',
          border: '1px solid var(--mantine-color-gray-3)',
          overflow: 'hidden',
          backgroundColor: 'var(--mantine-color-gray-0)',
          cursor: url ? 'zoom-in' : 'default',
        }}
      >
        {url ? (
          <Image src={url} alt={label} h={130} fit="cover" />
        ) : (
          <Center h={130}>
            <Text size="xs" c="dimmed">
              Chargement…
            </Text>
          </Center>
        )}
      </Box>
    </Box>
  )
}
