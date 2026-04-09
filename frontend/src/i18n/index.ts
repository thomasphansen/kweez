import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import da from './locales/da.json'
import de from './locales/de.json'
import en from './locales/en.json'
import pt from './locales/pt.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      da: { translation: da },
      de: { translation: de },
      en: { translation: en },
      pt: { translation: pt },
    },
    fallbackLng: 'en',
    supportedLngs: ['da', 'de', 'en', 'pt'],
    detection: {
      // Order of detection methods:
      // 1. querystring - check for ?lng=da in URL
      // 2. localStorage - check if user previously selected a language
      // 3. navigator - check browser/device language settings
      order: ['querystring', 'localStorage', 'navigator'],
      // Cache user's choice in localStorage
      caches: ['localStorage'],
      // Key to use in localStorage
      lookupLocalStorage: 'language',
      // Query parameter name (e.g., ?lng=da)
      lookupQuerystring: 'lng',
    },
    interpolation: {
      escapeValue: false,
    },
  })

// Save language preference when it changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng)
})

export default i18n
