const EXPRESSIONS = {
  neutral: {
    label: 'Neutral',
    morphTargets: {
      browInnerUp: 0,
      browOuterUpLeft: 0,
      browOuterUpRight: 0,
      jawOpen: 0,
      mouthSmileLeft: 0,
      mouthSmileRight: 0,
      eyeBlinkLeft: 0,
      eyeBlinkRight: 0,
    },
  },

  happy: {
    label: 'Happy',
    morphTargets: {
      browInnerUp: 0.1,
      browOuterUpLeft: 0.4,
      browOuterUpRight: 0.4,
      cheekSquintLeft: 0.3,
      cheekSquintRight: 0.3,
      mouthSmileLeft: 0.7,
      mouthSmileRight: 0.7,
      mouthDimpleLeft: 0.3,
      mouthDimpleRight: 0.3,
    },
  },

  angry: {
    label: 'Angry',
    morphTargets: {
      browDownLeft: 0.8,
      browDownRight: 0.8,
      browInnerUp: 0.3,
      mouthPressLeft: 0.6,
      mouthPressRight: 0.6,
      mouthFrownLeft: 0.4,
      mouthFrownRight: 0.4,
      eyeWideLeft: 0.3,
      eyeWideRight: 0.3,
      noseWrinklerLeft: 0.5,
      noseWrinklerRight: 0.5,
    },
  },

  thinking: {
    label: 'Thinking',
    morphTargets: {
      browInnerUp: 0.6,
      eyeSquintLeft: 0.3,
      eyeSquintRight: 0.3,
      mouthPressLeft: 0.2,
      mouthPressRight: 0.2,
      jawSidewaysLeft: 0.2,
    },
  },

  confident: {
    label: 'Confident',
    morphTargets: {
      browOuterUpLeft: 0.3,
      browOuterUpRight: 0.3,
      cheekSquintLeft: 0.2,
      cheekSquintRight: 0.2,
      mouthSmileLeft: 0.5,
      mouthSmileRight: 0.5,
      jawOpen: 0.1,
    },
  },

  skeptical: {
    label: 'Skeptical',
    morphTargets: {
      browDownLeft: 0.5,
      browDownRight: 0.5,
      browInnerUp: 0.2,
      eyeSquintLeft: 0.6,
      eyeSquintRight: 0.6,
      mouthPressLeft: 0.4,
      mouthPressRight: 0.3,
      mouthSmileLeft: 0.1,
      mouthSmileRight: 0.1,
    },
  },

  surprised: {
    label: 'Surprised',
    morphTargets: {
      browInnerUp: 0.5,
      browOuterUpLeft: 0.8,
      browOuterUpRight: 0.8,
      eyeWideLeft: 0.8,
      eyeWideRight: 0.8,
      jawOpen: 0.6,
      mouthOpen: 0.5,
    },
  },

  agreeing: {
    label: 'Agreeing',
    morphTargets: {
      browInnerUp: 0.1,
      mouthSmileLeft: 0.4,
      mouthSmileRight: 0.4,
      cheekSquintLeft: 0.2,
      cheekSquintRight: 0.2,
    },
  },

  disagreeing: {
    label: 'Disagreeing',
    morphTargets: {
      browDownLeft: 0.4,
      browDownRight: 0.4,
      mouthPressLeft: 0.3,
      mouthPressRight: 0.3,
      mouthFrownLeft: 0.2,
      mouthFrownRight: 0.2,
    },
  },
};

export function applyExpression(meshGroup, expressionName) {
  const expression = EXPRESSIONS[expressionName];
  if (!expression) {
    console.warn(`Expression "${expressionName}" not found`);
    return;
  }

  const targets = expression.morphTargets;
  meshGroup.traverse((child) => {
    if (child.isMesh && child.morphTargetDictionary) {
      Object.entries(targets).forEach(([name, weight]) => {
        const idx = child.morphTargetDictionary[name];
        if (idx !== undefined) {
          child.morphTargetInfluences[idx] = weight;
        }
      });
    }
  });
}

export function clearExpression(meshGroup) {
  meshGroup.traverse((child) => {
    if (child.isMesh && child.morphTargetDictionary) {
      Object.keys(child.morphTargetDictionary).forEach((name) => {
        const idx = child.morphTargetDictionary[name];
        child.morphTargetInfluences[idx] = 0;
      });
    }
  });
}

export default EXPRESSIONS;
