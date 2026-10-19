export interface Stage {
  /** 'work' gets a full card; 'course' is a smaller milestone on the line. */
  kind: 'work' | 'course';
  /** Start date (YYYY-MM), used to order the line and to place the year markers. */
  start: string;
  dates: string;
  role: string;
  place: string;
  summary?: string;
  tags?: string[];
}

// Oldest first: the line reads left to right and opens scrolled to the present.
export const stages: Stage[] = [
  { kind: 'course', start: '2021-09', dates: '2021 – 2022', role: '#YoProgramo', place: 'Argentina Programa' },
  { kind: 'course', start: '2022-06', dates: '2022 – 2023', role: 'Backend Programming · React.js', place: 'Coderhouse' },
  {
    kind: 'work', start: '2023-07', dates: 'Jul 2023 – Mar 2025', role: 'Backend Developer', place: 'Outside The Box',
    summary: 'Backend services and REST APIs for BooBoo, an international logistics platform, plus QA and automated testing.',
    tags: ['Node.js', 'Express', 'PostgreSQL', 'Cypress'],
  },
  { kind: 'course', start: '2024-03', dates: '2024', role: 'Full-Stack Development (Node.js)', place: 'Codo a Codo' },
  {
    kind: 'work', start: '2024-04', dates: '2024 – 2026', role: 'Co-founder & Full-Stack Developer', place: 'Archivo Web',
    summary: 'A web studio of our own: sites for architecture studios and real estate agencies, from first meeting to deploy.',
    tags: ['Astro', 'WordPress', 'Sanity'],
  },
  {
    kind: 'work', start: '2024-05', dates: '2024 – 2025', role: 'Programming Tutor', place: 'Universidad Nacional de Tres de Febrero',
    summary: 'Practical classes, project support and reviews for students of a programming diploma.',
  },
  {
    kind: 'work', start: '2025-04', dates: 'Apr – Aug 2025', role: 'Frontend Lead', place: 'D10 · freelance',
    summary: 'Built the frontend of an international logistics platform from scratch, as the only frontend developer.',
    tags: ['React', 'TypeScript', 'TanStack Query'],
  },
  {
    kind: 'work', start: '2025-07', dates: 'Jul 2025 – now', role: 'Full-Stack Engineer', place: 'Atena',
    summary: 'Venue Report: rebuilding the platform on Next.js and NestJS, search for 42,000+ venues, SEO and AI features.',
    tags: ['Next.js', 'NestJS', 'MySQL', 'Claude API'],
  },
];
