import { useEffect, useState } from 'react'
import { useForm } from '@mantine/form'
import { zod4Resolver } from 'mantine-form-zod-resolver'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Alert, Button, Divider, Group, Modal, Stack, Text, TextInput } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import { createParticipant } from '../api/participants'
import { notify } from '../lib/notify'
import { PhotoUpload } from './PhotoUpload'
import {
  EMPTY_PARTICIPANT,
  formatPhone,
  normalizePhoneDigits,
  participantSchema,
  type ParticipantFormValues as FormValues,
} from '../lib/participantSchema'

interface Props {
  activiteId: string
  opened: boolean
  onClose: () => void
}

export function AddParticipantDialog({ activiteId, opened, onClose }: Props) {
  const queryClient = useQueryClient()
  const [phoneFocused, setPhoneFocused] = useState(false)
  const [recto, setRecto] = useState<File | null>(null)
  const [verso, setVerso] = useState<File | null>(null)
  const form = useForm<FormValues>({
    mode: 'controlled',
    initialValues: EMPTY_PARTICIPANT,
    validate: zod4Resolver(participantSchema),
    // Retour immédiat : le champ requis se borde de rouge dès qu'on le quitte.
    validateInputOnBlur: true,
  })

  useEffect(() => {
    if (opened) form.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened])

  // Réinitialise les photos à chaque fermeture (toutes voies : annuler,
  // Échap, clic hors-modale, succès).
  const handleClose = () => {
    setRecto(null)
    setVerso(null)
    onClose()
  }

  const mutation = useMutation({
    mutationFn: (values: FormValues) => createParticipant(activiteId, values, { recto, verso }),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['participants', activiteId] })
      queryClient.invalidateQueries({ queryKey: ['stats', activiteId] })
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      notify.success(`Participant « ${p.prenom} ${p.nom} » ajouté.`)
      handleClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 409) {
        form.setFieldError(
          'numero_cni',
          'Ce numéro de CNI est déjà enregistré pour cette activité.',
        )
      } else {
        notify.error("Échec de l'ajout du participant.")
      }
    },
  })

  const phoneDigits = normalizePhoneDigits(form.getValues().telephone_wave ?? '')

  return (
    <Modal opened={opened} onClose={handleClose} title="Ajouter un participant" size="lg" centered>
      <form onSubmit={form.onSubmit((v) => mutation.mutate(v))} noValidate>
        <Text size="sm" c="dimmed" mb={4}>
          Saisie manuelle. Les photos de la CNI sont facultatives.
        </Text>
        <Text size="xs" c="red" mb="md">
          * Champ obligatoire
        </Text>
        <Stack gap="md">
          <Group grow align="flex-start">
            <TextInput
              label="Nom"
              required
              {...form.getInputProps('nom')}
              key={form.key('nom')}
            />
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

          <Divider label="Photos de la CNI (facultatif)" labelPosition="center" />
          <PhotoUpload label="Photo recto" value={recto} onChange={setRecto} />
          <PhotoUpload label="Photo verso" value={verso} onChange={setVerso} />

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
              Ajouter
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
