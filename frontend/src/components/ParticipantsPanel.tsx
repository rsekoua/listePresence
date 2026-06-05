import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import dayjs from 'dayjs'
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
import { alpha, useTheme } from '@mui/material/styles'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { frFR } from '@mui/x-data-grid/locales'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded'
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded'
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded'
import GridOnRoundedIcon from '@mui/icons-material/GridOnRounded'
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded'
import FolderZipRoundedIcon from '@mui/icons-material/FolderZipRounded'
import { fetchParticipants, type Participant } from '../api/participants'
import { exportCniZip, exportExcel, exportPresenceList } from '../api/exports'
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
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Participant | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const runExport = async (fn: (id: string) => Promise<void>) => {
    setExporting(true)
    try {
      await fn(activiteId)
      queryClient.invalidateQueries({ queryKey: ['export-history', activiteId] })
    } catch {
      enqueueSnackbar("L'export a échoué. Réessayez.", { variant: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const { data: page, isLoading } = useQuery({
    queryKey: ['participants', activiteId],
    queryFn: () => fetchParticipants(activiteId),
    refetchInterval: REFRESH_MS,
  })

  const participants = page?.items ?? []

  const columns: GridColDef<Participant>[] = [
    {
      field: 'nom',
      headerName: 'Participant',
      flex: 1.4,
      minWidth: 200,
      renderCell: (params) => (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', height: '100%' }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.dark,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {params.row.prenom.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }} noWrap>
            {params.row.prenom} {params.row.nom}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'structure',
      headerName: 'Structure',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
          <ApartmentRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
          <Typography variant="body2" noWrap>
            {params.row.structure}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'fonction',
      headerName: 'Fonction',
      flex: 1,
      minWidth: 140,
    },
    {
      field: 'telephone_wave',
      headerName: 'Téléphone Wave',
      width: 170,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
          <PhoneIphoneRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
          <Typography variant="body2" noWrap>
            {params.row.telephone_wave}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'numero_cni',
      headerName: 'N° CNI',
      width: 160,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" noWrap>
            {params.row.numero_cni}
          </Typography>
          {params.row.cni_complete ? (
            <Tooltip title="Carte CNI chargée (recto + verso)">
              <AttachFileRoundedIcon fontSize="small" sx={{ color: 'success.main' }} />
            </Tooltip>
          ) : (
            <Tooltip title="Photos CNI manquantes (saisie manuelle)">
              <WarningAmberRoundedIcon fontSize="small" color="warning" />
            </Tooltip>
          )}
        </Stack>
      ),
    },
    {
      field: 'horodatage',
      headerName: 'Inscrit le',
      width: 150,
      valueFormatter: (value) => dayjs(value as string).format('DD/MM/YYYY HH:mm'),
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
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: 'none', md: 'block' } }}
          >
            Actualisé toutes les 30 s
          </Typography>
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
        >
          <Button
            variant="outlined"
            size="small"
            startIcon={<GridOnRoundedIcon sx={{ color: '#059669' }} />}
            disabled={exporting || !participants.length}
            onClick={() => runExport(exportExcel)}
          >
           Export en Excel
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PictureAsPdfRoundedIcon sx={{ color: '#dc2626' }} />}
            disabled={exporting || !participants.length}
            onClick={() => runExport(exportPresenceList)}
          >
            Export en PDF
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FolderZipRoundedIcon sx={{ color: '#d97706' }} />}
            disabled={exporting || !participants.length}
            onClick={() => runExport(exportCniZip)}
          >
            Fiches CNI (ZIP)
          </Button>
          {canAdd && (
            <Button
              variant="contained"
              startIcon={<PersonAddRoundedIcon />}
              onClick={() => setAddOpen(true)}
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
            rowHeight={52}
            columnHeaderHeight={48}
            initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
            pageSizeOptions={[20, 50, 100]}
            sx={{
              border: 0,
              cursor: 'pointer',
              height: 460,
              fontSize: 13,
              '--DataGrid-rowBorderColor': '#eef0f4',
              '& .MuiDataGrid-columnHeader': { bgcolor: '#f8fafc' },
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc' },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 700,
                color: 'text.secondary',
                textTransform: 'uppercase',
                fontSize: 11,
                letterSpacing: 0.4,
              },
              '& .MuiDataGrid-cell': { borderColor: '#eef0f4' },
              '& .MuiDataGrid-cell .MuiTypography-root': { fontSize: 13 },
              '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
                outline: 'none',
              },
              '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' },
              '& .MuiDataGrid-footerContainer': { borderColor: '#eef0f4' },
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
