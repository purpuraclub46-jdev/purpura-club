import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  BarChart3,
  Boxes,
  CreditCard,
  FileText,
  Gift,
  History,
  LayoutDashboard,
  Package,
  ScanLine,
  Settings,
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
  roles?: Role[];
  description?: string;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  roles?: Role[];
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
      },
      {
        label: "Categorías",
        href: "/categorias",
        icon: Tags,
      },
      {
        label: "Pedidos",
        href: "/pedidos",
        icon: ShoppingBag,
      },
      {
        label: "POS",
        href: "/pos",
        icon: ScanLine,
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
      },
      {
        label: "Movimientos",
        href: "/movimientos",
        icon: History,
      },
      {
        label: "Transferencias",
        href: "/transferencias",
        icon: ArrowRightLeft,
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
      },
      {
        label: "Pagos",
        href: "/pagos",
        icon: CreditCard,
      },
      {
        label: "Usuarios",
        href: "/usuarios",
        icon: Users,
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
  {
    title: "Administración",
    entries: [
      {
        label: "SUNAT",
        href: "/sunat",
        icon: FileText,
      },
      {
        label: "Reportes",
        href: "/reportes",
        icon: BarChart3,
      },
      {
        label: "Configuración",
        href: "/configuracion",
        icon: Settings,
      },
    ],
  },
];
