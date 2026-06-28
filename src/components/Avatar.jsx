import { useEffect, useRef, useMemo } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useControls, folder } from 'leva';
import * as THREE from 'three';
import AvatarController from './AvatarController';
import NamePlate from './NamePlate';
import { collectMorphTargets } from '../utils/morphTargets';

function logAvatarDebug(name, scene, animations) {
  console.group(`[Avatar] ${name}`);
  const meshes = [];
  scene.traverse((child) => {
    if (child.isMesh) {
      meshes.push({
        name: child.name,
        morphTargets: child.morphTargetDictionary
          ? Object.keys(child.morphTargetDictionary)
          : [],
      });
    }
  });
  console.log('Mesh names:', meshes.map((m) => m.name));
  meshes.forEach((m) => {
    if (m.morphTargets.length > 0) {
      console.log(`Morph targets for "${m.name}":`, m.morphTargets);
    }
  });
  scene.traverse((child) => {
    if (child.isSkinnedMesh) {
      console.log('Skinned mesh:', child.name);
      console.log(
        'Skeleton bones:',
        child.skeleton.bones.map((b) => b.name)
      );
    }
  });
  console.log('Animation clips:', animations.map((a) => a.name));
  console.groupEnd();
}

export default function Avatar({
  name,
  seatIndex,
  position,
  register,
  speakerSeatIndex,
  targetSeatIndex,
  seatPositions,
  isSpeaking: isCurrentlySpeaking,
}) {
  const groupRef = useRef();
  const controllerRef = useRef(null);
  const debugLoggedRef = useRef(false);

  const gltfPath = `/avatars/p${seatIndex + 1}.glb`;
  const { scene, animations } = useGLTF(gltfPath);
  const { actions, mixer } = useAnimations(animations, groupRef);

  const morphTargetNames = useMemo(
    () => collectMorphTargets(scene),
    [scene]
  );

  useEffect(() => {
    if (!debugLoggedRef.current) {
      debugLoggedRef.current = true;
      logAvatarDebug(name, scene, animations);
    }
  }, [name, scene, animations]);

  useEffect(() => {
    if (!scene || !mixer) return;
    const controller = new AvatarController(scene, mixer, actions);
    controllerRef.current = controller;

    const idleKey = animations.find(
      (a) =>
        a.name.toLowerCase().includes('idle') ||
        a.name.toLowerCase().includes('standing') ||
        a.name.toLowerCase().includes('default')
    );
    if (idleKey && actions[idleKey.name]) {
      actions[idleKey.name].play();
    }

    return register(seatIndex, controller);
  }, [scene, mixer, actions, seatIndex, register, animations]);

  useFrame((_, delta) => {
    if (controllerRef.current) {
      controllerRef.current.update(delta);
    }
  });

  useEffect(() => {
    if (!controllerRef.current || !seatPositions || seatPositions.length === 0) return;

    const isSpeaker = speakerSeatIndex === seatIndex;
    const hasSpeaker = speakerSeatIndex !== null && speakerSeatIndex !== undefined;

    if (isSpeaker) {
      const targetIdx =
        targetSeatIndex !== null && targetSeatIndex !== undefined
          ? targetSeatIndex
          : (seatIndex + Math.floor(seatPositions.length / 2)) % seatPositions.length;
      controllerRef.current.lookAt(seatPositions[targetIdx]);
    } else if (hasSpeaker) {
      controllerRef.current.lookAt(seatPositions[speakerSeatIndex]);
    } else {
      controllerRef.current.lookAt(null);
    }
  }, [speakerSeatIndex, targetSeatIndex, seatIndex, seatPositions]);

  useEffect(() => {
    if (groupRef.current) {
      const [x, , z] = position;
      groupRef.current.rotation.y = Math.atan2(x, z) + Math.PI;
    }
  }, [position]);

  const levaMorphFolder = useMemo(() => {
    if (morphTargetNames.length === 0) return {};
    const morphControls = {};
    morphTargetNames.forEach((morphName) => {
      morphControls[morphName] = {
        value: 0,
        min: 0,
        max: 1,
        step: 0.01,
        label: morphName.replace(/([A-Z])/g, ' $1').trim(),
      };
    });
    return { [name]: folder(morphControls, { collapsed: true }) };
  }, [morphTargetNames, name]);

  const morphValues = useControls(
    () => levaMorphFolder,
    [levaMorphFolder],
    { collapsed: true }
  );

  useEffect(() => {
    if (!morphValues || morphTargetNames.length === 0 || !controllerRef.current) return;
    morphTargetNames.forEach((targetName) => {
      const val = morphValues[targetName];
      if (val !== undefined) {
        controllerRef.current.setMorphTarget(targetName, val);
      }
    });
  }, [morphValues, morphTargetNames]);

  return (
    <group ref={groupRef} position={position}>
      <primitive object={scene} />
      <NamePlate name={name} position={[0, 2.6, 0]} seatIndex={seatIndex} isActive={isCurrentlySpeaking} />
    </group>
  );
}
