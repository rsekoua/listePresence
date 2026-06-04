import { useState, type ReactElement, type ReactNode } from 'react'
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
  alpha,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { frFR } from '@mui/x-data-grid/locales'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EventRoundedIcon from '@mui/icons-material/EventRounded'
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import { fetchActivites, fetchGlobalStats } from '../api/activites'
import type { Activite, StatutActivite } from '../api/types'
import { ActiviteFormDialog } from '../components/ActiviteFormDialog'
import { ActiviteRowActions } from '../components/ActiviteRowActions'
import { ActiviteCardList } from '../components/ActiviteCardList'

const STATUT_LABEL: Record<
  StatutActivite,
  { label: string; color: 'success' | 'default' | 'warning'; icon: ReactElement }
> = {
  ouvert: { label: 'Ouverte', color: 'success', icon: <LockOpenRoundedIcon /> },
  ferme: { label: 'Fermée', color: 'warning', icon: <LockRoundedIcon /> },
  archive: { label: 'Archivée', color: 'default', icon: <Inventory2RoundedIcon /> },
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
    <Paper
      sx={{
        p: 3,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        transition: 'box-shadow .2s ease, transform .2s ease',
        '&:hover': {
          boxShadow: '0 8px 28px rgba(15,23,42,0.10)',
          transform: 'translateY(-2px)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(120px 80px at 100% 0%, ${color}14, transparent 70%)`,
          pointerEvents: 'none',
        },
      }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
            boxShadow: `0 6px 16px ${color}40`,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h3" sx={{ lineHeight: 1, fontWeight: 800 }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
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

  const { data: globalStats } = useQuery({
    queryKey: ['stats-globales'],
    queryFn: fetchGlobalStats,
  })

  const activites = data ?? []
  const total = activites.length
  const ouvertes = activites.filter((a) => a.statut === 'ouvert').length
  const fermees = activites.filter((a) => a.statut !== 'ouvert').length
  const participantsUniques = globalStats?.nb_participants_uniques ?? 0

 const columns: GridColDef<Activite>[] = [
    {
      field: 'nom',
      headerName: 'Activité',
      // flex: 2 donne plus de poids à la colonne principale pour éviter de tronquer les longs noms d'ateliers
      flex: 2,
      minWidth: 220,
      renderCell: (params) => (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', height: '100%' }}>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              // Utilisation du Cyan très doux du thème pour le fond
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.dark,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {params.row.nom.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }} noWrap>
            {params.row.nom}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'nb_participants',
      headerName: 'Participants',
      // Largeur fixe augmentée à 130 pour afficher le titre "PARTICIPANTS" en entier sans coupure
      width: 130,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: 'center', justifyContent: 'center', height: '100%' }}
        >
          <GroupsRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {params.row.nb_participants}
          </Typography>
        </Stack>
      ),
    },
    { 
      field: 'lieu', 
      headerName: 'Lieu', 
      flex: 1.2, 
      minWidth: 160,
      renderCell: (params) => (
        <Typography variant="body2" color="text.primary" noWrap sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: 'created_by',
      headerName: 'Organisateur',
      flex: 1,
      minWidth: 130,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
          <PersonRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
          <Typography variant="body2" color="text.secondary" noWrap>
            {params.row.created_by?.username || 'N/A'}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'date_debut',
      headerName: 'Période',
      // Augmenté à 160 pour éviter que les dates et heures se chevauchent ou passent à la ligne brutalement
      width: 160,
      sortable: true,
      renderCell: (params) => (
        <Stack sx={{ justifyContent: 'center', height: '100%', py: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
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
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const s = STATUT_LABEL[params.value as StatutActivite]
        return (
          <Stack sx={{ alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Chip
              size="small"
              icon={s.icon}
              label={s.label}
              color={s.color}
              variant="outlined"
              sx={{
                fontWeight: 600,
                fontSize: 12,
                height: 24,
                '& .MuiChip-icon': { fontSize: 14, ml: 0.5 },
              }}
            />
          </Stack>
        )
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <Stack direction="row" sx={{ justifyContent: 'flex-end', alignItems: 'center', height: '100%', width: '100%' }}>
          <ActiviteRowActions activite={params.row} />
        </Stack>
      ),
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
          <Typography variant="body2" color="text.secondary" sx={{ opacity:  0.5 }}>
            Gérez vos activités et générer leurs QR Codes
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
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <StatCard
          icon={<GroupsRoundedIcon />}
          label="Participants uniques"
          value={participantsUniques}
          color="#0ea5e9"
        />
        <StatCard
          icon={<EventRoundedIcon />}
          label="Activités au total"
          value={total}
          color="#4f46e5"
        />
        <StatCard
          icon={<LockOpenRoundedIcon />}
          label="Collectes ouvertes"
          value={ouvertes}
          color="#059669"
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
            fontSize: 13,
            '--DataGrid-rowBorderColor': '#eef0f4',
            '& .MuiDataGrid-columnHeader': {
              bgcolor: '#f8fafc',
            },
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: '#f8fafc',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 700,
              color: 'text.secondary',
              textTransform: 'uppercase',
              fontSize: 11,
              letterSpacing: 0.4,
            },
            '& .MuiDataGrid-cell .MuiTypography-root': {
              fontSize: 13,
            },
            // Gouttière gauche/droite pour aligner le contenu sur l'en-tête de la carte
            '& .MuiDataGrid-columnHeader:first-of-type, & .MuiDataGrid-cell:first-of-type': {
              pl: 2.5,
            },
            '& .MuiDataGrid-columnHeader:last-of-type, & .MuiDataGrid-cell:last-of-type': {
              pr: 2.5,
            },
            '& .MuiDataGrid-columnSeparator': { display: '' },
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

      <ActiviteFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Box>
  )
}
