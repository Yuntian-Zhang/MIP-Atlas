<div align="center">

# 🧭 MIP-Atlas

**See the structure behind your optimization model.**

[![Deploy](https://github.com/Yuntian-Zhang/MIP-Atlas/actions/workflows/deploy.yml/badge.svg)](https://github.com/Yuntian-Zhang/MIP-Atlas/actions/workflows/deploy.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Privacy](https://img.shields.io/badge/Privacy-Local%20Processing-2EA44F)](#features)

An interactive, browser-based explorer for mathematical optimization models.

[**🚀 Launch MIP-Atlas**](https://yuntian-zhang.github.io/MIP-Atlas/) · [Example Model](examples/toy_network.mps) · [Report an Issue](https://github.com/Yuntian-Zhang/MIP-Atlas/issues)

</div>

## ✨ Features

- **Matrix visualization** — explore sparsity patterns with sign-aware coloring, zoom, pan, and coefficient inspection.
- **Structural reordering** — reveal patterns using connected components, bipartite Reverse Cuthill–McKee (RCM), and degree-based ordering.
- **Graph analysis** — identify connected components of the constraint–variable bipartite graph.
- **Model anatomy** — inspect dimensions, density, coefficient magnitudes, variable domains, bounds, objective coefficients, and constraint details.
- **Local processing** — all model parsing and analysis happen in your browser. No model files are uploaded to a server.

## 🧩 Structural Ordering

*Uncover hidden structure in MIP constraint matrices through graph-based reordering.*

MIP-Atlas represents the (potentially rectangular) MIP constraint matrix as an undirected bipartite graph, with constraints and variables as vertices and nonzero coefficients as edges. The methods operate on the sparsity pattern, regardless of variable domains or coefficient signs. Structural ordering is a core, actively evolving focus of the project.

| Ordering | Algorithm | Purpose | Reference |
| :--- | :--- | :--- | :--- |
| Original | Identity permutation | Preserve the original row and column order | — |
| Connected Components | Union-Find with path compression (path halving) and union by rank | Reveal independent blocks in the constraint matrix | [1, 2] |
| Bipartite RCM | Degree-ordered BFS from low-degree roots, reversed within each component | Reveal banded sparsity patterns | [3, 4] |
| Degree | Independent row and column sorting by decreasing nonzero count | Highlight dense rows and columns | — |

All methods are implemented in TypeScript in [`src/lib/analysis.ts`](src/lib/analysis.ts). They produce display permutations without modifying the underlying model. Connected components identify exact structural blocks. Bipartite RCM adapts classical RCM to rectangular constraint matrices by ordering the bipartite graph and extracting separate row and column permutations; it is a visual ordering heuristic, not a decomposition certificate or a guarantee of bandwidth reduction. Degree ordering is a simple heuristic rather than a minimum-degree elimination algorithm.

**References**

1. Tarjan, R. E. (1975). [Efficiency of a good but not linear set union algorithm](https://doi.org/10.1145/321879.321884). *Journal of the ACM*, 22(2), 215–225.
2. Tarjan, R. E., & van Leeuwen, J. (1984). [Worst-case analysis of set union algorithms](https://doi.org/10.1145/62.2160). *Journal of the ACM*, 31(2), 245–281.
3. Cuthill, E., & McKee, J. (1969). [Reducing the bandwidth of sparse symmetric matrices](https://doi.org/10.1145/800195.805928). *Proceedings of the 24th National Conference of the ACM*, 157–172.
4. Liu, J. W. H., & Sherman, A. H. (1976). [Comparative analysis of the Cuthill–McKee and the Reverse Cuthill–McKee ordering algorithms for sparse matrices](https://doi.org/10.1137/0713020). *SIAM Journal on Numerical Analysis*, 13(2), 198–213.

New ordering algorithms, decomposition methods, and literature contributions are welcome!

## 🚀 Quick Start

Open [MIP-Atlas](https://yuntian-zhang.github.io/MIP-Atlas/), drop in an `.mps` file, or load the built-in sample model. Explore the matrix, click any nonzero coefficient, and switch reordering modes to uncover its structure.

To run locally (Node.js 22 recommended):

```bash
git clone https://github.com/Yuntian-Zhang/MIP-Atlas.git
cd MIP-Atlas
npm install
npm run dev
```

## 📂 Supported Format

MIP-Atlas supports common MPS records (`ROWS`, `COLUMNS`, `RHS`, `BOUNDS`), integer markers, and common variable bounds. Files up to 30 MB are accepted.

> **Current scope:** LP files and ranged constraints (`RANGES`) are not yet supported. Only the first RHS vector and bound set are used; uncommon MPS extensions and fixed-format edge cases may not be fully supported. MIP-Atlas is a model inspection tool, not an optimization solver. Verify imported data against the original model for critical analyses.

## 📄 License

Released under the [Apache License 2.0](LICENSE).

---

<div align="center">

If you find MIP-Atlas useful, consider giving it a ⭐ on GitHub.

</div>
