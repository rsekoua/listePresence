import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  Avatar,
  Box,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { frFR } from '@mui/x-data-grid/locales'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded'
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import EventRoundedIcon from '@mui/icons-material/EventRounded'
import {
  fetchAllParticipants,
  type ParticipantFilters,
  type ParticipantGlobal,
} from '../api/participants'

export function ParticipantsGlobalPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [cni, setCni] = useState<'' | 'complete' | 'incomplete'>('')

  const filters: ParticipantFilters = {
    ...(search ? { search } : {}),
    ...(cni ? { cni } : {}),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['participants-globaux', search, cni],
    queryFn: () => fetchAllParticipants(filters),
  })

  const participants = data?.items ?? []

  const columns: GridColDef<ParticipantGlobal>[] = [
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
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {params.row.prenom} {params.row.nom}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'activite_nom',
      headerName: 'Activité',
      flex: 1.2,
      minWidth: 160,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
          <EventRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
          <Typography variant="body2" noWrap>
            {params.row.activite_nom}
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
    { field: 'fonction', headerName: 'Fonction', flex: 1, minWidth: 140 },
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
            <AttachFileRoundedIcon fontSize="small" sx={{ color: 'success.main' }} />
          ) : (
            <WarningAmberRoundedIcon fontSize="small" color="warning" />
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
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          Participants
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tous les participants enregistrés, toutes activités confondues
        </Typography>
      </Box>

      {/* Filtres */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mb: 2.5 }}
      >
        <TextField
          placeholder="Rechercher (nom, email, CNI…)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: { sm: 360 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          label="CNI"
          value={cni}
          onChange={(e) => setCni(e.target.value as typeof cni)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Toutes</MenuItem>
          <MenuItem value="complete">Complètes</MenuItem>
          <MenuItem value="incomplete">Incomplètes</MenuItem>
        </TextField>
      </Stack>

      <Paper sx={{ overflow: 'hidden' }}>
        <DataGrid
          rows={participants}
          columns={columns}
          loading={isLoading}
          getRowId={(r) => r.id}
          onRowClick={(p) => navigate(`/activites/${p.row.activite_id}`)}
          disableRowSelectionOnClick
          disableColumnMenu
          rowHeight={52}
          columnHeaderHeight={48}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          pageSizeOptions={[25, 50, 100]}
          sx={{
            border: 0,
            cursor: 'pointer',
            height: 560,
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
      </Paper>
    </Box>
  )
}
