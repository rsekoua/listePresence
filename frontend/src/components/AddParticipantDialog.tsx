import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { createParticipant } from '../api/participants'

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
  open: boolean
  onClose: () => void
}

export function AddParticipantDialog({ activiteId, open, onClose }: Props) {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  useEffect(() => {
    if (open) reset(EMPTY)
  }, [open, reset])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => createParticipant(activiteId, values),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['participants', activiteId] })
      queryClient.invalidateQueries({ queryKey: ['stats', activiteId] })
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      enqueueSnackbar(`Participant « ${p.prenom} ${p.nom} » ajouté.`, {
        variant: 'success',
      })
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 409) {
        setError('numero_cni', {
          message: 'Ce numéro de CNI est déjà enregistré pour cette activité.',
        })
      } else {
        enqueueSnackbar("Échec de l'ajout du participant.", { variant: 'error' })
      }
    },
  })

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Ajouter un participant</DialogTitle>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Saisie manuelle (les photos de la CNI ne sont pas requises).
          </Typography>
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
              error={Boolean(errors.telephone_wave)}
              helperText={errors.telephone_wave?.message}
              {...register('telephone_wave')}
            />
            <TextField
              label="Adresse email"
              type="email"
              fullWidth
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
            {mutation.isError && !errors.numero_cni && (
              <Alert severity="error">Une erreur est survenue.</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">
            Annuler
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Ajout…' : 'Ajouter'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
