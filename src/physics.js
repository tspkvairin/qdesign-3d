const G = 9.81;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function bounce(value, vel, min, max, restitution) {
  if (value < min) {
    return { value: min, vel: Math.abs(vel) * restitution };
  }
  if (value > max) {
    return { value: max, vel: -Math.abs(vel) * restitution };
  }
  return { value, vel };
}

function stopIfRest(vel, threshold) {
  return Math.abs(vel) < threshold ? 0 : vel;
}

export function stepDoor(mech, dt, torque = 0) {
  const inertia = Math.max(mech.inertia, 0.0008);
  let net = torque - mech.viscous * mech.omega;
  net -= Math.sign(mech.omega || net) * mech.coulomb;

  mech.omega += (net / inertia) * dt;
  mech.omega = stopIfRest(mech.omega, 0.04);
  mech.angle += mech.omega * dt;

  const hit = bounce(mech.angle, mech.omega, mech.min, mech.max, mech.restitution);
  mech.angle = hit.value;
  mech.omega = stopIfRest(hit.vel, 0.08);

  if (mech.angle < 0.035 && mech.omega <= 0.15) {
    mech.angle = 0;
    mech.omega = 0;
  }
}

export function stepDrawer(mech, dt, force = 0) {
  const mass = Math.max(mech.mass, 0.2);
  const friction = mech.mu * mass * G;
  let net = force - mech.viscous * mech.vel;
  net -= Math.sign(mech.vel || net) * friction;

  mech.vel += (net / mass) * dt;
  mech.vel = stopIfRest(mech.vel, 0.01);
  mech.pos += mech.vel * dt;

  const hit = bounce(mech.pos, mech.vel, mech.min, mech.max, mech.restitution);
  mech.pos = hit.value;
  mech.vel = stopIfRest(hit.vel, 0.02);

  if (mech.pos < 0.004 && mech.vel <= 0.05) {
    mech.pos = 0;
    mech.vel = 0;
  }
}

export function syncMechanism(mech) {
  if (mech.type === 'door') {
    mech.pivot.rotation.y = -mech.angle;
    return;
  }
  mech.pivot.position.z = mech.pos;
}

export function applyTapImpulse(mech) {
  const opening = mech.type === 'door' ? mech.angle < mech.max * 0.4 : mech.pos < mech.max * 0.4;
  if (mech.type === 'door') {
    mech.omega += opening ? 5.2 : -4.4;
    return;
  }
  mech.vel += opening ? 1.35 : -1.45;
}

export function stepAll(mechanisms, dt, drag) {
  const h = Math.min(dt, 0.04);
  const sub = 2;
  const step = h / sub;

  for (let i = 0; i < sub; i += 1) {
    mechanisms.forEach((mech) => {
      if (drag && drag.mech === mech) {
        if (mech.type === 'door') {
          const next = clamp(drag.target, mech.min, mech.max);
          mech.omega = (next - mech.angle) / Math.max(step, 1 / 120);
          mech.angle = next;
        } else {
          const next = clamp(drag.target, mech.min, mech.max);
          mech.vel = (next - mech.pos) / Math.max(step, 1 / 120);
          mech.pos = next;
        }
      } else if (mech.type === 'door') {
        stepDoor(mech, step);
      } else {
        stepDrawer(mech, step);
      }
      syncMechanism(mech);
    });
  }
}
