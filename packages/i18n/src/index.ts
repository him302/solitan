/**
 * @soliton/i18n
 *
 * English + Hindi internationalization foundation. Provides the i18next instance,
 * the locale resources, and language-switching infrastructure. The React bindings
 * (react-i18next provider) and the Devanagari font asset are wired at the app layer.
 *
 * All initial app copy lives here as translation keys — screens must not hardcode
 * user-facing strings.
 */
import i18next, { type i18n as I18nInstance } from 'i18next';

export const SUPPORTED_LOCALES = ['en', 'hi'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

/** Shared translation namespace. Feature keys are added per phase. */
export const resources = {
  en: {
    translation: {
      common: {
        appName: 'Soliton',
        loading: 'Loading…',
        retry: 'Try again',
        language: 'Language',
        save: 'Save',
        cancel: 'Cancel',
        edit: 'Edit',
        delete: 'Delete',
        create: 'Create',
        close: 'Close',
        back: 'Back',
        search: 'Search',
        noResults: 'No results',
        done: 'Done',
        required: 'Required',
        optional: 'Optional',
      },
      home: {
        title: 'Welcome to Soliton',
        subtitle: 'The app foundation is ready.',
      },
      errors: {
        generic: 'Something went wrong.',
        notFound: 'This screen could not be found.',
        networkError: "Couldn't reach the server.",
        loadFailed: 'Failed to load data.',
      },
      // ── Phase 1: Customer discovery ──
      discovery: {
        title: 'Discover',
        searchPlaceholder: 'Search salons or services…',
        nearbyTitle: 'Nearby Salons',
        allSalons: 'All Salons',
        noSalons: 'No salons found',
        noSalonsBody: 'Try a different search or check back later.',
        sortNearest: 'Nearest',
        sortName: 'Name',
        filterCity: 'City',
        open: 'Open',
        closed: 'Closed',
        unconfigured: 'Hours not set',
      },
      // ── Phase 1: Salon detail ──
      salonDetail: {
        services: 'Services',
        noServices: 'No services available',
        noServicesBody: "This salon hasn't added services yet.",
        hours: 'Hours',
        hoursNotConfigured: 'Hours not configured',
        location: 'Location',
        distanceAway: '{{distance}} away',
        distanceUnavailable: 'Distance unavailable',
        today: 'Today',
        closedDay: 'Closed',
        priceLabel: '₹{{price}}',
        durationLabel: '{{minutes}} min',
        durationHoursLabel: '{{hours}} hr {{minutes}} min',
      },
      // ── Phase 1: Settings ──
      settings: {
        title: 'Settings',
        languageLabel: 'Language',
        english: 'English',
        hindi: 'हिन्दी',
        appearance: 'Appearance',
        lightMode: 'Light',
        darkMode: 'Dark',
        about: 'About',
        version: 'Version {{version}}',
        appDescription: "Don't wait at the salon. Arrive when your chair is ready.",
      },
      // ── Phase 1: Salon management (salon-mobile) ──
      salon: {
        login: {
          title: 'Salon Sign In',
          emailPlaceholder: 'Email',
          passwordPlaceholder: 'Password',
          signIn: 'Sign In',
          error: 'Invalid email or password.',
          signingIn: 'Signing in…',
        },
        dashboard: {
          title: 'Dashboard',
          profile: 'Salon Profile',
          services: 'Services',
          hours: 'Operating Hours',
          location: 'Location',
          welcome: 'Welcome, {{name}}',
        },
        profile: {
          title: 'Salon Profile',
          nameLabel: 'Salon Name',
          addressLabel: 'Address',
          cityLabel: 'City',
          latitudeLabel: 'Latitude',
          longitudeLabel: 'Longitude',
          saveSuccess: 'Profile updated.',
          saveError: 'Could not save profile.',
          namePlaceholder: 'Enter salon name',
          addressPlaceholder: 'Enter address',
          cityPlaceholder: 'Enter city',
        },
        services: {
          title: 'Services',
          addService: 'Add Service',
          editService: 'Edit Service',
          nameLabel: 'Service Name',
          priceLabel: 'Price (₹)',
          durationLabel: 'Duration (min)',
          activeLabel: 'Active',
          noServices: 'No services yet',
          noServicesBody: 'Add your first service to get started.',
          saveSuccess: 'Service saved.',
          deleteConfirm: 'Deactivate this service?',
          createSuccess: 'Service created.',
          namePlaceholder: 'e.g. Haircut',
          pricePlaceholder: 'e.g. 200',
          durationPlaceholder: 'e.g. 30',
        },
        hours: {
          title: 'Operating Hours',
          saveSuccess: 'Hours updated.',
          saveError: 'Could not save hours.',
          openLabel: 'Open',
          closedLabel: 'Closed',
          openTimeLabel: 'Opens',
          closeTimeLabel: 'Closes',
          days: {
            sun: 'Sunday',
            mon: 'Monday',
            tue: 'Tuesday',
            wed: 'Wednesday',
            thu: 'Thursday',
            fri: 'Friday',
            sat: 'Saturday',
          },
        },
        signOut: 'Sign Out',
      },
      // ── Weekday names (shared) ──
      weekdays: {
        short: {
          0: 'Sun',
          1: 'Mon',
          2: 'Tue',
          3: 'Wed',
          4: 'Thu',
          5: 'Fri',
          6: 'Sat',
        },
        long: {
          0: 'Sunday',
          1: 'Monday',
          2: 'Tuesday',
          3: 'Wednesday',
          4: 'Thursday',
          5: 'Friday',
          6: 'Saturday',
        },
      },
    },
  },
  hi: {
    translation: {
      common: {
        appName: 'सॉलिटन',
        loading: 'लोड हो रहा है…',
        retry: 'फिर से कोशिश करें',
        language: 'भाषा',
        save: 'सहेजें',
        cancel: 'रद्द करें',
        edit: 'संपादित करें',
        delete: 'हटाएं',
        create: 'बनाएं',
        close: 'बंद करें',
        back: 'वापस',
        search: 'खोजें',
        noResults: 'कोई परिणाम नहीं',
        done: 'हो गया',
        required: 'आवश्यक',
        optional: 'वैकल्पिक',
      },
      home: {
        title: 'सॉलिटन में आपका स्वागत है',
        subtitle: 'ऐप की नींव तैयार है।',
      },
      errors: {
        generic: 'कुछ गलत हो गया।',
        notFound: 'यह स्क्रीन नहीं मिल सकी।',
        networkError: 'सर्वर से कनेक्ट नहीं हो पाया।',
        loadFailed: 'डेटा लोड नहीं हो सका।',
      },
      // ── Phase 1: Customer discovery ──
      discovery: {
        title: 'खोजें',
        searchPlaceholder: 'सैलून या सेवाएं खोजें…',
        nearbyTitle: 'आस-पास के सैलून',
        allSalons: 'सभी सैलून',
        noSalons: 'कोई सैलून नहीं मिला',
        noSalonsBody: 'कोई और खोज करें या बाद में दोबारा देखें।',
        sortNearest: 'निकटतम',
        sortName: 'नाम',
        filterCity: 'शहर',
        open: 'खुला',
        closed: 'बंद',
        unconfigured: 'समय निर्धारित नहीं',
      },
      // ── Phase 1: Salon detail ──
      salonDetail: {
        services: 'सेवाएं',
        noServices: 'कोई सेवा उपलब्ध नहीं',
        noServicesBody: 'इस सैलून ने अभी तक सेवाएं नहीं जोड़ी हैं।',
        hours: 'समय',
        hoursNotConfigured: 'समय कॉन्फ़िगर नहीं किया गया',
        location: 'स्थान',
        distanceAway: '{{distance}} दूर',
        distanceUnavailable: 'दूरी उपलब्ध नहीं',
        today: 'आज',
        closedDay: 'बंद',
        priceLabel: '₹{{price}}',
        durationLabel: '{{minutes}} मिनट',
        durationHoursLabel: '{{hours}} घंटा {{minutes}} मिनट',
      },
      // ── Phase 1: Settings ──
      settings: {
        title: 'सेटिंग्स',
        languageLabel: 'भाषा',
        english: 'English',
        hindi: 'हिन्दी',
        appearance: 'दिखावट',
        lightMode: 'लाइट',
        darkMode: 'डार्क',
        about: 'के बारे में',
        version: 'संस्करण {{version}}',
        appDescription: 'सैलून में इंतज़ार न करें। जब आपकी कुर्सी तैयार हो तब पहुँचें।',
      },
      // ── Phase 1: Salon management (salon-mobile) ──
      salon: {
        login: {
          title: 'सैलून साइन इन',
          emailPlaceholder: 'ईमेल',
          passwordPlaceholder: 'पासवर्ड',
          signIn: 'साइन इन करें',
          error: 'ईमेल या पासवर्ड गलत है।',
          signingIn: 'साइन इन हो रहा है…',
        },
        dashboard: {
          title: 'डैशबोर्ड',
          profile: 'सैलून प्रोफ़ाइल',
          services: 'सेवाएं',
          hours: 'कार्य के घंटे',
          location: 'स्थान',
          welcome: 'स्वागत है, {{name}}',
        },
        profile: {
          title: 'सैलून प्रोफ़ाइल',
          nameLabel: 'सैलून का नाम',
          addressLabel: 'पता',
          cityLabel: 'शहर',
          latitudeLabel: 'अक्षांश',
          longitudeLabel: 'देशांतर',
          saveSuccess: 'प्रोफ़ाइल अपडेट हो गई।',
          saveError: 'प्रोफ़ाइल सहेज नहीं पाए।',
          namePlaceholder: 'सैलून का नाम दर्ज करें',
          addressPlaceholder: 'पता दर्ज करें',
          cityPlaceholder: 'शहर दर्ज करें',
        },
        services: {
          title: 'सेवाएं',
          addService: 'सेवा जोड़ें',
          editService: 'सेवा संपादित करें',
          nameLabel: 'सेवा का नाम',
          priceLabel: 'कीमत (₹)',
          durationLabel: 'अवधि (मिनट)',
          activeLabel: 'सक्रिय',
          noServices: 'अभी कोई सेवा नहीं',
          noServicesBody: 'शुरू करने के लिए अपनी पहली सेवा जोड़ें।',
          saveSuccess: 'सेवा सहेजी गई।',
          deleteConfirm: 'इस सेवा को निष्क्रिय करें?',
          createSuccess: 'सेवा बनाई गई।',
          namePlaceholder: 'जैसे हेयरकट',
          pricePlaceholder: 'जैसे 200',
          durationPlaceholder: 'जैसे 30',
        },
        hours: {
          title: 'कार्य के घंटे',
          saveSuccess: 'समय अपडेट हो गया।',
          saveError: 'समय सहेज नहीं पाए।',
          openLabel: 'खुला',
          closedLabel: 'बंद',
          openTimeLabel: 'खुलने का समय',
          closeTimeLabel: 'बंद होने का समय',
          days: {
            sun: 'रविवार',
            mon: 'सोमवार',
            tue: 'मंगलवार',
            wed: 'बुधवार',
            thu: 'गुरुवार',
            fri: 'शुक्रवार',
            sat: 'शनिवार',
          },
        },
        signOut: 'साइन आउट',
      },
      // ── Weekday names (shared) ──
      weekdays: {
        short: {
          0: 'रवि',
          1: 'सोम',
          2: 'मंगल',
          3: 'बुध',
          4: 'गुरु',
          5: 'शुक्र',
          6: 'शनि',
        },
        long: {
          0: 'रविवार',
          1: 'सोमवार',
          2: 'मंगलवार',
          3: 'बुधवार',
          4: 'गुरुवार',
          5: 'शुक्रवार',
          6: 'शनिवार',
        },
      },
    },
  },
} as const;

export interface InitI18nOptions {
  readonly locale?: SupportedLocale;
}

/** Creates and initializes an isolated i18next instance for an app. */
export function createI18n({ locale = DEFAULT_LOCALE }: InitI18nOptions = {}): I18nInstance {
  const instance = i18next.createInstance();
  void instance.init({
    resources,
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instance;
}

/** Switches the active language on an i18next instance. */
export async function changeLanguage(
  instance: I18nInstance,
  locale: SupportedLocale,
): Promise<void> {
  await instance.changeLanguage(locale);
}
