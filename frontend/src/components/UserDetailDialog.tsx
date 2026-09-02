import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core'
import { fetchUserAudit, updateUser, type AppUser } from '../api/users'
import type { Role } from '../api/types'
import { RoleSelect } from './RoleSelect'
import { actionMeta } from './auditMeta'
import { errorMessage, notify } from '../lib/notify'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function UserDetailDialog({
  user,
  onClose,
}: {
  user: AppUser | null
  onClose: () => void
}) {
  const [tab, setTab] = useState<string | null>('profil')

  useEffect(() => {
    if (user) setTab('profil')
  }, [user])

  return (
    <Modal opened={Boolean(user)} onClose={onClose} size="lg" centered title={null}>
      {user && (
        <Stack gap="md">
          <Group gap="md" align="center" wrap="nowrap">
            <Avatar color="brand" radius="md" size={44}>
              {user.username.charAt(0).toUpperCase()}
            </Avatar>
            <Box style={{ flexGrow: 1, minWidth: 0 }}>
              <Text fw={700} truncate>
                {user.username}
              </Text>
              <Group gap={8} mt={4}>
                <Badge size="sm" variant={user.role === 'admin' ? 'filled' : 'outline'} color="brand">
                  {user.role === 'admin' ? 'Administrateur' : 'Organisateur'}
                </Badge>
                <Badge
                  size="sm"
                  variant={user.is_active ? 'filled' : 'outline'}
                  color={user.is_active ? 'teal' : 'gray'}
                >
                  {user.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              </Group>
            </Box>
          </Group>

          <Tabs value={tab} onChange={setTab}>
            <Tabs.List>
              <Tabs.Tab value="profil">Profil</Tabs.Tab>
              <Tabs.Tab value="activite">Activité</Tabs.Tab>
            </Tabs.List>

            <Box mt="md" mih={320}>
              {tab === 'profil' ? (
                <ProfileTab user={user} onSaved={onClose} />
              ) : (
                <ActivityTab userId={user.id} />
              )}
            </Box>
          </Tabs>
        </Stack>
      )}
    </Modal>
  )
}

// --- Onglet Profil ---------------------------------------------------------

function ProfileTab({ user, onSaved }: { user: AppUser; onSaved: () => void }) {
  const queryClient = useQueryClient()
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState<Role>(user.role)

  useEffect(() => {
    setUsername(user.username)
    setEmail(user.email)
    setRole(user.role)
  }, [user])

  const mutation = useMutation({
    mutationFn: () => updateUser(user.id, { username, email, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      notify.success('Utilisateur modifié.')
      onSaved()
    },
    onError: (e) => notify.error(errorMessage(e, 'Modification impossible.')),
  })

  const valid = username.trim() && EMAIL_RE.test(email)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) mutation.mutate()
  }

  return (
    <form onSubmit={onSubmit}>
      <Stack gap="md">
        <TextInput
          label="Nom d'utilisateur"
          value={username}
          onChange={(e) => setUsername(e.currentTarget.value)}
        />
        <TextInput
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
        />
        <RoleSelect value={role} onChange={setRole} />
        <Group justify="flex-end">
          <Button type="submit" disabled={!valid} loading={mutation.isPending}>
            Enregistrer les modifications
          </Button>
        </Group>
      </Stack>
    </form>
  )
}

// --- Onglet Activité (logs) ------------------------------------------------

function ActivityTab({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-audit', userId],
    queryFn: () => fetchUserAudit(userId),
  })

  if (isLoading) {
    return (
      <Center py={48}>
        <Loader />
      </Center>
    )
  }

  const logs = data ?? []
  if (logs.length === 0) {
    return (
      <Text size="sm" c="dimmed" ta="center" py={48}>
        Aucune activité enregistrée.
      </Text>
    )
  }

  return (
    <Stack gap="sm">
      {logs.map((log, i) => {
        const meta = actionMeta(log.action)
        return (
          <Paper key={i} withBorder p="sm" radius="md">
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon variant="light" color={meta.color} radius="xl" size={36}>
                {meta.icon}
              </ThemeIcon>
              <Box style={{ flexGrow: 1, minWidth: 0 }}>
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Badge
                    variant={meta.color === 'gray' ? 'outline' : 'filled'}
                    color={meta.color}
                    style={{ textTransform: 'none' }}
                  >
                    {log.action_label}
                  </Badge>
                  <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                    {dayjs(log.created_at).format('DD/MM/YY HH:mm')}
                  </Text>
                </Group>
                {log.objet && (
                  <Text size="sm" mt={6}>
                    {log.objet}
                  </Text>
                )}
                {log.ip_address && (
                  <Text size="xs" c="dimmed" mt={2}>
                    IP {log.ip_address}
                  </Text>
                )}
              </Box>
            </Group>
          </Paper>
        )
      })}
    </Stack>
  )
}
