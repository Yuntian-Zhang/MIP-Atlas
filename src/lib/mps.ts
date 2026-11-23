import type {
  Constraint,
  MatrixEntry,
  OptimizationModel,
  Variable,
  VariableType,
} from "./types";

type Section =
  | "ROWS"
  | "COLUMNS"
  | "RHS"
  | "RANGES"
  | "BOUNDS"
  | "OBJSENSE"
  | "OBJNAME"
  | "NONE";

function finiteOrInfinity(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * A deliberately small, browser-side reader for the common free-format MPS
 * subset. It supports ROWS, COLUMNS, RHS, BOUNDS and integer MARKER records.
 * RANGES are currently reported as a warning rather than silently interpreted.
 */
export function parseMps(source: string, fallbackName = "Uploaded model"): OptimizationModel {
  const lines = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let section: Section = "NONE";
  let modelName = fallbackName;
  let objectiveSense: "min" | "max" = "min";
  let objectiveRow: string | null = null;
  let activeIntegerMarker = false;
  let selectedRhsVector: string | null = null;
  let selectedBoundSet: string | null = null;
  const warnings: string[] = [];

  const rowSpecs: Array<{ name: string; sense: "L" | "G" | "E" }> = [];
  const rowNameSet = new Set<string>();
  const variableOrder: string[] = [];
  const variableSeen = new Set<string>();
  const variableTypes = new Map<string, VariableType>();
  const lowerBounds = new Map<string, number>();
  const upperBounds = new Map<string, number>();
  const objective = new Map<string, number>();
  const rhsValues = new Map<string, number>();
  const coefficientMap = new Map<string, number>();

  const addVariable = (name: string) => {
    if (!variableSeen.has(name)) {
      variableSeen.add(name);
      variableOrder.push(name);
      variableTypes.set(name, activeIntegerMarker ? "integer" : "continuous");
    } else if (activeIntegerMarker && variableTypes.get(name) === "continuous") {
      variableTypes.set(name, "integer");
    }
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const raw = lines[lineIndex];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("*")) continue;

    const upper = trimmed.toUpperCase();
    const sectionNames = ["ROWS", "COLUMNS", "RHS", "RANGES", "BOUNDS", "OBJSENSE", "OBJNAME"];
    if (sectionNames.includes(upper)) {
      section = upper as Section;
      continue;
    }
    if (upper === "ENDATA") break;

    const tokens = trimmed.split(/\s+/);
    if (section === "NONE") {
      if (tokens[0].toUpperCase() === "NAME") {
        modelName = tokens[1] ?? modelName;
      }
      continue;
    }

    if (section === "OBJSENSE") {
      const sense = tokens[0].toUpperCase();
      if (sense === "MAX" || sense === "MAXIMIZE") objectiveSense = "max";
      if (sense === "MIN" || sense === "MINIMIZE") objectiveSense = "min";
      continue;
    }

    if (section === "OBJNAME") {
      objectiveRow = tokens[0] ?? objectiveRow;
      continue;
    }

    if (section === "ROWS") {
      const type = tokens[0]?.toUpperCase();
      const name = tokens[1];
      if (!name || !type || !["N", "L", "G", "E"].includes(type)) continue;
      if (type === "N") {
        if (objectiveRow === null) objectiveRow = name;
      } else {
        rowSpecs.push({ name, sense: type as "L" | "G" | "E" });
        rowNameSet.add(name);
      }
      continue;
    }

    if (section === "COLUMNS") {
      if (tokens.some((token) => token.toUpperCase().includes("MARKER"))) {
        const marker = tokens.join(" ").toUpperCase();
        if (marker.includes("INTORG")) activeIntegerMarker = true;
        if (marker.includes("INTEND")) activeIntegerMarker = false;
        continue;
      }

      const variableName = tokens[0];
      if (!variableName) continue;
      addVariable(variableName);

      for (let i = 1; i + 1 < tokens.length; i += 2) {
        const rowName = tokens[i];
        const value = Number(tokens[i + 1]);
        if (!Number.isFinite(value)) continue;

        if (rowName === objectiveRow || (!objectiveRow && !rowNameSet.has(rowName))) {
          objective.set(variableName, (objective.get(variableName) ?? 0) + value);
        } else if (rowNameSet.has(rowName)) {
          const key = `${rowName}\u0000${variableName}`;
          coefficientMap.set(key, (coefficientMap.get(key) ?? 0) + value);
        }
      }
      continue;
    }

    if (section === "RHS") {
      if (tokens.length < 3) continue;
      const vectorName = tokens[0];
      if (selectedRhsVector === null) selectedRhsVector = vectorName;
      if (vectorName !== selectedRhsVector) continue;
      for (let i = 1; i + 1 < tokens.length; i += 2) {
        const rowName = tokens[i];
        const value = Number(tokens[i + 1]);
        if (rowNameSet.has(rowName) && Number.isFinite(value)) rhsValues.set(rowName, value);
      }
      continue;
    }

    if (section === "RANGES") {
      if (!warnings.includes("RANGES records are not yet interpreted; ranged rows are shown using their RHS and row sense.")) {
        warnings.push("RANGES records are not yet interpreted; ranged rows are shown using their RHS and row sense.");
      }
      continue;
    }

    if (section === "BOUNDS") {
      const boundType = tokens[0]?.toUpperCase();
      const boundSet = tokens[1];
      const variableName = tokens[2];
      const valueToken = tokens[3];
      if (!boundType || !boundSet || !variableName) continue;
      if (selectedBoundSet === null) selectedBoundSet = boundSet;
      if (boundSet !== selectedBoundSet) continue;
      addVariable(variableName);

      const value = finiteOrInfinity(valueToken, 0);
      switch (boundType) {
        case "LO":
          lowerBounds.set(variableName, value);
          break;
        case "UP":
          upperBounds.set(variableName, value);
          break;
        case "FX":
          lowerBounds.set(variableName, value);
          upperBounds.set(variableName, value);
          break;
        case "FR":
          lowerBounds.set(variableName, -Infinity);
          upperBounds.set(variableName, Infinity);
          break;
        case "MI":
          lowerBounds.set(variableName, -Infinity);
          break;
        case "PL":
          upperBounds.set(variableName, Infinity);
          break;
        case "BV":
          lowerBounds.set(variableName, 0);
          upperBounds.set(variableName, 1);
          variableTypes.set(variableName, "binary");
          break;
        case "LI":
          lowerBounds.set(variableName, value);
          variableTypes.set(variableName, "integer");
          break;
        case "UI":
          upperBounds.set(variableName, value);
          variableTypes.set(variableName, "integer");
          break;
        default:
          warnings.push(`Unsupported BOUNDS record "${boundType}" for ${variableName}.`);
      }
    }
  }

  if (rowSpecs.length === 0) {
    throw new Error("No L, G, or E constraint rows were found. Check that this is a valid MPS model.");
  }
  if (variableOrder.length === 0) {
    throw new Error("No variables were found in the COLUMNS section.");
  }

  const rowIndex = new Map<string, number>(rowSpecs.map((row, index) => [row.name, index] as const));
  const colIndex = new Map<string, number>(variableOrder.map((name, index) => [name, index] as const));
  const entries: MatrixEntry[] = [];

  for (const [key, value] of coefficientMap) {
    if (Math.abs(value) < 1e-14) continue;
    const [rowName, variableName] = key.split("\u0000");
    const row = rowIndex.get(rowName);
    const col = colIndex.get(variableName);
    if (row !== undefined && col !== undefined) entries.push({ row, col, value });
  }

  const variables: Variable[] = variableOrder.map((name) => {
    const lower = lowerBounds.get(name) ?? 0;
    const upper = upperBounds.get(name) ?? Infinity;
    const declaredType = variableTypes.get(name) ?? "continuous";

    // In MPS, binary variables are sometimes represented by INTORG/INTEND
    // markers plus ordinary 0/1 bounds rather than an explicit BV record.
    const type: VariableType =
      declaredType === "integer" && lower === 0 && upper === 1
        ? "binary"
        : declaredType;

    return {
      name,
      type,
      lower,
      upper,
      objective: objective.get(name) ?? 0,
    };
  });

  const constraints: Constraint[] = rowSpecs.map((row) => ({
    name: row.name,
    sense: row.sense,
    rhs: rhsValues.get(row.name) ?? 0,
  }));

  if (objectiveRow === null) {
    warnings.push("No objective row was identified; objective coefficients are assumed to be zero.");
  }

  return {
    name: modelName,
    objectiveSense,
    objectiveRow,
    variables,
    constraints,
    entries,
    warnings,
  };
}
