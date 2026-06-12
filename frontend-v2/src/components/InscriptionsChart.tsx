import { useState } from 'react'
import { Box, Paper, Text } from '@mantine/core'
import { useElementSize } from '@mantine/hooks'
import dayjs from 'dayjs'
import type { DayCount } from '../api/activites'

interface Props {
  data: DayCount[]
}

/**
 * Courbe d'aire des inscriptions sur 30 jours — SVG maison (aucune dépendance
 * de graphique). Survol d'un point pour afficher la valeur du jour.
 */
export function InscriptionsChart({ data }: Props) {
  const { ref, width } = useElementSize()
  const [hover, setHover] = useState<number | null>(null)

  const height = 200
  const padL = 30
  const padR = 10
  const padT = 12
  const padB = 24
  const w = Math.max(width, 1)
  const innerW = w - padL - padR
  const innerH = height - padT - padB
  const n = data.length
  const max = Math.max(1, ...data.map((d) => d.total))

  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v: number) => padT + innerH - (v / max) * innerH

  const linePts = data.map((d, i) => `${x(i)},${y(d.total)}`).join(' ')
  const areaPts =
    n > 0
      ? `${x(0)},${padT + innerH} ${linePts} ${x(n - 1)},${padT + innerH}`
      : ''

  // Étiquettes d'axe X clairsemées (~6) + repères Y à 0 et max.
  const tickStep = Math.max(1, Math.round(n / 6))

  return (
    <Box ref={ref} style={{ width: '100%', position: 'relative' }}>
      {width > 0 && (
        <svg width={w} height={height} role="img" aria-label="Inscriptions par jour sur les 30 derniers jours">
          {/* Repères horizontaux (0 et max) */}
          {[0, max].map((v) => (
            <g key={v}>
              <line
                x1={padL}
                x2={w - padR}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--mantine-color-gray-2)"
                strokeWidth={1}
              />
              <text x={0} y={y(v) + 4} fontSize={11} fill="var(--mantine-color-gray-6)">
                {v}
              </text>
            </g>
          ))}

          {/* Aire + ligne */}
          {areaPts && <polygon points={areaPts} fill="var(--mantine-color-brand-5)" opacity={0.14} />}
          {n > 1 && (
            <polyline
              points={linePts}
              fill="none"
              stroke="var(--mantine-color-brand-6)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Étiquettes X */}
          {data.map((d, i) =>
            i % tickStep === 0 || i === n - 1 ? (
              <text
                key={i}
                x={x(i)}
                y={height - 6}
                fontSize={11}
                fill="var(--mantine-color-gray-6)"
                textAnchor="middle"
              >
                {dayjs(d.jour).format('DD/MM')}
              </text>
            ) : null,
          )}

          {/* Zones de survol + point actif */}
          {data.map((_, i) => (
            <rect
              key={i}
              x={x(i) - (innerW / Math.max(n - 1, 1)) / 2}
              y={padT}
              width={innerW / Math.max(n - 1, 1)}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            />
          ))}
          {hover !== null && (
            <circle cx={x(hover)} cy={y(data[hover].total)} r={4} fill="var(--mantine-color-brand-7)" />
          )}
        </svg>
      )}

      {/* Infobulle */}
      {hover !== null && (
        <Paper
          shadow="sm"
          p={6}
          radius="sm"
          withBorder
          style={{
            position: 'absolute',
            left: Math.min(Math.max(x(hover), 40), w - 40),
            top: 0,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <Text size="xs" fw={600}>
            {dayjs(data[hover].jour).format('DD/MM/YYYY')}
          </Text>
          <Text size="xs" c="dimmed">
            {data[hover].total} inscription{data[hover].total > 1 ? 's' : ''}
          </Text>
        </Paper>
      )}
    </Box>
  )
}
