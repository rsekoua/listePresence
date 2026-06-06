import { z } from 'zod'

/**
 * Schéma de validation partagé entre le formulaire de création (admin,
 * `AddParticipantDialog`) et le formulaire public derrière le QR code
 * (`PublicFormPage`). Source de vérité unique : les deux formulaires
 * collectent et valident exactement les mêmes champs.
 */
export const participantSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  structure: z.string().min(1, 'La structure est requise'),
  fonction: z.string().min(1, 'La fonction est requise'),
  telephone_wave: z
    .string()
    .min(1, 'Le téléphone est requis')
    .refine(
      (v) => /^(?:\+?225)?\d{10}$/.test(v.replace(/[\s.\-()]/g, '')),
      'Numéro ivoirien invalide (ex : 07 01 02 03 04)',
    ),
  email: z.string().min(1, "L'adresse email est requise").email('Adresse email invalide'),
  numero_cni: z.string().min(4, 'Numéro de CNI invalide'),
})

export type ParticipantFormValues = z.infer<typeof participantSchema>

export const EMPTY_PARTICIPANT: ParticipantFormValues = {
  nom: '',
  prenom: '',
  structure: '',
  fonction: '',
  telephone_wave: '',
  email: '',
  numero_cni: '',
}

/** Ne conserve que les 10 premiers chiffres saisis (forme stockée/envoyée). */
export function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 10)
}

/** Formate des chiffres en « 07 01 02 03 04 » (affichage hors saisie). */
export function formatPhone(digits: string): string {
  return digits.match(/.{1,2}/g)?.join(' ') ?? ''
}
