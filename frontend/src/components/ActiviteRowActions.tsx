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
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import { cloneActivite, deleteActivite, updateActivite } from '../api/activites'
import type { Activite } from '../api/types'
import { ActiviteFormDialog } from './ActiviteFormDialog'

export function ActiviteRowActions({ activite }: { activite: Activite }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const close = () => setAnchorEl(null)
  const canEdit = activite.can_edit

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

  const clone = useMutation({
    mutationFn: () => cloneActivite(activite.id),
    onSuccess: (copie) => {
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      enqueueSnackbar(`Activité clonée : « ${copie.nom} ».`, { variant: 'success' })
    },
    onError: () => enqueueSnackbar('Clonage impossible.', { variant: 'error' }),
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
          disabled={!canEdit}
          onClick={() => {
            close()
            setEditOpen(true)
          }}
        >
          <ListItemIcon>
            <EditRoundedIcon fontSize="small" />
          </ListItemIcon>
          Modifier
        </MenuItem>
        <MenuItem
          disabled={clone.isPending}
          onClick={() => {
            close()
            clone.mutate()
          }}
        >
          <ListItemIcon>
            <ContentCopyRoundedIcon fontSize="small" />
          </ListItemIcon>
          Cloner
        </MenuItem>
        <MenuItem
          disabled={!canEdit || activite.statut === 'archive' || toggle.isPending}
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
          disabled={!canEdit}
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

      <ActiviteFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        activite={activite}
      />

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
