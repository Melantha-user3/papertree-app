"use client";

import type { KeyboardEvent } from "react";
import type { ChainMetricSeries } from "@/lib/types/papertree";

const CHART_WIDTH = 520;
const CHART_HEIGHT = 180;
const CHART_PADDING = {
  top: 18,
  right: 16,
  bottom: 34,
  left: 16,
};

interface ChainMetricsChartProps {
  series: ChainMetricSeries[];
  selectedMetricKey: string | null;
  selectedNodeId: string | null;
  onSelectMetric: (metricKey: string) => void;
  onSelectNode: (nodeId: string) => void;
  modeLabel?: string | null;
  helperText?: string | null;
}

function formatMetricValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(value >= 100 ? 1 : 2);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function ChainMetricsChart({
  series,
  selectedMetricKey,
  selectedNodeId,
  onSelectMetric,
  onSelectNode,
  modeLabel,
  helperText,
}: ChainMetricsChartProps) {
  const activeSeries =
    series.find((item) => item.key === selectedMetricKey) ?? series[0] ?? null;

  if (!activeSeries) {
    return null;
  }

  const years = activeSeries.points.map((point) => point.publicationYear ?? 0);
  const values = activeSeries.points.map((point) => point.value);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const yearRange = Math.max(maxYear - minYear, 1);
  const valueRange = Math.max(maxValue - minValue, Math.abs(maxValue) * 0.1, 1);
  const paddedMinValue = minValue - valueRange * 0.12;
  const paddedMaxValue = maxValue + valueRange * 0.12;
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  const plotPoints = activeSeries.points.map((point) => {
    const x =
      CHART_PADDING.left +
      ((point.publicationYear ?? minYear) - minYear) / yearRange * plotWidth;
    const normalizedValue =
      (point.value - paddedMinValue) / Math.max(paddedMaxValue - paddedMinValue, 1);
    const y = CHART_PADDING.top + (1 - clamp(normalizedValue, 0, 1)) * plotHeight;

    return {
      ...point,
      x,
      y,
    };
  });

  const linePath = plotPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");

  const yAxisLabels = [
    {
      label: `${formatMetricValue(paddedMaxValue)}${activeSeries.unit ? ` ${activeSeries.unit}` : ""}`,
      y: CHART_PADDING.top + 4,
    },
    {
      label: `${formatMetricValue(minValue)}${activeSeries.unit ? ` ${activeSeries.unit}` : ""}`,
      y: CHART_HEIGHT - CHART_PADDING.bottom,
    },
  ];

  function handlePointKeyDown(nodeId: string, event: KeyboardEvent<SVGCircleElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectNode(nodeId);
    }
  }

  return (
    <div className="rounded-xl border border-white/80 bg-white/80 p-3">
      <div className="flex flex-wrap gap-2">
        {series.map((item) => {
          const active = item.key === activeSeries.key;
          return (
            <button
              key={item.key}
              type="button"
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                active
                  ? "border-cyan-300 bg-cyan-100 text-cyan-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => onSelectMetric(item.key)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-slate-800">
              {activeSeries.label}
              {activeSeries.unit ? ` (${activeSeries.unit})` : ""}
            </p>
            {modeLabel ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                {modeLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {helperText ?? "Locked chain trend by publication year. Click a point to select that paper."}
          </p>
        </div>
        <p className="text-[11px] text-slate-400">{activeSeries.points.length} comparable papers</p>
      </div>

      <div className="mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-[180px] min-w-[520px] overflow-visible"
          aria-label={`${activeSeries.label} trend chart`}
        >
          <defs>
            <linearGradient id={`metric-gradient-${activeSeries.key}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          <line
            x1={CHART_PADDING.left}
            x2={CHART_WIDTH - CHART_PADDING.right}
            y1={CHART_HEIGHT - CHART_PADDING.bottom}
            y2={CHART_HEIGHT - CHART_PADDING.bottom}
            stroke="#cbd5e1"
            strokeDasharray="4 4"
          />
          <line
            x1={CHART_PADDING.left}
            x2={CHART_WIDTH - CHART_PADDING.right}
            y1={CHART_PADDING.top}
            y2={CHART_PADDING.top}
            stroke="#e2e8f0"
          />

          <path
            d={`${linePath} L ${plotPoints[plotPoints.length - 1]?.x.toFixed(1)} ${(
              CHART_HEIGHT - CHART_PADDING.bottom
            ).toFixed(1)} L ${plotPoints[0]?.x.toFixed(1)} ${(
              CHART_HEIGHT - CHART_PADDING.bottom
            ).toFixed(1)} Z`}
            fill={`url(#metric-gradient-${activeSeries.key})`}
          />
          <path
            d={linePath}
            fill="none"
            stroke="#0891b2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />

          {yAxisLabels.map((item) => (
            <text
              key={`${item.label}-${item.y}`}
              x={CHART_WIDTH - CHART_PADDING.right}
              y={item.y}
              fill="#64748b"
              fontSize="11"
              textAnchor="end"
            >
              {item.label}
            </text>
          ))}

          {plotPoints.map((point) => {
            const active = point.nodeId === selectedNodeId;

            return (
              <g key={`${point.nodeId}-${point.publicationYear}-${point.value}`}>
                <line
                  x1={point.x}
                  x2={point.x}
                  y1={point.y}
                  y2={CHART_HEIGHT - CHART_PADDING.bottom}
                  stroke={active ? "#0891b2" : "#cbd5e1"}
                  strokeDasharray="3 4"
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={active ? 6 : 5}
                  fill={active ? "#0891b2" : "#ffffff"}
                  stroke="#0891b2"
                  strokeWidth={active ? 3 : 2}
                  onClick={() => onSelectNode(point.nodeId)}
                  onKeyDown={(event) => handlePointKeyDown(point.nodeId, event)}
                  role="button"
                  tabIndex={0}
                >
                  <title>
                    {`${point.title} (${point.publicationYear}) · ${formatMetricValue(point.value)}${
                      point.unit ? ` ${point.unit}` : ""
                    }`}
                  </title>
                </circle>
                <text
                  x={point.x}
                  y={CHART_HEIGHT - 10}
                  fill={active ? "#0f172a" : "#64748b"}
                  fontSize="11"
                  textAnchor="middle"
                >
                  {point.publicationYear}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {activeSeries.points.map((point) => {
          const active = point.nodeId === selectedNodeId;

          return (
            <button
              key={`summary-${point.nodeId}`}
              type="button"
              className={`rounded-xl border px-3 py-2 text-left transition ${
                active
                  ? "border-cyan-300 bg-cyan-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
              onClick={() => onSelectNode(point.nodeId)}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {point.publicationYear}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-800">
                {formatMetricValue(point.value)}
                {point.unit ? ` ${point.unit}` : ""}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">{point.title}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
