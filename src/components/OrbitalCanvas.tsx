import React, { useRef, useEffect, useState } from 'react';
import { TrajectoryResult, ReferenceFrame } from '../types/simulation';
import { GM_BASE } from '../utils/physicsEngine';

interface OrbitalCanvasProps {
  currentTrajectory: TrajectoryResult;
  comparisonTrajectory: TrajectoryResult | null;
  currentIndex: number;
  referenceFrame: ReferenceFrame;
  showVectors: boolean;
  showGravityField: boolean;
  showPredictedPath: boolean;
  zoom: number;
  onSelectStep?: (index: number) => void;
}

export const OrbitalCanvas: React.FC<OrbitalCanvasProps> = ({
  currentTrajectory,
  comparisonTrajectory,
  currentIndex,
  referenceFrame,
  showVectors,
  showGravityField,
  showPredictedPath,
  zoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  // Pan offset state for interactive dragging
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const points = currentTrajectory.points;
  const safeIndex = Math.min(currentIndex, points.length - 1);
  const activePoint = points[safeIndex] || points[0];

  // Reset pan when switching reference frame
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [referenceFrame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Scale: pixels per 10^3 km
    const baseScale = Math.min(width, height) / 520;
    const scale = baseScale * zoom;

    const centerX = width * 0.5 + pan.x;
    const centerY = height * 0.52 + pan.y;

    const toScreen = (wx: number, wy: number): [number, number] => {
      return [centerX + wx * scale, centerY - wy * scale];
    };

    // 1. Background Deep Space Obsidian Fill
    ctx.fillStyle = '#070A12';
    ctx.fillRect(0, 0, width, height);

    // 2. Coordinate Grid (Subtle Scientific Reticle)
    const gridSpacingWorld = 50; // 50 x 10^3 km
    const gridSpacingPx = gridSpacingWorld * scale;

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.55)';

    const startX = ((centerX % gridSpacingPx) + gridSpacingPx) % gridSpacingPx;
    for (let x = startX; x < width; x += gridSpacingPx) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const startY = ((centerY % gridSpacingPx) + gridSpacingPx) % gridSpacingPx;
    for (let y = startY; y < height; y += gridSpacingPx) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Principal Axes (X = 0, Y = 0)
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.55)';
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    // Axis scale markers
    ctx.fillStyle = '#64748B';
    ctx.font = '10px "IBM Plex Mono", monospace';
    for (let w = -300; w <= 300; w += 100) {
      if (w === 0) continue;
      const [sx, sy] = toScreen(w, 0);
      if (sx > 30 && sx < width - 30) {
        ctx.fillText(`${w}`, sx - 10, sy + 14);
      }
    }

    // Determine Planet Position in current frame
    const planetWorldX = referenceFrame === 'heliocentric' ? activePoint.planetX : 0;
    const planetWorldY = referenceFrame === 'heliocentric' ? activePoint.planetY : 0;
    const [pScreenX, pScreenY] = toScreen(planetWorldX, planetWorldY);

    // 3. Planet Orbital Path Line (in Heliocentric frame)
    if (referenceFrame === 'heliocentric') {
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const [orbStartX, orbY] = toScreen(350, 0);
      const [orbEndX] = toScreen(-350, 0);
      ctx.moveTo(orbStartX, orbY);
      ctx.lineTo(orbEndX, orbY);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Gravity Well Equipotential Rings
    if (showGravityField) {
      const rings = [2.2, 4.0, 6.5, 9.5];
      rings.forEach((mult, idx) => {
        const rWorld = currentTrajectory.planetRadius * mult;
        const rPx = rWorld * scale;
        ctx.save();
        ctx.beginPath();
        ctx.arc(pScreenX, pScreenY, rPx, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.22 - idx * 0.045})`;
        ctx.setLineDash([3, 5]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      });
    }

    // Helper function to draw arrow
    const drawArrow = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      color: string,
      label?: string,
      lineWidth = 2
    ) => {
      const headLen = 8;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 4) return;
      const angle = Math.atan2(dy, dx);

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lineWidth;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - headLen * Math.cos(angle - Math.PI / 6),
        y2 - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        x2 - headLen * Math.cos(angle + Math.PI / 6),
        y2 - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      if (label) {
        ctx.font = '600 11px "IBM Plex Mono", monospace';
        ctx.fillText(label, x2 + 6 * Math.cos(angle), y2 + 6 * Math.sin(angle) - 4);
      }
      ctx.restore();
    };

    // 5. Draw Locked Comparison Trajectory (Run A) if present
    if (comparisonTrajectory && comparisonTrajectory.points.length > 1) {
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      comparisonTrajectory.points.forEach((pt, idx) => {
        const wx = referenceFrame === 'heliocentric' ? pt.scX : pt.relX;
        const wy = referenceFrame === 'heliocentric' ? pt.scY : pt.relY;
        const [sx, sy] = toScreen(wx, wy);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();

      // Label Run A end
      const lastA = comparisonTrajectory.points[comparisonTrajectory.points.length - 1];
      const [ax, ay] = toScreen(
        referenceFrame === 'heliocentric' ? lastA.scX : lastA.relX,
        referenceFrame === 'heliocentric' ? lastA.scY : lastA.relY
      );
      ctx.fillStyle = '#94A3B8';
      ctx.font = '500 10px "IBM Plex Mono", monospace';
      ctx.fillText(
        `RUN A (${comparisonTrajectory.deltaV >= 0 ? '+' : ''}${comparisonTrajectory.deltaV.toFixed(1)} km/s)`,
        ax + 8,
        ay
      );
      ctx.restore();
    }

    // 6. Draw Unperturbed Straight-Line Reference Path (dotted) in Heliocentric Frame
    if (showPredictedPath && points.length > 1) {
      const p0 = points[0];
      const startWX = referenceFrame === 'heliocentric' ? p0.scX : p0.relX;
      const startWY = referenceFrame === 'heliocentric' ? p0.scY : p0.relY;
      const vxRef =
        referenceFrame === 'heliocentric' ? p0.vx : p0.vx - -currentTrajectory.params.planetSpeed;
      const vyRef = referenceFrame === 'heliocentric' ? p0.vy : p0.vy;

      const [s0x, s0y] = toScreen(startWX, startWY);
      const [s1x, s1y] = toScreen(startWX + vxRef * 28, startWY + vyRef * 28);

      ctx.save();
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(s0x, s0y);
      ctx.lineTo(s1x, s1y);
      ctx.stroke();
      ctx.restore();
    }

    // 7. Draw Full Predicted Trajectory Path (Faint Guide Line)
    if (showPredictedPath && points.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.24)';
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      points.forEach((pt, idx) => {
        const wx = referenceFrame === 'heliocentric' ? pt.scX : pt.relX;
        const wy = referenceFrame === 'heliocentric' ? pt.scY : pt.relY;
        const [sx, sy] = toScreen(wx, wy);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
      ctx.restore();
    }

    // 8. Draw Active Elapsed Trajectory Trail (Up to safeIndex)
    if (safeIndex > 0) {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Color-code trail segments or draw vibrant cyan trail
      ctx.strokeStyle = '#06B6D4';
      ctx.beginPath();
      for (let i = 0; i <= safeIndex; i++) {
        const pt = points[i];
        const wx = referenceFrame === 'heliocentric' ? pt.scX : pt.relX;
        const wy = referenceFrame === 'heliocentric' ? pt.scY : pt.relY;
        const [sx, sy] = toScreen(wx, wy);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Stroboscopic time-tick markers (inspired by BU Physics motion diagrams)
      for (let i = 0; i <= safeIndex; i += 20) {
        const pt = points[i];
        const wx = referenceFrame === 'heliocentric' ? pt.scX : pt.relX;
        const wy = referenceFrame === 'heliocentric' ? pt.scY : pt.relY;
        const [sx, sy] = toScreen(wx, wy);
        ctx.fillStyle = '#22D3EE';
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 9. Mark Periapsis (Closest Approach Point)
    if (currentTrajectory.periapsisIndex > 0 && showPredictedPath) {
      const periPt = points[currentTrajectory.periapsisIndex];
      if (periPt) {
        const wx = referenceFrame === 'heliocentric' ? periPt.scX : periPt.relX;
        const wy = referenceFrame === 'heliocentric' ? periPt.scY : periPt.relY;
        const [px, py] = toScreen(wx, wy);

        ctx.save();
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#F59E0B';
        ctx.font = '500 10px "IBM Plex Mono", monospace';
        ctx.fillText(`r_min: ${currentTrajectory.minDistance.toFixed(1)}`, px + 8, py - 6);
        ctx.restore();
      }
    }

    // 10. Draw Planet Body
    const planetRadiusPx = Math.max(8, currentTrajectory.planetRadius * scale);
    ctx.save();
    // Subtle atmospheric rim
    const grad = ctx.createRadialGradient(
      pScreenX - planetRadiusPx * 0.25,
      pScreenY - planetRadiusPx * 0.25,
      planetRadiusPx * 0.1,
      pScreenX,
      pScreenY,
      planetRadiusPx * 1.25
    );
    grad.addColorStop(0, '#60A5FA');
    grad.addColorStop(0.7, '#2563EB');
    grad.addColorStop(1, 'rgba(37, 99, 235, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pScreenX, pScreenY, planetRadiusPx * 1.25, 0, Math.PI * 2);
    ctx.fill();

    // Solid planet core
    ctx.fillStyle = '#1D4ED8';
    ctx.strokeStyle = '#93C5FD';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pScreenX, pScreenY, planetRadiusPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Planet velocity vector in Heliocentric frame
    if (
      referenceFrame === 'heliocentric' &&
      showVectors &&
      currentTrajectory.params.planetSpeed > 0.1
    ) {
      const vLenPx = currentTrajectory.params.planetSpeed * 3.2;
      drawArrow(
        pScreenX,
        pScreenY,
        pScreenX - vLenPx,
        pScreenY,
        '#60A5FA',
        `Vp (${currentTrajectory.params.planetSpeed.toFixed(1)} km/s)`,
        2
      );
    }

    // Planet label
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `Planet (${currentTrajectory.params.planetMass.toFixed(1)} M₀)`,
      pScreenX - 32,
      pScreenY + planetRadiusPx + 16
    );
    ctx.restore();

    // 11. Draw Spacecraft & Live Vectors (Inspired by BU Solar Sailboat force/velocity arrows)
    const scWorldX = referenceFrame === 'heliocentric' ? activePoint.scX : activePoint.relX;
    const scWorldY = referenceFrame === 'heliocentric' ? activePoint.scY : activePoint.relY;
    const [scScreenX, scScreenY] = toScreen(scWorldX, scWorldY);

    if (showVectors) {
      // Velocity vector
      const vxDisp =
        referenceFrame === 'heliocentric'
          ? activePoint.vx
          : activePoint.vx + currentTrajectory.params.planetSpeed;
      const vyDisp = activePoint.vy;
      const vScale = 2.8;
      drawArrow(
        scScreenX,
        scScreenY,
        scScreenX + vxDisp * vScale,
        scScreenY - vyDisp * vScale,
        '#10B981',
        'v',
        2.2
      );

      // Gravitational Acceleration vector (pointing toward planet)
      const dxP = planetWorldX - scWorldX;
      const dyP = planetWorldY - scWorldY;
      const distP = Math.hypot(dxP, dyP) || 1;
      const aMag = (GM_BASE * currentTrajectory.params.planetMass) / (distP * distP);
      // Log-scaled or clamped visual length so it is visible far away and doesn't fill screen at periapsis
      const aLenPx = Math.min(95, Math.max(14, aMag * 12));
      drawArrow(
        scScreenX,
        scScreenY,
        scScreenX + (dxP / distP) * aLenPx,
        scScreenY - (dyP / distP) * aLenPx,
        '#F59E0B',
        'Fg',
        2
      );
    }

    // Spacecraft Icon
    ctx.save();
    const headingRad = Math.atan2(
      -activePoint.vy,
      referenceFrame === 'heliocentric'
        ? activePoint.vx
        : activePoint.vx + currentTrajectory.params.planetSpeed
    );
    ctx.translate(scScreenX, scScreenY);
    ctx.rotate(headingRad);

    // Craft body triangle
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -5.5);
    ctx.lineTo(-3.5, 0);
    ctx.lineTo(-6, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Impact indicator if crashed
    if (
      currentTrajectory.outcome === 'IMPACT' &&
      safeIndex === points.length - 1
    ) {
      ctx.save();
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(scScreenX, scScreenY, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#F43F5E';
      ctx.font = '700 11px "IBM Plex Mono", monospace';
      ctx.fillText('✖ IMPACT DETECTED', scScreenX + 18, scScreenY + 4);
      ctx.restore();
    }
  }, [
    currentTrajectory,
    comparisonTrajectory,
    safeIndex,
    referenceFrame,
    showVectors,
    showGravityField,
    showPredictedPath,
    zoom,
    pan,
    activePoint,
    points,
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (isDraggingRef.current) {
      setPan({
        x: mx - dragStartRef.current.x,
        y: my - dragStartRef.current.y,
      });
    }

    const baseScale = Math.min(rect.width, rect.height) / 520;
    const scale = baseScale * zoom;
    const centerX = rect.width * 0.5 + pan.x;
    const centerY = rect.height * 0.52 + pan.y;

    const wx = (mx - centerX) / scale;
    const wy = (centerY - my) / scale;
    setHoverCoords({ x: wx, y: wy });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - rect.left - pan.x,
      y: e.clientY - rect.top - pan.y,
    };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#070A12]">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          isDraggingRef.current = false;
          setHoverCoords(null);
        }}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Top-Left Frame & Legend Overlay */}
      <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1.5 bg-[#0B0E17]/90 border border-slate-800 px-3 py-2 rounded">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
          <span>
            Frame:{' '}
            <strong className="text-cyan-400">
              {referenceFrame === 'heliocentric'
                ? 'Heliocentric (Solar Rest Frame)'
                : 'Planet Rest Frame (Planet Fixed)'}
            </strong>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono-tabular text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-0.5 bg-cyan-400"></span>
            Trajectory
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-0.5 bg-emerald-400"></span>
            Velocity (v)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-0.5 bg-amber-400"></span>
            Gravity (Fg)
          </span>
          {comparisonTrajectory && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-0.5 border-b border-dashed border-slate-400"></span>
              Locked Run A
            </span>
          )}
        </div>
      </div>

      {/* Bottom-Right Coordinate & Pan Reset HUD */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        {(pan.x !== 0 || pan.y !== 0) && (
          <button
            onClick={() => setPan({ x: 0, y: 0 })}
            className="px-2.5 py-1 text-xs font-mono-tabular bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded transition-colors cursor-pointer"
          >
            Center View
          </button>
        )}
        <div className="pointer-events-none bg-[#0B0E17]/90 border border-slate-800 px-2.5 py-1 rounded text-[11px] font-mono-tabular text-slate-400">
          {hoverCoords
            ? `X: ${hoverCoords.x.toFixed(0)} · Y: ${hoverCoords.y.toFixed(0)} (×10³ km)`
            : 'Drag canvas to pan · Hover for coordinates'}
        </div>
      </div>
    </div>
  );
};
