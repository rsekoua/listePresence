import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { createActivite } from '../api/activites'

const schema = z
  .object({
    nom: z.string().min(1, 'Le nom est requis'),
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
}

export function CreateActiviteDialog({ open, onClose }: Props) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: '',
      lieu: '',
      description: '',
      date_debut: dayjs().add(1, 'day').hour(9).minute(0),
      date_fin: dayjs().add(1, 'day').hour(17).minute(0),
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createActivite({
        nom: values.nom,
        lieu: values.lieu,
        description: values.description ?? '',
        date_debut: values.date_debut.toISOString(),
        date_fin: values.date_fin.toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      reset()
      onClose()
    },
  })

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nouvelle activité</DialogTitle>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {mutation.isError && (
              <Alert severity="error">
                Impossible de créer l'activité. Vérifiez les champs.
              </Alert>
            )}
            <TextField
              label="Nom de l'activité"
              fullWidth
              error={Boolean(errors.nom)}
              helperText={errors.nom?.message}
              {...register('nom')}
            />
            <TextField
              label="Lieu"
              fullWidth
              error={Boolean(errors.lieu)}
              helperText={errors.lieu?.message}
              {...register('lieu')}
            />
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
            {mutation.isPending ? 'Création…' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
