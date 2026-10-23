import { useState } from 'react';
import { motion } from 'framer-motion';
import { SPRING_FAST } from '../lib/animations';
import {
  GitBranch,
  ExternalLink,
  Copy,
  Check,
  Code2,
  Server,
  Layers,
  ShieldCheck,
  Calendar,
  Wallet,
  Users,
  Ticket,
  UserCheck,
  Shield,
  FileText,
  Cake,
  LayoutDashboard
} from 'lucide-react';

const REPO_URL = 'https://github.com/eepastrana01/ICLEBP.git';
const GITHUB_PROFILE = 'https://github.com/eepastrana01';

function GithubIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

const STACK_FRONTEND = [
  { name: 'React 19', tag: 'UI Library' },
  { name: 'TypeScript', tag: 'Lenguaje' },
  { name: 'Vite 8', tag: 'Bundler' },
  { name: 'Tailwind CSS v4', tag: 'Estilos' },
  { name: 'Framer Motion', tag: 'Animaciones' },
  { name: 'TanStack Query', tag: 'Estado & Caché' },
  { name: 'Lucide Icons', tag: 'Iconografía' },
  { name: 'jsPDF / AutoTable', tag: 'Exportación PDF' }
];

const STACK_BACKEND = [
  { name: 'Node.js & Express', tag: 'Servidor REST' },
  { name: 'PostgreSQL / Supabase', tag: 'Base de Datos' },
  { name: 'Prisma ORM', tag: 'Modelado & Schema' },
  { name: 'Zod Validator', tag: 'Validación de Tipos' },
  { name: 'JWT & bcryptjs', tag: 'Autenticación' },
  { name: 'Axios', tag: 'Cliente HTTP' }
];

const MODULOS_SISTEMA = [
  { icon: LayoutDashboard, name: 'Inicio', desc: 'Resumen ejecutivo, cartelera y accesos rápidos' },
  { icon: Calendar, name: 'Agenda Pastoral', desc: 'Planificación cronológica y calendario mensual' },
  { icon: Wallet, name: 'Finanzas', desc: 'Ingresos, egresos, balance y talonarios' },
  { icon: Users, name: 'Miembros', desc: 'Directorio congregacional y carnets' },
  { icon: FileText, name: 'Fe de Bautismo', desc: 'Registro y certificados oficiales en PDF' },
  { icon: UserCheck, name: 'Equipo Pastoral', desc: 'Estructura ministerial y liderazgo' },
  { icon: Ticket, name: 'Rifas & Eventos', desc: 'Control de talonarios y actividades pro-fondos' },
  { icon: Cake, name: 'Cumpleañeros', desc: 'Directorio de aniversarios del mes' },
  { icon: Layers, name: 'Cartelera Mensual', desc: 'Actividades públicas congregacionales' },
  { icon: Shield, name: 'Usuarios', desc: 'Matriz de permisos por módulo y accesos' },
  { icon: ShieldCheck, name: 'Mi Perfil', desc: 'Seguridad de cuenta y datos de contacto' }
];

export default function AppInfoView() {
  const [copiedRepo, setCopiedRepo] = useState(false);

  const copyRepoToClipboard = () => {
    navigator.clipboard.writeText(REPO_URL);
    setCopiedRepo(true);
    setTimeout(() => setCopiedRepo(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-sans text-slate-900">

      {/* ========== ENCABEZADO LIMPIO & ORGÁNICO ========== */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 p-2.5 shadow-2xs flex items-center justify-center shrink-0">
            <img src="/LogoICLEB.svg" alt="Logo ICLEB" className="h-full w-auto object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Planner Pastoral
              </h1>
              <span className="text-[11px] font-extrabold text-slate-700 bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-lg">
                v2.4
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Plataforma de gestión eclesial &bull; Iglesia Cristiana La Hermosa Betel (ICLEB)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
          >
            <GithubIcon className="w-4 h-4" />
            <span>GitHub</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>
        </div>
      </div>

      {/* ========== SECCIÓN DE AUTOR (EDIS PASTRANA) ========== */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={SPRING_FAST}
        className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
              EP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">
                  Edis Pastrana
                </h2>
                <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Desarrollador
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Autor y desarrollador del sistema Planner Pastoral ICLEB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <a
              href={GITHUB_PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span>@eepastrana01</span>
            </a>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal pt-1 border-t border-slate-100">
          Diseñado y programado para organizar las actividades pastorales, el directorio de membresía, la emisión de actas de bautismo y la transparencia financiera de la congregación.
        </p>
      </motion.div>

      {/* ========== REPOSITORIO & CÓDIGO ========== */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Repositorio del Proyecto
            </h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Rama: main</span>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="flex-1 px-3 py-2 font-mono text-xs font-bold text-slate-800 truncate select-all">
            {REPO_URL}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={copyRepoToClipboard}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
      </div>

      {/* ========== TECNOLOGÍAS USADAS (CHIPS LIMPIOS) ========== */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-5">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
            Tecnologías Utilizadas
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Herramientas y librerías que componen la arquitectura del sistema.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
          {/* Frontend */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
              <Code2 className="w-4 h-4 text-indigo-600" />
              <span>Frontend (Cliente)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {STACK_FRONTEND.map(tech => (
                <div
                  key={tech.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs"
                >
                  <span className="font-extrabold text-slate-800">{tech.name}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">&bull; {tech.tag}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Backend */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
              <Server className="w-4 h-4 text-emerald-600" />
              <span>Backend & Persistencia</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {STACK_BACKEND.map(tech => (
                <div
                  key={tech.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs"
                >
                  <span className="font-extrabold text-slate-800">{tech.name}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">&bull; {tech.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========== MÓDULOS DE LA PLATAFORMA ========== */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
            Módulos Integrados
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Ecosistema de 11 módulos activos para la labor ministerial.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULOS_SISTEMA.map(mod => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.name}
                className="p-3.5 rounded-2xl bg-slate-50/60 border border-slate-200/70 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-start gap-3"
              >
                <div className="p-2 rounded-xl bg-white text-slate-700 border border-slate-200 shadow-2xs shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                    {mod.name}
                  </h4>
                  <p className="text-[11px] font-medium text-slate-500 leading-snug mt-0.5">
                    {mod.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========== PIE DE PÁGINA SIMPLE ========== */}
      <div className="text-center py-2 text-xs font-medium text-slate-400">
        Planner Pastoral ICLEB &bull; Desarrollado por <strong className="text-slate-700">Edis Pastrana</strong>
      </div>

    </div>
  );
}
