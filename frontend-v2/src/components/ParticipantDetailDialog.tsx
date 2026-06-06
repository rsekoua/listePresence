import { useState } from 'react'
import dayjs from 'dayjs'
import { useQueryClient } from '@tanstack/react-query'
import { Avatar, Box, Button, Divider, Group, Modal, Stack, Text } from '@mantine/core'
import { IconFileTypePdf } from '@tabler/icons-react'
import { type Participant } from '../api/participants'
import { exportParticipantPdf } from '../api/exports'
import { notify } from '../lib/notify'
import { CniPhotos } from './CniPhotos'

interface Props {
  activiteId: string
  participant: Participant | null
  opened: boolean
  onClose: () => void
}

export function ParticipantDetailDialog({ activiteId, participant, opened, onClose }: Props) {
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
      <CniPhotos activiteId={activiteId} participantId={participant.id} enabled={opened} />

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
  )
}
