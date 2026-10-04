import React from 'react';
import { TrajectoryResult, GraphMode, ReferenceFrame } from '../types/simulation';

interface KinematicsGraphsProps {
  currentTrajectory: TrajectoryResult;
  comparisonTrajectory: TrajectoryResult | null;
  currentIndex: number;
  graphMode: GraphMode;
  referenceFrame: ReferenceFrame;
  onSelectGraphMode: (mode: GraphMode) => void;
  onScrubIndex: (index: number) => void;
}

export const KinematicsGraphs: React.FC<KinematicsGraphsProps> = ({
  currentTrajectory,
  comparisonTrajectory,
  currentIndex,
  graphMode,
  referenceFrame,
  onSelectGraphMode,
  onScrubIndex,
}) => {
  const points = currentTrajectory.points;
  const safeIndex = Math.min(currentIndex, points.length - 1);
  const activePoint = points[safeIndex] || points[0];

  const width = 560;
  const height = 165;
  const padLeft = 46;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Determine value accessor & units based on graphMode
  const getValue = (pt: typeof activePoint) => {
    if (graphMode === 'velocity') {
      return referenceFrame === 'heliocentric' ? pt.speed : pt.relSpeed;
    }
    if (graphMode === 'distance') {
      return pt.distance;
    }
    return pt.accel;
  };

  // Compute bounds across both currentTrajectory and comparisonTrajectory
  const maxTime = Math.max(
    points[points.length - 1]?.t || 1,
    comparisonTrajectory?.points[comparisonTrajectory.points.length - 1]?.t || 1
  );

  let minVal = Infinity;
  let maxVal = -Infinity;

  points.forEach((pt) => {
    const v = getValue(pt);
    if (v < minVal) minVal = v;
    if (v > maxVal) maxVal = v;
  });

  if (comparisonTrajectory) {
    comparisonTrajectory.points.forEach((pt) => {
      const v = getValue(pt);
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    });
  }

  if (graphMode === 'velocity') {
    minVal = Math.max(0, Math.floor(minVal * 0.85));
    maxVal = Math.ceil(maxVal * 1.1 + 2);
  } else if (graphMode === 'distance') {
    minVal = 0;
    maxVal = Math.ceil(maxVal * 1.05 + 10);
  } else {
    minVal = 0;
    maxVal = Math.max(5, maxVal * 1.1);
  }

  const valRange = Math.max(1e-3, maxVal - minVal);

  const toX = (t: number) => padLeft + (t / maxTime) * plotW;
  const toY = (v: number) => padTop + plotH - ((v - minVal) / valRange) * plotH;

  const buildPath = (pts: typeof points) => {
    if (pts.length === 0) return '';
    return pts
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${toX(pt.t).toFixed(1)} ${toY(getValue(pt)).toFixed(1)}`)
      .join(' ');
  };

  const currentPath = buildPath(points);
  const comparisonPath = comparisonTrajectory ? buildPath(comparisonTrajectory.points) : null;

  const activeX = toX(activePoint.t);
  const activeY = toY(getValue(activePoint));

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * width;
    const ratio = Math.max(0, Math.min(1, (clickX - padLeft) / plotW));
    const targetTime = ratio * maxTime;

    // Find closest index in currentTrajectory
    let bestIdx = 0;
    let bestDiff = Infinity;
    points.forEach((pt, idx) => {
      const diff = Math.abs(pt.t - targetTime);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = idx;
      }
    });
    onScrubIndex(bestIdx);
  };

  const yTicks = [minVal, minVal + valRange * 0.5, maxVal];

  return (
    <div className="flex flex-col h-full bg-[#111827] border-t border-slate-800 px-4 py-2.5">
      {/* Top Graph Controls & Live Metric Readout */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-200 tracking-wide">
            Real-Time Kinematic Graphs
          </span>
          <div className="flex items-center gap-1 p-0.5 bg-[#0B0E17] border border-slate-800 rounded">
            <button
              onClick={() => onSelectGraphMode('velocity')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                graphMode === 'velocity'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Speed |v|(t)
            </button>
            <button
              onClick={() => onSelectGraphMode('distance')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                graphMode === 'distance'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Distance r(t)
            </button>
            <button
              onClick={() => onSelectGraphMode('acceleration')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                graphMode === 'acceleration'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gravity |a|(t)
            </button>
          </div>
        </div>

        {/* Live Cursor Readout */}
        <div className="flex items-center gap-4 text-xs font-mono-tabular text-slate-300">
          <span>
            t = <strong className="text-slate-100">{activePoint.t.toFixed(1)}</strong> ks
          </span>
          <span>·</span>
          {graphMode === 'velocity' && (
            <span>
              {referenceFrame === 'heliocentric' ? 'Solar Speed |v|' : 'Planet-Frame Speed |v_rel|'}:{' '}
              <strong className="text-cyan-400">{getValue(activePoint).toFixed(2)} km/s</strong>
            </span>
          )}
          {graphMode === 'distance' && (
            <span>
              Separation r:{' '}
              <strong className="text-cyan-400">{activePoint.distance.toFixed(1)} ×10³ km</strong>
            </span>
          )}
          {graphMode === 'acceleration' && (
            <span>
              Accel |a|:{' '}
              <strong className="text-amber-400">{activePoint.accel.toFixed(2)} m/s²</strong>
            </span>
          )}
        </div>
      </div>

      {/* Interactive SVG Plot */}
      <div className="relative flex-1 min-h-[135px] w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          onClick={handleSvgClick}
          className="w-full h-full cursor-pointer select-none overflow-visible"
        >
          {/* Horizontal grid lines */}
          {yTicks.map((tick, i) => {
            const y = toY(tick);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#1E293B"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono-tabular"
                >
                  {tick.toFixed(graphMode === 'acceleration' ? 1 : 0)}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={height - padBottom}
            stroke="#475569"
            strokeWidth="1"
          />
          <line
            x1={padLeft}
            y1={height - padBottom}
            x2={width - padRight}
            y2={height - padBottom}
            stroke="#475569"
            strokeWidth="1"
          />

          {/* Time Axis Labels */}
          <text
            x={padLeft}
            y={height - 8}
            className="fill-slate-400 text-[10px] font-mono-tabular"
          >
            0.0 ks
          </text>
          <text
            x={padLeft + plotW * 0.5}
            y={height - 8}
            textAnchor="middle"
            className="fill-slate-500 text-[10px] font-mono-tabular"
          >
            Time t (×10³ s) — Click graph to scrub trajectory
          </text>
          <text
            x={width - padRight}
            y={height - 8}
            textAnchor="end"
            className="fill-slate-400 text-[10px] font-mono-tabular"
          >
            {maxTime.toFixed(1)} ks
          </text>

          {/* Locked Comparison Run A Curve (Dashed) */}
          {comparisonPath && (
            <path
              d={comparisonPath}
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.75"
              strokeDasharray="4 4"
              opacity="0.7"
            />
          )}

          {/* Current Trajectory Curve */}
          <path
            d={currentPath}
            fill="none"
            stroke={graphMode === 'acceleration' ? '#F59E0B' : '#06B6D4'}
            strokeWidth="2.25"
          />

          {/* Periapsis vertical marker */}
          {points[currentTrajectory.periapsisIndex] && (
            <line
              x1={toX(points[currentTrajectory.periapsisIndex].t)}
              y1={padTop}
              x2={toX(points[currentTrajectory.periapsisIndex].t)}
              y2={height - padBottom}
              stroke="#F59E0B"
              strokeWidth="1"
              strokeDasharray="2 3"
              opacity="0.55"
            />
          )}

          {/* Current Time Playhead Line & Point */}
          <line
            x1={activeX}
            y1={padTop}
            x2={activeX}
            y2={height - padBottom}
            stroke="#F8FAFC"
            strokeWidth="1.2"
            opacity="0.8"
          />
          <circle
            cx={activeX}
            cy={activeY}
            r="4.5"
            fill={graphMode === 'acceleration' ? '#F59E0B' : '#06B6D4'}
            stroke="#0B0E17"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  );
};
