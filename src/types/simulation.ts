export interface SimulationParams {
  /** Planet Mass Multiplier (1.0 = Reference Giant Planet, range 0.2 to 5.0) */
  planetMass: number;
  /** Planet Orbital Speed in Heliocentric Frame (km/s, range 0 to 25) */
  planetSpeed: number;
  /** Spacecraft Starting Velocity Magnitude in Heliocentric Frame (km/s, range 8 to 35) */
  initialSpeed: number;
  /** Spacecraft Starting Distance from Encounter Origin (10^3 km, range 120 to 360) */
  initialDistance: number;
  /** Spacecraft Approach Angle in degrees (range 15 to 165, where 90 is straight up +Y, <90 is head-on/against planet motion, >90 is tail-chase/with planet motion) */
  approachAngle: number;
  /** Impact Parameter / Aiming Offset in 10^3 km (range -120 to +120, negative passes behind planet in -X, positive passes in front +X) */
  aimingOffset: number;
}

export interface TelemetryPoint {
  t: number; // elapsed seconds (scaled simulation seconds)
  scX: number; // heliocentric X (10^3 km)
  scY: number; // heliocentric Y (10^3 km)
  planetX: number; // heliocentric planet X (10^3 km)
  planetY: number; // heliocentric planet Y (10^3 km)
  relX: number; // planet-frame X
  relY: number; // planet-frame Y
  vx: number; // heliocentric vx (km/s)
  vy: number; // heliocentric vy (km/s)
  speed: number; // heliocentric speed |v| (km/s)
  relSpeed: number; // speed relative to planet |v - V_p| (km/s)
  distance: number; // distance to planet center r (10^3 km)
  accel: number; // gravitational acceleration magnitude |a| (m/s^2 equivalent scaled)
  specificEnergy: number; // v^2/2 - GM/r in heliocentric vs planet frame
}

export type EncounterOutcome = 'FLYBY_BOOST' | 'FLYBY_BRAKE' | 'FLYBY_NEUTRAL' | 'IMPACT' | 'IN_PROGRESS';

export interface TrajectoryResult {
  params: SimulationParams;
  points: TelemetryPoint[];
  minDistance: number;
  periapsisIndex: number;
  initialSpeed: number;
  finalSpeed: number;
  deltaV: number;
  deflectionAngleDeg: number; // turning angle in heliocentric frame
  planetFrameTurnDeg: number; // turning angle in planet rest frame
  maxSpeed: number;
  maxAccel: number;
  outcome: EncounterOutcome;
  planetRadius: number; // 10^3 km
}

export interface PresetScenario {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  physicsTakeaway: string;
  params: SimulationParams;
}

export type ReferenceFrame = 'heliocentric' | 'planet';

export type GraphMode = 'velocity' | 'distance' | 'acceleration';
