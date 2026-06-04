import { Box, Paper, Stack, Typography } from '@mui/material'
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded'

export function AboutPage() {
  return (
    <Box sx={{ maxWidth: 720 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          À propos
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Informations sur l'application
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: 'common.white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <QrCode2RoundedIcon />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>Gestion de Présence</Typography>
            <Typography variant="body2" color="text.secondary">
              Version 1.0 — MVP
            </Typography>
          </Box>
        </Stack>

        <Typography variant="body2" sx={{ mb: 2 }}>
          Système web de collecte des présences aux activités via QR Code, avec
          gestion des justificatifs d'identité (CNI) et exports Excel / PDF.
        </Typography>

        <Stack spacing={0.5}>
          <Info label="Pile technique" value="Django Ninja · React MUI · PostgreSQL" />
          <Info label="Licence" value="Usage interne" />
        </Stack>
      </Paper>
    </Box>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Stack>
  )
}
