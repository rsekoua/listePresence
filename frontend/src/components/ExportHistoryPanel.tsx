import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import { fetchExportHistory } from '../api/exports'

export function ExportHistoryPanel({ activiteId }: { activiteId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['export-history', activiteId],
    queryFn: () => fetchExportHistory(activiteId),
  })

  const logs = data ?? []

  return (
    <Box sx={{ mt: 4 }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1.5 }}>
        <HistoryRoundedIcon color="primary" />
        <Typography variant="h6">Historique des exports</Typography>
        <Chip size="small" color="primary" label={logs.length} />
      </Stack>

      <Paper sx={{ overflow: 'hidden' }}>
        {isLoading ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            Chargement…
          </Typography>
        ) : logs.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            Aucun export généré pour le moment.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' } }}>
                <TableCell>Type</TableCell>
                <TableCell align="center">Entrées</TableCell>
                <TableCell>Utilisateur</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log, i) => (
                <TableRow key={i} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{log.type_label}</TableCell>
                  <TableCell align="center">{log.nb_entrees}</TableCell>
                  <TableCell>{log.utilisateur ?? '—'}</TableCell>
                  <TableCell>{dayjs(log.created_at).format('DD/MM/YYYY HH:mm')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  )
}
