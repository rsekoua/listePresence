import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  Avatar,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { frFR } from '@mui/x-data-grid/locales'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EventRoundedIcon from '@mui/icons-material/EventRounded'
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import { fetchActivites } from '../api/activites'
import type { Activite, StatutActivite } from '../api/types'
import { CreateActiviteDialog } from '../components/CreateActiviteDialog'
import { ActiviteRowActions } from '../components/ActiviteRowActions'
import { ActiviteCardList } from '../components/ActiviteCardList'

const STATUT_LABEL: Record<
  StatutActivite,
  { label: string; color: 'success' | 'default' | 'warning' }
> = {
  ouvert: { label: 'Ouverte', color: 'success' },
  ferme: { label: 'Fermée', color: 'warning' },
  archive: { label: 'Archivée', color: 'default' },
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode
  label: string
  value: number
  color: string
}) {
  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${color}1a`,
            color,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" sx={{ lineHeight: 1 }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['activites'],
    queryFn: fetchActivites,
  })

  const activites = data ?? []
  const total = activites.length
  const ouvertes = activites.filter((a) => a.statut === 'ouvert').length
  const fermees = activites.filter((a) => a.statut !== 'ouvert').length

  const columns: GridColDef<Activite>[] = [
    {
      field: 'nom',
      headerName: 'Activité',
      flex: 1.6,
      minWidth: 160,
      renderCell: (params) => (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', height: '100%' }}>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: 'primary.light',
              color: 'primary.dark',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {params.row.nom.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {params.row.nom}
          </Typography>
        </Stack>
      ),
    },
    { field: 'lieu', headerName: 'Lieu', flex: 1, minWidth: 90 },
    {
      field: 'date_debut',
      headerName: 'Période',
      width: 150,
      sortable: true,
      renderCell: (params) => (
        <Stack sx={{ justifyContent: 'center', height: '100%' }}>
          <Typography variant="body2">
            {dayjs(params.row.date_debut).format('DD/MM/YYYY HH:mm')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            au {dayjs(params.row.date_fin).format('DD/MM/YYYY HH:mm')}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'statut',
      headerName: 'Statut',
      width: 110,
      renderCell: (params) => {
        const s = STATUT_LABEL[params.value as StatutActivite]
        return <Chip size="small" label={s.label} color={s.color} />
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 92,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => <ActiviteRowActions activite={params.row} />,
    },
  ]

  return (
    <Box>
      {/* En-tête de page */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3 }}
      >
        <Box>
          <Typography variant="h4" component="h1">
            Vue d'ensemble
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gérez vos activités et leurs QR Codes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}
        >
          Nouvelle activité
        </Button>
      </Stack>

      {/* Statistiques */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          icon={<EventRoundedIcon />}
          label="Activités au total"
          value={total}
          color="#2563eb"
        />
        <StatCard
          icon={<LockOpenRoundedIcon />}
          label="Collectes ouvertes"
          value={ouvertes}
          color="#16a34a"
        />
        <StatCard
          icon={<LockRoundedIcon />}
          label="Collectes fermées"
          value={fermees}
          color="#d97706"
        />
      </Box>

      {/* Tableau */}
      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 600 }}>Liste des activités</Typography>
        </Box>
        {!isDesktop ? (
          <ActiviteCardList activites={activites} isLoading={isLoading} />
        ) : (
        <DataGrid
          rows={activites}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.id}
          onRowClick={(params) => navigate(`/activites/${params.id}`)}
          disableRowSelectionOnClick
          disableColumnMenu
          rowHeight={64}
          columnHeaderHeight={48}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 20, 50]}
          sx={{
            border: 0,
            cursor: 'pointer',
            height: 480,
            '--DataGrid-rowBorderColor': '#eef0f4',
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: 'background.default',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 700,
              color: 'text.secondary',
              textTransform: 'uppercase',
              fontSize: 12,
              letterSpacing: 0.4,
            },
            '& .MuiDataGrid-columnSeparator': { display: 'none' },
            '& .MuiDataGrid-cell': { borderColor: '#eef0f4' },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
              outline: 'none',
            },
            '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' },
            '& .MuiDataGrid-footerContainer': { borderColor: '#eef0f4' },
          }}
          localeText={{
            ...frFR.components.MuiDataGrid.defaultProps.localeText,
            noRowsLabel: 'Aucune activité pour le moment',
          }}
        />
        )}
      </Paper>

      <CreateActiviteDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Box>
  )
}
