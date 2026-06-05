import { useEffect, useRef, useState } from 'react'
import imageCompression from 'browser-image-compression'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded'
import CollectionsRoundedIcon from '@mui/icons-material/CollectionsRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import CropRoundedIcon from '@mui/icons-material/CropRounded'
import { CniCropDialog } from './CniCropDialog'

interface Props {
  label: string
  value: File | null
  onChange: (file: File | null) => void
  error?: string
  /** Clé unique pour conserver l'image en cours de recadrage après un
   *  rechargement de page (mémoire mobile). */
  persistKey?: string
}

// Compression finale (IMG-01 : ≤ 800 Ko, JPEG, qualité ~85 %).
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.85,
}

// Pré-réduction AVANT recadrage : allège la mémoire pour éviter que le
// navigateur mobile ne recharge la page à la prise de vue (grosses photos).
const PREVIEW_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1800,
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.9,
}

export function PhotoUpload({ label, value, onChange, error, persistKey }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const pendingStorageKey = persistKey ? `presence_pending_${persistKey}` : null
  // Restauration de l'image en cours de recadrage si la page a été rechargée.
  const [cropSrc, setCropSrc] = useState<string | null>(() => {
    if (!pendingStorageKey) return null
    try {
      return localStorage.getItem(pendingStorageKey)
    } catch {
      return null
    }
  })

  // Persiste l'image en cours de recadrage (et nettoie une fois terminé).
  useEffect(() => {
    if (!pendingStorageKey) return
    try {
      if (cropSrc) localStorage.setItem(pendingStorageKey, cropSrc)
      else localStorage.removeItem(pendingStorageKey)
    } catch {
      /* quota dépassé : on ignore */
    }
  }, [cropSrc, pendingStorageKey])

  useEffect(() => {
    if (!value) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(value)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  // 1) À la sélection / prise de vue : on réduit l'image puis on ouvre le recadrage.
  const handleFile = async (file?: File) => {
    if (!file) return
    setLocalError(null)
    if (!file.type.startsWith('image/')) {
      setLocalError('Veuillez sélectionner une image.')
      return
    }
    setLoading(true)
    try {
      const reduced = await imageCompression(file, PREVIEW_OPTIONS)
      const dataUrl = await imageCompression.getDataUrlFromFile(reduced)
      setCropSrc(dataUrl)
    } catch {
      setLocalError("Échec de la lecture de l'image.")
    } finally {
      setLoading(false)
    }
  }

  // 2) Après recadrage : compression de la carte rognée puis enregistrement.
  const handleCropped = async (cropped: File) => {
    setCropSrc(null)
    setLoading(true)
    try {
      const compressed = await imageCompression(cropped, COMPRESSION_OPTIONS)
      onChange(compressed)
    } catch {
      setLocalError("Échec du traitement de l'image.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {label}
      </Typography>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <Box
        sx={{
          border: '1px dashed',
          borderColor: error ? 'error.main' : 'divider',
          borderRadius: 2,
          p: 2,
          textAlign: 'center',
          bgcolor: 'background.default',
        }}
      >
        {loading ? (
          <Box sx={{ py: 4 }}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Traitement de l'image…
            </Typography>
          </Box>
        ) : preview ? (
          <Box>
            <Box
              component="img"
              src={preview}
              alt={label}
              sx={{
                width: '100%',
                maxHeight: 200,
                objectFit: 'contain',
                borderRadius: 1,
              }}
            />
            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: 'center', alignItems: 'center', mt: 1 }}
            >
              <CheckCircleRoundedIcon color="success" fontSize="small" />
              <Typography variant="body2" color="success.main">
                Photo ajoutée
              </Typography>
              <Button
                type="button"
                size="small"
                startIcon={<CropRoundedIcon />}
                onClick={() => preview && setCropSrc(preview)}
              >
                Recadrer
              </Button>
              <Button
                type="button"
                size="small"
                color="error"
                startIcon={<DeleteOutlineRoundedIcon />}
                onClick={() => onChange(null)}
              >
                Retirer
              </Button>
            </Stack>
          </Box>
        ) : (
          <Stack spacing={1.5} sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Ajoutez une photo nette et lisible
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.25}
              sx={{ justifyContent: 'center' }}
            >
              <Button
                type="button"
                variant="contained"
                size="large"
                fullWidth
                startIcon={<PhotoCameraRoundedIcon />}
                onClick={() => cameraRef.current?.click()}
                sx={{ py: 1.4, fontSize: 15 }}
              >
                Prendre une photo
              </Button>
              <Button
                type="button"
                variant="outlined"
                size="large"
                fullWidth
                startIcon={<CollectionsRoundedIcon />}
                onClick={() => galleryRef.current?.click()}
                sx={{ py: 1.4, fontSize: 15 }}
              >
                Galerie
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>

      {(error || localError) && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error || localError}
        </Alert>
      )}

      <CniCropDialog
        open={Boolean(cropSrc)}
        src={cropSrc}
        label={label}
        onCancel={() => setCropSrc(null)}
        onConfirm={handleCropped}
      />
    </Box>
  )
}
