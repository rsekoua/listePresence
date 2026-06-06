import { api } from './client'
import type { Role } from './types'
import type { AuditEntry } from './audit'

export interface AppUser {
  id: string
  username: string
  email: string
  role: Role
  is_active: boolean
  created_at: string
  nb_activites: number
}

export interface UserCreateInput {
  username: string
  email: string
  password: string
  role: Role
}

export async function fetchUsers(): Promise<AppUser[]> {
  const { data } = await api.get<AppUser[]>('/auth/users')
  return data
}

export async function createUser(input: UserCreateInput): Promise<AppUser> {
  const { data } = await api.post<AppUser>('/auth/users', input)
  return data
}

export async function updateUser(
  id: string,
  patch: { username?: string; email?: string; is_active?: boolean; role?: Role },
): Promise<AppUser> {
  const { data } = await api.patch<AppUser>(`/auth/users/${id}`, patch)
  return data
}

export async function resetUserPassword(
  id: string,
  nouveau_mot_de_passe: string,
): Promise<void> {
  await api.post(`/auth/users/${id}/reset-password`, { nouveau_mot_de_passe })
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/auth/users/${id}`)
}

/** Journal d'audit d'un utilisateur précis. */
export async function fetchUserAudit(id: string): Promise<AuditEntry[]> {
  const { data } = await api.get<AuditEntry[]>(`/auth/users/${id}/audit`)
  return data
}
