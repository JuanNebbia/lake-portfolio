import type { Text } from '../i18n/ui';

export interface Stage {
  /** 'work' gets a full card; 'course' is a smaller milestone on the line. */
  kind: 'work' | 'course';
  /** Start date (YYYY-MM), used to order the line and for the year shown in the heading. */
  start: string;
  dates: Text | string;
  role: Text | string;
  place: Text | string;
  summary?: Text;
  tags?: string[];
}

// Oldest first: the line reads left to right and opens scrolled to the present.
export const stages: Stage[] = [
  { kind: 'course', start: '2021-09', dates: '2021 – 2022', role: '#YoProgramo', place: 'Argentina Programa' },
  {
    kind: 'course', start: '2022-06', dates: '2022 – 2023', place: 'Coderhouse',
    role: { en: 'Backend Programming · React.js', es: 'Programación Backend · React.js' },
  },
  {
    kind: 'work', start: '2023-07', dates: 'Jul 2023 – Mar 2025', place: 'Outside The Box',
    role: { en: 'Backend Developer', es: 'Desarrollador Backend' },
    summary: {
      en: 'Backend services and REST APIs for BooBoo, an international logistics platform, plus QA and automated testing.',
      es: 'Servicios backend y APIs REST para BooBoo, una plataforma de logística internacional, además de QA y tests automatizados.',
    },
    tags: ['Node.js', 'Express', 'PostgreSQL', 'Cypress'],
  },
  {
    kind: 'course', start: '2024-03', dates: '2024', place: 'Codo a Codo',
    role: { en: 'Full-Stack Development (Node.js)', es: 'Desarrollo Full-Stack (Node.js)' },
  },
  {
    kind: 'work', start: '2024-04', dates: '2024 – 2026', place: 'Archivo Web',
    role: { en: 'Co-founder & Full-Stack Developer', es: 'Cofundador y Desarrollador Full-Stack' },
    summary: {
      en: 'A web studio of our own: sites for architecture studios and real estate agencies, from first meeting to deploy.',
      es: 'Un estudio web propio: sitios para estudios de arquitectura e inmobiliarias, desde la primera reunión hasta el deploy.',
    },
    tags: ['Astro', 'WordPress', 'Sanity'],
  },
  {
    kind: 'work', start: '2024-05', dates: '2024 – 2025', place: 'Universidad Nacional de Tres de Febrero',
    role: { en: 'Programming Tutor', es: 'Tutor de Programación' },
    summary: {
      en: 'Practical classes, project support and reviews for students of a programming diploma.',
      es: 'Clases prácticas, acompañamiento y corrección de proyectos para estudiantes de una diplomatura en programación.',
    },
  },
  {
    kind: 'work', start: '2025-04', dates: { en: 'Apr – Aug 2025', es: 'Abr – Ago 2025' },
    place: { en: 'D10 · freelance', es: 'D10 · independiente' },
    role: { en: 'Frontend Lead', es: 'Líder Frontend' },
    summary: {
      en: 'Built the frontend of an international logistics platform from scratch, as the only frontend developer.',
      es: 'Construí desde cero el frontend de una plataforma de logística internacional, como único desarrollador frontend.',
    },
    tags: ['React', 'TypeScript', 'TanStack Query'],
  },
  {
    kind: 'work', start: '2025-07', dates: { en: 'Jul 2025 – now', es: 'Jul 2025 – hoy' }, place: 'Atena',
    role: { en: 'Full-Stack Engineer', es: 'Desarrollador Full-Stack' },
    summary: {
      en: 'Venue Report: rebuilding the platform on Next.js and NestJS, search for 42,000+ venues, SEO and AI features.',
      es: 'Venue Report: reconstrucción de la plataforma con Next.js y NestJS, búsqueda de más de 42.000 venues, SEO y funcionalidades con IA.',
    },
    tags: ['Next.js', 'NestJS', 'MySQL', 'Claude API'],
  },
];
