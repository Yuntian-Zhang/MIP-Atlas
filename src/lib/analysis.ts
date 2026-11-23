import type { ComponentSummary, OptimizationModel } from "./types";

export interface ModelStatistics {
  rows: number;
  columns: number;
  nonzeros: number;
  density: number;
  minCoefficient: number | null;
  maxCoefficient: number | null;
  negativeCount: number;
  positiveCount: number;
  binaryCount: number;
  integerCount: number;
  continuousCount: number;
  emptyRows: number;
  emptyColumns: number;
  singletonRows: number;
}

export function getStatistics(model: OptimizationModel): ModelStatistics {
  const values = model.entries.map((entry) => entry.value);
  const absValues = values.map(Math.abs);
  const rowDegrees = new Uint32Array(model.constraints.length);
  const colDegrees = new Uint32Array(model.variables.length);
  for (const entry of model.entries) {
    rowDegrees[entry.row] += 1;
    colDegrees[entry.col] += 1;
  }
  return {
    rows: model.constraints.length,
    columns: model.variables.length,
    nonzeros: model.entries.length,
    density:
      model.constraints.length * model.variables.length === 0
        ? 0
        : model.entries.length / (model.constraints.length * model.variables.length),
    minCoefficient: absValues.length ? absValues.reduce((min, value) => Math.min(min, value), Infinity) : null,
    maxCoefficient: absValues.length ? absValues.reduce((max, value) => Math.max(max, value), -Infinity) : null,
    negativeCount: values.filter((value) => value < 0).length,
    positiveCount: values.filter((value) => value > 0).length,
    binaryCount: model.variables.filter((v) => v.type === "binary").length,
    integerCount: model.variables.filter((v) => v.type === "integer").length,
    continuousCount: model.variables.filter((v) => v.type === "continuous").length,
    emptyRows: [...rowDegrees].filter((degree) => degree === 0).length,
    emptyColumns: [...colDegrees].filter((degree) => degree === 0).length,
    singletonRows: [...rowDegrees].filter((degree) => degree === 1).length,
  };
}

/** Connected components of the constraint-variable bipartite graph. */
export function findComponents(model: OptimizationModel): ComponentSummary[] {
  const rowCount = model.constraints.length;
  const colCount = model.variables.length;
  const parent = Array.from({ length: rowCount + colCount }, (_, index) => index);
  const rank = new Uint8Array(rowCount + colCount);

  const find = (value: number): number => {
    let node = value;
    while (parent[node] !== node) {
      parent[node] = parent[parent[node]];
      node = parent[node];
    }
    return node;
  };

  const unite = (a: number, b: number) => {
    let rootA = find(a);
    let rootB = find(b);
    if (rootA === rootB) return;
    if (rank[rootA] < rank[rootB]) [rootA, rootB] = [rootB, rootA];
    parent[rootB] = rootA;
    if (rank[rootA] === rank[rootB]) rank[rootA] += 1;
  };

  for (const entry of model.entries) unite(entry.row, rowCount + entry.col);

  const groups = new Map<number, ComponentSummary>();
  const ensure = (root: number) => {
    if (!groups.has(root)) {
      groups.set(root, {
        id: groups.size + 1,
        rows: [],
        cols: [],
        nonzeros: 0,
      });
    }
    return groups.get(root)!;
  };

  for (let row = 0; row < rowCount; row += 1) {
    ensure(find(row)).rows.push(row);
  }
  for (let col = 0; col < colCount; col += 1) {
    ensure(find(rowCount + col)).cols.push(col);
  }
  for (const entry of model.entries) {
    const component = ensure(find(entry.row));
    component.nonzeros += 1;
  }

  return [...groups.values()].sort(
    (a, b) => b.rows.length + b.cols.length - (a.rows.length + a.cols.length),
  ).map((component, index) => ({ ...component, id: index + 1 }));
}


export type ReorderMode = "original" | "components" | "rcm" | "degree";

export interface MatrixOrdering {
  rowOrder: number[];
  colOrder: number[];
  description: string;
}

/**
 * Returns display permutations. The model itself and all original indices
 * remain unchanged, so reordering is strictly a visualization operation.
 */
export function getMatrixOrdering(
  model: OptimizationModel,
  mode: ReorderMode,
): MatrixOrdering {
  const rowCount = model.constraints.length;
  const colCount = model.variables.length;
  const rowDegrees = new Uint32Array(rowCount);
  const colDegrees = new Uint32Array(colCount);

  for (const entry of model.entries) {
    rowDegrees[entry.row] += 1;
    colDegrees[entry.col] += 1;
  }

  const originalRows = Array.from({ length: rowCount }, (_, index) => index);
  const originalCols = Array.from({ length: colCount }, (_, index) => index);

  if (mode === "original") {
    return {
      rowOrder: originalRows,
      colOrder: originalCols,
      description: "Original model order",
    };
  }

  if (mode === "degree") {
    return {
      rowOrder: [...originalRows].sort((a, b) => rowDegrees[b] - rowDegrees[a] || a - b),
      colOrder: [...originalCols].sort((a, b) => colDegrees[b] - colDegrees[a] || a - b),
      description: "Rows and columns sorted by decreasing degree",
    };
  }

  if (mode === "components") {
    const components = findComponents(model);
    return {
      rowOrder: components.flatMap((component) => component.rows),
      colOrder: components.flatMap((component) => component.cols),
      description: "Exact connected-component grouping of the bipartite graph",
    };
  }

  // Reverse Cuthill–McKee on the constraint-variable bipartite graph.
  // This is a heuristic ordering for visual bandwidth reduction, not a
  // block-decomposition certificate.
  const nodeCount = rowCount + colCount;
  const adjacency: number[][] = Array.from({ length: nodeCount }, () => []);
  const degree = new Uint32Array(nodeCount);

  for (const entry of model.entries) {
    const rowNode = entry.row;
    const colNode = rowCount + entry.col;
    adjacency[rowNode].push(colNode);
    adjacency[colNode].push(rowNode);
    degree[rowNode] += 1;
    degree[colNode] += 1;
  }

  const visited = new Uint8Array(nodeCount);
  const rcmOrder: number[] = [];
  const rootCandidates = Array.from({ length: nodeCount }, (_, node) => node)
    .sort((a, b) => degree[a] - degree[b] || a - b);
  let rootCursor = 0;
  let visitedCount = 0;

  while (visitedCount < nodeCount) {
    while (rootCursor < rootCandidates.length && visited[rootCandidates[rootCursor]]) {
      rootCursor += 1;
    }
    const root = rootCandidates[rootCursor];
    if (root === undefined) break;

    const queue: number[] = [root];
    const componentOrder: number[] = [];
    visited[root] = 1;
    visitedCount += 1;

    for (let head = 0; head < queue.length; head += 1) {
      const node = queue[head];
      componentOrder.push(node);

      const neighbors = adjacency[node]
        .filter((neighbor) => !visited[neighbor])
        .sort((a, b) => degree[a] - degree[b] || a - b);

      for (const neighbor of neighbors) {
        if (visited[neighbor]) continue;
        visited[neighbor] = 1;
        visitedCount += 1;
        queue.push(neighbor);
      }
    }

    for (let index = componentOrder.length - 1; index >= 0; index -= 1) {
      rcmOrder.push(componentOrder[index]);
    }
  }

  const rowOrder = rcmOrder.filter((node) => node < rowCount);
  const colOrder = rcmOrder
    .filter((node) => node >= rowCount)
    .map((node) => node - rowCount);

  return {
    rowOrder,
    colOrder,
    description: "Bipartite Reverse Cuthill–McKee heuristic",
  };
}
