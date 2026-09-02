import { useEffect, useRef, useState } from 'react'
import { useForm } from '@mantine/form'
import { zod4Resolver } from 'mantine-form-zod-resolver'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Alert, Button, Divider, Group, Loader, Modal, Stack, Text, TextInput } from '@mantine/core'
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react'
import {
  createParticipant,
  fetchParticipantPhoto,
  fetchPersonneHistorique,
  type PersonneHistorique,
} from '../api/participants'
import { notify } from '../lib/notify'
import { nomComplet } from '../lib/participantName'
import { upperInputProps } from '../lib/upperInput'
import { PhotoUpload } from './PhotoUpload'
import {
  EMPTY_PARTICIPANT,
  formatPhone,
  normalizePhoneDigits,
  participantSchema,
  toLocalPhoneDigits,
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
  const [prefillStatus, setPrefillStatus] = useState<'idle' | 'loading' | 'found'>('idle')
  const [photosReprises, setPhotosReprises] = useState(false)
  const lastPrefillCni = useRef('')
  const form = useForm<FormValues>({
    mode: 'controlled',
    initialValues: EMPTY_PARTICIPANT,
    validate: zod4Resolver(participantSchema),
    // Retour immédiat : le champ requis se borde de rouge dès qu'on le quitte.
    validateInputOnBlur: true,
  })

  useEffect(() => {
    if (opened) {
      form.reset()
      setPrefillStatus('idle')
      setPhotosReprises(false)
      lastPrefillCni.current = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened])

  // Réinitialise les photos à chaque fermeture (toutes voies : annuler,
  // Échap, clic hors-modale, succès).
  const handleClose = () => {
    setRecto(null)
    setVerso(null)
    onClose()
  }

  // Pré-remplissage — même principe que le formulaire public (QR Code) : dès
  // que le numéro de CNI est saisi (≥ 4 caractères) et perd le focus, on
  // cherche cette personne dans l'historique (ses activités à elle, ou toutes
  // pour un admin) pour compléter le reste du formulaire. Si une de ses
  // participations passées dispose d'une CNI complète, on en reprend aussi
  // les photos recto/verso (facultatives ici, contrairement au formulaire
  // public) plutôt que de forcer l'organisateur à les reprendre en photo.
  const handleCniBlur = async () => {
    const cni = form.getValues().numero_cni?.trim() ?? ''
    if (cni.length < 4 || cni === lastPrefillCni.current) return
    lastPrefillCni.current = cni
    setPrefillStatus('loading')
    setPhotosReprises(false)

    let found: PersonneHistorique
    try {
      found = await fetchPersonneHistorique(cni)
    } catch {
      // 404 (personne inconnue) ou toute autre erreur : cas nominal, silencieux.
      setPrefillStatus('idle')
      return
    }

    const current = form.getValues()
    form.setValues({
      nom: (current.nom || found.nom).toUpperCase(),
      prenom: (current.prenom || found.prenom).toUpperCase(),
      structure: (current.structure || found.structure).toUpperCase(),
      fonction: (current.fonction || found.fonction).toUpperCase(),
      telephone_wave: current.telephone_wave || toLocalPhoneDigits(found.telephone_wave),
      email: current.email || found.email,
    })
    setPrefillStatus('found')

    const source = found.participations.find((p) => p.cni_complete)
    if (source) {
      try {
        if (!recto) {
          const blob = await fetchParticipantPhoto(source.activite_id, source.participant_id, 'recto')
          setRecto(new File([blob], 'recto.jpg', { type: blob.type || 'image/jpeg' }))
        }
        if (!verso) {
          const blob = await fetchParticipantPhoto(source.activite_id, source.participant_id, 'verso')
          setVerso(new File([blob], 'verso.jpg', { type: blob.type || 'image/jpeg' }))
        }
        setPhotosReprises(true)
      } catch {
        // Les informations textuelles restent pré-remplies même si les photos
        // échouent à charger ; l'organisateur peut toujours les ajouter à la main.
      }
    }
  }

  const mutation = useMutation({
    mutationFn: (values: FormValues) => createParticipant(activiteId, values, { recto, verso }),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['participants', activiteId] })
      queryClient.invalidateQueries({ queryKey: ['stats', activiteId] })
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      notify.success(`Participant « ${nomComplet(p)} » ajouté.`)
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
          {/* Numéro de CNI en premier (comme le formulaire public) : permet
              de retrouver et pré-remplir le reste, photos incluses. */}
          <TextInput
            label="Numéro de CNI"
            description="Déjà connu(e) ? Ses informations et ses photos de CNI seront reprises automatiquement."
            required
            rightSection={
              prefillStatus === 'loading' ? (
                <Loader size="xs" />
              ) : prefillStatus === 'found' ? (
                <IconCircleCheck size={18} color="var(--mantine-color-teal-6)" />
              ) : null
            }
            {...form.getInputProps('numero_cni')}
            onBlur={(e) => {
              form.getInputProps('numero_cni').onBlur?.(e)
              handleCniBlur()
            }}
            key={form.key('numero_cni')}
          />
          {prefillStatus === 'found' && (
            <Text size="xs" c="teal.7" mt={-8}>
              Informations retrouvées et complétées ci-dessous
              {photosReprises ? ' (photos de CNI reprises aussi)' : ''} — vérifiez-les.
            </Text>
          )}

          <Divider label="Photos de la CNI (facultatif)" labelPosition="center" />
          <PhotoUpload label="Photo du recto de votre CNI" value={recto} onChange={setRecto} />
          <PhotoUpload label="Photo du verso de votre CNI" value={verso} onChange={setVerso} />

          <Group grow align="flex-start">
            <TextInput
              label="Nom"
              required
              {...upperInputProps(form, 'nom')}
              key={form.key('nom')}
            />
            <TextInput
              label="Prénom"
              required
              {...upperInputProps(form, 'prenom')}
              key={form.key('prenom')}
            />
          </Group>
          <TextInput
            label="Structure / Organisation"
            required
            {...upperInputProps(form, 'structure')}
            key={form.key('structure')}
          />
          <TextInput
            label="Fonction / Poste"
            required
            {...upperInputProps(form, 'fonction')}
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
