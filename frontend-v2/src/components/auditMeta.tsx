import type { ReactElement } from 'react'
import type { MantineColor } from '@mantine/core'
import {
  IconCopy,
  IconDownload,
  IconEdit,
  IconHistory,
  IconLogin,
  IconLogout,
  IconPlus,
  IconAlertCircle,
  IconToggleRight,
  IconTrash,
  IconUserPlus,
  IconLockCog,
} from '@tabler/icons-react'

export type ActionColor = 'gray' | 'teal' | 'red' | 'orange' | 'cyan'

interface Meta {
  icon: ReactElement
  color: ActionColor
}

const SIZE = 14

const META: Record<string, Meta> = {
  login: { icon: <IconLogin size={SIZE} />, color: 'teal' },
  login_failed: { icon: <IconAlertCircle size={SIZE} />, color: 'red' },
  logout: { icon: <IconLogout size={SIZE} />, color: 'gray' },
  password_change: { icon: <IconLockCog size={SIZE} />, color: 'cyan' },
  activite_create: { icon: <IconPlus size={SIZE} />, color: 'teal' },
  activite_update: { icon: <IconEdit size={SIZE} />, color: 'cyan' },
  activite_statut: { icon: <IconToggleRight size={SIZE} />, color: 'orange' },
  activite_delete: { icon: <IconTrash size={SIZE} />, color: 'red' },
  activite_clone: { icon: <IconCopy size={SIZE} />, color: 'gray' },
  participant_create: { icon: <IconUserPlus size={SIZE} />, color: 'teal' },
  participant_update: { icon: <IconEdit size={SIZE} />, color: 'cyan' },
  export: { icon: <IconDownload size={SIZE} />, color: 'orange' },
  user_create: { icon: <IconUserPlus size={SIZE} />, color: 'teal' },
  user_update: { icon: <IconEdit size={SIZE} />, color: 'cyan' },
  user_delete: { icon: <IconTrash size={SIZE} />, color: 'red' },
  user_reset_pwd: { icon: <IconLockCog size={SIZE} />, color: 'cyan' },
}

export function actionMeta(action: string): Meta {
  return META[action] ?? { icon: <IconHistory size={SIZE} />, color: 'gray' }
}

/** Couleur Mantine compatible Badge. */
export function actionBadgeColor(action: string): MantineColor {
  return actionMeta(action).color
}
