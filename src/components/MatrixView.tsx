import { useEffect, useMemo, useRef, useState } from "react";
import type { WheelEvent } from "react";
import { getMatrixOrdering, type ReorderMode } from "../lib/analysis";
import type { MatrixEntry, OptimizationModel } from "../lib/types";

interface Props {
  model: OptimizationModel;
  selected: MatrixEntry | null;
  onSelect: (entry: MatrixEntry | null) => void;
}

interface Viewport {
  scale: number;
  x: number;
  y: number;
}

const MARGIN = { left: 140, top: 42, right: 24, bottom: 96 };

function shorten(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function sampleIndices(length: number, limit: number): number[] {
  if (length <= limit) return Array.from({ length }, (_, index) => index);
  if (limit <= 1) return [0];
  return Array.from({ length: limit }, (_, index) =>
    Math.round((index * (length - 1)) / (limit - 1)),
  );
}

const reorderOptions: Array<{ value: ReorderMode; label: string }> = [
  { value: "original", label: "Original order" },
  { value: "components", label: "Connected components" },
  { value: "rcm", label: "Bipartite RCM" },
  { value: "degree", label: "Degree (high → low)" },
];

export default function MatrixView({ model, selected, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ scale: 1, x: 0, y: 0 });
  const [hovered, setHovered] = useState<MatrixEntry | null>(null);
  const [resizeVersion, setResizeVersion] = useState(0);
  const [orderMode, setOrderMode] = useState<ReorderMode>("original");
  const dragRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const draggedRef = useRef(false);

  const ordering = useMemo(
    () => getMatrixOrdering(model, orderMode),
    [model, orderMode],
  );

  const rowPosition = useMemo(() => {
    const positions = new Int32Array(model.constraints.length);
    ordering.rowOrder.forEach((originalIndex, displayIndex) => {
      positions[originalIndex] = displayIndex;
    });
    return positions;
  }, [model.constraints.length, ordering]);

  const colPosition = useMemo(() => {
    const positions = new Int32Array(model.variables.length);
    ordering.colOrder.forEach((originalIndex, displayIndex) => {
      positions[originalIndex] = displayIndex;
    });
    return positions;
  }, [model.variables.length, ordering]);

  const entryLookup = useMemo(() => {
    const lookup = new Map<string, MatrixEntry>();
    for (const entry of model.entries) lookup.set(`${entry.row}:${entry.col}`, entry);
    return lookup;
  }, [model.entries]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setResizeVersion((version) => version + 1));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(bounds.width * dpr));
    canvas.height = Math.max(1, Math.floor(bounds.height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const width = bounds.width;
    const height = bounds.height;
    const { left, top, right, bottom } = MARGIN;
    const plotWidth = Math.max(10, width - left - right);
    const plotHeight = Math.max(10, height - top - bottom);
    const rowCount = model.constraints.length;
    const colCount = model.variables.length;
    const cellWidth = plotWidth / Math.max(1, colCount);
    const cellHeight = plotHeight / Math.max(1, rowCount);

    ctx.fillStyle = "#0b1222";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#111d31";
    ctx.fillRect(left, top, plotWidth, plotHeight);
    ctx.strokeStyle = "rgba(148, 169, 204, 0.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(left + 0.5, top + 0.5, plotWidth - 1, plotHeight - 1);

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, plotWidth, plotHeight);
    ctx.clip();
    ctx.translate(left + viewport.x, top + viewport.y);
    ctx.scale(viewport.scale, viewport.scale);

    const pointSize = Math.max(1.2, Math.min(5.5, Math.min(cellWidth, cellHeight) * 0.92));
    for (const entry of model.entries) {
      const displayRow = rowPosition[entry.row];
      const displayCol = colPosition[entry.col];
      const x = (displayCol + 0.5) * cellWidth;
      const y = (displayRow + 0.5) * cellHeight;
      ctx.fillStyle = entry.value < 0 ? "#fb923c" : "#38bdf8";
      ctx.fillRect(x - pointSize / 2, y - pointSize / 2, pointSize, pointSize);
    }

    if (selected) {
      const x = (colPosition[selected.col] + 0.5) * cellWidth;
      const y = (rowPosition[selected.row] + 0.5) * cellHeight;
      ctx.strokeStyle = "#67e8f9";
      ctx.lineWidth = 2 / viewport.scale;
      ctx.shadowColor = "rgba(103, 232, 249, 0.8)";
      ctx.shadowBlur = 9 / viewport.scale;
      ctx.strokeRect(x - 6 / viewport.scale, y - 6 / viewport.scale, 12 / viewport.scale, 12 / viewport.scale);
      ctx.shadowBlur = 0;
    }

    if (hovered) {
      const x = (colPosition[hovered.col] + 0.5) * cellWidth;
      const y = (rowPosition[hovered.row] + 0.5) * cellHeight;
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 1.5 / viewport.scale;
      ctx.strokeRect(x - 5 / viewport.scale, y - 5 / viewport.scale, 10 / viewport.scale, 10 / viewport.scale);
    }
    ctx.restore();

    // Axis labels follow the displayed permutations but retain original names.
    ctx.font = "13px 'DM Mono', ui-monospace, monospace";
    ctx.fillStyle = "#b4c4da";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const displayRow of sampleIndices(rowCount, 7)) {
      const originalRow = ordering.rowOrder[displayRow];
      const y = top + (displayRow + 0.5) * cellHeight;
      ctx.fillText(shorten(model.constraints[originalRow].name, 16), left - 13, y);
      ctx.fillStyle = "#607895";
      ctx.fillRect(left - 5, y - 0.5, 5, 1);
      ctx.fillStyle = "#b4c4da";
    }

    ctx.fillStyle = "#b4c4da";
    ctx.font = "13px 'DM Mono', ui-monospace, monospace";
    for (const displayCol of sampleIndices(colCount, 6)) {
      const originalCol = ordering.colOrder[displayCol];
      const x = left + (displayCol + 0.5) * cellWidth;
      ctx.save();
      ctx.translate(x, top + plotHeight + 14);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(shorten(model.variables[originalCol].name, 17), 0, 0);
      ctx.restore();
      ctx.fillStyle = "#607895";
      ctx.fillRect(x - 0.5, top + plotHeight, 1, 5);
    }

    ctx.fillStyle = "#a8bad2";
    ctx.font = "600 13px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.translate(17, top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("CONSTRAINTS", 0, 0);
    ctx.restore();
    ctx.fillText("VARIABLES", left + plotWidth / 2, height - 8);

    ctx.font = "12px 'DM Mono', ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.fillStyle = "#a8bad2";
    ctx.fillText(`${rowCount.toLocaleString()} rows`, left - 13, top - 18);
    ctx.textAlign = "left";
    ctx.fillText(`${colCount.toLocaleString()} cols`, left, top - 18);

    // Right-align the legend to the plot edge, using measured text widths.
    const legendRight = width - right;
    const markerOffset = 10;
    const legendGap = 16;
    const negativeX = legendRight - ctx.measureText("Negative").width;
    const positiveX = negativeX - markerOffset - legendGap - ctx.measureText("Positive").width;
    const countRight = left + ctx.measureText(`${colCount.toLocaleString()} cols`).width;
    const legendY = positiveX - markerOffset - 4 < countRight + 8 ? 10 : 18;

    const drawLegendItem = (label: string, color: string, x: number) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x - markerOffset, legendY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b4c4da";
      ctx.fillText(label, x, legendY);
    };

    drawLegendItem("Positive", "#38bdf8", positiveX);
    drawLegendItem("Negative", "#fb923c", negativeX);
  }, [
    model,
    viewport,
    hovered,
    selected,
    resizeVersion,
    ordering,
    rowPosition,
    colPosition,
  ]);

  const entryAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    const { left, top, right, bottom } = MARGIN;
    const plotWidth = Math.max(10, bounds.width - left - right);
    const plotHeight = Math.max(10, bounds.height - top - bottom);
    const cellWidth = plotWidth / Math.max(1, model.variables.length);
    const cellHeight = plotHeight / Math.max(1, model.constraints.length);
    const localX = (clientX - bounds.left - left - viewport.x) / viewport.scale;
    const localY = (clientY - bounds.top - top - viewport.y) / viewport.scale;
    if (localX < 0 || localY < 0 || localX >= plotWidth || localY >= plotHeight) return null;

    const displayCol = Math.floor(localX / cellWidth);
    const displayRow = Math.floor(localY / cellHeight);
    const originalRow = ordering.rowOrder[displayRow];
    const originalCol = ordering.colOrder[displayCol];
    if (originalRow === undefined || originalCol === undefined) return null;
    return entryLookup.get(`${originalRow}:${originalCol}`) ?? null;
  };

  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const anchorX = event.clientX - bounds.left - MARGIN.left;
    const anchorY = event.clientY - bounds.top - MARGIN.top;
    setViewport((current) => {
      const nextScale = Math.min(24, Math.max(0.65, current.scale * factor));
      const ratio = nextScale / current.scale;
      return {
        scale: nextScale,
        x: anchorX - (anchorX - current.x) * ratio,
        y: anchorY - (anchorY - current.y) * ratio,
      };
    });
  };

  const changeOrder = (nextMode: ReorderMode) => {
    setOrderMode(nextMode);
    setViewport({ scale: 1, x: 0, y: 0 });
    setHovered(null);
  };

  return (
    <div className="matrix-wrap">
      <div className="matrix-toolbar">
        <span className="eyebrow">SPARSITY PATTERN</span>
        <div className="matrix-actions">
          <label className="reorder-control">
            <span>REORDER</span>
            <select
              value={orderMode}
              onChange={(event) => changeOrder(event.target.value as ReorderMode)}
              aria-label="Matrix row and column ordering"
            >
              {reorderOptions.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <span className="hint">Scroll to zoom · Drag to pan · Click a nonzero</span>
          <button className="mini-button" onClick={() => setViewport({ scale: 1, x: 0, y: 0 })}>Reset view</button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="matrix-canvas"
        aria-label="Interactive constraint matrix sparsity pattern"
        onWheel={handleWheel}
        onPointerDown={(event) => {
          draggedRef.current = false;
          dragRef.current = {
            x: event.clientX,
            y: event.clientY,
            originX: viewport.x,
            originY: viewport.y,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (dragRef.current && event.buttons === 1) {
            const drag = dragRef.current;
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            if (Math.abs(dx) + Math.abs(dy) > 2) draggedRef.current = true;
            setViewport((current) => ({
              ...current,
              x: drag.originX + dx,
              y: drag.originY + dy,
            }));
          } else {
            setHovered(entryAt(event.clientX, event.clientY));
          }
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerLeave={() => setHovered(null)}
        onClick={(event) => {
          if (draggedRef.current) {
            draggedRef.current = false;
            return;
          }
          onSelect(entryAt(event.clientX, event.clientY));
        }}
      />
      <div className="matrix-footer">
        <span>{model.entries.length.toLocaleString()} nonzero coefficients</span>
        <span className="ordering-note">{ordering.description}</span>
        {hovered && (
          <span className="hover-readout">
            {model.constraints[hovered.row]?.name} × {model.variables[hovered.col]?.name} = {hovered.value}
          </span>
        )}
      </div>
    </div>
  );
}
