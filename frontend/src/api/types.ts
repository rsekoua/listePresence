export type StatutActivite = 'ouvert' | 'ferme' | 'archive'
export type Role = 'admin' | 'organisateur'

export interface CreatedBy {
  id: string
  username: string
}

export interface Activite {
  id: string
  nom: string
  description: string
  date_debut: string
  date_fin: string
  lieu: string
  token_qr: string
  statut: StatutActivite
  form_url: string
  created_by: CreatedBy
  can_edit: boolean
  nb_participants: number
  created_at: string
  updated_at: string
}

export interface ActiviteInput {
  nom: string
  description?: string
  date_debut: string
  date_fin: string
  lieu: string
}

export interface TokenPair {
  access: string
  refresh: string
  token_type: string
}

export interface CurrentUser {
  id: string
  username: string
  email: string
  role: Role
}
