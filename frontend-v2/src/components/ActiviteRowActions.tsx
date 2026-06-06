import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ActionIcon, Group, Menu, Text, Tooltip } from '@mantine/core'
import { modals } from '@mantine/modals'
import {
  IconCopy,
  IconDotsVertical,
  IconEye,
  IconLock,
  IconLockOpen,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react'
import { cloneActivite, deleteActivite, updateActivite } from '../api/activites'
import type { Activite } from '../api/types'
import { ActiviteFormDialog } from './ActiviteFormDialog'
import { notify } from '../lib/notify'

export function ActiviteRowActions({ activite }: { activite: Activite }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)

  const canEdit = activite.can_edit
  const isOpen = activite.statut === 'ouvert'

  const toggle = useMutation({
    mutationFn: () =>
      updateActivite(activite.id, { statut: isOpen ? 'ferme' : 'ouvert' }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      notify.success(updated.statut === 'ouvert' ? 'Collecte ouverte.' : 'Collecte fermée.')
    },
    onError: () => notify.error('Impossible de modifier le statut.'),
  })

  const clone = useMutation({
    mutationFn: () => cloneActivite(activite.id),
    onSuccess: (copie) => {
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      notify.success(`Activité clonée : « ${copie.nom} ».`)
    },
    onError: () => notify.error('Clonage impossible.'),
  })

  const remove = useMutation({
    mutationFn: () => deleteActivite(activite.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activites'] })
      notify.success(`Activité « ${activite.nom} » supprimée.`)
    },
    onError: () => notify.error('Suppression impossible.'),
  })

  const confirmDelete = () =>
    modals.openConfirmModal({
      title: "Supprimer l'activité ?",
      centered: true,
      children: (
        <Text size="sm">
          L'activité « {activite.nom} » sera définitivement supprimée. Cette action est
          irréversible.
        </Text>
      ),
      labels: { confirm: 'Supprimer', cancel: 'Annuler' },
      confirmProps: { color: 'red' },
      onConfirm: () => remove.mutate(),
    })

  return (
    <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
      <Tooltip label="Voir le détail">
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => navigate(`/activites/${activite.id}`)}
          aria-label="Voir le détail"
        >
          <IconEye size={18} />
        </ActionIcon>
      </Tooltip>

      <Menu position="bottom-end" withinPortal shadow="md">
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" aria-label="Plus d'actions">
            <IconDotsVertical size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconEye size={16} />}
            onClick={() => navigate(`/activites/${activite.id}`)}
          >
            Voir le détail
          </Menu.Item>
          <Menu.Item
            leftSection={<IconPencil size={16} />}
            disabled={!canEdit}
            onClick={() => setEditOpen(true)}
          >
            Modifier
          </Menu.Item>
          <Menu.Item
            leftSection={<IconCopy size={16} />}
            disabled={clone.isPending}
            onClick={() => clone.mutate()}
          >
            Cloner
          </Menu.Item>
          <Menu.Item
            leftSection={isOpen ? <IconLock size={16} /> : <IconLockOpen size={16} />}
            disabled={!canEdit || activite.statut === 'archive' || toggle.isPending}
            onClick={() => toggle.mutate()}
          >
            {isOpen ? 'Fermer la collecte' : 'Ouvrir la collecte'}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            color="red"
            leftSection={<IconTrash size={16} />}
            disabled={!canEdit}
            onClick={confirmDelete}
          >
            Supprimer
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <ActiviteFormDialog
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        activite={activite}
      />
    </Group>
  )
}
