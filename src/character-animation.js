(function (root) {
  'use strict';
  // A static, balanced resting pose derived from a full gait cycle. The supplied
  // GLB has only a walking clip; never freeze it on a one-legged walking frame.
  function makeRestClip(T, walk) {
    const samples = 32;
    const tracks = walk.tracks.map(track => {
      const size = track.getValueSize(), mean = new Float32Array(size);
      const interpolant = track.createInterpolant();
      const quaternion = track.ValueTypeName === 'quaternion';
      const reference = Array.from(interpolant.evaluate(0));
      for (let i = 0; i < samples; i++) {
        const value = interpolant.evaluate(walk.duration * i / samples);
        const sign = quaternion && value.reduce((sum, v, j) => sum + v * reference[j], 0) < 0 ? -1 : 1;
        for (let j = 0; j < size; j++) mean[j] += sign * value[j] / samples;
      }
      if (quaternion) {
        const length = Math.hypot(...mean);
        for (let j = 0; j < size; j++) mean[j] /= length || 1;
      }
      return new track.constructor(track.name, [0, 1], [...mean, ...mean]);
    });
    return new T.AnimationClip('March_Rest_From_Walk', 1, tracks);
  }
  root.LabCharacterAnimation = Object.freeze({ makeRestClip });
})(typeof window === 'undefined' ? globalThis : window);
