import type { ReactElement } from 'react'
import type { MantineColor } from '@mantine/core'
import { IconArchive, IconLock, IconLockOpen } from '@tabler/icons-react'
import type { StatutActivite } from '../api/types'

export interface StatutMeta {
  label: string
  color: MantineColor
  icon: ReactElement
}

/** Métadonnées d'affichage par statut d'activité (libellé, couleur, icône). */
export const STATUT_META: Record<StatutActivite, StatutMeta> = {
  ouvert: { label: 'Ouverte', color: 'teal', icon: <IconLockOpen size={14} /> },
  ferme: { label: 'Fermée', color: 'orange', icon: <IconLock size={14} /> },
  archive: { label: 'Archivée', color: 'gray', icon: <IconArchive size={14} /> },
}
