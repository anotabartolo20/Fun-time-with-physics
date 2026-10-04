import React from 'react';
import { Play, Pause, RotateCcw, StepForward, StepBack, BookmarkCheck, Trash2, Compass } from 'lucide-react';
import { SimulationParams, TrajectoryResult, ReferenceFrame } from '../types/simulation';

interface ParameterDeckProps {
  params: SimulationParams;
  onChangeParam: <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onResetPlayback: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  playbackSpeed: number;
  onChangePlaybackSpeed: (speed: number) => void;
  referenceFrame: ReferenceFrame;
  onChangeReferenceFrame: (frame: ReferenceFrame) => void;
  showVectors: boolean;
  onToggleVectors: () => void;
  showGravityField: boolean;
  onToggleGravityField: () => void;
  showPredictedPath: boolean;
  onTogglePredictedPath: () => void;
  currentTrajectory: TrajectoryResult;
  comparisonTrajectory: TrajectoryResult | null;
  onLockComparison: () => void;
  onClearComparison: () => void;
  activePresetId: string;
}

export const ParameterDeck: React.FC<ParameterDeckProps> = ({
  params,
  onChangeParam,
  isPlaying,
  onTogglePlay,
  onResetPlayback,
  onStepForward,
  onStepBack,
  playbackSpeed,
  onChangePlaybackSpeed,
  referenceFrame,
  onChangeReferenceFrame,
  showVectors,
  onToggleVectors,
  showGravityField,
  onToggleGravityField,
  showPredictedPath,
  onTogglePredictedPath,
  currentTrajectory,
  comparisonTrajectory,
  onLockComparison,
  onClearComparison,
}) => {
  return (
    <aside className="w-full lg:w-[370px] xl:w-[390px] shrink-0 bg-[#111827] border-r border-slate-800 flex flex-col justify-between overflow-y-auto">
      <div className="p-4 space-y-5">
        {/* 1. Playback & Reference Frame Controls */}
        <section className="space-y-3 pb-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-400">
              01. Simulation Playback
            </h2>
            <div className="flex items-center gap-1">
              {[0.5, 1, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => onChangePlaybackSpeed(spd)}
                  className={`px-2 py-0.5 text-[11px] font-mono-tabular rounded transition-colors cursor-pointer ${
                    playbackSpeed === spd
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePlay}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause Encounter' : 'Launch / Resume'}</span>
            </button>

            <button
              onClick={onStepBack}
              title="Step Backward"
              className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <StepBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onStepForward}
              title="Step Forward"
              className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <StepForward className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onResetPlayback}
              title="Reset to T = 0"
              className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reference Frame Segmented Switch */}
          <div className="pt-1">
            <label className="block text-[11px] text-slate-400 mb-1.5">
              Observer Reference Frame
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#0B0E17] border border-slate-800 rounded">
              <button
                onClick={() => onChangeReferenceFrame('heliocentric')}
                className={`py-1.5 px-2.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  referenceFrame === 'heliocentric'
                    ? 'bg-slate-800 text-cyan-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Heliocentric (Sun)
              </button>
              <button
                onClick={() => onChangeReferenceFrame('planet')}
                className={`py-1.5 px-2.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  referenceFrame === 'planet'
                    ? 'bg-slate-800 text-cyan-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Planet Rest Frame
              </button>
            </div>
          </div>
        </section>

        {/* 2. Primary Physics Sliders (The 4 Core Group Variables + Planet Speed & Aim Offset) */}
        <section className="space-y-4 pb-4 border-b border-slate-800">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            02. Initial Conditions & Parameters
          </h2>

          {/* Variable 1: Planet Mass */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="slider-mass" className="font-medium text-slate-200">
                Planet Mass (M)
              </label>
              <span className="font-mono-tabular font-semibold text-cyan-400">
                {params.planetMass.toFixed(2)}{' '}
                <span className="text-[11px] font-normal text-slate-400">M_Jup</span>
              </span>
            </div>
            <input
              id="slider-mass"
              type="range"
              min={0.2}
              max={4.0}
              step={0.1}
              value={params.planetMass}
              onChange={(e) => onChangeParam('planetMass', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] font-mono-tabular text-slate-500">
              <span>0.2 M_Jup (Light)</span>
              <span>2.0 M_Jup</span>
              <span>4.0 M_Jup (Massive)</span>
            </div>
          </div>

          {/* Variable 2: Spacecraft Starting Velocity */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="slider-v0" className="font-medium text-slate-200">
                Spacecraft Starting Velocity (v₀)
              </label>
              <span className="font-mono-tabular font-semibold text-cyan-400">
                {params.initialSpeed.toFixed(1)}{' '}
                <span className="text-[11px] font-normal text-slate-400">km/s</span>
              </span>
            </div>
            <input
              id="slider-v0"
              type="range"
              min={8.0}
              max={30.0}
              step={0.5}
              value={params.initialSpeed}
              onChange={(e) => onChangeParam('initialSpeed', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] font-mono-tabular text-slate-500">
              <span>8.0 km/s</span>
              <span>19.0 km/s</span>
              <span>30.0 km/s</span>
            </div>
          </div>

          {/* Variable 3: Spacecraft Starting Distance */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="slider-r0" className="font-medium text-slate-200">
                Starting Distance (r₀)
              </label>
              <span className="font-mono-tabular font-semibold text-cyan-400">
                {params.initialDistance.toFixed(0)}{' '}
                <span className="text-[11px] font-normal text-slate-400">×10³ km</span>
              </span>
            </div>
            <input
              id="slider-r0"
              type="range"
              min={140}
              max={340}
              step={10}
              value={params.initialDistance}
              onChange={(e) => onChangeParam('initialDistance', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] font-mono-tabular text-slate-500">
              <span>140 ×10³ km (Close)</span>
              <span>240</span>
              <span>340 ×10³ km (Far)</span>
            </div>
          </div>

          {/* Variable 4: Spacecraft Approach Angle */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="slider-angle" className="font-medium text-slate-200">
                Approach Angle (θ)
              </label>
              <span className="font-mono-tabular font-semibold text-cyan-400">
                {params.approachAngle.toFixed(0)}°{' '}
                <span className="text-[11px] font-normal text-slate-400">
                  {params.approachAngle < 85
                    ? 'Head-On'
                    : params.approachAngle > 95
                    ? 'Tail-Chase'
                    : 'Perpendicular'}
                </span>
              </span>
            </div>
            <input
              id="slider-angle"
              type="range"
              min={25}
              max={155}
              step={1}
              value={params.approachAngle}
              onChange={(e) => onChangeParam('approachAngle', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] font-mono-tabular text-slate-500">
              <span>25° (Against Orbit)</span>
              <span>90° (⊥)</span>
              <span>155° (With Orbit)</span>
            </div>
          </div>

          {/* Variable 5: Aiming Offset / Flyby Side (Trailing vs Leading Edge) */}
          <div className="space-y-1 pt-1 border-t border-slate-800/70">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="slider-impact" className="font-medium text-slate-200">
                Flyby Corridor Offset (b)
              </label>
              <span className="font-mono-tabular font-semibold text-cyan-400">
                {params.aimingOffset > 0 ? `+${params.aimingOffset}` : params.aimingOffset}{' '}
                <span className="text-[11px] font-normal text-slate-400">
                  {params.aimingOffset < -5
                    ? 'Trailing (Boost)'
                    : params.aimingOffset > 5
                    ? 'Leading (Brake)'
                    : 'Direct Center'}
                </span>
              </span>
            </div>
            <input
              id="slider-impact"
              type="range"
              min={-110}
              max={110}
              step={2}
              value={params.aimingOffset}
              onChange={(e) => onChangeParam('aimingOffset', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] font-mono-tabular text-slate-500">
              <span>-110 (Behind Planet)</span>
              <span>0</span>
              <span>+110 (In Front)</span>
            </div>
          </div>

          {/* Variable 6: Planet Orbital Speed */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="slider-vp" className="font-medium text-slate-200">
                Planet Orbital Velocity (Vp)
              </label>
              <span className="font-mono-tabular font-semibold text-cyan-400">
                {params.planetSpeed.toFixed(1)}{' '}
                <span className="text-[11px] font-normal text-slate-400">km/s</span>
              </span>
            </div>
            <input
              id="slider-vp"
              type="range"
              min={0.0}
              max={22.0}
              step={0.5}
              value={params.planetSpeed}
              onChange={(e) => onChangeParam('planetSpeed', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] font-mono-tabular text-slate-500">
              <span>0 km/s (Stationary)</span>
              <span>13 km/s (Jupiter)</span>
              <span>22 km/s</span>
            </div>
          </div>
        </section>

        {/* 3. Vector & Field Layer Toggles + Trial A/B Comparison */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            03. Visual Overlays & Trial Comparison
          </h2>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={onToggleVectors}
              className={`py-1.5 px-2 text-[11px] font-medium rounded border transition-colors cursor-pointer whitespace-nowrap ${
                showVectors
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Vectors (v, Fg)
            </button>
            <button
              onClick={onToggleGravityField}
              className={`py-1.5 px-2 text-[11px] font-medium rounded border transition-colors cursor-pointer whitespace-nowrap ${
                showGravityField
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Gravity Rings
            </button>
            <button
              onClick={onTogglePredictedPath}
              className={`py-1.5 px-2 text-[11px] font-medium rounded border transition-colors cursor-pointer whitespace-nowrap ${
                showPredictedPath
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Asymptotes
            </button>
          </div>

          {/* Lock Trial A vs B Comparison (Inspired by BU 1Dmotion_graphs_twoa) */}
          <div className="pt-1 flex items-center gap-2">
            <button
              onClick={onLockComparison}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>{comparisonTrajectory ? 'Update Locked Run A' : 'Lock Run A for Comparison'}</span>
            </button>
            {comparisonTrajectory && (
              <button
                onClick={onClearComparison}
                title="Clear Run A Comparison"
                className="p-2 rounded bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Comparison Delta Summary if Run A is locked */}
          {comparisonTrajectory && (
            <div className="p-2.5 rounded bg-[#0B0E17] border border-slate-800 text-[11px] font-mono-tabular space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>Run A (Locked):</span>
                <span>
                  v_f = {comparisonTrajectory.finalSpeed.toFixed(1)} km/s (Δv{' '}
                  {comparisonTrajectory.deltaV >= 0 ? '+' : ''}
                  {comparisonTrajectory.deltaV.toFixed(1)})
                </span>
              </div>
              <div className="flex items-center justify-between text-cyan-300">
                <span>Run B (Current):</span>
                <span>
                  v_f = {currentTrajectory.finalSpeed.toFixed(1)} km/s (Δv{' '}
                  {currentTrajectory.deltaV >= 0 ? '+' : ''}
                  {currentTrajectory.deltaV.toFixed(1)})
                </span>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Bottom Physics Note */}
      <div className="p-3.5 border-t border-slate-800 bg-[#0B0E17]/60 text-xs text-slate-400 leading-relaxed">
        <div className="flex items-center gap-1.5 text-slate-200 font-semibold mb-1">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>Slingshot Principle</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Switch between <strong className="text-slate-200">Heliocentric</strong> and{' '}
          <strong className="text-slate-200">Planet Rest Frame</strong> to verify why spacecraft
          exit speed matches entry speed relative to the planet, yet gains up to{' '}
          <span className="font-mono-tabular text-cyan-400">2·Vp</span> in solar speed.
        </p>
      </div>
    </aside>
  );
};
