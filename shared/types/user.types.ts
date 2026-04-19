export type Role = 'patient' | 'doctor' | 'admin' | 'receptionist'
export type Language = 'ar' | 'en'

export interface UserPublic {
  id: string
  nameAr: string
  nameEn: string
  email: string
  phone: string
  role: Role
  preferredLanguage: Language
  profilePhotoUrl?: string
  isActive: boolean
  emailVerified: boolean
  createdAt: string
}

export interface AuthTokenPayload {
  sub: string        // user _id
  role: Role
  email: string
  iat?: number
  exp?: number
}

export interface LoginResponse {
  accessToken: string
  user: Pick<UserPublic, 'id' | 'nameAr' | 'nameEn' | 'role' | 'preferredLanguage' | 'email'>
}
