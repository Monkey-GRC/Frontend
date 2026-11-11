// src/app/core/config/navigation.config.ts
export interface NavSubItem {
    name: string;
    path: string;
    pro?: boolean;
    new?: boolean;
    section: string;
    roles?: string[]; // A child can be narrower than its parent
}

export interface NavItem {
    name: string;
    icon: string; // Nombre del icono de Google Symbols
    path?: string;
    new?: boolean;
    section: string; // Define a qué sección pertenece
    subItems?: NavSubItem[]; // Children of a group: the parent keeps its own page; a parent with no visible child behaves as a simple item
    roles?: string[]; // Si se define, solo estos roles ven el item
}

export type SectionIcon = Record<string, string>;

// Configuración de items de navegación
export const NAV_ITEMS: NavItem[] = [
    {
        icon: 'home',
        name: "GRC_FRAMEWORK.HOME",
        path: "/",
        section: "GRC_FRAMEWORK.MODULE_NAME.GENERAL",
        roles: ['admin_monkey'],
    },
    {
        icon: 'domain',
        name: "GRC_FRAMEWORK.COMPANIES",
        path: "/companies",
        section: "GRC_FRAMEWORK.MODULE_NAME.PARAMETRIZATION",
        roles: ['admin_monkey'],
    },
    {
        icon: 'library_books',
        name: "GRC_FRAMEWORK.CATALOG",
        path: "/catalog",
        section: "GRC_FRAMEWORK.MODULE_NAME.PARAMETRIZATION",
        roles: ['admin_monkey'],
    },
];

// Funciones helper para trabajar con la navegación
export class NavigationHelper {
    static getSections(items: NavItem[]): string[] {
        return [...new Set(items.map(item => item.section))];
    }

    static getItemsBySection(items: NavItem[], section: string): NavItem[] {
        return items.filter(item => item.section === section);
    }
}