export type ProgramAvailabilitySource = {
    active?: boolean;
    programTypeId?: { active?: boolean } | unknown;
    programModeId?: { active?: boolean } | unknown;
};

export type ProgramAvailability = {
    programActive: boolean;
    programTypeActive: boolean | null;
    programModeActive: boolean | null;
    selectable: boolean;
    inactiveReasons: string[];
};

function referencedStatus(reference: unknown): boolean | null {
    if (!reference || typeof reference !== 'object' || !('active' in reference)) {
        return null;
    }
    return (reference as { active?: boolean }).active !== false;
}

export function resolveProgramAvailability(
    program: ProgramAvailabilitySource,
): ProgramAvailability {
    const programActive = program.active !== false;
    const programTypeActive = referencedStatus(program.programTypeId);
    const programModeActive = referencedStatus(program.programModeId);
    const inactiveReasons: string[] = [];

    if (!programActive) inactiveReasons.push('Program variant is inactive');
    if (programTypeActive === false) inactiveReasons.push('Program type is inactive');
    if (programModeActive === false) inactiveReasons.push('Program mode is inactive');

    return {
        programActive,
        programTypeActive,
        programModeActive,
        selectable:
            programActive &&
            programTypeActive !== false &&
            programModeActive !== false,
        inactiveReasons,
    };
}
