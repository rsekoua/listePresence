import { Box, Radio, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
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
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
        Rôle
      </Typography>
      <Stack spacing={1.25}>
        {ROLE_OPTIONS.map((opt) => {
          const selected = value === opt.value
          return (
            <Box
              key={opt.value}
              role="button"
              onClick={() => onChange(opt.value)}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                p: 1.5,
                borderRadius: 2,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: (t) =>
                  selected ? alpha(t.palette.primary.main, 0.06) : 'transparent',
                boxShadow: (t) => (selected ? `0 0 0 1px ${t.palette.primary.main}` : 'none'),
                transition: 'all .15s ease',
                '&:hover': { borderColor: selected ? 'primary.main' : 'text.disabled' },
              }}
            >
              <Radio checked={selected} size="small" sx={{ p: 0, mt: 0.25 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {opt.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {opt.desc}
                </Typography>
              </Box>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}
