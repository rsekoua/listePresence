import { api } from './client'
import type { Activite, ActiviteInput, CurrentUser, TokenPair } from './types'

// --- Authentification ------------------------------------------------------

export async function loginRequest(
  username: string,
  password: string,
): Promise<TokenPair> {
  const { data } = await api.post<TokenPair>('/auth/login', { username, password })
  return data
}

export async function fetchMe(): Promise<CurrentUser> {
  const { data } = await api.get<CurrentUser>('/auth/me')
  return data
}

export async function logoutRequest(): Promise<void> {
  await api.post('/auth/logout')
}

export async function changePassword(
  ancien_mot_de_passe: string,
  nouveau_mot_de_passe: string,
): Promise<TokenPair> {
  const { data } = await api.post<TokenPair>('/auth/change-password', {
    ancien_mot_de_passe,
    nouveau_mot_de_passe,
  })
  return data
}

// --- Activités -------------------------------------------------------------

export async function fetchActivites(): Promise<Activite[]> {
  const { data } = await api.get<Activite[]>('/activites/')
  return data
}

export interface DayCount {
  jour: string
  total: number
}

export interface GlobalStats {
  nb_activites: number
  nb_participants_uniques: number
  nb_inscriptions: number
  cni_completes: number
  cni_total: number
  inscriptions_30j: DayCount[]
}

/** Stats transverses du tableau de bord (participants uniques par CNI). */
export async function fetchGlobalStats(): Promise<GlobalStats> {
  const { data } = await api.get<GlobalStats>('/activites/stats-globales')
  return data
}

export async function fetchActivite(id: string): Promise<Activite> {
  const { data } = await api.get<Activite>(`/activites/${id}`)
  return data
}

export async function createActivite(input: ActiviteInput): Promise<Activite> {
  const { data } = await api.post<Activite>('/activites/', input)
  return data
}

export async function updateActivite(
  id: string,
  input: Partial<ActiviteInput & { statut: string }>,
): Promise<Activite> {
  const { data } = await api.put<Activite>(`/activites/${id}`, input)
  return data
}

export async function deleteActivite(id: string): Promise<void> {
  await api.delete(`/activites/${id}`)
}

export async function cloneActivite(id: string): Promise<Activite> {
  const { data } = await api.post<Activite>(`/activites/${id}/clone`)
  return data
}

/** Récupère le QR Code en blob (l'endpoint exige le JWT). */
export async function fetchQrCode(id: string): Promise<Blob> {
  const { data } = await api.get(`/activites/${id}/qrcode`, {
    responseType: 'blob',
  })
  return data
}
