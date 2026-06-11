// src/app/core/config/navigation.config.ts
// Hello 
export interface NavSubItem {
    name: string;
    path: string;
    pro?: boolean;
    new?: boolean;
    section: string;
}

export interface NavItem {
    name: string;
    icon: string; // Nombre del icono de Google Symbols
    path?: string;
    new?: boolean;
    section: string; // Define a qué sección pertenece
    subItems?: NavSubItem[];
}

export interface SectionIcon {
    [key: string]: string;
}

// Configuración de items de navegación
export const NAV_ITEMS: NavItem[] = [
    // Sección "Menu"
    {
        icon: 'list_alt_check',
        name: "GRC Framework",
        section: "GRC_FRAMEWORK.MODULE_NAME.PARAMETRIZATION",
        subItems: [
            {
                name: "GRC_FRAMEWORK.CAUSES",
                path: "/causes",
                section: "GRC_FRAMEWORK.MODULE_NAME.PARAMETRIZATION"
            },
            {
                name: "GRC_FRAMEWORK.RISKS",
                path: "/risks",
                section: "GRC_FRAMEWORK.MODULE_NAME.PARAMETRIZATION"
            },
            {
                name: "GRC_FRAMEWORK.CONTROLS",
                path: "/controls",
                section: "GRC_FRAMEWORK.MODULE_NAME.PARAMETRIZATION"
            },
            {
                name: "GRC_FRAMEWORK.TEMPLATES",
                path: "/templates",
                section: "GRC_FRAMEWORK.MODULE_NAME.PARAMETRIZATION"
            },
        ],
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