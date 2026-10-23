import { useState } from 'react';
import { motion } from 'framer-motion';
import { SPRING_FAST } from '../lib/animations';
import {
  Code2,
  GitBranch,
  ExternalLink,
  Copy,
  Check,
  Cpu,
  Layers,
  ShieldCheck,
  Server,
  Sparkles,
  Award,
  Wallet,
  Calendar,
  Users,
  Ticket,
  UserCheck,
  Shield,
  FileText,
  Cake,
  LayoutDashboard
} from 'lucide-react';

function GithubIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

const REPO_URL = 'https://github.com/eepastrana01/ICLEBP.git';

const TECH_FRONTEND = [
  { name: 'React 19', desc: 'Biblioteca UI con Hooks modernos y carga diferida (Suspense)', tag: 'Core UI' },
  { name: 'TypeScript', desc: 'Tipado estricto para alta mantenibilidad y cero errores en runtime', tag: 'Lenguaje' },
  { name: 'Vite 8', desc: 'Entorno de compilación ultrarrápido con Hot Module Replacement (HMR)', tag: 'Bundler' },
  { name: 'Tailwind CSS v4', desc: 'Motor de diseño Glassmorphism con paletas visuales modernas y accesibles', tag: 'Estilos' },
  { name: 'Framer Motion', desc: 'Animaciones spring physics, transiciones de vista y micro-interacciones', tag: 'Animación' },
  { name: 'TanStack React Query', desc: 'Gestión reactiva de caché, sincronización en segundo plano y mutaciones', tag: 'Data Fetching' },
  { name: 'Lucide React', desc: 'Iconografía consistente, vectorial y optimizada para SaaS', tag: 'Iconos' },
  { name: 'jsPDF & AutoTable', desc: 'Generación y exportación de carnets, actas de bautismo y balances', tag: 'Reportes' }
];

const TECH_BACKEND = [
  { name: 'Node.js & Express', desc: 'API RESTful modular con middlewares de seguridad y control de rutas', tag: 'Servidor' },
  { name: 'PostgreSQL / Supabase', desc: 'Base de datos relacional robusta con transacciones ACID y alta disponibilidad', tag: 'Base de Datos' },
  { name: 'Prisma ORM', desc: 'Modelado de esquemas y migraciones consistentes de base de datos', tag: 'ORM' },
  { name: 'Zod Validator', desc: 'Validación estricta de esquemas, tipos y sanitización de datos entrantes', tag: 'Validación' },
  { name: 'JWT & bcryptjs', desc: 'Autenticación mediante tokens de sesión y hashing criptográfico de claves', tag: 'Seguridad' },
  { name: 'CORS & Body Parser', desc: 'Configuración segura de orígenes cruzados y procesamiento de payloads', tag: 'Middleware' }
];

const MODULOS_SISTEMA = [
  { icon: LayoutDashboard, name: 'Inicio & Dashboard', desc: 'Métricas pastorales, finanzas resumidas y accesos rápidos' },
  { icon: Calendar, name: 'Agenda Pastoral', desc: 'Planificación cronológica de cultos, reuniones y eventos' },
  { icon: Wallet, name: 'Finanzas Eclesiales', desc: 'Registro de ingresos, egresos, balance y talonarios' },
  { icon: Users, name: 'Directorio de Miembros', desc: 'Padrón congregacional, estados de membresía y carnets' },
  { icon: FileText, name: 'Fe de Bautismo', desc: 'Registro histórico y generación de certificados oficiales' },
  { icon: UserCheck, name: 'Equipo Pastoral', desc: 'Estructura ministerial, líderes de grupos y áreas de servicio' },
  { icon: Ticket, name: 'Rifas & Pro-Fondos', desc: 'Gestión de talonarios, boletos y recaudación especial' },
  { icon: Cake, name: 'Cumpleañeros', desc: 'Directorio mensual de aniversarios congregacionales' },
  { icon: Layers, name: 'Cartelera Mensual', desc: 'Visualización pública de las actividades del mes' },
  { icon: Shield, name: 'Usuarios & Permisos', desc: 'Matriz RBAC por módulo y restablecimiento de credenciales' },
  { icon: Sparkles, name: 'Perfil de Usuario', desc: 'Administración de credenciales personales y datos de contacto' }
];

export default function AppInfoView() {
  const [copiedRepo, setCopiedRepo] = useState(false);

  const copyRepoToClipboard = () => {
    navigator.clipboard.writeText(REPO_URL);
    setCopiedRepo(true);
    setTimeout(() => setCopiedRepo(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-14 font-sans text-slate-900">

      {/* ========== CABECERA PRINCIPAL ========== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border border-slate-200/80 shadow-2xs mb-2 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              Planner Pastoral ICLEB &bull; v2.4
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Información del Sistema
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Arquitectura de software, stack tecnológico, repositorio y autoría del proyecto.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <GithubIcon className="w-4 h-4" />
            <span>Ver en GitHub</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </div>
      </div>

      {/* ========== TARJETA DE AUTOR & CREADOR ========== */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={SPRING_FAST}
        className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800"
      >
        {/* Luces ambientales de fondo */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            {/* Avatar / Monograma del Autor */}
            <div className="relative shrink-0">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg">
                <div className="w-full h-full bg-slate-900 rounded-[1.4rem] flex items-center justify-center">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-white">EP</span>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-slate-950 rounded-xl shadow">
                <Award className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Autor & Creador Principal</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Edis Pastrana
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 max-w-xl leading-relaxed">
                Diseñador de interfaz, arquitecto de software y desarrollador de toda la plataforma <span className="font-bold text-white">Planner Pastoral ICLEB</span> para la Iglesia Cristiana La Hermosa Betel.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/10">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Plataforma
              </span>
              <span className="text-xs font-extrabold text-white">
                ICLEB Pastoral Suite
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/10">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Versión del Sistema
              </span>
              <span className="text-xs font-extrabold text-emerald-400">
                v2.4 &bull; Edición 2026
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ========== TARJETA DE REPOSITORIO DE CÓDIGO ========== */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={SPRING_FAST}
        className="glass-panel rounded-[2rem] p-6 sm:p-7 space-y-4 border border-white/80"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Repositorio de Código Fuente
              </h3>
              <p className="text-xs font-medium text-slate-500">
                Control de versiones en GitHub con integración continua y despliegue.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Rama activa: main</span>
          </span>
        </div>

        {/* Caja de URL con botón de copiado rápido */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-slate-50/80 rounded-2xl border border-slate-200/80">
          <div className="flex-1 px-3 py-2 font-mono text-xs font-bold text-slate-800 truncate select-all">
            {REPO_URL}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={copyRepoToClipboard}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                copiedRepo
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
              }`}
            >
              {copiedRepo ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar URL</span>
                </>
              )}
            </motion.button>

            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="Abrir en GitHub"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </motion.div>

      {/* ========== TECNOLOGÍAS USADAS (GRID DETALLADO) ========== */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <span>Stack Tecnológico & Dependencias</span>
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Tecnologías de grado de producción seleccionadas para máxima velocidad y seguridad.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Frontend */}
          <div className="glass-panel rounded-[2rem] p-6 space-y-4 border border-white/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Frontend & Experiencia de Usuario</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Single Page Application (SPA)</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200">
                  Cliente
                </span>
              </div>

              <div className="space-y-2.5">
                {TECH_FRONTEND.map(tech => (
                  <div key={tech.name} className="p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-slate-900">{tech.name}</span>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {tech.tag}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 leading-snug">{tech.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Backend & Base de Datos */}
          <div className="glass-panel rounded-[2rem] p-6 space-y-4 border border-white/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Backend, API & Persistencia</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Servicios RESTful y PostgreSQL</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  Servidor
                </span>
              </div>

              <div className="space-y-2.5">
                {TECH_BACKEND.map(tech => (
                  <div key={tech.name} className="p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-slate-900">{tech.name}</span>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {tech.tag}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 leading-snug">{tech.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========== MÓDULOS DE LA PLATAFORMA ========== */}
      <div className="glass-panel rounded-[2rem] p-6 sm:p-7 space-y-5 border border-white/80">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-4.5 h-4.5 text-indigo-600" />
            <span>Módulos Integrados en Planner Pastoral</span>
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Ecosistema completo para administración, planificación de actividades y finanzas eclesiales.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULOS_SISTEMA.map(mod => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.name}
                className="p-3.5 rounded-2xl bg-white border border-slate-200/70 hover:border-slate-300 transition-all shadow-2xs hover:shadow-xs flex items-start gap-3"
              >
                <div className="p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/60 shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 leading-tight">
                    {mod.name}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500 leading-snug mt-0.5">
                    {mod.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========== FOOTER / CERTIFICACIÓN ========== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-white/60 border border-slate-200/80 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Plataforma privada y exclusiva para la congregación <strong>ICLEB</strong>.</span>
        </div>
        <div className="text-slate-400 text-[11px]">
          Desarrollado con dedicación por <strong className="text-slate-700">Edis Pastrana</strong>
        </div>
      </div>

    </div>
  );
}
