/**
 * Effet « document scanné » appliqué aux photos de CNI après recadrage.
 *
 * Une photo prise au téléphone porte l'éclairage de la pièce : coin sombre,
 * ombre de la main, reflet du flash. Un scanner à plat, lui, éclaire
 * uniformément et rend un fond blanc. On reproduit ce rendu en trois temps :
 *
 * 1. **Uniformisation de l'éclairage** — on estime la lumière reçue par chaque
 *    zone (image très floutée), puis on éclaircit proportionnellement les zones
 *    sous-exposées. Le gain est *borné* : sans cela, le portrait du titulaire et
 *    le texte, qui sont légitimement sombres, seraient délavés.
 * 2. **Étalement des niveaux + contraste** — le fond part au blanc et les
 *    encres au noir, sur la base des valeurs réellement présentes dans la photo.
 * 3. **Renforcement de netteté** — masque flou léger, pour la lisibilité du
 *    texte imprimé.
 *
 * Deux rendus au choix : **couleur** (le portrait et les éléments de sécurité
 * restent vérifiables) ou **noir et blanc**, qui convertit en niveaux de gris —
 * et non en bitonal « photocopie », lequel réduirait le portrait du titulaire à
 * une tache inexploitable sur une pièce d'identité.
 */

/** Facteur de sous-échantillonnage servant à estimer l'éclairage (flou bon marché). */
const DOWNSCALE = 20
/** Luminosité visée pour le fond « papier ». */
const TARGET_LUMA = 235
/** Éclaircissement maximal d'une zone — au-delà, le portrait serait délavé. */
const MAX_GAIN = 1.8
/** Percentiles servant à l'étalement des niveaux (ignorent les pixels extrêmes). */
const LOW_PCT = 0.01
const HIGH_PCT = 0.94
/** Écart minimal entre les deux percentiles pour que l'étalement ait un sens. */
const MIN_RANGE = 40

const CONTRAST = 1.12
const SATURATION = 1.08
const SHARPEN = 0.55

const LUMA_R = 0.299
const LUMA_G = 0.587
const LUMA_B = 0.114

/** Rendu final : couleur d'origine conservée, ou conversion en niveaux de gris. */
export type ScanMode = 'color' | 'grayscale'

export interface ScanOptions {
  /** Intensité de l'uniformisation : 0 = photo brute, 1 = fond entièrement blanchi. */
  strength?: number
  /** Rendu final (défaut : couleur). */
  mode?: ScanMode
}

/**
 * Applique le rendu « scanné » à une image et renvoie un nouveau fichier JPEG.
 *
 * En cas d'échec (canvas indisponible, image illisible), renvoie le fichier
 * d'origine : l'effet est un confort visuel, il ne doit jamais faire perdre la
 * photo au participant.
 */
export async function applyScanEffect(file: File, options: ScanOptions = {}): Promise<File> {
  const strength = options.strength ?? 0.9
  const mode = options.mode ?? 'color'

  let image: HTMLImageElement
  try {
    image = await loadImage(file)
  } catch {
    return file
  }

  const { width, height } = image
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return file

  ctx.drawImage(image, 0, 0)
  const illumination = illuminationMap(image, width, height)
  if (!illumination) return file

  const frame = ctx.getImageData(0, 0, width, height)
  const histogram = evenLighting(frame.data, illumination, strength)
  stretchLevels(frame.data, histogram, width * height, mode)
  sharpen(frame.data, width, height)
  ctx.putImageData(frame, 0, 0)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.92),
  )
  return blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file
}

// --- Étapes ----------------------------------------------------------------

/**
 * Carte d'éclairage : l'image réduite puis réagrandie, ce qui ne conserve que
 * les variations lentes de lumière (et non le contenu du document).
 */
function illuminationMap(
  image: HTMLImageElement,
  width: number,
  height: number,
): Uint8ClampedArray | null {
  const w = Math.max(1, Math.round(width / DOWNSCALE))
  const h = Math.max(1, Math.round(height / DOWNSCALE))

  const small = document.createElement('canvas')
  small.width = w
  small.height = h
  const sctx = small.getContext('2d')
  if (!sctx) return null
  sctx.imageSmoothingEnabled = true
  sctx.imageSmoothingQuality = 'high'
  sctx.drawImage(image, 0, 0, w, h)

  const full = document.createElement('canvas')
  full.width = width
  full.height = height
  const fctx = full.getContext('2d', { willReadFrequently: true })
  if (!fctx) return null
  fctx.imageSmoothingEnabled = true
  fctx.imageSmoothingQuality = 'high'
  fctx.drawImage(small, 0, 0, width, height)

  return fctx.getImageData(0, 0, width, height).data
}

/**
 * Éclaircit chaque zone à hauteur de son déficit de lumière, puis renvoie
 * l'histogramme de luminance du résultat (réutilisé pour l'étalement).
 */
function evenLighting(
  data: Uint8ClampedArray,
  illumination: Uint8ClampedArray,
  strength: number,
): Uint32Array {
  const histogram = new Uint32Array(256)

  for (let i = 0; i < data.length; i += 4) {
    const local =
      LUMA_R * illumination[i] + LUMA_G * illumination[i + 1] + LUMA_B * illumination[i + 2]
    const gain = Math.min(MAX_GAIN, Math.max(1, TARGET_LUMA / Math.max(local, 1)))
    const applied = 1 + (gain - 1) * strength

    const r = clamp(data[i] * applied)
    const g = clamp(data[i + 1] * applied)
    const b = clamp(data[i + 2] * applied)
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b

    histogram[(LUMA_R * r + LUMA_G * g + LUMA_B * b) | 0]++
  }

  return histogram
}

/**
 * Étale les niveaux entre les percentiles observés (fond → blanc, encres →
 * noir), applique le contraste, puis le rendu final : saturation légèrement
 * relevée en couleur, ou conversion en niveaux de gris.
 */
function stretchLevels(
  data: Uint8ClampedArray,
  histogram: Uint32Array,
  pixels: number,
  mode: ScanMode,
): void {
  const low = percentile(histogram, pixels, LOW_PCT)
  const high = percentile(histogram, pixels, HIGH_PCT)
  // Photo déjà uniforme (ou quasi vide) : l'étalement n'apporterait que du bruit.
  const stretch = high - low >= MIN_RANGE
  const scale = stretch ? 255 / (high - low) : 1

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]
    let g = data[i + 1]
    let b = data[i + 2]

    if (stretch) {
      r = (r - low) * scale
      g = (g - low) * scale
      b = (b - low) * scale
    }

    r = (r - 128) * CONTRAST + 128
    g = (g - 128) * CONTRAST + 128
    b = (b - 128) * CONTRAST + 128

    const luma = LUMA_R * r + LUMA_G * g + LUMA_B * b

    if (mode === 'grayscale') {
      const gray = clamp(luma)
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
    } else {
      data[i] = clamp(luma + (r - luma) * SATURATION)
      data[i + 1] = clamp(luma + (g - luma) * SATURATION)
      data[i + 2] = clamp(luma + (b - luma) * SATURATION)
    }
  }
}

/** Masque flou léger (voisinage en croix) — rend le texte imprimé plus net. */
function sharpen(data: Uint8ClampedArray, width: number, height: number): void {
  const source = new Uint8ClampedArray(data)
  const row = width * 4

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const base = y * row + x * 4
      for (let c = 0; c < 3; c++) {
        const i = base + c
        const blurred =
          (source[i] + source[i - row] + source[i + row] + source[i - 4] + source[i + 4]) / 5
        data[i] = clamp(source[i] + (source[i] - blurred) * SHARPEN)
      }
    }
  }
}

// --- Utilitaires -----------------------------------------------------------

function clamp(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : value
}

/** Valeur de luminance sous laquelle se trouve la fraction `ratio` des pixels. */
function percentile(histogram: Uint32Array, pixels: number, ratio: number): number {
  const target = pixels * ratio
  let seen = 0
  for (let level = 0; level < 256; level++) {
    seen += histogram[level]
    if (seen >= target) return level
  }
  return 255
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Image illisible"))
    }
    image.src = url
  })
}
