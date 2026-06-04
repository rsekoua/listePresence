import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  Avatar,
  Box,
  Chip,
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
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded'
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import {
  fetchPersonnes,
  type ParticipantFilters,
  type Personne,
} from '../api/participants'
import { PersonneHistoriqueDialog } from '../components/PersonneHistoriqueDialog'

export function ParticipantsGlobalPage() {
  const theme = useTheme()
  const [search, setSearch] = useState('')
  const [cni, setCni] = useState<'' | 'complete' | 'incomplete'>('')
  const [selected, setSelected] = useState<string | null>(null)

  const filters: ParticipantFilters = {
    ...(search ? { search } : {}),
    ...(cni ? { cni } : {}),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['personnes', search, cni],
    queryFn: () => fetchPersonnes(filters),
  })

  const personnes = data ?? []

  const columns: GridColDef<Personne>[] = [
    {
      field: 'nom',
      headerName: 'Personne',
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
      field: 'telephone_wave',
      headerName: 'Téléphone',
      width: 160,
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
      field: 'nb_activites',
      headerName: 'Activités',
      width: 110,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Stack sx={{ height: '100%', justifyContent: 'center', alignItems: 'center' }}>
          <Chip
            size="small"
            label={params.row.nb_activites}
            color={params.row.nb_activites > 1 ? 'primary' : 'default'}
            variant={params.row.nb_activites > 1 ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600, minWidth: 36 }}
          />
        </Stack>
      ),
    },
    {
      field: 'cni_complete',
      headerName: 'CNI',
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Stack sx={{ height: '100%', justifyContent: 'center', alignItems: 'center' }}>
          {params.row.cni_complete ? (
            <AttachFileRoundedIcon fontSize="small" sx={{ color: 'success.main' }} />
          ) : (
            <WarningAmberRoundedIcon fontSize="small" color="warning" />
          )}
        </Stack>
      ),
    },
    {
      field: 'derniere_participation',
      headerName: 'Dernière participation',
      width: 180,
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
          Annuaire des personnes distinctes ({personnes.length}) — regroupées par CNI
        </Typography>
      </Box>

      {/* Filtres */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
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
          rows={personnes}
          columns={columns}
          loading={isLoading}
          getRowId={(r) => r.numero_cni}
          onRowClick={(p) => setSelected(p.row.numero_cni)}
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
            noRowsLabel: 'Aucune personne',
          }}
        />
      </Paper>

      <PersonneHistoriqueDialog
        numeroCni={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </Box>
  )
}
