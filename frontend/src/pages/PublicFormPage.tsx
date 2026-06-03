import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
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
  Divider,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded'
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

export function PublicFormPage() {
  const { token = '' } = useParams()
  const storageKey = `presence_form_${token}`

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
  const [progress, setProgress] = useState(0)
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<ParticipantConfirmation | null>(null)

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      submitParticipant(token, values, recto as File, verso as File, setProgress),
    onSuccess: (data) => {
      localStorage.removeItem(storageKey)
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 0, sm: 4 } }}>
      <Container maxWidth="sm" disableGutters>
        <Paper sx={{ borderRadius: { xs: 0, sm: 3 }, overflow: 'hidden' }}>
          {/* En-tête activité */}
          <Box sx={{ bgcolor: 'primary.main', color: 'common.white', p: 3 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <QrCode2RoundedIcon />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {activite.nom}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {activite.lieu} · {dayjs(activite.date_debut).format('DD/MM/YYYY')}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Vos informations
            </Typography>

            {serverError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {serverError}
              </Alert>
            )}

            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Nom"
                  fullWidth
                  error={Boolean(errors.nom)}
                  helperText={errors.nom?.message}
                  {...register('nom')}
                />
                <TextField
                  label="Prénom"
                  fullWidth
                  error={Boolean(errors.prenom)}
                  helperText={errors.prenom?.message}
                  {...register('prenom')}
                />
              </Stack>
              <TextField
                label="Structure / Organisation"
                fullWidth
                error={Boolean(errors.structure)}
                helperText={errors.structure?.message}
                {...register('structure')}
              />
              <TextField
                label="Fonction / Poste"
                fullWidth
                error={Boolean(errors.fonction)}
                helperText={errors.fonction?.message}
                {...register('fonction')}
              />
              <TextField
                label="Téléphone Wave"
                placeholder="07 01 02 03 04"
                fullWidth
                inputMode="tel"
                error={Boolean(errors.telephone_wave)}
                helperText={errors.telephone_wave?.message}
                {...register('telephone_wave')}
              />
              <TextField
                label="Adresse email"
                type="email"
                fullWidth
                inputMode="email"
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
                {...register('email')}
              />
              <TextField
                label="Numéro de CNI"
                fullWidth
                error={Boolean(errors.numero_cni)}
                helperText={errors.numero_cni?.message}
                {...register('numero_cni')}
              />

              <Divider />

              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Photos de la CNI
              </Typography>
              <PhotoUpload
                label="Recto de la CNI"
                value={recto}
                onChange={setRecto}
                error={photoError.recto}
              />
              <PhotoUpload
                label="Verso de la CNI"
                value={verso}
                onChange={setVerso}
                error={photoError.verso}
              />

              {mutation.isPending && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Envoi en cours… {progress}%
                  </Typography>
                  <LinearProgress variant="determinate" value={progress} />
                </Box>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={mutation.isPending}
                sx={{ py: 1.4, fontSize: 16 }}
              >
                {mutation.isPending ? 'Envoi…' : 'Valider mon inscription'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

// --- Sous-composants -------------------------------------------------------

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
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
      <Paper sx={{ p: 4, maxWidth: 460, width: '100%', textAlign: 'center' }}>
        <CheckCircleRoundedIcon color="success" sx={{ fontSize: 56 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
          Inscription confirmée
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Merci, votre présence à « {activiteNom} » a bien été enregistrée.
        </Typography>
        <Divider sx={{ my: 3 }} />
        <Stack spacing={1.25} sx={{ textAlign: 'left' }}>
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
      </Paper>
    </Centered>
  )
}
