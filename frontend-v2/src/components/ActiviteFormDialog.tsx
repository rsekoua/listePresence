import { useEffect } from 'react'
import { useForm } from '@mantine/form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  Alert,
  Box,
  Button,
  Group,
  Modal,
  NumberInput,
  Radio,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { DateTimePicker } from '@mantine/dates'
import { IconAlertCircle } from '@tabler/icons-react'
import { createActivite, updateActivite } from '../api/activites'
import type { Activite, TypeMission } from '../api/types'
import { notify } from '../lib/notify'

interface FormValues {
  nom: string
  ville: string
  lieu: string
  description: string
  date_debut: string
  date_fin: string
  type_mission: TypeMission
  budget_alloue: number | string
}

interface Props {
  opened: boolean
  onClose: () => void
  /** Si fourni, le dialog est en mode édition. */
  activite?: Activite
}

const DT = 'YYYY-MM-DD HH:mm:ss'

const emptyValues = (): FormValues => ({
  nom: '',
  ville: '',
  lieu: '',
  description: '',
  date_debut: dayjs().add(1, 'day').hour(9).minute(0).second(0).format(DT),
  date_fin: dayjs().add(1, 'day').hour(17).minute(0).second(0).format(DT),
  type_mission: 'atelier',
  budget_alloue: '',
})

/** Dialog de création ou d'édition d'une activité. */
export function ActiviteFormDialog({ opened, onClose, activite }: Props) {
  const isEdit = Boolean(activite)
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    mode: 'controlled',
    initialValues: emptyValues(),
    validate: {
      nom: (v) => (v.trim() ? null : 'Le nom est requis'),
      ville: (v) => (v.trim() ? null : 'La ville est requise'),
      lieu: (v) => (v.trim() ? null : 'Le lieu est requis'),
      date_debut: (v) => (v ? null : 'Date de début requise'),
      date_fin: (v, values) => {
        if (!v) return 'Date de fin requise'
        if (!dayjs(v).isAfter(dayjs(values.date_debut)))
          return 'La date de fin doit être postérieure à la date de début'
        return null
      },
    },
  })

  // Pré-remplit le formulaire à l'ouverture (édition) ou le réinitialise (création).
  useEffect(() => {
    if (!opened) return
    if (activite) {
      form.setValues({
        nom: activite.nom,
        ville: activite.ville,
        lieu: activite.lieu,
        description: activite.description,
        date_debut: dayjs(activite.date_debut).format(DT),
        date_fin: dayjs(activite.date_fin).format(DT),
        type_mission: activite.type_mission,
        budget_alloue: activite.budget_alloue ?? '',
      })
    } else {
      form.setValues(emptyValues())
    }
    form.resetDirty()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, activite])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        nom: values.nom,
        ville: values.ville,
        lieu: values.lieu,
        description: values.description ?? '',
        date_debut: dayjs(values.date_debut).toISOString(),
        date_fin: dayjs(values.date_fin).toISOString(),
        type_mission: values.type_mission,
        budget_alloue:
          values.type_mission === 'terrain' && values.budget_alloue !== ''
            ? Number(values.budget_alloue)
            : null,
      }
      return activite ? updateActivite(activite.id, payload) : createActivite(payload)
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      if (activite) {
        queryClient.invalidateQueries({ queryKey: ['activite', activite.id] })
      }
      notify.success(
        isEdit
          ? `Activité « ${saved.nom} » modifiée.`
          : `Activité « ${saved.nom} » créée avec succès.`,
      )
      onClose()
    },
    onError: () => {
      notify.error(
        isEdit
          ? "Échec de la modification de l'activité."
          : "Échec de la création de l'activité.",
      )
    },
  })

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? "Modifier l'activité" : 'Nouvelle activité'}
      size="lg"
      centered
    >
      <form onSubmit={form.onSubmit((v) => mutation.mutate(v))}>
        <Stack gap="md">
          {mutation.isError && (
            <Alert color="red" icon={<IconAlertCircle size={18} />} variant="light">
              Une erreur est survenue. Vérifiez les champs.
            </Alert>
          )}
          <TextInput
            label="Nom de l'activité"
            {...form.getInputProps('nom')}
            key={form.key('nom')}
          />
          <Radio.Group
            label="Type d'activité"
            {...form.getInputProps('type_mission')}
            key={form.key('type_mission')}
          >
            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm" mt={6}>
              <Radio.Card value="terrain" p="sm" radius="md">
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <Radio.Indicator />
                  <Box>
                    <Text size="sm" fw={600}>
                      Mission terrain
                    </Text>
                    <Text size="xs" c="dimmed">
                      Équipes, dépenses &amp; justificatifs
                    </Text>
                  </Box>
                </Group>
              </Radio.Card>
              <Radio.Card value="atelier" p="sm" radius="md">
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <Radio.Indicator />
                  <Box>
                    <Text size="sm" fw={600}>
                      Atelier (en salle)
                    </Text>
                    <Text size="xs" c="dimmed">
                      Collecte des participants en salle
                    </Text>
                  </Box>
                </Group>
              </Radio.Card>
            </SimpleGrid>
          </Radio.Group>
          {form.values.type_mission === 'terrain' && (
            <NumberInput
              label="Budget alloué (FCFA)"
              description="Optionnel — base du taux de conciliation des justificatifs"
              placeholder="Laisser vide si non défini"
              min={0}
              thousandSeparator=" "
              hideControls
              {...form.getInputProps('budget_alloue')}
              key={form.key('budget_alloue')}
            />
          )}
          <Group grow align="flex-start">
            <TextInput label="Ville" {...form.getInputProps('ville')} key={form.key('ville')} />
            <TextInput
              label="Lieu (hôtel, salle…)"
              {...form.getInputProps('lieu')}
              key={form.key('lieu')}
            />
          </Group>
          <Group grow align="flex-start">
            <DateTimePicker
              label="Début"
              valueFormat="DD/MM/YYYY HH:mm"
              {...form.getInputProps('date_debut')}
              key={form.key('date_debut')}
            />
            <DateTimePicker
              label="Fin"
              valueFormat="DD/MM/YYYY HH:mm"
              {...form.getInputProps('date_fin')}
              key={form.key('date_fin')}
            />
          </Group>
          <Textarea
            label="Description (optionnel)"
            autosize
            minRows={2}
            {...form.getInputProps('description')}
            key={form.key('description')}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
