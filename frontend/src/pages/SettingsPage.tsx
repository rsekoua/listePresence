import { useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { IconLockCog } from '@tabler/icons-react'
import { changePassword, fetchMe } from '../api/activites'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/PageHeader'
import { errorMessage, notify } from '../lib/notify'

export function SettingsPage() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: fetchMe })
  const { login } = useAuth()

  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const mutation = useMutation({
    mutationFn: () => changePassword(ancien, nouveau),
    onSuccess: (tokens) => {
      // Le mot de passe a changé : l'ancien jeton est révoqué côté serveur.
      // On enregistre le nouveau couple pour garder la session courante active.
      login(tokens.access, tokens.refresh)
      notify.success('Mot de passe mis à jour.')
      setAncien('')
      setNouveau('')
      setConfirmation('')
    },
    onError: (err: unknown) => {
      notify.error(errorMessage(err, 'Impossible de changer le mot de passe.'))
    },
  })

  const erreurConfirmation = confirmation.length > 0 && nouveau !== confirmation
  const erreurLongueur = nouveau.length > 0 && nouveau.length < 8
  const peutValider =
    ancien.length > 0 &&
    nouveau.length >= 8 &&
    nouveau === confirmation &&
    !mutation.isPending

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (peutValider) mutation.mutate()
  }

  return (
    <Box maw={640}>
      <PageHeader title="Paramètres" subtitle="Votre profil et la sécurité de votre compte" />

      {/* Profil */}
      <Paper p="lg" radius="sm" mb="lg">
        <Title order={5} mb="md">
          Profil
        </Title>
        <Group gap="md" align="center">
          <Avatar size={56} radius="md" color="brand">
            {me?.username.charAt(0).toUpperCase() ?? '?'}
          </Avatar>
          <Box>
            <Text fw={700}>{me?.username ?? '—'}</Text>
            <Text size="sm" c="dimmed">
              {me?.email ?? '—'}
            </Text>
            {me?.role && (
              <Badge mt={6} variant={me.role === 'admin' ? 'filled' : 'light'} color="brand">
                {me.role === 'admin' ? 'Administrateur' : 'Organisateur'}
              </Badge>
            )}
          </Box>
        </Group>
      </Paper>

      {/* Changement de mot de passe */}
      <Paper p="lg" radius="sm">
        <Title order={5} mb={4}>
          Changer le mot de passe
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          8 caractères minimum.
        </Text>
        <Divider mb="lg" />
        <form onSubmit={onSubmit}>
          <Stack gap="md">
            <PasswordInput
              label="Mot de passe actuel"
              value={ancien}
              onChange={(e) => setAncien(e.currentTarget.value)}
              autoComplete="current-password"
            />
            <PasswordInput
              label="Nouveau mot de passe"
              value={nouveau}
              onChange={(e) => setNouveau(e.currentTarget.value)}
              autoComplete="new-password"
              error={erreurLongueur ? 'Au moins 8 caractères.' : undefined}
            />
            <PasswordInput
              label="Confirmer le nouveau mot de passe"
              value={confirmation}
              onChange={(e) => setConfirmation(e.currentTarget.value)}
              autoComplete="new-password"
              error={erreurConfirmation ? 'Les mots de passe ne correspondent pas.' : undefined}
            />
            <Box>
              <Button
                type="submit"
                disabled={!peutValider}
                loading={mutation.isPending}
                leftSection={<IconLockCog size={18} />}
              >
                Mettre à jour le mot de passe
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>
    </Box>
  )
}
