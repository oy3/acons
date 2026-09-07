export function isProgramSelectable(program) {
  if (!program) return false;

  const typeActive =
    program.programTypeActive ??
    program.programTypeId?.active ??
    program.programType?.active ??
    true;
  const modeActive =
    program.programModeActive ??
    program.programModeId?.active ??
    program.programMode?.active ??
    true;

  return (
    program.selectable !== false &&
    program.active !== false &&
    program.programActive !== false &&
    typeActive !== false &&
    modeActive !== false
  );
}

export function getProgramInactiveReasons(program) {
  if (!program) return [];
  if (Array.isArray(program.inactiveReasons) && program.inactiveReasons.length) {
    return program.inactiveReasons;
  }

  const reasons = [];
  if (program.active === false || program.programActive === false) {
    reasons.push("Variant inactive");
  }
  if (
    (program.programTypeActive ??
      program.programTypeId?.active ??
      program.programType?.active) === false
  ) {
    reasons.push("Type inactive");
  }
  if (
    (program.programModeActive ??
      program.programModeId?.active ??
      program.programMode?.active) === false
  ) {
    reasons.push("Mode inactive");
  }
  return reasons;
}

export function appendProgramAvailability(baseLabel, program) {
  return getProgramInactiveReasons(program).length
    ? `${baseLabel} (Inactive)`
    : baseLabel;
}

export function sortProgramsByAvailability(programs = []) {
  return [...programs].sort((left, right) => {
    const availabilityOrder =
      Number(isProgramSelectable(right)) - Number(isProgramSelectable(left));
    if (availabilityOrder) return availabilityOrder;

    const leftLabel = left.label || left.name || "";
    const rightLabel = right.label || right.name || "";
    return leftLabel.localeCompare(rightLabel);
  });
}

export function sortOptionsByActive(options = [], labelKey) {
  return [...options].sort((left, right) => {
    const availabilityOrder =
      Number(right.active !== false) - Number(left.active !== false);
    if (availabilityOrder) return availabilityOrder;
    return String(left[labelKey] || "").localeCompare(
      String(right[labelKey] || ""),
    );
  });
}
