export function collectMorphTargets(scene) {
  const names = [];
  const seen = new Set();

  scene.traverse((child) => {
    if (child.isMesh && child.morphTargetDictionary) {
      Object.keys(child.morphTargetDictionary).forEach((name) => {
        if (!seen.has(name)) {
          seen.add(name);
          names.push(name);
        }
      });
    }
  });

  return names.sort();
}

export function setMorphTargetWeight(scene, targetName, weight) {
  scene.traverse((child) => {
    if (child.isMesh && child.morphTargetDictionary) {
      const idx = child.morphTargetDictionary[targetName];
      if (idx !== undefined) {
        child.morphTargetInfluences[idx] = weight;
      }
    }
  });
}

export function buildLevaMorphConfig(scene) {
  const targets = collectMorphTargets(scene);
  if (targets.length === 0) return null;

  const config = {};
  targets.forEach((name) => {
    config[name] = {
      value: 0,
      min: 0,
      max: 1,
      step: 0.01,
      label: name.replace(/([A-Z])/g, ' $1').trim(),
    };
  });

  return config;
}

export function resetAllMorphTargets(scene) {
  scene.traverse((child) => {
    if (child.isMesh && child.morphTargetDictionary) {
      child.morphTargetInfluences.forEach((_, i) => {
        child.morphTargetInfluences[i] = 0;
      });
    }
  });
}
