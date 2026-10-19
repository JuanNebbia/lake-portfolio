import type { ImageMetadata } from 'astro';
import venueReport from '../assets/projects/venue-report.png';
import wip from '../assets/projects/wip.png';
import hdh from '../assets/projects/hdh.png';
import esterasPerrote from '../assets/projects/esteras-perrote.png';
import d10 from '../assets/projects/d10.png';
import booboo from '../assets/projects/booboo.webp';

export interface Project {
  name: string;
  years: string;
  /** My role, and who I did it through (company, studio or freelance). */
  role: string;
  via: string;
  description: string;
  stack: string[];
  url?: string;
  /** Screenshot of the public site. Internal platforms have none and show a placeholder instead. */
  image?: ImageMetadata;
  /** Which part of the screenshot to keep when the card crops it (CSS object-position). Defaults to the top. */
  focus?: string;
}

export const projects: Project[] = [
  {
    name: 'Venue Report',
    years: '2025 – now',
    role: 'Full-stack engineer',
    via: 'Atena',
    description:
      'A global platform to find places to celebrate and gather, mixing editorial content with a curated directory of venues and hotels. I took part in its full rebuild: we kept the legacy Symfony and Vue platform running while building the new one on Next.js and NestJS, normalizing 170,000+ old venue records and bringing in the new designs. I also work on search and discovery for 42,000+ venues in 120+ countries, SEO and AI-powered content enrichment.',
    stack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'NestJS', 'TypeORM', 'MySQL', 'Claude API', 'Tavily'],
    url: 'https://venuereport.com',
    image: venueReport,
  },
  {
    name: 'D10',
    years: 'Apr – Aug 2025',
    role: 'Frontend lead',
    via: 'Freelance',
    description:
      'A management platform for international logistics and transport: shipment files, consignments, offers and tariffs, with route tracking, documents and profitability for each file. As the only frontend developer, I built the app from scratch: the interface, its architecture and the integrations with the backend.',
    stack: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'shadcn/ui', 'TanStack Query', 'React Hook Form', 'Zod'],
    url: 'https://www.d10logistics.com',
    image: d10,
  },
  {
    name: 'BooBoo',
    years: '2023 – 2025',
    role: 'Backend & QA',
    via: 'Outside The Box',
    description:
      'A platform for an international logistics and transport company operating mainly in Spain. I built and maintained backend services and REST APIs, refactored them for performance, and owned test cases and automated testing.',
    stack: ['Node.js', 'Express', 'PostgreSQL', 'Angular', 'Cypress'],
    image: booboo,
    focus: 'right center',   // a wide landing: keep the dashboard mock-up
  },
  {
    name: 'WIP',
    years: '2026',
    role: 'Full-stack developer',
    via: 'Archivo Web',
    description:
      'The site of an architecture studio that is also a cultural space: projects, an events agenda, a café and a shop, with all the content managed from WordPress.',
    stack: ['Astro', 'WordPress'],
    url: 'https://www.wip.ar',
    image: wip,
  },
  {
    name: 'HDH Bienes Raíces',
    years: '2026',
    role: 'Full-stack developer',
    via: 'Archivo Web',
    description:
      'A real estate agency site with property search and listings synced from Tokko, the system the agency uses to manage its properties.',
    stack: ['Astro', 'Tokko API'],
    url: 'https://hdhbienesraices.com.ar',
    image: hdh,
  },
  {
    name: 'Esteras Perrote',
    years: '2025',
    role: 'Full-stack developer',
    via: 'Archivo Web',
    description: 'The portfolio site of an architecture studio, built as a custom WordPress theme so the studio can publish its own projects.',
    stack: ['WordPress', 'PHP'],
    url: 'https://esterasperrote.com',
    image: esterasPerrote,
  },
];
