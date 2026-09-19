(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StaticElectricity = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Qualitative, countable teaching model. A unit is not a calibrated coulomb.
  // Positive sites remain attached to their conductor; only electrons transfer.
  const NEUTRAL_ELECTRONS = 12;
  const MAX_GROUNDED_DEFICIT = 4;
  const NEAR_DISTANCE = 0.28;
  const FIELD_END = 0.76;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function inductionStrength(distance) {
    return clamp((FIELD_END - distance) / (FIELD_END - NEAR_DISTANCE), 0, 1);
  }

  function derive(state) {
    const strength = inductionStrength(state.rodDistance);
    const electrons = NEUTRAL_ELECTRONS - state.electroscopeNetCharge;
    // Symmetric leaves carry equal charge. The top retains the remainder, so
    // even during intermediate drag positions the count is always exact.
    const leafElectrons = Math.round(3 - state.electroscopeNetCharge / 4 + strength);
    const topElectrons = electrons - 2 * leafElectrons;
    const leafCharge = 3 - leafElectrons;
    return {
      ...state,
      inductionStrength: strength,
      isRodNear: state.rodDistance <= NEAR_DISTANCE,
      electronCount: electrons,
      topElectrons,
      leafElectrons,
      topCharge: 6 - topElectrons,
      leafChargeLeft: leafCharge,
      leafChargeRight: leafCharge,
      leafAngle: Math.abs(leafCharge) * 28,
      sphereTotalCharge: state.sphereA.charge + state.sphereB.charge
    };
  }

  function createState(mission = 1) {
    if (mission !== 1 && mission !== 2) throw new RangeError('Only missions 1 and 2 are playable.');
    return derive({
      mission,
      rodCharge: 'negative',
      rodDistance: 1,
      isGrounded: false,
      electroscopeNetCharge: 0,
      earthNetCharge: 0,
      sphereA: { charge: -6, size: 1 },
      sphereB: { charge: 0, size: 1 },
      taskPhase: 'bring-rod',
      hasObservedInduction: false,
      hasGroundedNear: false,
      isolatedPositive: false,
      operationComplete: false,
      completed: false,
      answer: null,
      feedback: 'ready',
      lastEvent: { kind: 'reset', electronTransfer: 0 },
      revision: 0
    });
  }

  function updateTask(previous, next, action) {
    if (next.mission === 1) {
      if (next.isRodNear && next.electroscopeNetCharge === 0) {
        next.hasObservedInduction = true;
        next.operationComplete = true;
        next.taskPhase = 'check-charge';
        next.feedback = 'induced-neutral';
      } else {
        next.operationComplete = false;
        next.taskPhase = 'bring-rod';
        next.feedback = next.hasObservedInduction ? 'induction-reversed' : 'ready';
      }
      return next;
    }

    if (next.isGrounded && next.isRodNear && next.electroscopeNetCharge > 0) {
      next.hasObservedInduction = true;
      next.hasGroundedNear = true;
      next.isolatedPositive = false;
      next.operationComplete = false;
      next.taskPhase = 'disconnect-ground';
      next.feedback = 'electrons-to-earth';
      return next;
    }

    if (action.type === 'SET_GROUNDED' && !next.isGrounded && previous.isGrounded &&
        next.isRodNear && next.hasGroundedNear && next.electroscopeNetCharge > 0) {
      next.isolatedPositive = true;
      next.taskPhase = 'remove-rod';
      next.feedback = 'charge-isolated';
      return next;
    }

    if (next.inductionStrength === 0 && next.isGrounded &&
        (previous.hasGroundedNear || previous.isolatedPositive)) {
      next.hasGroundedNear = false;
      next.isolatedPositive = false;
      next.operationComplete = false;
      next.taskPhase = 'bring-rod';
      next.feedback = 'wrong-order';
      return next;
    }

    if (next.isolatedPositive && !next.isGrounded && next.electroscopeNetCharge > 0) {
      next.operationComplete = next.inductionStrength === 0;
      next.taskPhase = next.operationComplete ? 'check-charge' : 'remove-rod';
      next.feedback = next.operationComplete ? 'positive-remains' : 'charge-isolated';
      return next;
    }

    if (next.isGrounded) {
      next.operationComplete = false;
      next.taskPhase = 'bring-rod';
      if (next.electroscopeNetCharge === 0) {
        next.isolatedPositive = false;
        next.hasGroundedNear = false;
        next.feedback = previous.electroscopeNetCharge > 0 ? 'wrong-order' : 'ground-without-rod';
      }
      return next;
    }

    if (next.isRodNear) {
      next.hasObservedInduction = true;
      next.taskPhase = 'connect-ground';
      next.feedback = 'ready-to-ground';
    } else if (next.inductionStrength === 0) {
      next.taskPhase = 'bring-rod';
      // Keep the actionable wrong-order explanation when the player lets go.
      if (previous.feedback !== 'wrong-order') {
        next.feedback = next.hasObservedInduction ? 'rod-too-early' : 'ready';
      }
    }
    return next;
  }

  function reduce(previous, action) {
    if (!action || typeof action.type !== 'string') throw new TypeError('An action type is required.');
    if (action.type === 'RESET') return createState(previous.mission);

    if (action.type === 'ANSWER') {
      if (!['positive', 'negative', 'neutral'].includes(action.value)) {
        throw new RangeError('Unknown charge answer.');
      }
      if (previous.completed) return previous;
      if (!previous.operationComplete) return { ...previous, feedback: 'observe-first' };
      const correct = action.value === (previous.mission === 1 ? 'neutral' : 'positive');
      return {
        ...previous,
        answer: action.value,
        completed: correct,
        taskPhase: correct ? 'complete' : 'check-charge',
        feedback: correct ? 'concept-correct' : (previous.mission === 1 ? 'not-net-charge' : 'electrons-left'),
        lastEvent: { kind: correct ? 'completed' : 'answer-again', electronTransfer: 0 },
        revision: previous.revision + 1
      };
    }

    let next = { ...previous, revision: previous.revision + 1 };
    if (action.type === 'MOVE_ROD') {
      if (!Number.isFinite(action.distance)) throw new TypeError('Rod distance must be finite.');
      next.rodDistance = clamp(action.distance, 0, 1);
      if (next.rodDistance === previous.rodDistance) return previous;
    } else if (action.type === 'SET_GROUNDED') {
      if (typeof action.value !== 'boolean') throw new TypeError('Grounding state must be boolean.');
      if (next.mission === 1 || action.value === previous.isGrounded) return previous;
      next.isGrounded = action.value;
    } else {
      throw new RangeError('Unknown action: ' + action.type);
    }

    // This is the only electron-exchange boundary. Moving an isolated rod never
    // changes the net charge; a grounded apparatus exchanges with Earth only.
    if (next.isGrounded) {
      next.electroscopeNetCharge = Math.round(MAX_GROUNDED_DEFICIT * inductionStrength(next.rodDistance));
      next.earthNetCharge = -next.electroscopeNetCharge;
    }
    const transfer = next.electroscopeNetCharge - previous.electroscopeNetCharge;
    next.lastEvent = {
      kind: transfer > 0 ? 'to-earth' : transfer < 0 ? 'from-earth' :
        action.type === 'MOVE_ROD' ? 'redistribution' : next.isGrounded ? 'ground-connected' : 'ground-disconnected',
      electronTransfer: transfer
    };
    next = updateTask(previous, derive(next), action);
    // An earned learning result is durable; further exploration still uses the
    // real current physical state and never freezes the apparatus.
    if (previous.completed) {
      next.completed = true;
      next.taskPhase = 'complete';
    }
    return next;
  }

  function contactEqualSpheres(sphereA, sphereB) {
    if (!sphereA || !sphereB || !Number.isFinite(sphereA.charge) || !Number.isFinite(sphereB.charge)) {
      throw new TypeError('Two finite charges are required.');
    }
    if (!(sphereA.size > 0) || sphereA.size !== sphereB.size) {
      throw new RangeError('This room only models equal-sized conducting spheres.');
    }
    const shared = (sphereA.charge + sphereB.charge) / 2;
    return { sphereA: { ...sphereA, charge: shared }, sphereB: { ...sphereB, charge: shared } };
  }

  function checkInvariants(state) {
    const errors = [];
    if (state.electroscopeNetCharge + state.earthNetCharge !== 0) errors.push('electroscope + Earth must conserve charge');
    if (state.electronCount + state.electroscopeNetCharge !== NEUTRAL_ELECTRONS) errors.push('charge must match the electron count');
    if (state.topElectrons + 2 * state.leafElectrons !== state.electronCount) errors.push('electron regions must sum exactly');
    if (state.topCharge + state.leafChargeLeft + state.leafChargeRight !== state.electroscopeNetCharge) errors.push('regional charge must sum exactly');
    if (state.leafChargeLeft !== state.leafChargeRight) errors.push('symmetric leaves must have equal charge');
    if (!Number.isInteger(state.electroscopeNetCharge)) errors.push('net charge must be in whole model units');
    if (state.rodCharge !== 'negative') errors.push('this room has a negative rod only');
    if (state.topElectrons < 0 || state.leafElectrons < 0) errors.push('electron counts cannot be negative');
    return errors;
  }

  return Object.freeze({
    createState, reduce, inductionStrength, contactEqualSpheres, checkInvariants,
    constants: Object.freeze({ NEUTRAL_ELECTRONS, MAX_GROUNDED_DEFICIT, NEAR_DISTANCE, FIELD_END })
  });
});
