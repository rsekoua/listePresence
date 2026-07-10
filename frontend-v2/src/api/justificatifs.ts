import { api } from './client'

export type CategorieJustif =
  | 'carburant'
  | 'peage'
  | 'communication'
  | 'perdiem'
  | 'presence'
  | 'collation'

/** Catégories dont le montant justifié = somme des reçus (montant par pièce). */
export const CATEGORIES_MULTI_RECU: CategorieJustif[] = [
  'carburant',
  'peage',
  'communication',
]

export const CATEGORIE_LABELS: Record<CategorieJustif, string> = {
  carburant: 'Carburant',
  peage: 'Péage',
  communication: 'Communication',
  perdiem: 'Perdiem',
  presence: 'Liste de présence',
  collation: 'Collation',
}

export interface PieceJointe {
  id: string
  libelle: string
  montant: string | null
  content_type: string
  fichier_url: string
  created_at: string
}

export interface Justificatif {
  id: string
  equipe: string
  categorie: CategorieJustif
  categorie_label: string
  montant_total: string | null
  montant_justifie: string
  activite_collation_id: string | null
  activite_collation_nom: string | null
  pieces: PieceJointe[]
  created_at: string
}

export interface JustificatifInput {
  categorie: CategorieJustif
  equipe?: string
  montant_total?: string | number | null
  activite_collation_id?: string | null
}

export interface CategorieConciliation {
  categorie: CategorieJustif
  categorie_label: string
  montant_justifie: string
}

export interface Conciliation {
  budget_alloue: string | null
  montant_justifie: string
  reste_a_justifier: string | null
  taux: number | null
  par_categorie: CategorieConciliation[]
}

export async function fetchJustificatifs(
  activiteId: string,
): Promise<Justificatif[]> {
  const { data } = await api.get<Justificatif[]>(
    `/activites/${activiteId}/justificatifs`,
  )
  return data
}

export async function fetchConciliation(
  activiteId: string,
): Promise<Conciliation> {
  const { data } = await api.get<Conciliation>(
    `/activites/${activiteId}/conciliation`,
  )
  return data
}

export async function createJustificatif(
  activiteId: string,
  input: JustificatifInput,
): Promise<Justificatif> {
  const { data } = await api.post<Justificatif>(
    `/activites/${activiteId}/justificatifs`,
    input,
  )
  return data
}

export async function updateJustificatif(
  activiteId: string,
  justificatifId: string,
  input: JustificatifInput,
): Promise<Justificatif> {
  const { data } = await api.put<Justificatif>(
    `/activites/${activiteId}/justificatifs/${justificatifId}`,
    input,
  )
  return data
}

export async function deleteJustificatif(
  activiteId: string,
  justificatifId: string,
): Promise<void> {
  await api.delete(`/activites/${activiteId}/justificatifs/${justificatifId}`)
}

export async function addPiece(
  activiteId: string,
  justificatifId: string,
  fichier: File,
  extra?: { montant?: string | number | null; libelle?: string },
): Promise<Justificatif> {
  const fd = new FormData()
  fd.append('fichier', fichier)
  if (extra?.montant != null && extra.montant !== '') {
    fd.append('montant', String(extra.montant))
  }
  if (extra?.libelle) fd.append('libelle', extra.libelle)

  const { data } = await api.post<Justificatif>(
    `/activites/${activiteId}/justificatifs/${justificatifId}/pieces`,
    fd,
    // `Content-Type: false` retire le défaut JSON pour laisser le navigateur
    // poser le boundary multipart (sinon le fichier serait perdu).
    { headers: { 'Content-Type': false } },
  )
  return data
}

export async function deletePiece(
  activiteId: string,
  justificatifId: string,
  pieceId: string,
): Promise<void> {
  await api.delete(
    `/activites/${activiteId}/justificatifs/${justificatifId}/pieces/${pieceId}`,
  )
}

/** Récupère le fichier d'une pièce (l'endpoint exige le JWT) en blob. */
export async function fetchPieceFichier(url: string): Promise<Blob> {
  // `url` est déjà préfixé « /api/... » côté serveur ; on retire le préfixe car
  // le client Axios a déjà baseURL '/api'.
  const path = url.replace(/^\/api/, '')
  const { data } = await api.get(path, { responseType: 'blob' })
  return data
}

/** Télécharge le ZIP des fiches CNI des bénéficiaires d'une collation. */
export async function downloadCollationCni(
  activiteId: string,
  justificatifId: string,
): Promise<Blob> {
  const { data } = await api.get(
    `/activites/${activiteId}/justificatifs/${justificatifId}/cni.zip`,
    { responseType: 'blob' },
  )
  return data
}
