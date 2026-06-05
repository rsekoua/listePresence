import type { ReactElement } from 'react'
import LoginRoundedIcon from '@mui/icons-material/LoginRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import ToggleOnRoundedIcon from '@mui/icons-material/ToggleOnRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded'
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'

export type ActionColor = 'default' | 'success' | 'error' | 'warning' | 'info'

interface Meta {
  icon: ReactElement
  color: ActionColor
}

const META: Record<string, Meta> = {
  login: { icon: <LoginRoundedIcon />, color: 'success' },
  login_failed: { icon: <ErrorOutlineRoundedIcon />, color: 'error' },
  logout: { icon: <LogoutRoundedIcon />, color: 'default' },
  password_change: { icon: <LockResetRoundedIcon />, color: 'info' },
  activite_create: { icon: <AddRoundedIcon />, color: 'success' },
  activite_update: { icon: <EditRoundedIcon />, color: 'info' },
  activite_statut: { icon: <ToggleOnRoundedIcon />, color: 'warning' },
  activite_delete: { icon: <DeleteOutlineRoundedIcon />, color: 'error' },
  activite_clone: { icon: <ContentCopyRoundedIcon />, color: 'default' },
  export: { icon: <FileDownloadRoundedIcon />, color: 'warning' },
  user_create: { icon: <PersonAddRoundedIcon />, color: 'success' },
  user_update: { icon: <EditRoundedIcon />, color: 'info' },
  user_delete: { icon: <DeleteOutlineRoundedIcon />, color: 'error' },
  user_reset_pwd: { icon: <LockResetRoundedIcon />, color: 'info' },
}

export function actionMeta(action: string): Meta {
  return META[action] ?? { icon: <HistoryRoundedIcon />, color: 'default' }
}
