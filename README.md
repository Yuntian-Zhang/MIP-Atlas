# MIP-Atlas

**An interactive toolkit for visualizing and exploring the structure of mathematical optimization models.**

MIP-Atlas is a browser-based tool for inspecting optimization models through their constraint matrices. It is designed to make sparsity patterns, variable domains, and basic graph structure easier to explore.

## Features

- **Interactive constraint matrix** — visualize the sparsity pattern, with positive and negative coefficients distinguished by color.
- **Matrix exploration** — zoom, pan, hover over nonzeros, and inspect individual coefficients.
- **Row and column reordering** — switch between the original order, connected-component grouping, bipartite Reverse Cuthill–McKee (RCM), and degree-based ordering.
- **Model statistics** — inspect dimensions, nonzero count, matrix density, coefficient ranges, and variable-domain counts.
- **Model details** — inspect variable types, bounds, objective coefficients, constraint senses, and right-hand sides.
- **Bipartite graph components** — identify connected components of the constraint–variable graph.
- **Browser-side processing** — models are parsed and analyzed locally in the browser; they are not uploaded to a project server.

## How to use

1. Open MIP-Atlas and load the built-in sample model or select an `.mps` file.
2. Explore the constraint matrix. Scroll to zoom, drag to pan, and click a nonzero coefficient to inspect its value and corresponding row and column.
3. Use the **Reorder** menu to change the displayed row and column order. Reordering affects visualization only; it does not modify the model.
4. Review the model statistics and switch between the **Overview** and **Components** panels to inspect variable domains and connected components.

## Input format

MIP-Atlas currently supports common MPS records, including `ROWS`, `COLUMNS`, `RHS`, and `BOUNDS`, as well as integer markers and common bound types.

Current limitations:

- LP files are not supported.
- `RANGES` records are detected but are not interpreted as ranged constraints.
- Only the first RHS vector and first bound set are used.
- Uncommon MPS extensions and some fixed-format edge cases may not be fully supported.

MIP-Atlas is a model visualization and inspection tool, not an optimization solver. For critical analysis, verify imported model data against the original modeling environment.

## License

MIP-Atlas is released under the [MIT License](LICENSE).
