import { Box, Paper, Stack, Typography } from '@mui/material'

const ETAPES: { titre: string; detail: string }[] = [
  {
    titre: '1. Créer une activité',
    detail:
      "Depuis le tableau de bord, cliquez sur « Nouvelle activité » et renseignez le nom, les dates et le lieu.",
  },
  {
    titre: '2. Partager le QR Code',
    detail:
      "Ouvrez l'activité : son QR Code est généré automatiquement. Affichez-le ou téléchargez-le pour que les participants le scannent.",
  },
  {
    titre: '3. Collecter les présences',
    detail:
      "Les participants scannent le QR Code, remplissent le formulaire et photographient leur CNI. Le compteur se met à jour automatiquement.",
  },
  {
    titre: '4. Fermer la collecte',
    detail:
      "Quand l'activité est terminée, fermez la collecte pour désactiver le formulaire public.",
  },
  {
    titre: '5. Exporter les données',
    detail:
      "Depuis le panneau des participants, exportez la liste Excel, la liste de présence à signer (PDF) ou l'archive ZIP des fiches CNI.",
  },
]

export function HelpPage() {
  return (
    <Box sx={{ maxWidth: 720 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          Aide
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Guide d'utilisation rapide
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          {ETAPES.map((etape) => (
            <Box key={etape.titre}>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{etape.titre}</Typography>
              <Typography variant="body2" color="text.secondary">
                {etape.detail}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Box>
  )
}
