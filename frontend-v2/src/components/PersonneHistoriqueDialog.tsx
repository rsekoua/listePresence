import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  Avatar,
  Badge,
  Box,
  Center,
  Divider,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core'
import { IconCalendarEvent, IconChevronRight, IconMapPin } from '@tabler/icons-react'
import { fetchPersonneHistorique } from '../api/participants'
import { CniPhotos } from './CniPhotos'

interface Props {
  numeroCni: string | null
  opened: boolean
  onClose: () => void
}

export function PersonneHistoriqueDialog({ numeroCni, opened, onClose }: Props) {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['personne-historique', numeroCni],
    queryFn: () => fetchPersonneHistorique(numeroCni as string),
    enabled: opened && Boolean(numeroCni),
  })

  return (
    <Modal opened={opened} onClose={onClose} size="lg" centered title={null}>
      <Group gap="md" align="center" wrap="nowrap" mb="md">
        <Avatar color="brand" radius="md">
          {data?.prenom?.charAt(0).toUpperCase() ?? '?'}
        </Avatar>
        <Box style={{ flexGrow: 1, minWidth: 0 }}>
          <Text fw={700} truncate>
            {data ? `${data.prenom} ${data.nom}` : 'Chargement…'}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {data?.structure}
          </Text>
        </Box>
      </Group>

      {isLoading || !data ? (
        <Center py={48}>
          <Loader />
        </Center>
      ) : (
        <>
          {/* Identité */}
          <Stack gap="xs">
            {(
              [
                ['Fonction', data.fonction],
                ['Téléphone', data.telephone_wave],
                ['Email', data.email],
                ['N° CNI', data.numero_cni],
              ] as [string, string][]
            ).map(([label, value]) => (
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

          {/* Pièce d'identité — issue de la participation la plus récente
              disposant d'une CNI complète (la personne est dédupliquée par CNI). */}
          {(() => {
            const source = data.participations.find((p) => p.cni_complete)
            return source ? (
              <CniPhotos
                activiteId={source.activite_id}
                participantId={source.participant_id}
                enabled={opened}
              />
            ) : (
              <>
                <Text fw={600} size="sm" mb="sm">
                  Pièce d'identité
                </Text>
                <Text size="sm" c="dimmed">
                  Aucune photo de CNI enregistrée pour cette personne.
                </Text>
              </>
            )
          })()}

          <Divider my="md" />

          <Group gap="xs" mb="sm">
            <Text fw={600} size="sm">
              Participations
            </Text>
            <Badge color="brand">{data.nb_activites}</Badge>
          </Group>

          <Stack gap={6}>
            {data.participations.map((p) => (
              <UnstyledButton
                key={p.participant_id}
                onClick={() => {
                  navigate(`/activites/${p.activite_id}`)
                  onClose()
                }}
                p="sm"
                style={{
                  borderRadius: 'var(--mantine-radius-md)',
                  border: '1px solid var(--mantine-color-gray-2)',
                }}
              >
                <Group gap="sm" wrap="nowrap">
                  <IconCalendarEvent size={18} color="var(--mantine-color-gray-5)" />
                  <Box style={{ flexGrow: 1, minWidth: 0 }}>
                    <Text size="sm" fw={600} truncate>
                      {p.activite_nom}
                    </Text>
                    <Group gap="md" c="dimmed" mt={2} wrap="nowrap">
                      <Group gap={4} wrap="nowrap">
                        <IconMapPin size={13} />
                        <Text size="xs" truncate>
                          {p.activite_lieu}
                        </Text>
                      </Group>
                      <Text size="xs">{dayjs(p.horodatage).format('DD/MM/YYYY HH:mm')}</Text>
                    </Group>
                  </Box>
                  <IconChevronRight size={16} color="var(--mantine-color-gray-5)" />
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </>
      )}
    </Modal>
  )
}
