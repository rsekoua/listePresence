import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import {
  Alert,
  Box,
  Button,
  Center,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { IconAlertCircle, IconCircleCheck, IconQrcode } from '@tabler/icons-react'
import { confirmPasswordReset } from '../api/activites'

/** Page publique de confirmation d'un lien de réinitialisation à usage unique
 * (généré par un admin depuis /utilisateurs — pas de flux email). */
export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmValue, setConfirmValue] = useState('')

  const mutation = useMutation({
    mutationFn: () => confirmPasswordReset(token ?? '', password),
    onSuccess: () => {
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    },
  })

  const errorMessage = (() => {
    if (!mutation.isError) return null
    const status = isAxiosError(mutation.error) ? mutation.error.response?.status : undefined
    if (status === 422) return 'Mot de passe trop faible (8 caractères min.).'
    return 'Ce lien est invalide, expiré ou déjà utilisé. Demandez-en un nouveau à votre administrateur.'
  })()

  const passwordsMatch = password.length > 0 && password === confirmValue
  const valid = password.length >= 8 && passwordsMatch

  return (
    <Center mih="100vh" p="md">
      <Stack gap="lg" w="100%" maw={400} align="center">
        <Group gap="xs" align="center">
          <ThemeIcon size={30} radius="md" color="brand">
            <IconQrcode size={18} />
          </ThemeIcon>
          <Text fw={800} size="md">
            Gestion de liste de Présence
          </Text>
        </Group>

        <Paper w="100%" radius="lg" p="xl" withBorder={false} shadow="sm">
          {mutation.isSuccess ? (
            <Stack align="center" gap="md" py="md">
              <ThemeIcon size={48} radius="xl" color="teal" variant="light">
                <IconCircleCheck size={28} />
              </ThemeIcon>
              <Title order={4} ta="center">
                Mot de passe réinitialisé
              </Title>
              <Text size="sm" c="dimmed" ta="center">
                Redirection vers la connexion…
              </Text>
            </Stack>
          ) : (
            <>
              <Box ta="center" mb="lg">
                <Title order={3} fw={800}>
                  Nouveau mot de passe
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  Choisissez un nouveau mot de passe pour votre compte
                </Text>
              </Box>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (valid) mutation.mutate()
                }}
              >
                <Stack gap="md">
                  {errorMessage && (
                    <Alert color="red" icon={<IconAlertCircle size={18} />} variant="light">
                      {errorMessage}
                    </Alert>
                  )}

                  <PasswordInput
                    label="Nouveau mot de passe"
                    placeholder="••••••••"
                    size="md"
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                    error={
                      password.length > 0 && password.length < 8
                        ? 'Au moins 8 caractères.'
                        : undefined
                    }
                    data-autofocus
                  />
                  <PasswordInput
                    label="Confirmer le mot de passe"
                    placeholder="••••••••"
                    size="md"
                    value={confirmValue}
                    onChange={(e) => setConfirmValue(e.currentTarget.value)}
                    error={
                      confirmValue.length > 0 && !passwordsMatch
                        ? 'Les mots de passe ne correspondent pas.'
                        : undefined
                    }
                  />

                  <Button
                    type="submit"
                    size="md"
                    fullWidth
                    mt="xs"
                    disabled={!valid}
                    loading={mutation.isPending}
                  >
                    Réinitialiser le mot de passe
                  </Button>
                </Stack>
              </form>
            </>
          )}
        </Paper>
      </Stack>
    </Center>
  )
}
