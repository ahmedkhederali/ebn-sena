export interface SpecialtySummary {
  id: string
  nameAr: string
  nameEn: string
  descriptionAr?: string | undefined
  descriptionEn?: string | undefined
  icon?: string | undefined
}

export interface DoctorPublic {
  id: string
  nameAr: string
  nameEn: string
  specialty: SpecialtySummary
  bioAr?: string
  bioEn?: string
  profilePhotoUrl?: string
  consultationFeeSAR: number
  averageRating: number
  ratingCount: number
  yearsOfExperience?: number
  qualifications?: string[]
  languages: string[]
  isActive: boolean
}

export interface DoctorListResponse {
  doctors: DoctorPublic[]
  meta: {
    cursor: string | null
    hasMore: boolean
    total?: number
  }
}
