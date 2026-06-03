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
  const { data } = await api.post<Participant>(
    `/activites/${activiteId}/participants`,
    input,
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
