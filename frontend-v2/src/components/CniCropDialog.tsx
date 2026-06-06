import { useCallback, useEffect, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { ActionIcon, Box, Button, Group, Modal, Slider, Text, Tooltip } from '@mantine/core'
import {
  IconRotateClockwise,
  IconRotate2,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react'

// Ratio d'une carte d'identité (format carte bancaire : 85,6 × 54 mm).
const CARD_RATIO = 85.6 / 54

interface Props {
  opened: boolean
  src: string | null
  label: string
  onCancel: () => void
  onConfirm: (file: File) => void
}

export function CniCropDialog({ opened, src, label, onCancel, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [area, setArea] = useState<Area | null>(null)
  const [working, setWorking] = useState(false)

  // Réinitialise le cadrage à chaque nouvelle image.
  useEffect(() => {
    if (opened) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
      setArea(null)
    }
  }, [opened, src])

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), [])

  const rotate = (delta: number) => setRotation((r) => (((r + delta) % 360) + 360) % 360)

  const handleConfirm = async () => {
    if (!src || !area) return
    setWorking(true)
    try {
      const file = await getCroppedFile(src, area, rotation)
      onConfirm(file)
    } finally {
      setWorking(false)
    }
  }

  return (
    <Modal opened={opened} onClose={onCancel} title={`Recadrer — ${label}`} size="lg" centered>
      <Text size="sm" c="dimmed" mb="sm">
        Placez la carte dans le cadre. Déplacez, zoomez et pivotez pour ne garder que la CNI.
      </Text>
      <Box
        style={{
          position: 'relative',
          width: '100%',
          height: 340,
          background: '#0f172a',
          borderRadius: 'var(--mantine-radius-md)',
          overflow: 'hidden',
        }}
      >
        {src && (
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={CARD_RATIO}
            objectFit="contain"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            showGrid={false}
          />
        )}
      </Box>

      {/* Zoom */}
      <Group gap="sm" align="center" mt="md" wrap="nowrap">
        <IconZoomOut size={18} color="var(--mantine-color-gray-6)" />
        <Slider
          flex={1}
          value={zoom}
          min={1}
          max={4}
          step={0.05}
          label={null}
          onChange={setZoom}
          aria-label="Zoom"
        />
        <IconZoomIn size={18} color="var(--mantine-color-gray-6)" />
      </Group>

      {/* Rotation */}
      <Group gap="sm" align="center" mt="sm" wrap="nowrap">
        <Tooltip label="Pivoter à gauche">
          <ActionIcon variant="subtle" color="gray" onClick={() => rotate(-90)}>
            <IconRotate2 size={18} />
          </ActionIcon>
        </Tooltip>
        <Slider
          flex={1}
          value={rotation}
          min={0}
          max={360}
          step={1}
          onChange={setRotation}
          aria-label="Rotation"
          label={(v) => `${v}°`}
        />
        <Tooltip label="Pivoter à droite">
          <ActionIcon variant="subtle" color="gray" onClick={() => rotate(90)}>
            <IconRotateClockwise size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={handleConfirm} disabled={!area} loading={working}>
          Valider le recadrage
        </Button>
      </Group>
    </Modal>
  )
}

// --- Utilitaires -----------------------------------------------------------

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

const toRad = (deg: number) => (deg * Math.PI) / 180

/** Taille de la boîte englobante après rotation. */
function rotatedSize(width: number, height: number, rotation: number) {
  const rad = toRad(rotation)
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  }
}

/** Découpe la zone sélectionnée (en tenant compte de la rotation) → JPEG. */
async function getCroppedFile(src: string, area: Area, rotation: number): Promise<File> {
  const image = await loadImage(src)

  // 1) Dessine l'image pivotée sur un canvas intermédiaire.
  const { width: bw, height: bh } = rotatedSize(image.width, image.height, rotation)
  const rotated = document.createElement('canvas')
  rotated.width = bw
  rotated.height = bh
  const rctx = rotated.getContext('2d')
  if (!rctx) throw new Error('Canvas indisponible')
  rctx.translate(bw / 2, bh / 2)
  rctx.rotate(toRad(rotation))
  rctx.drawImage(image, -image.width / 2, -image.height / 2)

  // 2) Extrait la zone sélectionnée (coordonnées dans l'image pivotée).
  const out = document.createElement('canvas')
  out.width = Math.round(area.width)
  out.height = Math.round(area.height)
  const octx = out.getContext('2d')
  if (!octx) throw new Error('Canvas indisponible')
  octx.drawImage(rotated, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height)

  const blob = await new Promise<Blob>((resolve, reject) =>
    out.toBlob((b) => (b ? resolve(b) : reject(new Error('Échec du recadrage'))), 'image/jpeg', 0.92),
  )
  return new File([blob], 'cni.jpg', { type: 'image/jpeg' })
}
