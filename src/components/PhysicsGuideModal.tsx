import React from 'react';
import { X } from 'lucide-react';

interface PhysicsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhysicsGuideModal: React.FC<PhysicsGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 text-slate-200 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-100">
              Orbital Mechanics & Gravity Assist Theory
            </h2>
            <p className="text-xs text-slate-400">
              How spacecraft gain or lose speed without expending propellant
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-slate-300">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
              1. Conservation of Energy in Two Reference Frames
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              In the <strong>Planet’s Rest Frame</strong>, gravitational potential energy converts
              into kinetic energy as the spacecraft falls toward periapsis (closest approach), and
              converts back as it climbs out. Thus, the incoming asymptotic speed{' '}
              <code className="font-mono-tabular text-cyan-300">v_∞,in</code> and outgoing speed{' '}
              <code className="font-mono-tabular text-cyan-300">v_∞,out</code> relative to the
              planet are strictly equal—only the velocity vector’s direction rotates by the
              hyperbolic turning angle <code className="font-mono-tabular text-cyan-300">δ</code>.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
              2. Why Heliocentric Speed Changes (The Elastic Bounce Analogy)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              In the <strong>Heliocentric (Solar) Frame</strong>, the planet is moving with orbital
              velocity <code className="font-mono-tabular text-cyan-300">V_p</code>. Adding the
              planet’s velocity vector to the rotated relative velocity vector{' '}
              <code className="font-mono-tabular text-cyan-300">v = v_rel + V_p</code> changes the
              spacecraft’s solar speed:
            </p>
            <ul className="list-disc list-inside text-xs text-slate-300 mt-2 space-y-1">
              <li>
                <strong>Trailing-Edge Flyby (+Δv Slingshot Boost):</strong> Passing behind the
                planet bends the spacecraft’s path toward the planet’s direction of motion,
                transferring kinetic energy from the planet to the craft.
              </li>
              <li>
                <strong>Leading-Edge Flyby (-Δv Gravity Brake):</strong> Passing in front of the
                planet bends the spacecraft’s path opposite to the planet’s motion, reducing its
                solar speed (used by missions like Parker Solar Probe and MESSENGER).
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded bg-[#0B0E17] border border-slate-800">
              <div className="text-xs font-semibold text-slate-100 mb-1">
                Hyperbolic Turning Angle (δ)
              </div>
              <div className="font-mono-tabular text-xs text-cyan-400 mb-1">
                sin(δ / 2) = 1 / (1 + r_p · v_∞² / GM)
              </div>
              <p className="text-[11px] text-slate-400">
                Increasing Planet Mass (M) or decreasing closest approach distance (r_p) increases
                the bending angle δ.
              </p>
            </div>

            <div className="p-3 rounded bg-[#0B0E17] border border-slate-800">
              <div className="text-xs font-semibold text-slate-100 mb-1">
                Inspired by BU Physics HTML5 Labs
              </div>
              <p className="text-[11px] text-slate-400">
                Combines 2D orbital slingshot dynamics, real-time force/velocity vectors, and live
                synchronized kinematic graphing with Run A/B comparison.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
          >
            Back to Simulation
          </button>
        </div>
      </div>
    </div>
  );
};
