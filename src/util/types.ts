export type jwtUser = {
  sub: string
  email: string
  role: string
  exp: number
  iss: string
}

export type refreshUser = Omit<jwtUser, 'email'>
