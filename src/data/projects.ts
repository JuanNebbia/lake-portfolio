import type { ImageMetadata } from 'astro';
import type { Text } from '../i18n/ui';
import venueReport from '../assets/projects/venue-report.png';
import wip from '../assets/projects/wip.png';
import hdh from '../assets/projects/hdh.png';
import esterasPerrote from '../assets/projects/esteras-perrote.png';
import d10 from '../assets/projects/d10.png';
import booboo from '../assets/projects/booboo.webp';

export interface Project {
  name: string;
  years: Text | string;
  /** My role, and who I did it through (company, studio or freelance). */
  role: Text;
  via: Text | string;
  description: Text;
  stack: string[];
  url?: string;
  /** Screenshot of the public site. Internal platforms have none and show a placeholder instead. */
  image?: ImageMetadata;
  /** Which part of the screenshot to keep when the card crops it (CSS object-position). Defaults to the top. */
  focus?: string;
}

const fullStackDev: Text = { en: 'Full-stack developer', es: 'Desarrollador full-stack' };

export const projects: Project[] = [
  {
    name: 'Venue Report',
    years: { en: '2025 – now', es: '2025 – hoy' },
    role: { en: 'Full-stack engineer', es: 'Desarrollador full-stack' },
    via: 'Atena',
    description: {
      en: 'A global platform to find places to celebrate and gather, mixing editorial content with a curated directory of venues and hotels. I took part in its full rebuild: we kept the legacy Symfony and Vue platform running while building the new one on Next.js and NestJS, normalizing 170,000+ old venue records and bringing in the new designs. I also work on search and discovery for 42,000+ venues in 120+ countries, SEO and AI-powered content enrichment.',
      es: 'Una plataforma global para encontrar lugares donde celebrar y reunirse, que combina contenido editorial con un directorio curado de venues y hoteles. Formé parte de su reconstrucción completa: mantuvimos funcionando la plataforma anterior en Symfony y Vue mientras construíamos la nueva con Next.js y NestJS, normalizando más de 170.000 registros de venues e implementando los nuevos diseños. También trabajo en la búsqueda de más de 42.000 venues en más de 120 países, el SEO y el enriquecimiento de contenido con IA.',
    },
    stack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'NestJS', 'TypeORM', 'MySQL', 'Claude API', 'Tavily'],
    url: 'https://venuereport.com',
    image: venueReport,
  },
  {
    name: 'D10',
    years: { en: 'Apr – Aug 2025', es: 'Abr – Ago 2025' },
    role: { en: 'Frontend lead', es: 'Líder frontend' },
    via: { en: 'Freelance', es: 'Independiente' },
    description: {
      en: 'A management platform for international logistics and transport: shipment files, consignments, offers and tariffs, with route tracking, documents and profitability for each file. As the only frontend developer, I built the app from scratch: the interface, its architecture and the integrations with the backend.',
      es: 'Una plataforma de gestión de logística y transporte internacional: expedientes, partidas, ofertas y tarifas, con seguimiento de rutas, documentos y rentabilidad por expediente. Como único desarrollador frontend, construí la aplicación desde cero: la interfaz, su arquitectura y las integraciones con el backend.',
    },
    stack: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'shadcn/ui', 'TanStack Query', 'React Hook Form', 'Zod'],
    url: 'https://www.d10logistics.com',
    image: d10,
  },
  {
    name: 'BooBoo',
    years: '2023 – 2025',
    role: { en: 'Backend & QA', es: 'Backend y QA' },
    via: 'Outside The Box',
    description: {
      en: 'A platform for an international logistics and transport company operating mainly in Spain. I built and maintained backend services and REST APIs, refactored them for performance, and owned test cases and automated testing.',
      es: 'Una plataforma para una empresa internacional de logística y transporte que opera principalmente en España. Desarrollé y mantuve servicios backend y APIs REST, los refactoricé para mejorar su rendimiento y me encargué de los casos de prueba y los tests automatizados.',
    },
    stack: ['Node.js', 'Express', 'PostgreSQL', 'Angular', 'Cypress'],
    image: booboo,
    focus: 'right center',   // a wide landing: keep the dashboard mock-up
  },
  {
    name: 'WIP',
    years: '2026',
    role: fullStackDev,
    via: 'Archivo Web',
    description: {
      en: 'The site of an architecture studio that is also a cultural space: projects, an events agenda, a café and a shop, with all the content managed from WordPress.',
      es: 'El sitio de un estudio de arquitectura que también es un espacio cultural: proyectos, agenda de eventos, café y tienda, con todo el contenido gestionado desde WordPress.',
    },
    stack: ['Astro', 'WordPress', 'React', 'React Hook Form', 'Tailwind CSS'],
    url: 'https://www.wip.ar',
    image: wip,
  },
  {
    name: 'HDH Bienes Raíces',
    years: '2026',
    role: fullStackDev,
    via: 'Archivo Web',
    description: {
      en: 'A real estate agency site with property search and listings synced from Tokko, the system the agency uses to manage its properties.',
      es: 'El sitio de una inmobiliaria, con buscador de propiedades y fichas sincronizadas desde Tokko, el sistema con el que la inmobiliaria gestiona sus propiedades.',
    },
    stack: ['Astro', 'Tokko API', 'React', 'Tailwind CSS'],
    url: 'https://hdhbienesraices.com.ar',
    image: hdh,
  },
  {
    name: 'Esteras Perrote',
    years: '2025',
    role: fullStackDev,
    via: 'Archivo Web',
    description: {
      en: 'The portfolio site of an architecture studio, built as a custom WordPress theme so the studio can publish its own projects.',
      es: 'El sitio portfolio de un estudio de arquitectura, hecho como un tema de WordPress a medida para que el estudio publique sus propios proyectos.',
    },
    stack: ['WordPress', 'PHP'],
    url: 'https://esterasperrote.com',
    image: esterasPerrote,
  },
];
