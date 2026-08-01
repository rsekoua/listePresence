import type { ChangeEvent } from 'react'
import type { UseFormReturnType } from '@mantine/form'

/**
 * Comme `form.getInputProps(field)`, mais force la valeur en majuscules à
 * chaque frappe (convention CNI/administrative). Réservé aux champs texte
 * libre (nom, prénom, structure, fonction, ville, lieu…) — jamais mot de
 * passe ou email.
 */
export function upperInputProps<T>(form: UseFormReturnType<T>, field: keyof T & string) {
  // setFieldValue est typé via un chemin conditionnel (FormPathValue) que
  // l'inférence générique ne résout pas ici : signature simplifiée, le champ
  // ciblé est toujours un texte libre côté appelant.
  const setValue = form.setFieldValue as (field: string, value: string) => void
  return {
    ...form.getInputProps(field),
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValue(field, e.currentTarget.value.toUpperCase()),
  }
}
