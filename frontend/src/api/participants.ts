import { api } from './client'

export interface Participant {
  id: string
  nom: string
  prenom: string
  structure: string
  fonction: string
  telephone_wave: string
  email: string
  numero_cni: string
  horodatage: string
  photo_recto_url: string
  photo_verso_url: string
  cni_complete: boolean
}

export interface Paginated<T> {
  items: T[]
  count: number
}

export interface StructureStat {
  structure: string
  count: number
}

export interface Stats {
  total: number
  cni_completes: number
  cni_incompletes: number
  par_structure: StructureStat[]
}

export async function fetchParticipants(
  activiteId: string,
): Promise<Paginated<Participant>> {
  const { data } = await api.get<Paginated<Participant>>(
    `/activites/${activiteId}/participants`,
    { params: { limit: 1000 } },
  )
  return data
}

export interface ParticipantFilters {
  search?: string
  structure?: string
  cni?: 'complete' | 'incomplete'
}

/** Une personne unique de l'annuaire (regroupée par numéro de CNI). */
export interface Personne {
  numero_cni: string
  nom: string
  prenom: string
  structure: string
  fonction: string
  telephone_wave: string
  email: string
  nb_activites: number
  derniere_participation: string
  cni_complete: boolean
}

/** Annuaire des personnes distinctes (dédupliquées par CNI). */
export async function fetchPersonnes(
  filters: ParticipantFilters = {},
): Promise<Personne[]> {
  const { data } = await api.get<Personne[]>('/activites/personnes', {
    params: filters,
  })
  return data
}

export interface HistoriqueLigne {
  participant_id: string
  activite_id: string
  activite_nom: string
  activite_lieu: string
  horodatage: string
  cni_complete: boolean
}

export interface PersonneHistorique {
  numero_cni: string
  nom: string
  prenom: string
  structure: string
  fonction: string
  telephone_wave: string
  email: string
  nb_activites: number
  participations: HistoriqueLigne[]
}

/** Historique de participation d'une personne (toutes ses inscriptions). */
export async function fetchPersonneHistorique(
  numeroCni: string,
): Promise<PersonneHistorique> {
  const { data } = await api.get<PersonneHistorique>(
    '/activites/personnes/historique',
    { params: { numero_cni: numeroCni } },
  )
  return data
}

export interface ParticipantInput {
  nom: string
  prenom: string
  structure: string
  fonction: string
  telephone_wave: string
  email: string
  numero_cni: string
}

export async function createParticipant(
  activiteId: string,
  input: ParticipantInput,
): Promise<Participant> {
  // L'endpoint accepte désormais des photos CNI optionnelles (multipart) ;
  // la saisie manuelle envoie uniquement les champs texte. `Content-Type: false`
  // retire le défaut JSON du client pour laisser le navigateur poser le boundary.
  const fd = new FormData()
  Object.entries(input).forEach(([key, value]) => fd.append(key, value))
  const { data } = await api.post<Participant>(
    `/activites/${activiteId}/participants`,
    fd,
    { headers: { 'Content-Type': false } },
  )
  return data
}

export async function fetchStats(activiteId: string): Promise<Stats> {
  const { data } = await api.get<Stats>(`/activites/${activiteId}/stats`)
  return data
}

export async function fetchParticipantPhoto(
  activiteId: string,
  participantId: string,
  cote: 'recto' | 'verso',
): Promise<Blob> {
  const { data } = await api.get(
    `/activites/${activiteId}/participants/${participantId}/photo/${cote}`,
    { responseType: 'blob' },
  )
  return data
}
