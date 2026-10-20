/** Client-safe user fields (never includes the password hash). */
export interface SafeUser {
  id: number
  email: string
  name: string | null
  avatar: unknown
  role: string
}

/**
 * Auth snapshot shared by the route guard and admin UI:
 * `hasUsers` chooses first-run `/admin/register` vs `/admin/login`;
 * `user` keeps authenticated visitors out of the auth pages.
 */
export interface AuthState {
  user: SafeUser | null
  hasUsers: boolean
}
