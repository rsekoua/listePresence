import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material'
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import { deleteActivite, updateActivite } from '../api/activites'
import type { Activite } from '../api/types'

export function ActiviteRowActions({ activite }: { activite: Activite }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const close = () => setAnchorEl(null)

  const toggle = useMutation({
    mutationFn: () =>
      updateActivite(activite.id, {
        statut: activite.statut === 'ouvert' ? 'ferme' : 'ouvert',
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      enqueueSnackbar(
        updated.statut === 'ouvert' ? 'Collecte ouverte.' : 'Collecte fermée.',
        { variant: 'success' },
      )
    },
    onError: () =>
      enqueueSnackbar('Impossible de modifier le statut.', { variant: 'error' }),
  })

  const remove = useMutation({
    mutationFn: () => deleteActivite(activite.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      enqueueSnackbar(`Activité « ${activite.nom} » supprimée.`, {
        variant: 'success',
      })
      setConfirmOpen(false)
    },
    onError: () => {
      enqueueSnackbar('Suppression impossible.', { variant: 'error' })
      setConfirmOpen(false)
    },
  })

  const isOpen = activite.statut === 'ouvert'

  return (
    <>
      <Tooltip title="Voir le détail">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/activites/${activite.id}`)
          }}
        >
          <VisibilityRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation()
          setAnchorEl(e.currentTarget)
        }}
      >
        <MoreVertRoundedIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={close}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem
          onClick={() => {
            close()
            navigate(`/activites/${activite.id}`)
          }}
        >
          <ListItemIcon>
            <VisibilityRoundedIcon fontSize="small" />
          </ListItemIcon>
          Voir le détail
        </MenuItem>
        <MenuItem
          disabled={activite.statut === 'archive' || toggle.isPending}
          onClick={() => {
            close()
            toggle.mutate()
          }}
        >
          <ListItemIcon>
            {isOpen ? (
              <LockRoundedIcon fontSize="small" />
            ) : (
              <LockOpenRoundedIcon fontSize="small" />
            )}
          </ListItemIcon>
          {isOpen ? 'Fermer la collecte' : 'Ouvrir la collecte'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            close()
            setConfirmOpen(true)
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteOutlineRoundedIcon fontSize="small" color="error" />
          </ListItemIcon>
          Supprimer
        </MenuItem>
      </Menu>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>Supprimer l'activité&nbsp;?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            L'activité « {activite.nom} » sera définitivement supprimée. Cette
            action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setConfirmOpen(false)}>
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
