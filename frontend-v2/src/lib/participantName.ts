/**
 * Nom affiché d'un participant : **NOM PRÉNOM**.
 *
 * Cet ordre est celui des exports Excel et PDF générés par le backend
 * (colonnes « Nom » puis « Prénom », et `nom_complet` dans exports/services.py)
 * ainsi que des noms de fichiers des fiches CNI. Passer par ce helper évite que
 * l'ordre ne redérive écran par écran.
 */
export function nomComplet(p: { nom: string; prenom: string }): string {
  return `${p.nom} ${p.prenom}`.trim()
}

/** Idem, en majuscules — forme retenue dans les tableaux et les en-têtes. */
export function nomCompletMajuscules(p: { nom: string; prenom: string }): string {
  return nomComplet(p).toUpperCase()
}
