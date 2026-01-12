import { useState, useEffect, useCallback } from 'react';

type TranslationData = Record<string, any>;

const SUPPORTED_LANGUAGES = ['fr', 'en', 'ar', 'zh', 'de', 'es'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
  zh: '中文',
  de: 'Deutsch',
  es: 'Español'
};

const translationCache: Record<string, TranslationData> = {};

export const useTranslation = () => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('language');
    if (saved && SUPPORTED_LANGUAGES.includes(saved as SupportedLanguage)) {
      return saved as SupportedLanguage;
    }
    const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
    return SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : 'fr';
  });

  const [translations, setTranslations] = useState<TranslationData>({});
  const [loading, setLoading] = useState(true);

  const loadTranslations = useCallback(async (lang: SupportedLanguage) => {
    if (translationCache[lang]) {
      setTranslations(translationCache[lang]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/locales/${lang}.json`);
      if (!response.ok) throw new Error('Failed to load translations');
      const data = await response.json();
      translationCache[lang] = data;
      setTranslations(data);
    } catch (error) {
      console.error(`Failed to load ${lang} translations:`, error);
      if (lang !== 'fr') {
        await loadTranslations('fr');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTranslations(language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language, loadTranslations]);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  }, []);

  const t = useCallback((key: string, fallback?: string): string => {
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }

    return typeof value === 'string' ? value : fallback || key;
  }, [translations]);

  return {
    t,
    language,
    setLanguage,
    loading,
    languages: SUPPORTED_LANGUAGES,
    languageNames: LANGUAGE_NAMES,
    isRTL: language === 'ar'
  };
};

export default useTranslation;
