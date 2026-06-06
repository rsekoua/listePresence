import { useEffect, useRef, useState } from 'react'
import imageCompression from 'browser-image-compression'
import { Alert, Box, Button, Center, Group, Image, Loader, Stack, Text } from '@mantine/core'
import {
  IconCamera,
  IconCheck,
  IconCrop,
  IconPhoto,
  IconTrash,
} from '@tabler/icons-react'
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
      <Text size="sm" fw={600} mb={8}>
        {label}
      </Text>

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
        p="md"
        ta="center"
        style={{
          border: `1px dashed ${error ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-gray-3)'}`,
          borderRadius: 'var(--mantine-radius-md)',
          backgroundColor: 'var(--mantine-color-gray-0)',
        }}
      >
        {loading ? (
          <Stack align="center" gap="xs" py="xl">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Traitement de l'image…
            </Text>
          </Stack>
        ) : preview ? (
          <Box>
            <Center>
              <Image src={preview} alt={label} mah={200} fit="contain" radius="sm" />
            </Center>
            <Group justify="center" align="center" gap="xs" mt="sm">
              <IconCheck size={18} color="var(--mantine-color-teal-6)" />
              <Text size="sm" c="teal">
                Photo ajoutée
              </Text>
              <Button
                type="button"
                size="xs"
                variant="subtle"
                leftSection={<IconCrop size={16} />}
                onClick={() => preview && setCropSrc(preview)}
              >
                Recadrer
              </Button>
              <Button
                type="button"
                size="xs"
                variant="subtle"
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={() => onChange(null)}
              >
                Retirer
              </Button>
            </Group>
          </Box>
        ) : (
          <Stack gap="sm" py="md">
            <Text size="sm" c="dimmed">
              Ajoutez une photo nette et lisible
            </Text>
            <Group justify="center" grow>
              <Button
                type="button"
                size="md"
                leftSection={<IconCamera size={18} />}
                onClick={() => cameraRef.current?.click()}
              >
                Prendre une photo
              </Button>
              <Button
                type="button"
                size="md"
                variant="default"
                leftSection={<IconPhoto size={18} />}
                onClick={() => galleryRef.current?.click()}
              >
                Galerie
              </Button>
            </Group>
          </Stack>
        )}
      </Box>

      {(error || localError) && (
        <Alert color="red" variant="light" mt="xs">
          {error || localError}
        </Alert>
      )}

      <CniCropDialog
        opened={Boolean(cropSrc)}
        src={cropSrc}
        label={label}
        onCancel={() => setCropSrc(null)}
        onConfirm={handleCropped}
      />
    </Box>
  )
}
