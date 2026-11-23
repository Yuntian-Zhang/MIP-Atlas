export type VariableType = "continuous" | "integer" | "binary";

export interface Variable {
  name: string;
  type: VariableType;
  lower: number;
  upper: number;
  objective: number;
}

export interface Constraint {
  name: string;
  sense: "L" | "G" | "E";
  rhs: number;
}

export interface MatrixEntry {
  row: number;
  col: number;
  value: number;
}

export interface OptimizationModel {
  name: string;
  objectiveSense: "min" | "max";
  objectiveRow: string | null;
  variables: Variable[];
  constraints: Constraint[];
  entries: MatrixEntry[];
  warnings: string[];
}

export interface ComponentSummary {
  id: number;
  rows: number[];
  cols: number[];
  nonzeros: number;
}
