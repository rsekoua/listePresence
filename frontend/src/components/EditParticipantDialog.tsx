import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { isAxiosError } from 'axios'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { updateParticipant, type Participant } from '../api/participants'
import { PhotoUpload } from './PhotoUpload'

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

interface Props {
  activiteId: string
  participant: Participant | null
  open: boolean
  onClose: () => void
  onUpdated?: () => void
}

export function EditParticipantDialog({
  activiteId,
  participant,
  open,
  onClose,
  onUpdated,
}: Props) {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [recto, setRecto] = useState<File | null>(null)
  const [verso, setVerso] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open && participant) {
      const raw = participant.telephone_wave.replace(/\D/g, '')
      const local = (raw.startsWith('225') ? raw.slice(3) : raw).slice(0, 10)
      reset({
        nom: participant.nom,
        prenom: participant.prenom,
        structure: participant.structure,
        fonction: participant.fonction,
        telephone_wave: local,
        email: participant.email,
        numero_cni: participant.numero_cni,
      })
    }
  }, [open, participant, reset])

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
      enqueueSnackbar(`Participant « ${p.prenom} ${p.nom} » mis à jour.`, { variant: 'success' })
      setRecto(null)
      setVerso(null)
      onUpdated?.()
      handleClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 409) {
        setError('numero_cni', {
          message: 'Ce numéro de CNI est déjà utilisé par un autre participant de cette activité.',
        })
      } else {
        enqueueSnackbar('Échec de la mise à jour du participant.', { variant: 'error' })
      }
    },
  })

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Modifier le participant</DialogTitle>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <DialogContent>
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            * Champ obligatoire
          </Typography>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Nom"
                fullWidth
                required
                error={Boolean(errors.nom)}
                helperText={errors.nom?.message}
                {...register('nom')}
              />
              <TextField
                label="Prénom"
                fullWidth
                required
                error={Boolean(errors.prenom)}
                helperText={errors.prenom?.message}
                {...register('prenom')}
              />
            </Stack>
            <TextField
              label="Structure / Organisation"
              fullWidth
              required
              error={Boolean(errors.structure)}
              helperText={errors.structure?.message}
              {...register('structure')}
            />
            <TextField
              label="Fonction / Poste"
              fullWidth
              required
              error={Boolean(errors.fonction)}
              helperText={errors.fonction?.message}
              {...register('fonction')}
            />
            <Controller
              name="telephone_wave"
              control={control}
              render={({ field }) => (
                <TextField
                  label="Téléphone Wave"
                  placeholder="07 01 02 03 04"
                  inputMode="tel"
                  fullWidth
                  required
                  error={Boolean(errors.telephone_wave)}
                  helperText={errors.telephone_wave?.message}
                  {...field}
                />
              )}
            />
            <TextField
              label="Adresse email"
              type="email"
              fullWidth
              required
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              {...register('email')}
            />
            <TextField
              label="Numéro de CNI"
              fullWidth
              required
              error={Boolean(errors.numero_cni)}
              helperText={errors.numero_cni?.message}
              {...register('numero_cni')}
            />

            <Divider>Pièce d'identité (CNI)</Divider>
            <Typography variant="body2" color={participant?.cni_complete ? 'text.secondary' : 'warning.main'}>
              {participant?.cni_complete
                ? 'CNI actuelle complète. Choisissez une photo uniquement pour la remplacer.'
                : 'CNI actuelle incomplète. Ajoutez les photos manquantes ci-dessous.'}{' '}
              Laisser une face vide conserve la photo existante.
            </Typography>
            <PhotoUpload label="Photo du recto de votre CNI" value={recto} onChange={setRecto} />
            <PhotoUpload label="Photo du verso de votre CNI" value={verso} onChange={setVerso} />

            {mutation.isError && !errors.numero_cni && (
              <Alert severity="error">Une erreur est survenue.</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Annuler
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
