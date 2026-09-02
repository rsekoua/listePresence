import { api } from './client'

export interface AuditEntry {
  username: string
  action: string
  action_label: string
  objet: string
  ip_address: string | null
  created_at: string
}

export interface AuditFilters {
  action?: string
  search?: string
}

/** Liste des actions possibles (code + libellé) pour le filtre. */
export const AUDIT_ACTIONS: { value: string; label: string }[] = [
  { value: 'login', label: 'Connexion' },
  { value: 'login_failed', label: 'Échec de connexion' },
  { value: 'logout', label: 'Déconnexion' },
  { value: 'password_change', label: 'Changement de mot de passe' },
  { value: 'activite_create', label: "Création d'activité" },
  { value: 'activite_update', label: "Modification d'activité" },
  { value: 'activite_statut', label: 'Changement de statut' },
  { value: 'activite_delete', label: "Suppression d'activité" },
  { value: 'activite_clone', label: "Clonage d'activité" },
  { value: 'participant_create', label: "Ajout manuel d'un participant" },
  { value: 'participant_update', label: "Modification d'un participant" },
  { value: 'export', label: 'Export' },
  { value: 'user_create', label: 'Création de compte' },
  { value: 'user_update', label: 'Modification de compte' },
  { value: 'user_delete', label: 'Suppression de compte' },
  { value: 'user_reset_pwd', label: 'Réinitialisation de mot de passe' },
]

export async function fetchAuditLogs(filters: AuditFilters = {}): Promise<AuditEntry[]> {
  const { data } = await api.get<AuditEntry[]>('/auth/audit', { params: filters })
  return data
}
