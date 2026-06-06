import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from '@mantine/form'
import { zod4Resolver } from 'mantine-form-zod-resolver'
import { useMutation, useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import dayjs from 'dayjs'
import {
  Alert,
  Box,
  Button,
  Center,
  Container,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core'
import {
  IconAddressBook,
  IconCalendarEvent,
  IconCircleCheck,
  IconCalendarOff,
  IconId,
  IconMapPin,
  IconQrcode,
  IconUser,
} from '@tabler/icons-react'
import {
  fetchActivitePublique,
  submitParticipant,
  type ParticipantConfirmation,
} from '../api/public'
import { PhotoUpload } from '../components/PhotoUpload'
import {
  EMPTY_PARTICIPANT,
  formatPhone,
  normalizePhoneDigits,
  participantSchema,
  type ParticipantFormValues as FormValues,
} from '../lib/participantSchema'

/** Convertit un fichier en dataURL (pour persistance hors-ligne). */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Reconstruit un File à partir d'une dataURL sauvegardée. */
async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], name, { type: blob.type || 'image/jpeg' })
}

export function PublicFormPage() {
  const { token = '' } = useParams()
  const storageKey = `presence_form_${token}`
  const photoKey = `presence_photos_${token}`

  const { data: activite, isLoading, isError } = useQuery({
    queryKey: ['activite-publique', token],
    queryFn: () => fetchActivitePublique(token),
    enabled: Boolean(token),
    retry: false,
  })

  const saved = useMemo<FormValues | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || 'null')
    } catch {
      return null
    }
  }, [storageKey])

  const form = useForm<FormValues>({
    mode: 'controlled',
    initialValues: saved ?? EMPTY_PARTICIPANT,
    validate: zod4Resolver(participantSchema),
    // Sauvegarde hors-ligne partielle (FORM-08) — champs texte uniquement.
    onValuesChange: (values) => {
      localStorage.setItem(storageKey, JSON.stringify(values))
    },
  })

  const [recto, setRecto] = useState<File | null>(null)
  const [verso, setVerso] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState<{ recto?: string; verso?: string }>({})
  const [phoneFocused, setPhoneFocused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<ParticipantConfirmation | null>(null)

  // Restauration des photos après un éventuel rechargement de page (mémoire mobile).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(photoKey)
      if (!raw) return
      const savedPhotos = JSON.parse(raw) as { recto?: string; verso?: string }
      if (savedPhotos.recto)
        dataUrlToFile(savedPhotos.recto, 'recto.jpg').then(setRecto).catch(() => {})
      if (savedPhotos.verso)
        dataUrlToFile(savedPhotos.verso, 'verso.jpg').then(setVerso).catch(() => {})
    } catch {
      /* dataURL illisible : on ignore */
    }
  }, [photoKey])

  // Sauvegarde des photos (compressées) pour survivre à un rechargement.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const obj: { recto?: string; verso?: string } = {}
        if (recto) obj.recto = await fileToDataUrl(recto)
        if (verso) obj.verso = await fileToDataUrl(verso)
        if (cancelled) return
        if (obj.recto || obj.verso) localStorage.setItem(photoKey, JSON.stringify(obj))
        else localStorage.removeItem(photoKey)
      } catch {
        /* quota dépassé : on ignore la persistance des photos */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [recto, verso, photoKey])

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      submitParticipant(token, values, recto as File, verso as File, setProgress),
    onSuccess: (data) => {
      localStorage.removeItem(storageKey)
      localStorage.removeItem(photoKey)
      setConfirmation(data)
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 409) {
        setServerError(
          err.response.data?.detail ?? 'Un participant avec ce numéro de CNI existe déjà.',
        )
      } else if (isAxiosError(err) && err.response?.status === 422) {
        setServerError('Certaines informations sont invalides. Vérifiez le formulaire.')
      } else {
        setServerError('Une erreur est survenue. Réessayez.')
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
  })

  const onSubmit = (values: FormValues) => {
    setServerError(null)
    const pErr: { recto?: string; verso?: string } = {}
    if (!recto) pErr.recto = 'La photo recto est obligatoire'
    if (!verso) pErr.verso = 'La photo verso est obligatoire'
    setPhotoError(pErr)
    if (pErr.recto || pErr.verso) return
    setProgress(0)
    mutation.mutate(values)
  }

  // --- États non-formulaire ------------------------------------------------

  if (isLoading) {
    return (
      <Centered>
        <Progress value={100} animated w={200} />
      </Centered>
    )
  }

  if (isError || !activite) {
    return (
      <Centered>
        <Paper p="xl" radius="sm" ta="center" maw={420}>
          <ThemeIcon color="red" variant="light" size={56} radius="xl" mx="auto">
            <IconCalendarOff size={32} />
          </ThemeIcon>
          <Title order={5} mt="sm">
            Activité introuvable
          </Title>
          <Text c="dimmed" mt="xs">
            Ce lien n'est pas valide. Vérifiez le QR Code.
          </Text>
        </Paper>
      </Centered>
    )
  }

  if (confirmation) {
    return <Confirmation data={confirmation} activiteNom={activite.nom} />
  }

  if (!activite.is_open) {
    return (
      <Centered>
        <Paper p="xl" radius="sm" ta="center" maw={420}>
          <ThemeIcon color="orange" variant="light" size={56} radius="xl" mx="auto">
            <IconCalendarOff size={32} />
          </ThemeIcon>
          <Title order={5} mt="sm">
            Collecte fermée
          </Title>
          <Text c="dimmed" mt="xs">
            Les inscriptions pour « {activite.nom} » ne sont pas ouvertes.
          </Text>
        </Paper>
      </Centered>
    )
  }

  // --- Formulaire ----------------------------------------------------------

  const phoneDigits = normalizePhoneDigits(form.getValues().telephone_wave ?? '')

  return (
    <Box mih="100vh" bg="#f0f4f8" py={{ base: 'sm', sm: 'xl' }}>
      <Container size="sm" px="sm">
        <form onSubmit={form.onSubmit(onSubmit)} noValidate>
          <Stack gap="md">
            {/* Carte titre (bandeau d'accent en haut) */}
            <Paper radius="sm" style={{ overflow: 'hidden', borderTop: '6px solid var(--mantine-color-brand-6)' }}>
              <Box p="lg">
                <Group gap="xs" align="center" mb="sm">
                  <IconQrcode size={20} color="var(--mantine-color-brand-7)" />
                  <Text size="xs" c="brand.7" fw={700} style={{ letterSpacing: 0.5 }}>
                    FORMULAIRE DE PRÉSENCE
                  </Text>
                </Group>
                <Title order={3} fw={800} lh={1.2}>
                  {activite.nom}
                </Title>
                <Group gap="md" mt="sm" c="dimmed" wrap="wrap">
                  <Group gap={4} wrap="nowrap">
                    <IconMapPin size={17} />
                    <Text size="sm">
                      {activite.ville} · {activite.lieu}
                    </Text>
                  </Group>
                  <Group gap={4} wrap="nowrap">
                    <IconCalendarEvent size={17} />
                    <Text size="sm">{dayjs(activite.date_debut).format('DD/MM/YYYY')}</Text>
                  </Group>
                </Group>
                <Text size="xs" c="red" mt="md">
                  * Champ obligatoire
                </Text>
              </Box>
            </Paper>

            {serverError && (
              <Alert color="red" variant="light">
                {serverError}
              </Alert>
            )}

            {/* Section 1 — Identité */}
            <SectionCard icon={<IconUser size={20} />} title="Identité">
              <TextInput
                size="md"
                label="Nom"
                required
                autoComplete="family-name"
                autoCapitalize="words"
                {...form.getInputProps('nom')}
                key={form.key('nom')}
              />
              <TextInput
                size="md"
                label="Prénom"
                required
                autoComplete="given-name"
                autoCapitalize="words"
                {...form.getInputProps('prenom')}
                key={form.key('prenom')}
              />
            </SectionCard>

            {/* Section 2 — Coordonnées */}
            <SectionCard icon={<IconAddressBook size={20} />} title="Coordonnées">
              <TextInput
                size="md"
                label="Structure / Organisation"
                required
                autoCapitalize="words"
                {...form.getInputProps('structure')}
                key={form.key('structure')}
              />
              <TextInput
                size="md"
                label="Fonction / Poste"
                required
                autoCapitalize="words"
                {...form.getInputProps('fonction')}
                key={form.key('fonction')}
              />
              <TextInput
                size="md"
                label="Téléphone Wave"
                required
                placeholder="07 01 02 03 04"
                inputMode="tel"
                autoComplete="tel"
                maxLength={14}
                value={phoneFocused ? phoneDigits : phoneDigits ? formatPhone(phoneDigits) : ''}
                onChange={(e) =>
                  form.setFieldValue('telephone_wave', normalizePhoneDigits(e.currentTarget.value))
                }
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                error={form.errors.telephone_wave}
              />
              <TextInput
                size="md"
                label="Adresse email"
                required
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                {...form.getInputProps('email')}
                key={form.key('email')}
              />
            </SectionCard>

            {/* Section 3 — Pièce d'identité */}
            <SectionCard icon={<IconId size={20} />} title="Pièce d'identité (CNI)">
              <TextInput
                size="md"
                label="Numéro de CNI"
                required
                autoCapitalize="characters"
                {...form.getInputProps('numero_cni')}
                key={form.key('numero_cni')}
              />
              <PhotoUpload
                label="Photo du recto de votre CNI *"
                value={recto}
                onChange={setRecto}
                error={photoError.recto}
                persistKey={`${token}_recto`}
              />
              <PhotoUpload
                label="Photo du verso de votre CNI *"
                value={verso}
                onChange={setVerso}
                error={photoError.verso}
                persistKey={`${token}_verso`}
              />
            </SectionCard>

            {mutation.isPending && (
              <Box>
                <Text size="xs" c="dimmed" mb={4}>
                  Envoi en cours… {progress}%
                </Text>
                <Progress value={progress} radius="sm" />
              </Box>
            )}

            <Button type="submit" size="lg" fullWidth loading={mutation.isPending} radius="md">
              Valider mon inscription
            </Button>

            <Text size="xs" c="dimmed" ta="center" pb="md">
              Vos données sont collectées pour la gestion de présence de l'activité.
            </Text>
          </Stack>
        </form>
      </Container>
    </Box>
  )
}

// --- Sous-composants -------------------------------------------------------

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <Paper p="lg" radius="sm">
      <Group gap="xs" align="center" mb="md" c="brand.7">
        {icon}
        <Text fw={700} c="dark">
          {title}
        </Text>
      </Group>
      <Stack gap="md">{children}</Stack>
    </Paper>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <Center mih="100vh" bg="#f0f4f8" p="md">
      {children}
    </Center>
  )
}

function Confirmation({
  data,
  activiteNom,
}: {
  data: ParticipantConfirmation
  activiteNom: string
}) {
  const rows: [string, string][] = [
    ['Nom', `${data.prenom} ${data.nom}`],
    ['Structure', data.structure],
    ['Fonction', data.fonction],
    ['Téléphone', data.telephone_wave],
    ['Email', data.email],
    ['N° CNI', data.numero_cni],
    ['Enregistré le', dayjs(data.horodatage).format('DD/MM/YYYY à HH:mm')],
  ]
  return (
    <Centered>
      <Paper
        maw={460}
        w="100%"
        radius="sm"
        style={{ overflow: 'hidden', borderTop: '6px solid var(--mantine-color-teal-6)' }}
      >
        <Box p="xl" ta="center">
          <ThemeIcon color="teal" variant="light" size={64} radius="xl" mx="auto">
            <IconCircleCheck size={40} />
          </ThemeIcon>
          <Title order={4} mt="sm">
            Inscription confirmée
          </Title>
          <Text c="dimmed" mt="xs">
            Merci, votre présence à « {activiteNom} » a bien été enregistrée.
          </Text>
          <Stack gap="xs" mt="lg" p="md" ta="left" bg="#f0f4f8" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
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
        </Box>
      </Paper>
    </Centered>
  )
}
