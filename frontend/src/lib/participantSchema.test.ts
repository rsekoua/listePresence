import { describe, expect, it } from 'vitest'
import {
  EMPTY_PARTICIPANT,
  formatPhone,
  normalizePhoneDigits,
  participantSchema,
  toLocalPhoneDigits,
  type ParticipantFormValues,
} from './participantSchema'

const VALID: ParticipantFormValues = {
  nom: 'KOUASSI',
  prenom: 'JEAN',
  structure: 'MINISTERE X',
  fonction: 'AGENT',
  telephone_wave: '0701020304',
  email: 'jean.kouassi@example.com',
  numero_cni: 'CI001234567',
}

describe('participantSchema', () => {
  it('accepte un participant complet et valide', () => {
    const result = participantSchema.safeParse(VALID)
    expect(result.success).toBe(true)
  })

  it.each(['nom', 'prenom', 'structure', 'fonction', 'email', 'numero_cni'] as const)(
    'rejette %s vide',
    (field) => {
      const result = participantSchema.safeParse({ ...VALID, [field]: '' })
      expect(result.success).toBe(false)
    },
  )

  it('rejette un numéro de CNI trop court (< 4 caractères)', () => {
    const result = participantSchema.safeParse({ ...VALID, numero_cni: 'AB1' })
    expect(result.success).toBe(false)
  })

  it('accepte un numéro de CNI de 4 caractères', () => {
    const result = participantSchema.safeParse({ ...VALID, numero_cni: 'AB12' })
    expect(result.success).toBe(true)
  })

  it('rejette une adresse email mal formée', () => {
    const result = participantSchema.safeParse({ ...VALID, email: 'pas-un-email' })
    expect(result.success).toBe(false)
  })

  describe('téléphone', () => {
    it.each([
      '0701020304',
      '07 01 02 03 04',
      '07.01.02.03.04',
      '07-01-02-03-04',
      '+2250701020304',
      '2250701020304',
      '+225 07 01 02 03 04',
    ])('accepte le format "%s"', (telephone_wave) => {
      const result = participantSchema.safeParse({ ...VALID, telephone_wave })
      expect(result.success).toBe(true)
    })

    it.each([
      '070102030', // 9 chiffres
      '07010203045', // 11 chiffres
      'abcdefghij', // pas des chiffres
      '+22407010203', // préfixe + 9 chiffres seulement
    ])('rejette le format "%s"', (telephone_wave) => {
      const result = participantSchema.safeParse({ ...VALID, telephone_wave })
      expect(result.success).toBe(false)
    })
  })

  it("EMPTY_PARTICIPANT n'est pas valide (tous les champs sont requis)", () => {
    const result = participantSchema.safeParse(EMPTY_PARTICIPANT)
    expect(result.success).toBe(false)
  })
})

describe('normalizePhoneDigits', () => {
  it('ne garde que les chiffres', () => {
    expect(normalizePhoneDigits('07 01.02-03(04)')).toBe('0701020304')
  })

  it('tronque à 10 chiffres', () => {
    expect(normalizePhoneDigits('070102030412345')).toBe('0701020304')
  })

  it('retourne une chaîne vide si aucun chiffre', () => {
    expect(normalizePhoneDigits('abc')).toBe('')
  })
})

describe('formatPhone', () => {
  it('groupe les chiffres par paires', () => {
    expect(formatPhone('0701020304')).toBe('07 01 02 03 04')
  })

  it('gère un nombre impair de chiffres (dernier groupe incomplet)', () => {
    expect(formatPhone('070102030')).toBe('07 01 02 03 0')
  })

  it('retourne une chaîne vide en entrée vide', () => {
    expect(formatPhone('')).toBe('')
  })
})

describe('toLocalPhoneDigits', () => {
  it('retire le préfixe international 225', () => {
    expect(toLocalPhoneDigits('+2250701020304')).toBe('0701020304')
  })

  it('laisse un numéro déjà local inchangé', () => {
    expect(toLocalPhoneDigits('0701020304')).toBe('0701020304')
  })

  it('tronque à 10 chiffres après retrait du préfixe', () => {
    expect(toLocalPhoneDigits('+225070102030499')).toBe('0701020304')
  })

  it("ne retire pas '225' s'il n'est pas en préfixe", () => {
    // Un numéro local ne commençant pas par 225 ne doit pas être altéré à tort.
    expect(toLocalPhoneDigits('0622512345')).toBe('0622512345')
  })
})
