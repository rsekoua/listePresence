import axios from 'axios'

/** Client Axios public (formulaire participant) — sans token ni redirection. */
const publicApi = axios.create({ baseURL: '/api' })

export interface ActivitePublique {
  nom: string
  lieu: string
  date_debut: string
  date_fin: string
  statut: string
  is_open: boolean
}

export interface ParticipantConfirmation {
  id: string
  nom: string
  prenom: string
  structure: string
  fonction: string
  telephone_wave: string
  email: string
  numero_cni: string
  horodatage: string
}

export interface ParticipantFields {
  nom: string
  prenom: string
  structure: string
  fonction: string
  telephone_wave: string
  email: string
  numero_cni: string
}

export async function fetchActivitePublique(
  token: string,
): Promise<ActivitePublique> {
  const { data } = await publicApi.get<ActivitePublique>(
    `/public/activite/${token}`,
  )
  return data
}

export async function submitParticipant(
  token: string,
  fields: ParticipantFields,
  recto: File,
  verso: File,
  onProgress?: (percent: number) => void,
): Promise<ParticipantConfirmation> {
  const fd = new FormData()
  Object.entries(fields).forEach(([key, value]) => fd.append(key, value))
  fd.append('photo_cni_recto', recto)
  fd.append('photo_cni_verso', verso)

  const { data } = await publicApi.post<ParticipantConfirmation>(
    `/public/activite/${token}/participer`,
    fd,
    {
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    },
  )
  return data
}
