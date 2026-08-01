import { useEffect } from 'react'
import { useForm } from '@mantine/form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Group, Modal, Stack, TextInput } from '@mantine/core'
import { cloneActivite } from '../api/activites'
import type { Activite } from '../api/types'
import { notify, errorMessage } from '../lib/notify'
import { upperInputProps } from '../lib/upperInput'

interface Props {
  opened: boolean
  onClose: () => void
  activite: Activite
  /** Appelé après un clonage réussi (ex. navigation vers la copie). */
  onCloned?: (copie: Activite) => void
}

/** Dialog de clonage d'une activité : permet de renommer la copie avant de valider. */
export function CloneActiviteDialog({ opened, onClose, activite, onCloned }: Props) {
  const queryClient = useQueryClient()

  const form = useForm({
    initialValues: { nom: `${activite.nom} (COPIE)`.toUpperCase() },
    validate: {
      nom: (v) => (v.trim() ? null : 'Le nom est requis'),
    },
  })

  // Réinitialise le nom proposé à chaque ouverture (l'activité source affichée
  // peut changer d'une ouverture à l'autre — liste vs détail).
  useEffect(() => {
    if (opened) form.setValues({ nom: `${activite.nom} (COPIE)`.toUpperCase() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, activite.nom])

  const clone = useMutation({
    mutationFn: () => cloneActivite(activite.id, form.values.nom.trim()),
    onSuccess: (copie) => {
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      notify.success(`Activité clonée : « ${copie.nom} ».`)
      onClose()
      onCloned?.(copie)
    },
    onError: (err) => notify.error(errorMessage(err, 'Clonage impossible.')),
  })

  return (
    <Modal opened={opened} onClose={onClose} title="Cloner l'activité" centered>
      <form onSubmit={form.onSubmit(() => clone.mutate())}>
        <Stack gap="md">
          <TextInput
            label="Nom de la copie"
            data-autofocus
            {...upperInputProps(form, 'nom')}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" loading={clone.isPending}>
              Cloner
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
