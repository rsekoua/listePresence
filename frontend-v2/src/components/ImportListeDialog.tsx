import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Group, Modal, Select, Stack, Text } from '@mantine/core'
import { IconAlertCircle, IconUsersGroup } from '@tabler/icons-react'
import { fetchActivites } from '../api/activites'
import { importListe } from '../api/participants'
import { notify, errorMessage } from '../lib/notify'

interface Props {
  opened: boolean
  onClose: () => void
  activiteId: string
}

/** Rattache une liste de personnes existante (importe les participants d'une
 *  autre activité, dédoublonnés par CNI). */
export function ImportListeDialog({ opened, onClose, activiteId }: Props) {
  const queryClient = useQueryClient()
  const [sourceId, setSourceId] = useState<string | null>(null)

  const { data: activites } = useQuery({
    queryKey: ['activites'],
    queryFn: fetchActivites,
    enabled: opened,
  })

  const options = (activites ?? [])
    .filter((a) => a.id !== activiteId)
    .map((a) => ({
      value: a.id,
      label: `${a.nom} (${a.nb_participants} pers.)`,
    }))

  const mutation = useMutation({
    mutationFn: () => importListe(activiteId, sourceId as string),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['participants', activiteId] })
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      queryClient.invalidateQueries({ queryKey: ['activite', activiteId] })
      notify.success(
        `${res.imported} personne(s) rattachée(s)` +
          (res.skipped ? `, ${res.skipped} déjà présente(s) ignorée(s).` : '.'),
      )
      setSourceId(null)
      onClose()
    },
    onError: (err) => notify.error(errorMessage(err, 'Rattachement impossible.')),
  })

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Rattacher une liste existante"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Importe les personnes d’une autre activité dans celle-ci. Les CNI déjà
          présents sont ignorés ; les photos CNI existantes sont reprises.
        </Text>
        <Select
          label="Activité source"
          placeholder="Choisir une activité"
          searchable
          data={options}
          value={sourceId}
          onChange={setSourceId}
          leftSection={<IconUsersGroup size={16} />}
          nothingFoundMessage="Aucune autre activité"
        />
        <Alert color="blue" variant="light" icon={<IconAlertCircle size={18} />}>
          Les personnes sont copiées dans cette activité (pas de lien dynamique) :
          les listes restent indépendantes ensuite.
        </Alert>
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            Annuler
          </Button>
          <Button
            loading={mutation.isPending}
            disabled={!sourceId}
            onClick={() => mutation.mutate()}
          >
            Rattacher
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
