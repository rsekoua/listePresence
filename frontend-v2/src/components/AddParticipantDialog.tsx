import { useEffect } from 'react'
import { useForm } from '@mantine/form'
import { zodResolver } from 'mantine-form-zod-resolver'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Alert, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import { createParticipant } from '../api/participants'
import { notify } from '../lib/notify'

const schema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  structure: z.string().min(1, 'La structure est requise'),
  fonction: z.string().min(1, 'La fonction est requise'),
  telephone_wave: z
    .string()
    .refine(
      (v) => /^(?:\+?225)?\d{10}$/.test(v.replace(/[\s.\-()]/g, '')),
      'Numéro ivoirien invalide (ex : 07 01 02 03 04)',
    ),
  email: z.string().email('Adresse email invalide'),
  numero_cni: z.string().min(4, 'Numéro de CNI invalide'),
})

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = {
  nom: '',
  prenom: '',
  structure: '',
  fonction: '',
  telephone_wave: '',
  email: '',
  numero_cni: '',
}

interface Props {
  activiteId: string
  opened: boolean
  onClose: () => void
}

export function AddParticipantDialog({ activiteId, opened, onClose }: Props) {
  const queryClient = useQueryClient()
  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: EMPTY,
    validate: zodResolver(schema),
  })

  useEffect(() => {
    if (opened) form.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => createParticipant(activiteId, values),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['participants', activiteId] })
      queryClient.invalidateQueries({ queryKey: ['stats', activiteId] })
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      notify.success(`Participant « ${p.prenom} ${p.nom} » ajouté.`)
      onClose()
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

  return (
    <Modal opened={opened} onClose={onClose} title="Ajouter un participant" size="lg" centered>
      <form onSubmit={form.onSubmit((v) => mutation.mutate(v))}>
        <Text size="sm" c="dimmed" mb="md">
          Saisie manuelle (les photos de la CNI ne sont pas requises).
        </Text>
        <Stack gap="md">
          <Group grow align="flex-start">
            <TextInput label="Nom" {...form.getInputProps('nom')} key={form.key('nom')} />
            <TextInput label="Prénom" {...form.getInputProps('prenom')} key={form.key('prenom')} />
          </Group>
          <TextInput
            label="Structure / Organisation"
            {...form.getInputProps('structure')}
            key={form.key('structure')}
          />
          <TextInput
            label="Fonction / Poste"
            {...form.getInputProps('fonction')}
            key={form.key('fonction')}
          />
          <TextInput
            label="Téléphone Wave"
            placeholder="07 01 02 03 04"
            {...form.getInputProps('telephone_wave')}
            key={form.key('telephone_wave')}
          />
          <TextInput
            label="Adresse email"
            type="email"
            {...form.getInputProps('email')}
            key={form.key('email')}
          />
          <TextInput
            label="Numéro de CNI"
            {...form.getInputProps('numero_cni')}
            key={form.key('numero_cni')}
          />
          {mutation.isError && !form.errors.numero_cni && (
            <Alert color="red" icon={<IconAlertCircle size={18} />} variant="light">
              Une erreur est survenue.
            </Alert>
          )}
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
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
