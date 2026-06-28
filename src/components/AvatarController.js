import * as THREE from 'three';

const BLINK_DURATION = 0.15;
const MIN_BLINK_INTERVAL = 3;
const MAX_BLINK_INTERVAL = 7;
const HEAD_LERP_SPEED = 0.08;
const JAW_TALK_AMPLITUDE = 0.35;
const JAW_TALK_SPEED = 14;

const MORPH_ALIASES = {
  jawOpen: ['jawOpen', 'jaw_open', 'JawOpen', 'jawopening', 'Fcl_MTH_Open', 'mouthOpen'],
  mouthSmileLeft: ['mouthSmileLeft', 'mouth_smile_left', 'MouthSmileLeft', 'Fcl_MTH_Smile_L'],
  mouthSmileRight: ['mouthSmileRight', 'mouth_smile_right', 'MouthSmileRight', 'Fcl_MTH_Smile_R'],
  eyeBlinkLeft: ['eyeBlinkLeft', 'eye_blink_left', 'EyeBlinkLeft', 'Fcl_EYE_Blink_L'],
  eyeBlinkRight: ['eyeBlinkRight', 'eye_blink_right', 'EyeBlinkRight', 'Fcl_EYE_Blink_R'],
  browInnerUp: ['browInnerUp', 'brow_inner_up', 'BrowInnerUp', 'Fcl_BRW_InnerUp'],
  browOuterUpLeft: ['browOuterUpLeft', 'brow_outer_up_left', 'BrowOuterUpLeft', 'Fcl_BRW_OuterUp_L'],
  browOuterUpRight: ['browOuterUpRight', 'brow_outer_up_right', 'BrowOuterUpRight', 'Fcl_BRW_OuterUp_R'],
  browDownLeft: ['browDownLeft', 'brow_down_left', 'BrowDownLeft', 'Fcl_BRW_Down_L'],
  browDownRight: ['browDownRight', 'brow_down_right', 'BrowDownRight', 'Fcl_BRW_Down_R'],
  cheekSquintLeft: ['cheekSquintLeft', 'cheek_squint_left', 'CheekSquintLeft'],
  cheekSquintRight: ['cheekSquintRight', 'cheek_squint_right', 'CheekSquintRight'],
  mouthDimpleLeft: ['mouthDimpleLeft', 'mouth_dimple_left', 'MouthDimpleLeft'],
  mouthDimpleRight: ['mouthDimpleRight', 'mouth_dimple_right', 'MouthDimpleRight'],
  mouthPressLeft: ['mouthPressLeft', 'mouth_press_left', 'MouthPressLeft'],
  mouthPressRight: ['mouthPressRight', 'mouth_press_right', 'MouthPressRight'],
  mouthFrownLeft: ['mouthFrownLeft', 'mouth_frown_left', 'MouthFrownLeft'],
  mouthFrownRight: ['mouthFrownRight', 'mouth_frown_right', 'MouthFrownRight'],
  eyeWideLeft: ['eyeWideLeft', 'eye_wide_left', 'EyeWideLeft'],
  eyeWideRight: ['eyeWideRight', 'eye_wide_right', 'EyeWideRight'],
  eyeSquintLeft: ['eyeSquintLeft', 'eye_squint_left', 'EyeSquintLeft'],
  eyeSquintRight: ['eyeSquintRight', 'eye_squint_right', 'EyeSquintRight'],
  noseWrinklerLeft: ['noseWrinklerLeft', 'nose_wrinkler_left', 'NoseWrinklerLeft'],
  noseWrinklerRight: ['noseWrinklerRight', 'nose_wrinkler_right', 'NoseWrinklerRight'],
  mouthOpen: ['mouthOpen', 'mouth_open', 'MouthOpen', 'Fcl_MTH_Open'],
  jawSidewaysLeft: ['jawSidewaysLeft', 'jaw_sideways_left', 'JawSidewaysLeft'],
};

const EXPRESSION_PRESETS = {
  neutral: {},
  happy: {
    browInnerUp: 0.1, browOuterUpLeft: 0.4, browOuterUpRight: 0.4,
    cheekSquintLeft: 0.3, cheekSquintRight: 0.3,
    mouthSmileLeft: 0.7, mouthSmileRight: 0.7,
    mouthDimpleLeft: 0.3, mouthDimpleRight: 0.3,
  },
  confident: {
    browOuterUpLeft: 0.3, browOuterUpRight: 0.3,
    cheekSquintLeft: 0.2, cheekSquintRight: 0.2,
    mouthSmileLeft: 0.5, mouthSmileRight: 0.5, jawOpen: 0.1,
  },
  thinking: {
    browInnerUp: 0.6, eyeSquintLeft: 0.3, eyeSquintRight: 0.3,
    mouthPressLeft: 0.2, mouthPressRight: 0.2, jawSidewaysLeft: 0.15,
  },
  skeptical: {
    browDownLeft: 0.5, browDownRight: 0.5, browInnerUp: 0.2,
    eyeSquintLeft: 0.6, eyeSquintRight: 0.6,
    mouthPressLeft: 0.4, mouthPressRight: 0.3,
    mouthSmileLeft: 0.1, mouthSmileRight: 0.1,
  },
  agreeing: {
    browInnerUp: 0.1, mouthSmileLeft: 0.4, mouthSmileRight: 0.4,
    cheekSquintLeft: 0.2, cheekSquintRight: 0.2,
  },
  disagreeing: {
    browDownLeft: 0.4, browDownRight: 0.4,
    mouthPressLeft: 0.3, mouthPressRight: 0.3,
    mouthFrownLeft: 0.2, mouthFrownRight: 0.2,
  },
  surprised: {
    browInnerUp: 0.5, browOuterUpLeft: 0.8, browOuterUpRight: 0.8,
    eyeWideLeft: 0.8, eyeWideRight: 0.8, jawOpen: 0.6,
  },
  angry: {
    browDownLeft: 0.8, browDownRight: 0.8, browInnerUp: 0.3,
    mouthPressLeft: 0.6, mouthPressRight: 0.6,
    mouthFrownLeft: 0.4, mouthFrownRight: 0.4,
    eyeWideLeft: 0.3, eyeWideRight: 0.3,
    noseWrinklerLeft: 0.5, noseWrinklerRight: 0.5,
  },
};

export default class AvatarController {
  constructor(scene, mixer, actions = {}) {
    this.scene = scene;
    this.mixer = mixer;
    this.actions = actions;
    this.isTalking = false;
    this.headBone = null;
    this.morphMeshes = [];
    this.jawTargets = [];
    this.allMorphTargetNames = new Set();
    this.morphNameMap = {};

    this._blinkTimer = 0;
    this._nextBlinkTime = this._randomBlinkInterval();
    this._isBlinking = false;
    this._blinkProgress = 0;

    this._targetLookPosition = null;
    this._lastLookPosition = null;
    this._headBaseQuaternion = null;
    this._headInitialized = false;

    this._currentExpressionWeights = {};
    this._targetExpressionWeights = {};
    this._expressionLerpSpeed = 0.12;

    this._jawPhase = 0;

    this._hasMorphTargets = false;
    this._expressionFallback = false;
    this._fallbackEmotion = 'neutral';
    this._fallbackColor = new THREE.Color(0x888888);
    this._fallbackMeshes = [];

    this._onDebugLog = null;

    this._initScene();
  }

  set onDebug(cb) {
    this._onDebugLog = cb;
  }

  _debug(...args) {
    if (this._onDebugLog) this._onDebugLog(...args);
  }

  _randomBlinkInterval() {
    return MIN_BLINK_INTERVAL + Math.random() * (MAX_BLINK_INTERVAL - MIN_BLINK_INTERVAL);
  }

  _findMorphName(standardName) {
    if (this.morphNameMap[standardName]) return this.morphNameMap[standardName];
    const aliases = MORPH_ALIASES[standardName];
    if (!aliases) return null;
    for (const alias of aliases) {
      if (this.allMorphTargetNames.has(alias)) {
        this.morphNameMap[standardName] = alias;
        return alias;
      }
    }
    return null;
  }

  _initScene() {
    this.scene.traverse((child) => {
      if (child.isSkinnedMesh) {
        child.skeleton.bones.forEach((bone) => {
          const lower = bone.name.toLowerCase();
          if (lower.includes('head') || lower.includes('neck')) {
            this.headBone = bone;
          }
        });
      }
    });

    this.scene.traverse((child) => {
      if (child.isMesh) {
        if (child.morphTargetDictionary) {
          this.morphMeshes.push(child);
          Object.keys(child.morphTargetDictionary).forEach((name) => {
            this.allMorphTargetNames.add(name);
            const lower = name.toLowerCase();
            if (lower.includes('jaw') || lower.includes('mouthopen') || lower.includes('Fcl_MTH_Open')) {
              this.jawTargets.push({
                mesh: child,
                name,
                idx: child.morphTargetDictionary[name],
              });
            }
          });
        }
        if (child.material && !child.morphTargetDictionary) {
          this._fallbackMeshes.push(child);
        }
      }
    });

    this._hasMorphTargets = this.morphMeshes.length > 0 && this.allMorphTargetNames.size > 0;
    this._expressionFallback = !this._hasMorphTargets;

    if (this.headBone) {
      this._headBaseQuaternion = this.headBone.quaternion.clone();
      this._headInitialized = true;
      this._debug('Head bone:', this.headBone.name);
    } else {
      this._debug('No head bone found');
    }

    this._debug(
      `Morphs: ${this.allMorphTargetNames.size}, Jaw targets: ${this.jawTargets.length}, ${this._expressionFallback ? 'Using fallback' : 'Using morph targets'}`
    );
    if (this.allMorphTargetNames.size > 0) {
      this._debug('Available:', Array.from(this.allMorphTargetNames));
    }
  }

  getMorphTargetNames() {
    return Array.from(this.allMorphTargetNames);
  }

  update(delta) {
    if (this.mixer) this.mixer.update(delta);
    this._updateBlink(delta);
    this._updateLookAt(delta);
    this._updateExpression(delta);
    this._updateTalkingJaw(delta);
    if (this._expressionFallback) this._updateFallback(delta);
  }

  _updateBlink(delta) {
    this._blinkTimer += delta;
    if (this._isBlinking) {
      this._blinkProgress += delta / BLINK_DURATION;
      if (this._blinkProgress >= 1) {
        this._isBlinking = false;
        this._blinkProgress = 0;
        this._blinkTimer = 0;
        this._nextBlinkTime = this._randomBlinkInterval();
        this._applyMorph('eyeBlinkLeft', 0);
        this._applyMorph('eyeBlinkRight', 0);
        return;
      }
      const phase = this._blinkProgress < 0.5
        ? this._blinkProgress * 2
        : 2 - this._blinkProgress * 2;
      const weight = Math.min(phase, 1);
      this._applyMorph('eyeBlinkLeft', weight);
      this._applyMorph('eyeBlinkRight', weight);
    } else if (this._blinkTimer >= this._nextBlinkTime) {
      this._isBlinking = true;
      this._blinkProgress = 0;
    }
  }

  _updateLookAt(_delta) {
    if (!this.headBone || !this._targetLookPosition) return;
    const worldPos = new THREE.Vector3();
    this.headBone.getWorldPosition(worldPos);
    const direction = new THREE.Vector3()
      .copy(this._targetLookPosition)
      .sub(worldPos)
      .normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const targetQuat = new THREE.Quaternion();
    const m4 = new THREE.Matrix4();
    m4.lookAt(new THREE.Vector3(0, 0, 0), direction, up);
    targetQuat.setFromRotationMatrix(m4);
    if (this.headBone.parent) {
      const parentQuat = new THREE.Quaternion();
      this.headBone.parent.getWorldQuaternion(parentQuat);
      targetQuat.premultiply(parentQuat.clone().invert());
    }
    const clamped = this._clampHeadRotation(targetQuat);
    this.headBone.quaternion.slerp(clamped, HEAD_LERP_SPEED);
  }

  _clampHeadRotation(quat) {
    const euler = new THREE.Euler().setFromQuaternion(quat, 'YXZ');
    const maxAngle = Math.PI / 3.5;
    euler.x = Math.max(-maxAngle, Math.min(maxAngle, euler.x));
    euler.y = Math.max(-maxAngle, Math.min(maxAngle, euler.y));
    return new THREE.Quaternion().setFromEuler(euler);
  }

  _updateExpression(_delta) {
    if (!this._hasMorphTargets) return;
    const keys = Object.keys(this._targetExpressionWeights);
    if (keys.length === 0) return;
    keys.forEach((name) => {
      const target = this._targetExpressionWeights[name] ?? 0;
      const current = this._currentExpressionWeights[name] ?? 0;
      const next = current + (target - current) * this._expressionLerpSpeed;
      this._currentExpressionWeights[name] = next;
      this._applyMorph(name, next);
    });
  }

  _updateTalkingJaw(delta) {
    if (!this.isTalking || this.jawTargets.length === 0) return;
    this._jawPhase += delta * JAW_TALK_SPEED;
    const jawOpen = (Math.sin(this._jawPhase) * 0.5 + 0.5) * JAW_TALK_AMPLITUDE;
    this.jawTargets.forEach(({ idx, mesh }) => {
      mesh.morphTargetInfluences[idx] = jawOpen;
    });
  }

  _updateFallback(_delta) {
    const intensity = this._fallbackEmotion === 'neutral' ? 0 : 0.15;
    const colorMap = {
      neutral: 0x888888,
      happy: 0x4ecdc4,
      confident: 0x45b7d1,
      thinking: 0xf9ca24,
      skeptical: 0xe17055,
      agreeing: 0x00b894,
      disagreeing: 0xd63031,
      surprised: 0x6c5ce7,
      angry: 0xe17055,
    };
    const targetColor = new THREE.Color(colorMap[this._fallbackEmotion] || 0x888888);
    this._fallbackColor.lerp(targetColor, 0.1);
    this._fallbackMeshes.forEach((mesh) => {
      if (mesh.material && !mesh.material._isFallbackGlow) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            mat.emissive = this._fallbackColor;
            mat.emissiveIntensity = this.isTalking ? 0.3 : intensity;
          });
        } else {
          mesh.material.emissive = this._fallbackColor;
          mesh.material.emissiveIntensity = this.isTalking ? 0.3 : intensity;
        }
      }
    });
  }

  _applyMorph(standardName, weight) {
    if (!this._hasMorphTargets) return;
    const actualName = this._findMorphName(standardName);
    if (!actualName) return;
    this.morphMeshes.forEach((mesh) => {
      const idx = mesh.morphTargetDictionary?.[actualName];
      if (idx !== undefined) {
        mesh.morphTargetInfluences[idx] = Math.max(0, Math.min(1, weight));
      }
    });
  }

  setMorphTarget(name, weight) {
    this._applyMorph(name, weight);
  }

  setExpression(expressionMap) {
    if (!expressionMap || typeof expressionMap !== 'object') return;
    if (this._hasMorphTargets) {
      Object.keys(this._currentExpressionWeights).forEach((key) => {
        this._targetExpressionWeights[key] = 0;
      });
      Object.entries(expressionMap).forEach(([name, weight]) => {
        const actualName = this._findMorphName(name);
        if (actualName) {
          this._targetExpressionWeights[actualName] = weight;
        }
      });
    }
  }

  setEmotion(emotion) {
    const key = emotion.toLowerCase();
    const preset = EXPRESSION_PRESETS[key];
    if (preset) {
      if (this._hasMorphTargets) {
        this.setExpression(preset);
      }
      this._fallbackEmotion = key;
    }
  }

  lookAt(targetPosition) {
    if (!this.headBone) return;
    if (targetPosition) {
      if (targetPosition instanceof THREE.Vector3) {
        this._targetLookPosition = targetPosition;
      } else if (Array.isArray(targetPosition)) {
        this._targetLookPosition = new THREE.Vector3(targetPosition[0], targetPosition[1] || 1.5, targetPosition[2]);
      } else {
        this._targetLookPosition = targetPosition.clone ? targetPosition.clone() : new THREE.Vector3().copy(targetPosition);
      }
    } else {
      this._targetLookPosition = null;
      if (this._headBaseQuaternion) {
        this.headBone.quaternion.copy(this._headBaseQuaternion);
      }
    }
  }

  lookAtSpeaker(avatarPosition) {
    this.lookAt(avatarPosition);
  }

  startTalking() {
    this.isTalking = true;
    this._jawPhase = 0;
  }

  stopTalking() {
    this.isTalking = false;
    this.jawTargets.forEach(({ idx, mesh }) => {
      mesh.morphTargetInfluences[idx] = 0;
    });
  }

  playAnimation(name) {
    const exact = this.actions[name];
    if (exact) { exact.reset().play(); return; }
    const found = Object.keys(this.actions).find(
      (key) => key.toLowerCase() === name.toLowerCase()
    );
    if (found) this.actions[found].reset().play();
  }

  idle() {
    const idleKey = Object.keys(this.actions).find(
      (key) =>
        key.toLowerCase().includes('idle') ||
        key.toLowerCase().includes('standing') ||
        key.toLowerCase().includes('default')
    );
    if (idleKey) this.actions[idleKey].reset().play();
  }

  blink() {
    if (!this._isBlinking) {
      this._isBlinking = true;
      this._blinkProgress = 0;
    }
  }

  playGesture(name) {
    this._debug(`Gesture: "${name}"`);
  }

  nod() { this.playGesture('nod'); }
  shakeHead() { this.playGesture('shakeHead'); }
  thinkingGesture() { this.playGesture('thinking'); }
  openHand() { this.playGesture('openHand'); }
  crossArms() { this.playGesture('crossArms'); }
  point() { this.playGesture('point'); }

  setViseme(_visemeName) {
    this._debug(`Viseme (arch): "${_visemeName}"`);
  }

  updateVisemeTimeline(_timeline) {
    this._debug(`Viseme timeline (arch): ${_timeline?.length ?? 0} entries`);
  }

  playLipSync(_samples) {
    this._debug('Lip sync (arch)');
  }

  receiveEvent(event) {
    if (!event) return;
    const { speaker, target, emotion, gesture, visemes, text } = event;
    if (speaker) this.lookAtSpeaker(speaker);
    if (target) this.lookAt(target);
    if (emotion) this.setEmotion(emotion);
    if (gesture) this.playGesture(gesture);
    if (visemes) this.setViseme(visemes);
    if (text) this._debug(`Text: "${text.substring(0, 60)}..."`);
  }
}
