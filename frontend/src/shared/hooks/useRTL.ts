import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export function useRTL() {
  const { i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = i18n.language
  }, [isRTL, i18n.language])

  const toggleLanguage = () => {
    i18n.changeLanguage(isRTL ? 'en' : 'ar')
  }

  return { isRTL, lang: i18n.language, toggleLanguage }
}
