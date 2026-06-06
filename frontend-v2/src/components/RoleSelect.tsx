import { Box, Group, Radio, Stack, Text } from '@mantine/core'
import type { Role } from '../api/types'

const ROLE_OPTIONS: { value: Role; label: string; desc: string }[] = [
  {
    value: 'organisateur',
    label: 'Organisateur',
    desc: 'Crée et gère ses propres activités.',
  },
  {
    value: 'admin',
    label: 'Administrateur',
    desc: 'Accès complet : toutes les activités et la gestion des comptes.',
  },
]

export function RoleSelect({
  value,
  onChange,
}: {
  value: Role
  onChange: (r: Role) => void
}) {
  return (
    <Box>
      <Text size="sm" fw={600} mb={8}>
        Rôle
      </Text>
      <Stack gap="xs">
        {ROLE_OPTIONS.map((opt) => {
          const selected = value === opt.value
          return (
            <Group
              key={opt.value}
              role="button"
              align="flex-start"
              gap="sm"
              wrap="nowrap"
              p="sm"
              onClick={() => onChange(opt.value)}
              style={{
                borderRadius: 'var(--mantine-radius-md)',
                cursor: 'pointer',
                border: `1px solid ${
                  selected ? 'var(--mantine-color-brand-6)' : 'var(--mantine-color-gray-3)'
                }`,
                backgroundColor: selected ? 'var(--mantine-color-brand-0)' : 'transparent',
                boxShadow: selected ? '0 0 0 1px var(--mantine-color-brand-6)' : 'none',
                transition: 'all .15s ease',
              }}
            >
              <Radio checked={selected} onChange={() => onChange(opt.value)} mt={2} />
              <Box>
                <Text size="sm" fw={600}>
                  {opt.label}
                </Text>
                <Text size="xs" c="dimmed">
                  {opt.desc}
                </Text>
              </Box>
            </Group>
          )
        })}
      </Stack>
    </Box>
  )
}
