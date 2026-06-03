import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { frFR } from '@mui/x-data-grid/locales'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import { fetchParticipants, type Participant } from '../api/participants'
import { ParticipantDetailDialog } from './ParticipantDetailDialog'
import { AddParticipantDialog } from './AddParticipantDialog'

const REFRESH_MS = 30_000

export function ParticipantsPanel({
  activiteId,
  canAdd,
}: {
  activiteId: string
  canAdd: boolean
}) {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [selected, setSelected] = useState<Participant | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const { data: page, isLoading } = useQuery({
    queryKey: ['participants', activiteId],
    queryFn: () => fetchParticipants(activiteId),
    refetchInterval: REFRESH_MS,
  })

  const participants = page?.items ?? []

  const columns: GridColDef<Participant>[] = [
    { field: 'nom', headerName: 'Nom', flex: 1, minWidth: 110 },
    { field: 'prenom', headerName: 'Prénom', flex: 1, minWidth: 110 },
    { field: 'structure', headerName: 'Structure', flex: 1.2, minWidth: 140 },
    { field: 'fonction', headerName: 'Fonction', flex: 1.2, minWidth: 140 },
    { field: 'telephone_wave', headerName: 'Téléphone Wave', width: 150 },
    {
      field: 'numero_cni',
      headerName: 'N° CNI',
      width: 150,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" noWrap>
            {params.row.numero_cni}
          </Typography>
          {!params.row.cni_complete && (
            <Tooltip title="Photos CNI manquantes (saisie manuelle)">
              <WarningAmberRoundedIcon fontSize="small" color="warning" />
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ]

  return (
    <Box>
      {/* En-tête + actions */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { sm: 'center' }, mb: 2.5 }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexGrow: 1 }}>
          <GroupsRoundedIcon color="primary" />
          <Typography variant="h6">Participants</Typography>
          <Chip size="small" color="primary" label={participants.length} />
        </Stack>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: 'none', sm: 'block' } }}
          >
            Actualisé toutes les 30 s
          </Typography>
          {canAdd && (
            <Button
              variant="contained"
              startIcon={<PersonAddRoundedIcon />}
              onClick={() => setAddOpen(true)}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Ajouter un participant
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Liste */}
      <Paper sx={{ overflow: 'hidden' }}>
        {!isDesktop ? (
          <ParticipantCards
            participants={participants}
            isLoading={isLoading}
            onSelect={setSelected}
          />
        ) : (
          <DataGrid
            rows={participants}
            columns={columns}
            loading={isLoading}
            getRowId={(r) => r.id}
            onRowClick={(p) => setSelected(p.row)}
            disableRowSelectionOnClick
            disableColumnMenu
            rowHeight={56}
            columnHeaderHeight={46}
            initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
            pageSizeOptions={[20, 50, 100]}
            sx={{
              border: 0,
              cursor: 'pointer',
              height: 460,
              '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.default' },
              '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
                outline: 'none',
              },
              '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' },
            }}
            localeText={{
              ...frFR.components.MuiDataGrid.defaultProps.localeText,
              noRowsLabel: 'Aucun participant',
            }}
          />
        )}
      </Paper>

      <ParticipantDetailDialog
        activiteId={activiteId}
        participant={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
      <AddParticipantDialog
        activiteId={activiteId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </Box>
  )
}

function ParticipantCards({
  participants,
  isLoading,
  onSelect,
}: {
  participants: Participant[]
  isLoading: boolean
  onSelect: (p: Participant) => void
}) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    )
  }
  if (!participants.length) {
    return (
      <Typography color="text.secondary" sx={{ textAlign: 'center', py: 5 }}>
        Aucun participant
      </Typography>
    )
  }
  return (
    <Stack divider={<Divider />}>
      {participants.map((p) => (
        <Box
          key={p.id}
          sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
          onClick={() => onSelect(p)}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
            <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}>
              {p.prenom.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography sx={{ fontWeight: 600 }} noWrap>
                {p.prenom} {p.nom}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {p.fonction} · {p.structure}
              </Typography>
            </Box>
            {!p.cni_complete && (
              <Tooltip title="Photos CNI manquantes">
                <WarningAmberRoundedIcon fontSize="small" color="warning" />
              </Tooltip>
            )}
          </Stack>
          <Stack direction="row" spacing={2} sx={{ pl: 6 }}>
            <Typography variant="caption" color="text.secondary">
              📞 {p.telephone_wave}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              CNI : {p.numero_cni}
            </Typography>
          </Stack>
        </Box>
      ))}
    </Stack>
  )
}
