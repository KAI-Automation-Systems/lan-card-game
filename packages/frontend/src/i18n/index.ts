import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import nl from './nl.json'
import de from './de.json'

i18n.use(initReactI18next).init({
  resources: {
    nl: { translation: nl },
    de: { translation: de },
  },
  lng: 'nl',
  fallbackLng: 'nl',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
