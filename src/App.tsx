/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ZoomIn, ZoomOut, BookOpen, RotateCcw } from 'lucide-react';
import {
  SimulationParams,
  TrajectoryResult,
  ReferenceFrame,
  GraphMode,
} from './types/simulation';
import { computeTrajectory, PRESET_SCENARIOS } from './utils/physicsEngine';
import { OrbitalCanvas } from './components/OrbitalCanvas';
import { KinematicsGraphs } from './components/KinematicsGraphs';
import { ParameterDeck } from './components/ParameterDeck';
import { PhysicsGuideModal } from './components/PhysicsGuideModal';

export default function App() {
  // Initial simulation state from Default Preset ("Voyager Boost")
  const [params, setParams] = useState<SimulationParams>(PRESET_SCENARIOS[0].params);
  const [activePresetId, setActivePresetId] = useState<string>(PRESET_SCENARIOS[0].id);

  // Playback state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // View & HUD options
  const [referenceFrame, setReferenceFrame] = useState<ReferenceFrame>('heliocentric');
  const [graphMode, setGraphMode] = useState<GraphMode>('velocity');
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showGravityField, setShowGravityField] = useState<boolean>(true);
  const [showPredictedPath, setShowPredictedPath] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Locked Comparison Run A (inspired by BU 1Dmotion_graphs_twoa)
  const [comparisonTrajectory, setComparisonTrajectory] = useState<TrajectoryResult | null>(null);

  // Compute current trajectory using RK4 integrator whenever parameters change
  const currentTrajectory = useMemo(() => {
    return computeTrajectory(params);
  }, [params]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const totalPoints = currentTrajectory.points.length;
    if (currentIndex >= totalPoints - 1) {
      setIsPlaying(false);
      return;
    }

    const intervalMs = 20;
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => {
        const step = playbackSpeed === 0.5 ? 1 : playbackSpeed === 1 ? 2 : 4;
        const next = prev + step;
        if (next >= totalPoints - 1) {
          setIsPlaying(false);
          return totalPoints - 1;
        }
        return next;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isPlaying, playbackSpeed, currentTrajectory.points.length, currentIndex]);

  // Parameter change handler
  const handleChangeParam = <K extends keyof SimulationParams>(
    key: K,
    value: SimulationParams[K]
  ) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }));
    setActivePresetId('custom');
  };

  // Select a preset scenario
  const handleSelectPreset = (presetId: string) => {
    const found = PRESET_SCENARIOS.find((p) => p.id === presetId);
    if (!found) return;
    setParams({ ...found.params });
    setActivePresetId(found.id);
    setCurrentIndex(0);
    setIsPlaying(true);
  };

  const handleTogglePlay = () => {
    const maxIdx = currentTrajectory.points.length - 1;
    if (currentIndex >= maxIdx) {
      setCurrentIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  const handleResetPlayback = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.min(currentTrajectory.points.length - 1, prev + 8));
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.max(0, prev - 8));
  };

  const safeIndex = Math.min(currentIndex, currentTrajectory.points.length - 1);
  const activePoint = currentTrajectory.points[safeIndex] || currentTrajectory.points[0];

  // Outcome status formatting (Explicit text + icon glyph, never hue alone)
  const getOutcomeStatus = () => {
    if (currentTrajectory.outcome === 'IMPACT') {
      return {
        label: '✖ SURFACE IMPACT',
        colorClass: 'text-rose-400',
        dotClass: 'bg-rose-500 ring-4 ring-rose-500/20',
      };
    }
    if (currentTrajectory.outcome === 'FLYBY_BOOST') {
      return {
        label: '▲ GRAVITY BOOST (+Δv)',
        colorClass: 'text-emerald-400',
        dotClass: 'bg-emerald-500 ring-4 ring-emerald-500/20',
      };
    }
    if (currentTrajectory.outcome === 'FLYBY_BRAKE') {
      return {
        label: '▼ GRAVITY BRAKE (-Δv)',
        colorClass: 'text-amber-400',
        dotClass: 'bg-amber-500 ring-4 ring-amber-500/20',
      };
    }
    return {
      label: '● NEUTRAL DEFLECTION (Δv ≈ 0)',
      colorClass: 'text-cyan-400',
      dotClass: 'bg-cyan-500 ring-4 ring-cyan-500/20',
    };
  };

  const statusInfo = getOutcomeStatus();

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[#0B0E17] text-slate-100 overflow-x-hidden">
      {/* 1. Strict 3-Zone Top Navigation Bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-[#0B0E17] shrink-0">
        {/* Zone 1: Single Text Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleSelectPreset(PRESET_SCENARIOS[0].id);
          }}
          className="font-display text-base md:text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap"
        >
          Gravitational Assist Lab
        </a>

        {/* Zone 2: 4 Clean Preset Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          {PRESET_SCENARIOS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              className={`py-1 transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
                activePresetId === preset.id
                  ? 'text-cyan-300 border-cyan-400 font-semibold'
                  : 'border-transparent hover:text-slate-100'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </nav>

        {/* Zone 3: 2 Primary Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded transition-colors whitespace-nowrap cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Physics Guide</span>
          </button>
          <button
            onClick={() => {
              handleSelectPreset(PRESET_SCENARIOS[0].id);
              setComparisonTrajectory(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-500 hover:bg-cyan-400 rounded transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Lab</span>
          </button>
        </div>
      </header>

      {/* 2. Main Asymmetric Split Console */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Control & Parameter Column */}
        <ParameterDeck
          params={params}
          onChangeParam={handleChangeParam}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onResetPlayback={handleResetPlayback}
          onStepForward={handleStepForward}
          onStepBack={handleStepBack}
          playbackSpeed={playbackSpeed}
          onChangePlaybackSpeed={setPlaybackSpeed}
          referenceFrame={referenceFrame}
          onChangeReferenceFrame={setReferenceFrame}
          showVectors={showVectors}
          onToggleVectors={() => setShowVectors((v) => !v)}
          showGravityField={showGravityField}
          onToggleGravityField={() => setShowGravityField((g) => !g)}
          showPredictedPath={showPredictedPath}
          onTogglePredictedPath={() => setShowPredictedPath((p) => !p)}
          currentTrajectory={currentTrajectory}
          comparisonTrajectory={comparisonTrajectory}
          onLockComparison={() => setComparisonTrajectory(currentTrajectory)}
          onClearComparison={() => setComparisonTrajectory(null)}
          activePresetId={activePresetId}
        />

        {/* Right Interactive Viewport + Telemetry Ribbon + Synchronized Graphs */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Top Telemetry Summary Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-slate-800 bg-[#111827] divide-y sm:divide-y-0 sm:divide-x divide-slate-800 shrink-0">
            {/* Metric 1: Encounter Classification */}
            <div className="px-4 py-2.5 flex flex-col justify-center">
              <span className="text-[10px] tracking-wider uppercase text-slate-400 font-medium">
                Maneuver Outcome
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`}></span>
                <span className={`text-xs font-mono-tabular font-semibold ${statusInfo.colorClass}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>

            {/* Metric 2: Net Speed Change (Delta v) */}
            <div className="px-4 py-2.5 flex flex-col justify-center">
              <span className="text-[10px] tracking-wider uppercase text-slate-400 font-medium">
                Net Solar Speed Δv
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span
                  className={`text-xl font-mono-tabular font-bold ${
                    currentTrajectory.deltaV > 0.5
                      ? 'text-emerald-400'
                      : currentTrajectory.deltaV < -0.5
                      ? 'text-amber-400'
                      : 'text-slate-100'
                  }`}
                >
                  {currentTrajectory.deltaV >= 0 ? '+' : ''}
                  {currentTrajectory.deltaV.toFixed(2)}
                </span>
                <span className="text-xs font-mono-tabular text-slate-400">km/s</span>
                <span className="text-[11px] font-mono-tabular text-slate-500 ml-1">
                  ({((currentTrajectory.deltaV / currentTrajectory.initialSpeed) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>

            {/* Metric 3: Instantaneous Velocity */}
            <div className="px-4 py-2.5 flex flex-col justify-center">
              <span className="text-[10px] tracking-wider uppercase text-slate-400 font-medium">
                Current Speed |v(t)|
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-mono-tabular font-bold text-slate-100">
                  {(referenceFrame === 'heliocentric'
                    ? activePoint.speed
                    : activePoint.relSpeed
                  ).toFixed(2)}
                </span>
                <span className="text-xs font-mono-tabular text-slate-400">km/s</span>
                <span className="text-[11px] font-mono-tabular text-slate-500 ml-1">
                  (v_f: {currentTrajectory.finalSpeed.toFixed(1)})
                </span>
              </div>
            </div>

            {/* Metric 4: Closest Approach (Periapsis) */}
            <div className="px-4 py-2.5 flex flex-col justify-center">
              <span className="text-[10px] tracking-wider uppercase text-slate-400 font-medium">
                Periapsis Distance (r_min)
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-mono-tabular font-bold text-slate-100">
                  {currentTrajectory.minDistance.toFixed(1)}
                </span>
                <span className="text-xs font-mono-tabular text-slate-400">×10³ km</span>
              </div>
            </div>

            {/* Metric 5: Deflection Angle */}
            <div className="px-4 py-2.5 flex flex-col justify-center">
              <span className="text-[10px] tracking-wider uppercase text-slate-400 font-medium">
                Deflection Angle (δ)
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-mono-tabular font-bold text-cyan-400">
                  {(referenceFrame === 'heliocentric'
                    ? currentTrajectory.deflectionAngleDeg
                    : currentTrajectory.planetFrameTurnDeg
                  ).toFixed(1)}
                  °
                </span>
                <span className="text-[11px] font-mono-tabular text-slate-400">
                  {referenceFrame === 'heliocentric' ? 'Solar Frame' : 'Planet Frame'}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive 2D Orbital Canvas Stage */}
          <div className="relative flex-1 min-h-[340px] w-full">
            <OrbitalCanvas
              currentTrajectory={currentTrajectory}
              comparisonTrajectory={comparisonTrajectory}
              currentIndex={safeIndex}
              referenceFrame={referenceFrame}
              showVectors={showVectors}
              showGravityField={showGravityField}
              showPredictedPath={showPredictedPath}
              zoom={zoom}
              onSelectStep={(idx) => {
                setIsPlaying(false);
                setCurrentIndex(idx);
              }}
            />

            {/* Top-Right Zoom & Time Scrubber Controls Overlay */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#0B0E17]/90 border border-slate-800 p-1 rounded">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.2).toFixed(1))))}
                title="Zoom Out"
                className="p-1.5 rounded hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-[11px] font-mono-tabular text-slate-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.2).toFixed(1))))}
                title="Zoom In"
                className="p-1.5 rounded hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Time-Series & Kinematic Graphs Tray (220px) */}
          <div className="h-[220px] shrink-0">
            <KinematicsGraphs
              currentTrajectory={currentTrajectory}
              comparisonTrajectory={comparisonTrajectory}
              currentIndex={safeIndex}
              graphMode={graphMode}
              referenceFrame={referenceFrame}
              onSelectGraphMode={setGraphMode}
              onScrubIndex={(idx) => {
                setIsPlaying(false);
                setCurrentIndex(idx);
              }}
            />
          </div>
        </div>
      </main>

      {/* Physics Theory & Equations Modal */}
      <PhysicsGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
