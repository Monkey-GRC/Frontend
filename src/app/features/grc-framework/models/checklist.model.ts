export type ChecklistOS = 'UBUNTU' | 'WINDOWS';

export interface ChecklistCheck {
    checkId: string;
    title: string;
    result?: string | null;
    description?: string | null;
    rationale?: string | null;
    remediation?: string | null;
    soc2Code?: string | null;
    cisCode?: string | null;
    pciDssCode?: string | null;
    soc2CodeInferred?: string | null;
    soc2MappingSource?: string | null;
    soc2MappingConfidence?: string | null;
    soc2MappingCitation?: string | null;
}
