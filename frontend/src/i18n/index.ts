import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Arabic translations
import arCommon from './ar/common.json'
import arAuth from './ar/auth.json'
import arAppointments from './ar/appointments.json'
import arPortal from './ar/portal.json'
import arPublic from './ar/public.json'
import arPatient from './ar/patient.json'
import arAdmin from './ar/admin.json'
import arDoctor from './ar/doctor.json'

// English translations
import enCommon from './en/common.json'
import enAuth from './en/auth.json'
import enAppointments from './en/appointments.json'
import enPortal from './en/portal.json'
import enPublic from './en/public.json'
import enPatient from './en/patient.json'
import enAdmin from './en/admin.json'
import enDoctor from './en/doctor.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: {
        common: arCommon,
        auth: arAuth,
        appointments: arAppointments,
        portal: arPortal,
        public: arPublic,
        patient: arPatient,
        admin: arAdmin,
        doctor: arDoctor,
      },
      en: {
        common: enCommon,
        auth: enAuth,
        appointments: enAppointments,
        portal: enPortal,
        public: enPublic,
        patient: enPatient,
        admin: enAdmin,
        doctor: enDoctor,
      },
    },
    fallbackLng: 'ar',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
