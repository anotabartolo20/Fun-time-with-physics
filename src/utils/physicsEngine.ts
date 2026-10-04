import { SimulationParams, TelemetryPoint, TrajectoryResult, PresetScenario, EncounterOutcome } from '../types/simulation';

/**
 * Physical Scaling Constants:
 * Distance unit: 10^3 km (Mm)
 * Time unit: simulation seconds (1 sim unit = 1000 seconds)
 * Velocity unit: km/s (note: 1 km/s * 1000 s = 10^3 km = 1 distance unit!)
 * Therefore, if t is measured in kiloseconds (ks), 1 km/s = 1 Mm / ks!
 * Let's verify:
 * 1 km/s = 10^3 m/s.
 * Multiplied by 10^3 seconds (1 ks) = 10^6 m = 10^3 km = 1 unit of distance!
 * That makes the units 100% consistent and exact without arbitrary fudge factors!
 *
 * Let's check GM in (km/s)^2 * (10^3 km):
 * For Jupiter, GM = 1.26686534e8 km^3/s^2 = 126,686.5 (km/s)^2 * (10^3 km).
 * For a tunable planetary encounter where v_inf ~ 12-20 km/s and periapsis r_p ~ 25-80 (10^3 km):
 * Let GM_BASE = 12000 (km/s)^2 * (10^3 km) per 1.0 M_ref (approx Saturn/Neptune scale or scaled giant planet so that at r = 30 (10^3 km), v_esc = sqrt(2 * 12000 / 30) = 28.28 km/s).
 * Let's check the turning angle at v_inf = 15 km/s, r_p = 35 (10^3 km), M = 1.5:
 * GM = 18000. e = 1 + r_p * v_inf^2 / GM = 1 + 35 * 225 / 18000 = 1 + 0.4375 = 1.4375.
 * sin(delta/2) = 1 / e = 0.6956 -> delta = 88.1 degrees!
 * This produces dramatic, textbook-clear hyperbolic slingshot bends across the entire slider range.
 */
export const GM_BASE = 12000; // (km/s)^2 * (10^3 km)

export function getPlanetRadius(planetMass: number): number {
  // Visual and physical radius in 10^3 km (scales with cube root of mass)
  return 14 * Math.pow(planetMass, 0.33);
}

/**
 * Computes a complete spacecraft trajectory using 4th-Order Runge-Kutta (RK4) integration.
 * We set up the initial state so that without gravity, the spacecraft would reach its
 * closest approach to the planet at approximately t_encounter = initialDistance / relSpeed_initial.
 */
export function computeTrajectory(params: SimulationParams): TrajectoryResult {
  const {
    planetMass,
    planetSpeed,
    initialSpeed,
    initialDistance,
    approachAngle,
    aimingOffset,
  } = params;

  const GM = GM_BASE * planetMass;
  const planetRadius = getPlanetRadius(planetMass);

  // Convert approachAngle (degrees) to velocity vector in heliocentric frame.
  // Convention:
  // Planet moves strictly in the -X direction (to the left): V_p = (-planetSpeed, 0)
  // Spacecraft approaches from the bottom (-Y region) moving generally upward (+Y):
  // Angle theta is measured from the +X axis (0 deg = right, 90 deg = straight up +Y, 180 deg = left).
  // Wait: if planet moves left (-X), then:
  // - Passing behind the planet (trailing edge) and getting pulled left (-X) gives a SPEED BOOST!
  // - Passing in front of the planet (leading edge) and getting pulled right (+X) gives a SPEED BRAKE!
  const rad = (approachAngle * Math.PI) / 180;
  const vx0 = initialSpeed * Math.cos(rad);
  const vy0 = initialSpeed * Math.sin(rad);

  // Planet velocity in heliocentric frame (moves right-to-left: -planetSpeed along X)
  const vpx = -planetSpeed;
  const vpy = 0;

  // Relative initial velocity of spacecraft with respect to planet:
  const rvx0 = vx0 - vpx;
  const rvy0 = vy0 - vpy;
  const relSpeed0 = Math.hypot(rvx0, rvy0);

  // Unit vector of initial relative velocity in planet rest frame:
  const ux = rvx0 / (relSpeed0 || 1);
  const uy = rvy0 / (relSpeed0 || 1);

  // Perpendicular unit vector (rotated 90 deg clockwise so positive aimingOffset shifts to the right/front of approach)
  const px = uy;
  const py = -ux;

  // In the planet rest frame, start the spacecraft at distance `initialDistance` along the approach asymptote,
  // offset perpendicularly by `aimingOffset` (the impact parameter b).
  // Ensure starting distance is always outside planetRadius * 2.5
  const safeDist = Math.max(initialDistance, Math.abs(aimingOffset) + planetRadius * 3);
  const alongDist = Math.sqrt(Math.max(100, safeDist * safeDist - aimingOffset * aimingOffset));

  const relX0 = -ux * alongDist + px * aimingOffset;
  const relY0 = -uy * alongDist + py * aimingOffset;

  // Set planet position at t = 0 so that at t_encounter = alongDist / relSpeed0, the planet is near the origin (0, 0).
  const tEncounterEst = alongDist / Math.max(relSpeed0, 5);
  const planetX0 = -vpx * tEncounterEst;
  const planetY0 = 0;

  // Initial heliocentric position of spacecraft:
  let scX = planetX0 + relX0;
  let scY = planetY0 + relY0;
  let vx = vx0;
  let vy = vy0;

  // Total simulation duration: enough to travel well past the encounter
  const totalTime = Math.min(85, Math.max(32, tEncounterEst * 2.35));
  const dt = 0.04; // 0.04 ks = 40 seconds per RK4 step (high precision)
  const steps = Math.floor(totalTime / dt);

  const points: TelemetryPoint[] = [];
  let minDistance = Infinity;
  let periapsisIndex = 0;
  let maxSpeed = 0;
  let maxAccel = 0;
  let impacted = false;

  // Helper for gravitational acceleration at time t and spacecraft position (x, y)
  const getAccel = (t: number, x: number, y: number) => {
    const pX = planetX0 + vpx * t;
    const pY = planetY0 + vpy * t;
    const dx = pX - x;
    const dy = pY - y;
    const r2 = dx * dx + dy * dy;
    const r = Math.sqrt(r2);
    // Soften inside planet radius to prevent numerical infinity on impact
    const effR = Math.max(r, planetRadius * 0.5);
    const aMag = GM / (effR * effR);
    return {
      ax: aMag * (dx / r),
      ay: aMag * (dy / r),
      r,
      aMag,
      pX,
      pY,
    };
  };

  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    const { ax, ay, r, aMag, pX, pY } = getAccel(t, scX, scY);

    const speed = Math.hypot(vx, vy);
    const rvx = vx - vpx;
    const rvy = vy - vpy;
    const relSpeed = Math.hypot(rvx, rvy);
    const specificEnergy = 0.5 * speed * speed - GM / Math.max(r, planetRadius * 0.5);

    // Record every 2nd step to keep array size ~600-900 points for smooth 60fps scrubbing
    if (i % 2 === 0 || r <= planetRadius || i === steps) {
      const idx = points.length;
      points.push({
        t: Number(t.toFixed(2)),
        scX,
        scY,
        planetX: pX,
        planetY: pY,
        relX: scX - pX,
        relY: scY - pY,
        vx,
        vy,
        speed,
        relSpeed,
        distance: r,
        accel: aMag,
        specificEnergy,
      });

      if (r < minDistance) {
        minDistance = r;
        periapsisIndex = idx;
      }
      if (speed > maxSpeed) maxSpeed = speed;
      if (aMag > maxAccel) maxAccel = aMag;
    }

    if (r <= planetRadius) {
      impacted = true;
      break;
    }

    // RK4 Integration Step
    const k1vx = ax;
    const k1vy = ay;
    const k1rx = vx;
    const k1ry = vy;

    const a2 = getAccel(t + 0.5 * dt, scX + 0.5 * dt * k1rx, scY + 0.5 * dt * k1ry);
    const k2vx = a2.ax;
    const k2vy = a2.ay;
    const k2rx = vx + 0.5 * dt * k1vx;
    const k2ry = vy + 0.5 * dt * k1vy;

    const a3 = getAccel(t + 0.5 * dt, scX + 0.5 * dt * k2rx, scY + 0.5 * dt * k2ry);
    const k3vx = a3.ax;
    const k3vy = a3.ay;
    const k3rx = vx + 0.5 * dt * k2vx;
    const k3ry = vy + 0.5 * dt * k2vy;

    const a4 = getAccel(t + dt, scX + dt * k3rx, scY + dt * k3ry);
    const k4vx = a4.ax;
    const k4vy = a4.ay;
    const k4rx = vx + dt * k3vx;
    const k4ry = vy + dt * k3vy;

    scX += (dt / 6) * (k1rx + 2 * k2rx + 2 * k3rx + k4rx);
    scY += (dt / 6) * (k1ry + 2 * k2ry + 2 * k3ry + k4ry);
    vx += (dt / 6) * (k1vx + 2 * k2vx + 2 * k3vx + k4vx);
    vy += (dt / 6) * (k1vy + 2 * k2vy + 2 * k3vy + k4vy);
  }

  const firstPt = points[0];
  const lastPt = points[points.length - 1];
  const finalSpeed = lastPt.speed;
  const deltaV = finalSpeed - firstPt.speed;

  // Deflection angle in heliocentric frame
  const dotHelio = firstPt.vx * lastPt.vx + firstPt.vy * lastPt.vy;
  const cosHelio = Math.max(-1, Math.min(1, dotHelio / (firstPt.speed * lastPt.speed || 1)));
  const deflectionAngleDeg = (Math.acos(cosHelio) * 180) / Math.PI;

  // Deflection angle in planet rest frame
  const rvxFirst = firstPt.vx - vpx;
  const rvyFirst = firstPt.vy - vpy;
  const rvxLast = lastPt.vx - vpx;
  const rvyLast = lastPt.vy - vpy;
  const dotPlanet = rvxFirst * rvxLast + rvyFirst * rvyLast;
  const cosPlanet = Math.max(
    -1,
    Math.min(1, dotPlanet / (firstPt.relSpeed * lastPt.relSpeed || 1))
  );
  const planetFrameTurnDeg = (Math.acos(cosPlanet) * 180) / Math.PI;

  let outcome: EncounterOutcome = 'FLYBY_NEUTRAL';
  if (impacted) {
    outcome = 'IMPACT';
  } else if (deltaV > 0.6) {
    outcome = 'FLYBY_BOOST';
  } else if (deltaV < -0.6) {
    outcome = 'FLYBY_BRAKE';
  }

  return {
    params: { ...params },
    points,
    minDistance,
    periapsisIndex,
    initialSpeed: firstPt.speed,
    finalSpeed,
    deltaV,
    deflectionAngleDeg,
    planetFrameTurnDeg,
    maxSpeed,
    maxAccel,
    outcome,
    planetRadius,
  };
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'voyager-boost',
    name: 'Maximal Slingshot Boost',
    subtitle: 'Trailing-Edge Flyby (+Δv)',
    description:
      'Spacecraft approaches counter to the planet’s motion and sweeps behind its trailing edge, getting pulled along the planet’s orbital path.',
    physicsTakeaway:
      'In the planet frame, entry and exit speeds are equal. In the solar frame, turning toward the planet’s velocity vector transfers orbital kinetic energy to the spacecraft.',
    params: {
      planetMass: 1.8,
      planetSpeed: 13.0,
      initialSpeed: 14.0,
      initialDistance: 240,
      approachAngle: 60,
      aimingOffset: -42,
    },
  },
  {
    id: 'parker-brake',
    name: 'Gravity Brake Maneuver',
    subtitle: 'Leading-Edge Flyby (-Δv)',
    description:
      'Modeled after Parker Solar Probe at Venus: passing in front of the planet’s leading edge deflects the craft opposite to the planet’s orbital motion.',
    physicsTakeaway:
      'Passing ahead of the planet pulls the spacecraft backward relative to the planet’s motion, shedding heliocentric orbital speed so the probe can drop closer to the Sun.',
    params: {
      planetMass: 1.6,
      planetSpeed: 14.0,
      initialSpeed: 18.0,
      initialDistance: 240,
      approachAngle: 120,
      aimingOffset: 44,
    },
  },
  {
    id: 'stationary-planet',
    name: 'Stationary Planet Control',
    subtitle: 'Zero Net Speed Gain (Δv = 0)',
    description:
      'When the planet has zero orbital velocity, gravity bends the spacecraft’s trajectory hyperbolically, but asymptotic departure speed equals approach speed.',
    physicsTakeaway:
      'Without planetary motion (Vp = 0 km/s), gravitational potential energy converts to kinetic energy at periapsis and back again upon exit—proving a moving planet is required for a slingshot boost.',
    params: {
      planetMass: 2.0,
      planetSpeed: 0.0,
      initialSpeed: 15.0,
      initialDistance: 240,
      approachAngle: 70,
      aimingOffset: -45,
    },
  },
  {
    id: 'shallow-deflection',
    name: 'Distant Weak Flyby',
    subtitle: 'High Impact Parameter',
    description:
      'A wide pass far from the planet’s gravity well produces only a gentle trajectory bend and modest velocity transfer.',
    physicsTakeaway:
      'Gravitational acceleration falls off with the inverse square of distance (1/r²), reducing the hyperbolic turning angle and limiting Δv transfer.',
    params: {
      planetMass: 1.0,
      planetSpeed: 13.0,
      initialSpeed: 16.0,
      initialDistance: 260,
      approachAngle: 65,
      aimingOffset: -90,
    },
  },
];
