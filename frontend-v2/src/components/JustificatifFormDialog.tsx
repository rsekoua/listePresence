import { useEffect } from 'react'
import { useForm } from '@mantine/form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import { fetchActivites } from '../api/activites'
import {
  CATEGORIE_LABELS,
  CATEGORIES_MULTI_RECU,
  createJustificatif,
  updateJustificatif,
  type CategorieJustif,
  type Justificatif,
} from '../api/justificatifs'
import { notify, errorMessage } from '../lib/notify'

interface FormValues {
  categorie: CategorieJustif
  equipe: string
  montant_total: number | string
  activite_collation_id: string | null
}

interface Props {
  opened: boolean
  onClose: () => void
  activiteId: string
  /** Si fourni, le dialog est en mode édition. */
  justificatif?: Justificatif
}

const CATEGORIE_OPTIONS = (
  Object.entries(CATEGORIE_LABELS) as [CategorieJustif, string][]
).map(([value, label]) => ({ value, label }))

/** Un montant total est saisi manuellement pour perdiem et collation. */
function usesMontantTotal(cat: CategorieJustif): boolean {
  return cat === 'perdiem' || cat === 'collation'
}

export function JustificatifFormDialog({
  opened,
  onClose,
  activiteId,
  justificatif,
}: Props) {
  const isEdit = Boolean(justificatif)
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    mode: 'controlled',
    initialValues: {
      categorie: 'carburant',
      equipe: '',
      montant_total: '',
      activite_collation_id: null,
    },
    validate: {
      montant_total: (v, values) =>
        usesMontantTotal(values.categorie) && v === ''
          ? 'Montant requis'
          : null,
      activite_collation_id: (v, values) =>
        values.categorie === 'collation' && !v
          ? 'Sélectionnez l’activité de collecte des CNI'
          : null,
    },
  })

  // Liste des activités (pour rattacher une collation à sa collecte de CNI).
  const { data: activites } = useQuery({
    queryKey: ['activites'],
    queryFn: fetchActivites,
    enabled: opened,
  })

  useEffect(() => {
    if (!opened) return
    if (justificatif) {
      form.setValues({
        categorie: justificatif.categorie,
        equipe: justificatif.equipe,
        montant_total: justificatif.montant_total ?? '',
        activite_collation_id: justificatif.activite_collation_id,
      })
    } else {
      form.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, justificatif])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const input = {
        categorie: values.categorie,
        equipe: values.equipe.trim(),
        montant_total: usesMontantTotal(values.categorie)
          ? Number(values.montant_total)
          : null,
        activite_collation_id:
          values.categorie === 'collation' ? values.activite_collation_id : null,
      }
      return justificatif
        ? updateJustificatif(activiteId, justificatif.id, input)
        : createJustificatif(activiteId, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['justificatifs', activiteId] })
      queryClient.invalidateQueries({ queryKey: ['conciliation', activiteId] })
      notify.success(isEdit ? 'Poste modifié.' : 'Poste de dépense créé.')
      onClose()
    },
    onError: (err) => notify.error(errorMessage(err, 'Enregistrement impossible.')),
  })

  const cat = form.values.categorie
  const isMulti = CATEGORIES_MULTI_RECU.includes(cat)

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? 'Modifier le poste' : 'Nouveau poste de dépense'}
      centered
    >
      <form onSubmit={form.onSubmit((v) => mutation.mutate(v))}>
        <Stack gap="md">
          <Select
            label="Catégorie"
            data={CATEGORIE_OPTIONS}
            allowDeselect={false}
            {...form.getInputProps('categorie')}
            key={form.key('categorie')}
          />
          <TextInput
            label="Équipe (optionnel)"
            placeholder="Ex. Équipe A — Kouassi"
            {...form.getInputProps('equipe')}
            key={form.key('equipe')}
          />
          {usesMontantTotal(cat) && (
            <NumberInput
              label={
                cat === 'perdiem' ? 'Montant total du perdiem (FCFA)' : 'Montant (FCFA)'
              }
              min={0}
              thousandSeparator=" "
              hideControls
              {...form.getInputProps('montant_total')}
              key={form.key('montant_total')}
            />
          )}
          {cat === 'collation' && (
            <Select
              label="Activité liée (collecte des CNI)"
              placeholder="Choisir l’activité"
              searchable
              data={(activites ?? []).map((a) => ({ value: a.id, label: a.nom }))}
              {...form.getInputProps('activite_collation_id')}
              key={form.key('activite_collation_id')}
            />
          )}
          {isMulti && (
            <Alert color="blue" variant="light" icon={<IconAlertCircle size={18} />}>
              Le montant se saisit reçu par reçu : ajoutez ensuite chaque pièce
              avec son montant. Le total du poste est calculé automatiquement.
            </Alert>
          )}
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Enregistrer' : 'Créer le poste'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
