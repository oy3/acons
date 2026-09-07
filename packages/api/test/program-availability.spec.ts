import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { resolveProgramAvailability } from '../src/utils/program-availability.util';

test('a program is selectable only when its variant, type, and mode are active', () => {
    assert.deepEqual(
        resolveProgramAvailability({
            active: true,
            programTypeId: { active: true },
            programModeId: { active: true },
        }),
        {
            programActive: true,
            programTypeActive: true,
            programModeActive: true,
            selectable: true,
            inactiveReasons: [],
        },
    );
});

test('availability reports every inactive layer without changing stored flags', () => {
    const availability = resolveProgramAvailability({
        active: false,
        programTypeId: { active: false },
        programModeId: { active: false },
    });

    assert.equal(availability.selectable, false);
    assert.deepEqual(availability.inactiveReasons, [
        'Program variant is inactive',
        'Program type is inactive',
        'Program mode is inactive',
    ]);
});

test('unpopulated references do not incorrectly mark a freshly saved program unavailable', () => {
    const availability = resolveProgramAvailability({
        active: true,
        programTypeId: 'type-id',
        programModeId: 'mode-id',
    });

    assert.equal(availability.programTypeActive, null);
    assert.equal(availability.programModeActive, null);
    assert.equal(availability.selectable, true);
});
