/// <reference types="vite/client" />
import { useMemo, useRef, useState } from "react";
import MatrixView from "./components/MatrixView";
import exampleMps from "../examples/b1c1s1.mps?raw";
import { findComponents, getStatistics } from "./lib/analysis";
import { parseMps } from "./lib/mps";
import type { MatrixEntry, OptimizationModel } from "./lib/types";

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });

function formatBound(value: number): string {
  if (value === Infinity) return "+∞";
  if (value === -Infinity) return "−∞";
  return numberFormat.format(value);
}

function formatCoefficient(value: number | null): string {
  return value === null ? "—" : numberFormat.format(value);
}

export default function App() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [model, setModel] = useState<OptimizationModel | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<MatrixEntry | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "components">("overview");

  const stats = useMemo(() => (model ? getStatistics(model) : null), [model]);
  const components = useMemo(() => (model ? findComponents(model) : []), [model]);

  const loadText = (text: string, name: string) => {
    try {
      const parsed = parseMps(text, name.replace(/\.[^.]+$/, ""));
      setModel(parsed);
      setFileName(name);
      setSelectedEntry(null);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not parse this model.");
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".mps")) {
      setError("The current MVP supports .mps files. LP support will be added in a later iteration.");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setError("This MVP limits uploads to 30 MB to keep browser-side processing responsive.");
      return;
    }
    loadText(await file.text(), file.name);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><span /><span /><span /><span /></div>
          <div>
            <div className="brand-name">MIP<span>-Atlas</span></div>
            <div className="brand-subtitle">EXPLORER / 0.1.0</div>
          </div>
        </div>
        <div className="topbar-right">
          <span className="status-dot" /> LOCAL ANALYSIS
          <a href="https://github.com/Yuntian-Zhang/MIP-Atlas" target="_blank" rel="noreferrer" className="github-link">GitHub ↗</a>
        </div>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="hero-copy">
            <div className="kicker"><span /> MATHEMATICAL PROGRAMMING, MADE VISIBLE</div>
            <h1>See the structure<br /><em>behind your model.</em></h1>
            <p>Explore constraint matrices, discover connected components, and inspect the anatomy of your optimization formulations.</p>
          </div>
          <div className="hero-decoration" aria-hidden="true">
            <svg className="orbit-graphic" viewBox="0 0 360 240" role="presentation">
              <defs>
                <radialGradient id="planet-cyan" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#d7f8ff" />
                  <stop offset="42%" stopColor="#68d7f5" />
                  <stop offset="100%" stopColor="#2386b8" />
                </radialGradient>
                <radialGradient id="planet-violet" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#eee5ff" />
                  <stop offset="45%" stopColor="#b69aff" />
                  <stop offset="100%" stopColor="#7157bd" />
                </radialGradient>
                <radialGradient id="planet-blue" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#e0f7ff" />
                  <stop offset="45%" stopColor="#76b9f4" />
                  <stop offset="100%" stopColor="#3b70b8" />
                </radialGradient>
                <linearGradient id="equation-card" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1e416b" stopOpacity=".96" />
                  <stop offset="100%" stopColor="#10243e" stopOpacity=".98" />
                </linearGradient>
                <filter id="planet-glow" x="-200%" y="-200%" width="500%" height="500%">
                  <feGaussianBlur stdDeviation="5" />
                </filter>
              </defs>

              <ellipse className="orbit-line orbit-line-one" cx="180" cy="120" rx="130" ry="52"
                transform="rotate(-27 180 120)" />
              <ellipse className="orbit-line orbit-line-two" cx="180" cy="120" rx="112" ry="91"
                transform="rotate(43 180 120)" />

              <g transform="rotate(-27 180 120)">
                <circle className="planet-halo" cx="310" cy="120" r="8" fill="#55c9ed" />
                <circle className="planet-body" cx="310" cy="120" r="5.5" fill="url(#planet-cyan)" />
                <circle className="planet-halo" cx="50" cy="120" r="7" fill="#8d7ce5" />
                <circle className="planet-body" cx="50" cy="120" r="4.5" fill="url(#planet-violet)" />
                <circle className="planet-halo" cx="180" cy="68" r="6" fill="#65b6ee" />
                <circle className="planet-body" cx="180" cy="68" r="3.5" fill="url(#planet-blue)" />
              </g>

              <g transform="rotate(43 180 120)">
                <circle className="planet-halo" cx="292" cy="120" r="7" fill="#a18af0" />
                <circle className="planet-body" cx="292" cy="120" r="4.5" fill="url(#planet-violet)" />
                <circle className="planet-halo" cx="180" cy="29" r="8" fill="#55c9ed" />
                <circle className="planet-body" cx="180" cy="29" r="5" fill="url(#planet-cyan)" />
                <circle className="planet-halo" cx="180" cy="211" r="6" fill="#65b6ee" />
                <circle className="planet-body" cx="180" cy="211" r="3.5" fill="url(#planet-blue)" />
              </g>

              <g className="equation-card" transform="rotate(-8 180 120)">
                <rect x="130" y="80" width="100" height="80" rx="23" fill="url(#equation-card)" />
                <rect x="130.5" y="80.5" width="99" height="79" rx="22.5" className="equation-card-border" />
                <text x="180" y="132" textAnchor="middle" className="equation-text">
                  <tspan>Ax</tspan><tspan className="equation-accent"> ≥ b</tspan>
                </text>
              </g>
            </svg>
          </div>
        </section>

        {!model ? (
          <section
            className="upload-panel"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void handleFile(event.dataTransfer.files[0]);
            }}
          >
            <div className="upload-icon">↑</div>
            <h2>Bring a model to life</h2>
            <p>Drop an MPS file here, or browse your computer.</p>
            <button className="primary-button" onClick={() => fileInput.current?.click()}>Choose MPS file <span>↗</span></button>
            <input
              ref={fileInput}
              type="file"
              accept=".mps,.MPS"
              hidden
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            <div className="upload-footnote">MPS format · processed locally in your browser · max 30 MB</div>
            <button className="text-button" onClick={() => loadText(exampleMps, "b1c1s1.mps")}>Load a sample model instead →</button>
          </section>
        ) : (
          <>
            <section className="model-heading">
              <div>
                <div className="kicker">CURRENT MODEL</div>
                <h2>{model.name}</h2>
                <div className="model-meta">
                  <span className="file-chip">MPS</span>
                  <span>{fileName}</span>
                  <span>·</span>
                  <span>{model.objectiveSense.toUpperCase()}IMIZE</span>
                </div>
              </div>
              <div className="model-actions">
                <button className="secondary-button" onClick={() => { setModel(null); setFileName(""); setError(""); }}>Close model</button>
                <button className="primary-button compact" onClick={() => fileInput.current?.click()}>Open another ↗</button>
                <input ref={fileInput} type="file" accept=".mps,.MPS" hidden onChange={(event) => void handleFile(event.target.files?.[0])} />
              </div>
            </section>

            {stats && (
              <section className="stats-grid">
                <StatCard label="CONSTRAINTS" value={stats.rows.toLocaleString()} sub="Rows in A" />
                <StatCard label="VARIABLES" value={stats.columns.toLocaleString()} sub={`${stats.binaryCount} binary · ${stats.integerCount} integer · ${stats.continuousCount} continuous`} />
                <StatCard label="NONZEROS" value={stats.nonzeros.toLocaleString()} sub="Stored coefficients" />
                <StatCard label="MATRIX DENSITY" value={`${(stats.density * 100).toFixed(2)}%`} sub="Nonzeros / matrix size" />
              </section>
            )}

            <section className="workspace-grid">
              <div className="main-column">
                <div className="panel matrix-panel">
                  <div className="panel-heading">
                    <div>
                      <div className="eyebrow">01 / MATRIX VIEW</div>
                      <h3>Constraint matrix <span>A</span></h3>
                    </div>
                    <div className="panel-tag">SPARSE MATRIX</div>
                  </div>
                  <MatrixView model={model} selected={selectedEntry} onSelect={setSelectedEntry} />
                </div>

                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <div className="eyebrow">02 / MODEL ANATOMY</div>
                      <h3>Structural analysis</h3>
                    </div>
                    <div className="tabs">
                      <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>Overview</button>
                      <button className={activeTab === "components" ? "active" : ""} onClick={() => setActiveTab("components")}>Components</button>
                    </div>
                  </div>
                  {activeTab === "overview" ? (
                    <div className="analysis-overview">
                      <div className="analysis-stat"><span>Absolute coefficient range</span><strong>{formatCoefficient(stats?.minCoefficient ?? null)} — {formatCoefficient(stats?.maxCoefficient ?? null)}</strong></div>
                      <div className="analysis-stat"><span>Positive / negative entries</span><strong><b className="positive-text">{stats?.positiveCount}</b> / <b className="negative-text">{stats?.negativeCount}</b></strong></div>
                      <div className="analysis-stat"><span>Bipartite connected components</span><strong>{components.length}</strong></div>
                      <div className="analysis-stat"><span>Empty rows / columns</span><strong>{stats?.emptyRows} / {stats?.emptyColumns}</strong></div>
                      <div className="analysis-stat"><span>Singleton constraints</span><strong>{stats?.singletonRows}</strong></div>
                    </div>
                  ) : (
                    <div className="component-list">
                      {components.slice(0, 12).map((component) => (
                        <div className="component-row" key={component.id}>
                          <span className="component-index">C{String(component.id).padStart(2, "0")}</span>
                          <div className="component-bar-wrap"><div className="component-bar" style={{ width: `${Math.max(3, (component.nonzeros / Math.max(1, stats?.nonzeros ?? 1)) * 100)}%` }} /></div>
                          <span>{component.rows.length} rows</span>
                          <span>{component.cols.length} cols</span>
                          <strong>{component.nonzeros} nz</strong>
                        </div>
                      ))}
                      {components.length > 12 && <p className="muted-note">Showing the 12 largest components.</p>}
                    </div>
                  )}
                </div>
              </div>

              <aside className="side-column">
                <div className="panel inspector-panel">
                  <div className="eyebrow">INSPECTOR</div>
                  <h3>Selection details</h3>
                  {selectedEntry ? (
                    <div className="selection-details">
                      <div className="coefficient-value">{numberFormat.format(selectedEntry.value)}</div>
                      <div className="detail-pair"><span>Constraint</span><strong>{model.constraints[selectedEntry.row]?.name}</strong></div>
                      <div className="detail-pair"><span>Variable</span><strong>{model.variables[selectedEntry.col]?.name}</strong></div>
                      <div className="detail-pair"><span>Row sense</span><strong>{model.constraints[selectedEntry.row]?.sense}</strong></div>
                      <div className="detail-pair"><span>RHS</span><strong>{numberFormat.format(model.constraints[selectedEntry.row]?.rhs ?? 0)}</strong></div>
                      <div className="detail-pair"><span>Variable type</span><strong>{model.variables[selectedEntry.col]?.type}</strong></div>
                      <div className="detail-pair"><span>Bounds</span><strong>[{formatBound(model.variables[selectedEntry.col]?.lower ?? 0)}, {formatBound(model.variables[selectedEntry.col]?.upper ?? Infinity)}]</strong></div>
                      <div className="detail-pair"><span>Objective coeff.</span><strong>{numberFormat.format(model.variables[selectedEntry.col]?.objective ?? 0)}</strong></div>
                    </div>
                  ) : (
                    <div className="empty-selection">
                      <div className="crosshair">⌖</div>
                      <p>Select a nonzero matrix entry to inspect its constraint, variable, and coefficient.</p>
                    </div>
                  )}
                </div>

                <div className="panel distribution-panel">
                  <div className="eyebrow">VARIABLE DOMAINS</div>
                  <h3>Variable types</h3>
                  <DomainBar label="Binary" value={stats?.binaryCount ?? 0} total={stats?.columns ?? 0} color="blue" />
                  <DomainBar label="Integer" value={stats?.integerCount ?? 0} total={stats?.columns ?? 0} color="violet" />
                  <DomainBar label="Continuous" value={stats?.continuousCount ?? 0} total={stats?.columns ?? 0} color="teal" />
                </div>

                <div className="panel notes-panel">
                  <div className="eyebrow">PARSER NOTES</div>
                  {model.warnings.length ? model.warnings.map((warning, index) => <p className="warning-text" key={index}>△ {warning}</p>) : <p className="success-text">✓ No parser warnings for the supported MPS features.</p>}
                  <p className="muted-note">This is an early MVP. Always validate imported model data against your original solver/modeling environment.</p>
                </div>
              </aside>
            </section>
          </>
        )}

        {error && <div className="error-toast" role="alert"><span>!</span>{error}<button onClick={() => setError("")}>×</button></div>}
        <footer className="footer">
          <span>MIP-ATLAS <b>·</b> OPEN SOURCE TOOLING FOR OPTIMIZATION RESEARCH</span>
          <span>BUILT FOR MODEL CURIOSITY</span>
        </footer>
      </main>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div className="stat-card"><div className="eyebrow">{label}</div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div></div>;
}

function DomainBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = total ? (value / total) * 100 : 0;
  return (
    <div className="domain-row">
      <div className="domain-label"><span>{label}</span><strong>{value}</strong></div>
      <div className="domain-track"><div className={`domain-fill ${color}`} style={{ width: `${percent}%` }} /></div>
    </div>
  );
}
