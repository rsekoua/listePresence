import type { AxiosResponse } from 'axios'
import { api } from './client'

/** Filtres optionnels appliqués avant export (EXP-05). */
export interface ExportFilters {
  search?: string
  structure?: string
  date_from?: string
  date_to?: string
  cni?: 'complete' | 'incomplete'
}

/** Déclenche le téléchargement d'un blob, en réutilisant le nom de fichier
 *  fourni par le serveur (header Content-Disposition) si disponible. */
function triggerDownload(response: AxiosResponse<Blob>, fallback: string) {
  const disposition = response.headers['content-disposition'] as string | undefined
  const match = disposition?.match(/filename="?([^"]+)"?/)
  const filename = match?.[1] ?? fallback

  const url = URL.createObjectURL(response.data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function buildParams(filters?: ExportFilters) {
  const params: Record<string, string> = {}
  if (filters?.search) params.search = filters.search
  if (filters?.structure) params.structure = filters.structure
  if (filters?.date_from) params.date_from = filters.date_from
  if (filters?.date_to) params.date_to = filters.date_to
  if (filters?.cni) params.cni = filters.cni
  return params
}

async function download(url: string, fallback: string, filters?: ExportFilters) {
  const response = await api.get<Blob>(url, {
    responseType: 'blob',
    params: buildParams(filters),
  })
  triggerDownload(response, fallback)
}

/** EXP-01 — Liste des participants au format Excel. */
export function exportExcel(activiteId: string, filters?: ExportFilters) {
  return download(`/exports/activites/${activiteId}/excel`, 'participants.xlsx', filters)
}

/** EXP-03 — Liste de présence à signer (PDF). */
export function exportPresenceList(activiteId: string, filters?: ExportFilters) {
  return download(
    `/exports/activites/${activiteId}/pdf-liste`,
    'liste_presence.pdf',
    filters,
  )
}

/** EXP-04 — Archive ZIP de toutes les fiches CNI. */
export function exportCniZip(activiteId: string, filters?: ExportFilters) {
  return download(`/exports/activites/${activiteId}/zip`, 'fiches_cni.zip', filters)
}

/** EXP-02 — Fiche CNI individuelle (PDF). */
export function exportParticipantPdf(participantId: string) {
  return download(`/exports/participants/${participantId}/pdf`, 'fiche_cni.pdf')
}
