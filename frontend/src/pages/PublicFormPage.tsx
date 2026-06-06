import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import {
  Controller,
  useForm,
  type Control,
  type UseFormRegisterReturn,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import dayjs from 'dayjs'
import {
  Alert,
  Box,
  Button,
  Container,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import ContactPhoneRoundedIcon from '@mui/icons-material/ContactPhoneRounded'
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import EventRoundedIcon from '@mui/icons-material/EventRounded'
import {
  fetchActivitePublique,
  submitParticipant,
  type ParticipantConfirmation,
} from '../api/public'
import { PhotoUpload } from '../components/PhotoUpload'

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

// Champs agrandis et police à 16 px : confort tactile + anti-zoom iOS (FORM-09).
const FIELD_SX = {
  '& .MuiInputBase-input': { fontSize: 16, py: '18px' },
  '& .MuiOutlinedInput-root': { borderRadius: '12px' },
  '& label': { fontSize: 16 },
  // Recentre verticalement le libellé au repos dans le champ agrandi.
  '& .MuiInputLabel-outlined:not(.MuiInputLabel-shrink)': {
    transform: 'translate(14px, 21px) scale(1)',
  },
}

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

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: saved ?? EMPTY,
  })

  // Sauvegarde hors-ligne partielle (FORM-08) — champs texte uniquement.
  useEffect(() => {
    const sub = watch((v) => localStorage.setItem(storageKey, JSON.stringify(v)))
    return () => sub.unsubscribe()
  }, [watch, storageKey])

  const [recto, setRecto] = useState<File | null>(null)
  const [verso, setVerso] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState<{ recto?: string; verso?: string }>({})

  // Restauration des photos après un éventuel rechargement de page (mémoire mobile).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(photoKey)
      if (!raw) return
      const saved = JSON.parse(raw) as { recto?: string; verso?: string }
      if (saved.recto) dataUrlToFile(saved.recto, 'recto.jpg').then(setRecto).catch(() => {})
      if (saved.verso) dataUrlToFile(saved.verso, 'verso.jpg').then(setVerso).catch(() => {})
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
  const [progress, setProgress] = useState(0)
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<ParticipantConfirmation | null>(null)

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
          err.response.data?.detail ??
            'Un participant avec ce numéro de CNI existe déjà.',
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
        <LinearProgress sx={{ width: 200 }} />
      </Centered>
    )
  }

  if (isError || !activite) {
    return (
      <Centered>
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 420 }}>
          <EventBusyRoundedIcon color="error" sx={{ fontSize: 48 }} />
          <Typography variant="h6" sx={{ mt: 1 }}>
            Activité introuvable
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Ce lien n'est pas valide. Vérifiez le QR Code.
          </Typography>
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
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 420 }}>
          <EventBusyRoundedIcon color="warning" sx={{ fontSize: 48 }} />
          <Typography variant="h6" sx={{ mt: 1 }}>
            Collecte fermée
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Les inscriptions pour « {activite.nom} » ne sont pas ouvertes.
          </Typography>
        </Paper>
      </Centered>
    )
  }

  // --- Formulaire ----------------------------------------------------------

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f0f4f8', py: { xs: 2, sm: 4 } }}>
      <Container maxWidth="sm" sx={{ px: { xs: 1.5, sm: 2 } }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2}>
            {/* Carte titre (style Google Forms : bandeau d'accent en haut) */}
            <Paper sx={{ overflow: 'hidden', borderTop: '6px solid', borderTopColor: 'primary.main' }}>
              <Box sx={{ p: 3 }}>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1.5 }}>
                  <QrCode2RoundedIcon color="primary" />
                  <Typography variant="caption" color="primary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
                    FORMULAIRE DE PRÉSENCE
                  </Typography>
                </Stack>
                <Typography variant="h5" component="h1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  {activite.nom}
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 1.5, color: 'text.secondary', flexWrap: 'wrap' }}>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <PlaceRoundedIcon sx={{ fontSize: 17 }} />
                    <Typography variant="body2">
                      {activite.ville} · {activite.lieu}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <EventRoundedIcon sx={{ fontSize: 17 }} />
                    <Typography variant="body2">
                      {dayjs(activite.date_debut).format('DD/MM/YYYY')}
                    </Typography>
                  </Stack>
                </Stack>
                <Typography variant="caption" color="error" sx={{ display: 'block', mt: 2 }}>
                  * Champ obligatoire
                </Typography>
              </Box>
            </Paper>

            {serverError && <Alert severity="error">{serverError}</Alert>}

            {/* Section 1 — Identité */}
            <SectionCard icon={<PersonRoundedIcon />} title="Identité">
              <Field
                label="Nom"
                required
                autoComplete="family-name"
                autoCapitalize="words"
                error={errors.nom?.message}
                field={register('nom')}
              />
              <Field
                label="Prénom"
                required
                autoComplete="given-name"
                autoCapitalize="words"
                error={errors.prenom?.message}
                field={register('prenom')}
              />
            </SectionCard>

            {/* Section 2 — Coordonnées */}
            <SectionCard icon={<ContactPhoneRoundedIcon />} title="Coordonnées">
              <Field
                label="Structure / Organisation"
                required
                autoCapitalize="words"
                error={errors.structure?.message}
                field={register('structure')}
              />
              <Field
                label="Fonction / Poste"
                required
                autoCapitalize="words"
                error={errors.fonction?.message}
                field={register('fonction')}
              />
              <PhoneField control={control} error={errors.telephone_wave?.message} />
              <Field
                label="Adresse email"
                required
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                error={errors.email?.message}
                field={register('email')}
              />
            </SectionCard>

            {/* Section 3 — Pièce d'identité */}
            <SectionCard icon={<BadgeRoundedIcon />} title="Pièce d'identité (CNI)">
              <Field
                label="Numéro de CNI"
                required
                autoCapitalize="characters"
                error={errors.numero_cni?.message}
                field={register('numero_cni')}
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
                <Typography variant="caption" color="text.secondary">
                  Envoi en cours… {progress}%
                </Typography>
                <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 1 }} />
              </Box>
            )}

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={mutation.isPending}
              sx={{ py: 1.5, fontSize: 16, borderRadius: 2 }}
            >
              {mutation.isPending ? 'Envoi…' : 'Valider mon inscription'}
            </Button>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textAlign: 'center', display: 'block', pb: 2 }}
            >
              Vos données sont collectées pour la gestion de présence de l'activité.
            </Typography>
          </Stack>
        </Box>
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
    <Paper sx={{ p: { xs: 2.5, sm: 3 } }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2.5, color: 'primary.main' }}>
        {icon}
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {title}
        </Typography>
      </Stack>
      <Stack spacing={2.5}>{children}</Stack>
    </Paper>
  )
}

function Field({
  label,
  field,
  error,
  required,
  type,
  placeholder,
  inputMode,
  autoComplete,
  autoCapitalize,
}: {
  label: string
  field: UseFormRegisterReturn
  error?: string
  required?: boolean
  type?: string
  placeholder?: string
  inputMode?: 'text' | 'tel' | 'email'
  autoComplete?: string
  autoCapitalize?: string
}) {
  return (
    <TextField
      label={label}
      required={required}
      type={type}
      placeholder={placeholder}
      fullWidth
      size="medium"
      error={Boolean(error)}
      helperText={error}
      sx={FIELD_SX}
      slotProps={{
        htmlInput: { inputMode, autoComplete, autoCapitalize },
      }}
      {...field}
    />
  )
}

/** Formate 10 chiffres en « 07 01 02 03 04 ». */
function formatPhone(digits: string): string {
  return digits.match(/.{1,2}/g)?.join(' ') ?? ''
}

/** Champ téléphone : saisie limitée à 10 chiffres, affichage formaté au repos
 *  et chiffres bruts une fois le champ sélectionné. */
function PhoneField({
  control,
  error,
}: {
  control: Control<FormValues>
  error?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <Controller
      name="telephone_wave"
      control={control}
      render={({ field }) => {
        const digits = (field.value ?? '').replace(/\D/g, '').slice(0, 10)
        return (
          <TextField
            label="Téléphone Wave"
            required
            fullWidth
            size="medium"
            placeholder="07 01 02 03 04"
            value={focused ? digits : digits ? formatPhone(digits) : ''}
            onChange={(e) =>
              field.onChange(e.target.value.replace(/\D/g, '').slice(0, 10))
            }
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false)
              field.onBlur()
            }}
            error={Boolean(error)}
            helperText={error}
            sx={FIELD_SX}
            slotProps={{
              htmlInput: { inputMode: 'tel', autoComplete: 'tel', maxLength: 14 },
            }}
          />
        )
      }}
    />
  )
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f0f4f8',
        p: 2,
      }}
    >
      {children}
    </Box>
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
        sx={{
          maxWidth: 460,
          width: '100%',
          overflow: 'hidden',
          borderTop: '6px solid',
          borderTopColor: 'success.main',
        }}
      >
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircleRoundedIcon color="success" sx={{ fontSize: 56 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
            Inscription confirmée
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Merci, votre présence à « {activiteNom} » a bien été enregistrée.
          </Typography>
          <Stack
            spacing={1.25}
            sx={{ textAlign: 'left', mt: 3, bgcolor: '#f0f4f8', borderRadius: 2, p: 2 }}
          >
            {rows.map(([label, value]) => (
              <Stack
                key={label}
                direction="row"
                sx={{ justifyContent: 'space-between', gap: 2 }}
              >
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
                  {value}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Paper>
    </Centered>
  )
}
