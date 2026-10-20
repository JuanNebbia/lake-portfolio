// Two languages: English at `/` (the default) and Spanish at `/es/`.
export const languages = { en: 'English', es: 'Español' } as const;
export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'en';

/** A piece of text in every language. */
export type Text = Record<Lang, string>;
export const tr = (text: Text | string, lang: Lang) => (typeof text === 'string' ? text : text[lang]);

/** Home page of each language. */
export const homePath = (lang: Lang) => (lang === defaultLang ? '/' : `/${lang}/`);

export const ui = {
  en: {
    'meta.title': 'Juan Nebbia',
    'meta.description': 'Full-stack engineer building web products end to end, from backend architecture to the interface.',
    'lang.label': 'Language',
    'hero.label': 'Juan Nebbia, Full-Stack Engineer',
    'hero.time': 'Time of day',
    'about.label': '// about',
    'projects.label': '// projects',
    'projects.title': 'Some of my work',
    'projects.internal': '// internal platform',
    'projects.homePage': 'home page',
    'experience.label': '// experience',
    'experience.title': 'The road so far',
    'experience.aria': (from: string) => `Timeline from ${from} to today. Drag or use the arrow keys to move through it.`,
    'experience.now': 'now',
    'experience.hint': '← drag to go back in time',
    'contact.label': '// contact',
    'contact.title': "Let's talk",
    'contact.lead': 'Always open to hear about new challenges. The fastest way to reach me is by email.',
    'contact.copy': (what: string) => `Copy ${what}`,
    'contact.copied': (what: string) => `Copied ${what}`,
    'contact.email': 'Write an email',
    'contact.linkedin': 'Open LinkedIn profile',
    'contact.github': 'Open GitHub profile',
  },
  es: {
    'meta.title': 'Juan Nebbia',
    'meta.description': 'Desarrollador full-stack que construye productos web de punta a punta, desde la arquitectura backend hasta la interfaz.',
    'lang.label': 'Idioma',
    'hero.label': 'Juan Nebbia, Desarrollador Full-Stack',
    'hero.time': 'Hora del día',
    'about.label': '// sobre mí',
    'projects.label': '// proyectos',
    'projects.title': 'Algunos de mis trabajos',
    'projects.internal': '// plataforma interna',
    'projects.homePage': 'página de inicio',
    'experience.label': '// experiencia',
    'experience.title': 'El camino hasta acá',
    'experience.aria': (from: string) => `Línea de tiempo desde ${from} hasta hoy. Arrastrá o usá las flechas para recorrerla.`,
    'experience.now': 'hoy',
    'experience.hint': '← arrastrá para volver en el tiempo',
    'contact.label': '// contacto',
    'contact.title': 'Hablemos',
    'contact.lead': 'Siempre abierto a escuchar nuevos desafíos. La forma más rápida de contactarme es por email.',
    'contact.copy': (what: string) => `Copiar ${what}`,
    'contact.copied': (what: string) => `Copiado: ${what}`,
    'contact.email': 'Escribir un email',
    'contact.linkedin': 'Abrir perfil de LinkedIn',
    'contact.github': 'Abrir perfil de GitHub',
  },
} as const;

export const useT = (lang: Lang) => ui[lang];

/** The language of a page, from its URL. */
export const langFromUrl = (url: URL): Lang => (url.pathname.split('/')[1] === 'es' ? 'es' : defaultLang);
