import { Box, Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core'
import { IconQrcode } from '@tabler/icons-react'
import { PageHeader } from '../components/PageHeader'

export function AboutPage() {
  return (
    <Box maw={720}>
      <PageHeader title="À propos" subtitle="Informations sur l'application" />

      <Paper p="lg" radius="sm">
        <Group gap="md" align="center" mb="md">
          <ThemeIcon size={48} radius="sm" color="brand">
            <IconQrcode size={26} />
          </ThemeIcon>
          <Box>
            <Text fw={700}>Gestion de Présence</Text>
            <Text size="sm" c="dimmed">
              Version 1.0 — MVP
            </Text>
          </Box>
        </Group>

        <Text size="sm" mb="md">
          Système web de collecte des présences aux activités via QR Code, avec gestion des
          justificatifs d'identité (CNI) et exports Excel / PDF.
        </Text>

        <Stack gap={6}>
          <Info label="Pile technique" value="Django Ninja · React Mantine · PostgreSQL" />
          <Info label="Licence" value="Usage interne" />
        </Stack>
      </Paper>
    </Box>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" gap="md">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={600}>
        {value}
      </Text>
    </Group>
  )
}
