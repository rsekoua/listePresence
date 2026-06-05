import { useCallback, useEffect, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import ZoomOutRoundedIcon from '@mui/icons-material/ZoomOutRounded'
import ZoomInRoundedIcon from '@mui/icons-material/ZoomInRounded'
import RotateLeftRoundedIcon from '@mui/icons-material/RotateLeftRounded'
import RotateRightRoundedIcon from '@mui/icons-material/RotateRightRounded'

// Ratio d'une carte d'identité (format carte bancaire : 85,6 × 54 mm).
const CARD_RATIO = 85.6 / 54

interface Props {
  open: boolean
  src: string | null
  label: string
  onCancel: () => void
  onConfirm: (file: File) => void
}

export function CniCropDialog({ open, src, label, onCancel, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [area, setArea] = useState<Area | null>(null)
  const [working, setWorking] = useState(false)

  // Réinitialise le cadrage à chaque nouvelle image.
  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
      setArea(null)
    }
  }, [open, src])

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), [])

  const rotate = (delta: number) =>
    setRotation((r) => ((r + delta) % 360 + 360) % 360)

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
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>Recadrer — {label}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Placez la carte dans le cadre. Déplacez, zoomez et pivotez pour ne garder
          que la CNI.
        </Typography>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: { xs: 300, sm: 360 },
            bgcolor: '#0f172a',
            borderRadius: 2,
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
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mt: 2 }}>
          <ZoomOutRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Slider
            value={zoom}
            min={1}
            max={4}
            step={0.05}
            onChange={(_, v) => setZoom(v as number)}
            aria-label="Zoom"
          />
          <ZoomInRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        </Stack>

        {/* Rotation */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1 }}>
          <Tooltip title="Pivoter à gauche">
            <IconButton size="small" onClick={() => rotate(-90)}>
              <RotateLeftRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Slider
            value={rotation}
            min={0}
            max={360}
            step={1}
            onChange={(_, v) => setRotation(v as number)}
            aria-label="Rotation"
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}°`}
          />
          <Tooltip title="Pivoter à droite">
            <IconButton size="small" onClick={() => rotate(90)}>
              <RotateRightRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} color="inherit">
          Annuler
        </Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!area || working}>
          {working ? 'Traitement…' : 'Valider le recadrage'}
        </Button>
      </DialogActions>
    </Dialog>
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
async function getCroppedFile(
  src: string,
  area: Area,
  rotation: number,
): Promise<File> {
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
  octx.drawImage(
    rotated,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height,
  )

  const blob = await new Promise<Blob>((resolve, reject) =>
    out.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Échec du recadrage'))),
      'image/jpeg',
      0.92,
    ),
  )
  return new File([blob], 'cni.jpg', { type: 'image/jpeg' })
}
