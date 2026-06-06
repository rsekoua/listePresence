import type { ReactNode } from 'react'
import { Box, Group, Stack, Text, Title } from '@mantine/core'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Actions affichées à droite (boutons…). */
  actions?: ReactNode
}

/** En-tête de page standard : titre + sous-titre à gauche, actions à droite. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Group justify="space-between" align="flex-end" wrap="wrap" gap="md" mb="lg">
      <Box>
        <Stack gap={2}>
          <Title order={2}>{title}</Title>
          {subtitle && (
            <Text size="sm" c="dimmed">
              {subtitle}
            </Text>
          )}
        </Stack>
      </Box>
      {actions && <Group gap="sm">{actions}</Group>}
    </Group>
  )
}
