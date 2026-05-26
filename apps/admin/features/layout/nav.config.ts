import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  BarChart3,
  Boxes,
  CreditCard,
  FileText,
  Gift,
  History,
  KeyRound,
  LayoutDashboard,
  Package,
  ScanLine,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tags,
  Ticket,
  Trophy,
  Users,
  UserSquare2,
} from "lucide-react";
import type { Role } from "@/types/api";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Niveles de acceso legacy permitidos. Si no se indica, no se filtra por nivel. */
  roles?: Role[];
  /**
   * Claves de permisos requeridas. El usuario debe tener AL MENOS UNA.
   * SUPER_ADMIN siempre pasa.
   */
  anyPermission?: string[];
  description?: string;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  roles?: Role[];
  anyPermission?: string[];
  items: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export interface NavSection {
  title: string;
  entries: NavEntry[];
}

export const isNavGroup = (entry: NavEntry): entry is NavGroup =>
  "items" in entry;

export const navSections: NavSection[] = [
  {
    title: "Resumen",
    entries: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Comercial",
    entries: [
      {
        label: "Ecommerce",
        href: "/ecommerce",
        icon: ShoppingBag,
      },
      {
        label: "Productos",
        href: "/productos",
        icon: Package,
        anyPermission: ["products.view"],
      },
      {
        label: "Categorías",
        href: "/categorias",
        icon: Tags,
        anyPermission: ["products.view"],
      },
      {
        label: "Pedidos",
        href: "/pedidos",
        icon: ShoppingBag,
      },
      {
        label: "POS",
        icon: ScanLine,
        // Solo visible para usuarios con permisos administrativos (cajeros
        // puros usan el shell standalone /pos directamente sin pasar por el
        // sidebar admin).
        anyPermission: ["reports.view"],
        items: [
          {
            label: "Monitoreo POS",
            href: "/monitoreo-pos",
            icon: BarChart3,
            anyPermission: ["reports.view"],
          },
          {
            label: "Abrir terminal",
            href: "/pos",
            icon: ScanLine,
            anyPermission: ["pos.access"],
          },
        ],
      },
    ],
  },
  {
    title: "Inventario",
    entries: [
      {
        label: "Inventarios",
        href: "/inventarios",
        icon: Boxes,
        anyPermission: ["inventory.view"],
      },
      {
        label: "Movimientos",
        href: "/movimientos",
        icon: History,
        anyPermission: ["inventory.view"],
      },
      {
        label: "Transferencias",
        href: "/transferencias",
        icon: ArrowRightLeft,
        anyPermission: ["inventory.transfer"],
      },
      {
        label: "Ubicaciones",
        href: "/ubicaciones",
        icon: Store,
      },
    ],
  },
  {
    title: "Sorteos",
    entries: [
      {
        label: "Sorteos",
        icon: Sparkles,
        anyPermission: ["raffles.view"],
        items: [
          { label: "Sorteos", href: "/sorteos", icon: Sparkles },
          { label: "Participaciones", href: "/sorteos/participaciones", icon: Ticket },
          { label: "Ganadores", href: "/sorteos/ganadores", icon: Trophy },
        ],
      },
    ],
  },
  {
    title: "Púrpura Club",
    entries: [
      {
        label: "Púrpura Club",
        icon: Gift,
        items: [
          { label: "Membresías", href: "/membresias", icon: Gift },
          { label: "Referidos", href: "/referidos", icon: Users },
          { label: "Beneficios", href: "/beneficios", icon: Sparkles },
        ],
      },
    ],
  },
  {
    title: "Operación",
    entries: [
      {
        label: "Clientes",
        href: "/clientes",
        icon: UserSquare2,
        anyPermission: ["customers.view"],
      },
      {
        label: "Pagos",
        href: "/pagos",
        icon: CreditCard,
      },
    ],
  },
  {
    title: "Administración",
    entries: [
      {
        label: "Acceso",
        icon: ShieldCheck,
        anyPermission: ["users.view", "rbac.manage"],
        items: [
          {
            label: "Usuarios",
            href: "/usuarios",
            icon: Users,
            anyPermission: ["users.view"],
          },
          {
            label: "Roles",
            href: "/roles",
            icon: ShieldCheck,
            anyPermission: ["rbac.manage"],
          },
          {
            label: "Permisos",
            href: "/permisos",
            icon: KeyRound,
            anyPermission: ["rbac.manage"],
          },
        ],
      },
      {
        label: "SUNAT",
        href: "/sunat",
        icon: FileText,
      },
      {
        label: "Reportes",
        href: "/reportes",
        icon: BarChart3,
        anyPermission: ["reports.view"],
      },
      {
        label: "Configuración",
        href: "/configuracion",
        icon: Settings,
      },
    ],
  },
];
