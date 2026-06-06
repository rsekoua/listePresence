import { useEffect, useState } from 'react'
import { useForm } from '@mantine/form'
import { zod4Resolver } from 'mantine-form-zod-resolver'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Alert, Button, Divider, Group, Modal, Stack, Text, TextInput } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import { updateParticipant, type Participant } from '../api/participants'
import { notify } from '../lib/notify'
import { PhotoUpload } from './PhotoUpload'
import {
  formatPhone,
  normalizePhoneDigits,
  participantSchema,
  toLocalPhoneDigits,
  type ParticipantFormValues as FormValues,
} from '../lib/participantSchema'

interface Props {
  activiteId: string
  participant: Participant | null
  opened: boolean
  onClose: () => void
  /** Appelé après une mise à jour réussie (ex. fermer aussi la fiche détail). */
  onUpdated?: () => void
}

export function EditParticipantDialog({
  activiteId,
  participant,
  opened,
  onClose,
  onUpdated,
}: Props) {
  const queryClient = useQueryClient()
  const [phoneFocused, setPhoneFocused] = useState(false)
  const [recto, setRecto] = useState<File | null>(null)
  const [verso, setVerso] = useState<File | null>(null)
  const form = useForm<FormValues>({
    mode: 'controlled',
    initialValues: {
      nom: '',
      prenom: '',
      structure: '',
      fonction: '',
      telephone_wave: '',
      email: '',
      numero_cni: '',
    },
    validate: zod4Resolver(participantSchema),
    validateInputOnBlur: true,
  })

  // Pré-remplit le formulaire à l'ouverture (ou au changement de participant).
  useEffect(() => {
    if (opened && participant) {
      form.setValues({
        nom: participant.nom,
        prenom: participant.prenom,
        structure: participant.structure,
        fonction: participant.fonction,
        telephone_wave: toLocalPhoneDigits(participant.telephone_wave),
        email: participant.email,
        numero_cni: participant.numero_cni,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, participant?.id])

  const handleClose = () => {
    setRecto(null)
    setVerso(null)
    onClose()
  }

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateParticipant(activiteId, participant!.id, values, { recto, verso }),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['participants', activiteId] })
      queryClient.invalidateQueries({ queryKey: ['stats', activiteId] })
      queryClient.invalidateQueries({ queryKey: ['personnes'] })
      notify.success(`Participant « ${p.prenom} ${p.nom} » mis à jour.`)
      setRecto(null)
      setVerso(null)
      onUpdated?.()
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 409) {
        form.setFieldError(
          'numero_cni',
          'Ce numéro de CNI est déjà utilisé par un autre participant de cette activité.',
        )
      } else {
        notify.error('Échec de la mise à jour du participant.')
      }
    },
  })

  const phoneDigits = normalizePhoneDigits(form.getValues().telephone_wave ?? '')

  return (
    <Modal opened={opened} onClose={handleClose} title="Modifier le participant" size="lg" centered>
      <form onSubmit={form.onSubmit((v) => mutation.mutate(v))} noValidate>
        <Text size="xs" c="red" mb="md">
          * Champ obligatoire
        </Text>
        <Stack gap="md">
          <Group grow align="flex-start">
            <TextInput label="Nom" required {...form.getInputProps('nom')} key={form.key('nom')} />
            <TextInput
              label="Prénom"
              required
              {...form.getInputProps('prenom')}
              key={form.key('prenom')}
            />
          </Group>
          <TextInput
            label="Structure / Organisation"
            required
            {...form.getInputProps('structure')}
            key={form.key('structure')}
          />
          <TextInput
            label="Fonction / Poste"
            required
            {...form.getInputProps('fonction')}
            key={form.key('fonction')}
          />
          <TextInput
            label="Téléphone Wave"
            required
            placeholder="07 01 02 03 04"
            inputMode="tel"
            maxLength={14}
            value={phoneFocused ? phoneDigits : phoneDigits ? formatPhone(phoneDigits) : ''}
            onChange={(e) =>
              form.setFieldValue('telephone_wave', normalizePhoneDigits(e.currentTarget.value))
            }
            onFocus={() => setPhoneFocused(true)}
            onBlur={() => {
              setPhoneFocused(false)
              form.validateField('telephone_wave')
            }}
            error={form.errors.telephone_wave}
          />
          <TextInput
            label="Adresse email"
            required
            type="email"
            {...form.getInputProps('email')}
            key={form.key('email')}
          />
          <TextInput
            label="Numéro de CNI"
            required
            {...form.getInputProps('numero_cni')}
            key={form.key('numero_cni')}
          />

          <Divider label="Pièce d'identité (CNI)" labelPosition="center" />
          <Text size="xs" c={participant?.cni_complete ? 'dimmed' : 'orange'}>
            {participant?.cni_complete
              ? 'CNI actuelle complète. Choisissez une photo uniquement pour la remplacer.'
              : 'CNI actuelle incomplète. Ajoutez les photos manquantes ci-dessous.'}{' '}
            Laisser une face vide conserve la photo existante.
          </Text>
          <PhotoUpload label="Photo du recto de votre CNI" value={recto} onChange={setRecto} />
          <PhotoUpload label="Photo du verso de votre CNI" value={verso} onChange={setVerso} />

          {mutation.isError && !form.errors.numero_cni && (
            <Alert color="red" icon={<IconAlertCircle size={18} />} variant="light">
              Une erreur est survenue.
            </Alert>
          )}
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
