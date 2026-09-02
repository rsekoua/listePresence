import { useEffect, useState } from 'react'
import { Box, Center, Group, Image, Modal, Text } from '@mantine/core'
import { fetchParticipantPhoto } from '../api/participants'

interface Props {
  activiteId: string
  participantId: string
  /** Ne déclenche le chargement que lorsque le conteneur est ouvert. */
  enabled?: boolean
}

/**
 * Affiche les photos CNI recto/verso d'un participant (miniatures cliquables
 * + zoom plein écran). Tolère l'absence de photo (saisie manuelle sans pièce)
 * et les erreurs réseau : chaque face est chargée indépendamment.
 */
export function CniPhotos({ activiteId, participantId, enabled = true }: Props) {
  const [recto, setRecto] = useState<string | null>(null)
  const [verso, setVerso] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !participantId) return
    const urls: string[] = []
    let cancelled = false
    // Reset avant le chargement : évite d'afficher les photos (périmées ou
    // révoquées) du participant précédent pendant la requête.
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true)
    setRecto(null)
    setVerso(null)
    /* eslint-enable react-hooks/set-state-in-effect */
    Promise.allSettled([
      fetchParticipantPhoto(activiteId, participantId, 'recto'),
      fetchParticipantPhoto(activiteId, participantId, 'verso'),
    ]).then(([r, v]) => {
      if (cancelled) return
      if (r.status === 'fulfilled') {
        const u = URL.createObjectURL(r.value)
        urls.push(u)
        setRecto(u)
      }
      if (v.status === 'fulfilled') {
        const u = URL.createObjectURL(v.value)
        urls.push(u)
        setVerso(u)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [enabled, activiteId, participantId])

  const hasAny = Boolean(recto || verso)

  return (
    <>
      <Text fw={600} size="sm" mb="sm">
        Pièce d'identité{hasAny ? ' (cliquer pour agrandir)' : ''}
      </Text>
      <Group grow align="flex-start">
        <CniThumb label="Recto" url={recto} loading={loading} onZoom={setZoom} />
        <CniThumb label="Verso" url={verso} loading={loading} onZoom={setZoom} />
      </Group>

      {/* Zoom plein écran */}
      <Modal
        opened={Boolean(zoom)}
        onClose={() => setZoom(null)}
        size="auto"
        centered
        withCloseButton={false}
        padding={0}
      >
        {zoom && (
          <Image
            src={zoom}
            alt="CNI"
            onClick={() => setZoom(null)}
            style={{ maxWidth: '90vw', maxHeight: '85vh', cursor: 'zoom-out' }}
          />
        )}
      </Modal>
    </>
  )
}

function CniThumb({
  label,
  url,
  loading,
  onZoom,
}: {
  label: string
  url: string | null
  loading: boolean
  onZoom: (u: string) => void
}) {
  return (
    <Box>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Box
        mt={4}
        h={130}
        onClick={() => url && onZoom(url)}
        style={{
          borderRadius: 'var(--mantine-radius-md)',
          border: '1px solid var(--mantine-color-gray-3)',
          overflow: 'hidden',
          backgroundColor: 'var(--mantine-color-gray-0)',
          cursor: url ? 'zoom-in' : 'default',
        }}
      >
        {url ? (
          <Image src={url} alt={label} h={130} fit="cover" />
        ) : (
          <Center h={130}>
            <Text size="xs" c="dimmed">
              {loading ? 'Chargement…' : 'Aucune photo'}
            </Text>
          </Center>
        )}
      </Box>
    </Box>
  )
}
