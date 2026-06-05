import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import dayjs, { Dayjs } from 'dayjs'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { createActivite, updateActivite } from '../api/activites'
import type { Activite } from '../api/types'

const schema = z
  .object({
    nom: z.string().min(1, 'Le nom est requis'),
    ville: z.string().min(1, 'La ville est requise'),
    lieu: z.string().min(1, 'Le lieu est requis'),
    description: z.string().optional(),
    date_debut: z.custom<Dayjs>((v) => dayjs.isDayjs(v), 'Date de début requise'),
    date_fin: z.custom<Dayjs>((v) => dayjs.isDayjs(v), 'Date de fin requise'),
  })
  .refine((d) => d.date_fin.isAfter(d.date_debut), {
    message: 'La date de fin doit être postérieure à la date de début',
    path: ['date_fin'],
  })

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  /** Si fourni, le dialog est en mode édition. */
  activite?: Activite
}

const emptyValues = (): FormValues => ({
  nom: '',
  ville: '',
  lieu: '',
  description: '',
  date_debut: dayjs().add(1, 'day').hour(9).minute(0),
  date_fin: dayjs().add(1, 'day').hour(17).minute(0),
})

/** Dialog de création ou d'édition d'une activité. */
export function ActiviteFormDialog({ open, onClose, activite }: Props) {
  const isEdit = Boolean(activite)
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(),
  })

  // Pré-remplit le formulaire à l'ouverture (édition) ou le réinitialise (création).
  useEffect(() => {
    if (!open) return
    if (activite) {
      reset({
        nom: activite.nom,
        ville: activite.ville,
        lieu: activite.lieu,
        description: activite.description,
        date_debut: dayjs(activite.date_debut),
        date_fin: dayjs(activite.date_fin),
      })
    } else {
      reset(emptyValues())
    }
  }, [open, activite, reset])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        nom: values.nom,
        ville: values.ville,
        lieu: values.lieu,
        description: values.description ?? '',
        date_debut: values.date_debut.toISOString(),
        date_fin: values.date_fin.toISOString(),
      }
      return activite
        ? updateActivite(activite.id, payload)
        : createActivite(payload)
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      if (activite) {
        queryClient.invalidateQueries({ queryKey: ['activite', activite.id] })
      }
      enqueueSnackbar(
        isEdit
          ? `Activité « ${saved.nom} » modifiée.`
          : `Activité « ${saved.nom} » créée avec succès.`,
        { variant: 'success' },
      )
      onClose()
    },
    onError: () => {
      enqueueSnackbar(
        isEdit
          ? "Échec de la modification de l'activité."
          : "Échec de la création de l'activité.",
        { variant: 'error' },
      )
    },
  })

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? "Modifier l'activité" : 'Nouvelle activité'}</DialogTitle>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {mutation.isError && (
              <Alert severity="error">
                Une erreur est survenue. Vérifiez les champs.
              </Alert>
            )}
            <TextField
              label="Nom de l'activité"
              fullWidth
              error={Boolean(errors.nom)}
              helperText={errors.nom?.message}
              {...register('nom')}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Ville"
                fullWidth
                error={Boolean(errors.ville)}
                helperText={errors.ville?.message}
                {...register('ville')}
              />
              <TextField
                label="Lieu (hôtel, salle…)"
                fullWidth
                error={Boolean(errors.lieu)}
                helperText={errors.lieu?.message}
                {...register('lieu')}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller
                control={control}
                name="date_debut"
                render={({ field }) => (
                  <DateTimePicker
                    label="Début"
                    value={field.value}
                    onChange={field.onChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: Boolean(errors.date_debut),
                        helperText: errors.date_debut?.message,
                      },
                    }}
                  />
                )}
              />
              <Controller
                control={control}
                name="date_fin"
                render={({ field }) => (
                  <DateTimePicker
                    label="Fin"
                    value={field.value}
                    onChange={field.onChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: Boolean(errors.date_fin),
                        helperText: errors.date_fin?.message,
                      },
                    }}
                  />
                )}
              />
            </Stack>
            <TextField
              label="Description (optionnel)"
              fullWidth
              multiline
              minRows={2}
              {...register('description')}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">
            Annuler
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending
              ? 'Enregistrement…'
              : isEdit
                ? 'Enregistrer'
                : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
