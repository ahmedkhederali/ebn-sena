import 'dotenv/config'
import mongoose from 'mongoose'
import { ServiceModel } from '../features/doctors/doctors.schema'
import { ContentBlockModel } from '../features/content/content.service'

const SPECIALTIES = [
  { nameAr: 'قلب وأوعية دموية', nameEn: 'Cardiology', icon: '🫀', sortOrder: 1 },
  { nameAr: 'طب أطفال', nameEn: 'Pediatrics', icon: '👶', sortOrder: 2 },
  { nameAr: 'جلدية', nameEn: 'Dermatology', icon: '🩺', sortOrder: 3 },
  { nameAr: 'عظام ومفاصل', nameEn: 'Orthopedics', icon: '🦴', sortOrder: 4 },
  { nameAr: 'أعصاب', nameEn: 'Neurology', icon: '🧠', sortOrder: 5 },
  { nameAr: 'طب عام', nameEn: 'General Practice', icon: '🏥', sortOrder: 6 },
]

const CONTENT_BLOCKS = [
  { key: 'hero.title', ar: 'ابن سينا للرعاية الطبية', en: 'Ibn Sina Medical Care' },
  {
    key: 'hero.subtitle',
    ar: 'رعاية صحية متكاملة بأيدي خبراء متخصصين',
    en: 'Comprehensive healthcare by specialized experts',
  },
  { key: 'contact.phone', ar: '920000000', en: '920000000' },
  { key: 'contact.email', ar: 'info@ibnsina.sa', en: 'info@ibnsina.sa' },
  {
    key: 'hero.cta',
    ar: 'احجز موعدك الآن',
    en: 'Book Your Appointment Now',
  },
]

async function seed() {
  const uri = process.env['MONGODB_URI']
  if (!uri) {
    console.error('MONGODB_URI not set')
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log('Connected to MongoDB')

  // Upsert specialties
  let createdCount = 0
  for (const specialty of SPECIALTIES) {
    const result = await ServiceModel.findOneAndUpdate(
      { nameEn: specialty.nameEn },
      { $setOnInsert: { ...specialty, descriptionAr: '', descriptionEn: '', isActive: true } },
      { upsert: true, new: true },
    )
    if (result) createdCount++
  }
  console.log(`Specialties: ${createdCount} upserted`)

  // Upsert content blocks
  for (const block of CONTENT_BLOCKS) {
    await ContentBlockModel.findOneAndUpdate(
      { key: block.key },
      { $setOnInsert: block },
      { upsert: true },
    )
  }
  console.log(`Content blocks: ${CONTENT_BLOCKS.length} upserted`)

  await mongoose.disconnect()
  console.log('Seed complete')
}

seed().catch((err: unknown) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
