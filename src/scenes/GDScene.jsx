import { useState, useEffect, Suspense } from 'react';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import ConferenceRoom from '../components/ConferenceRoom';
import RoundTable from '../components/RoundTable';
import Lighting from '../components/Lighting';
import Avatar from '../components/Avatar';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAvatarController } from '../hooks/useAvatarController';

const AVATAR_COUNT = 5;
const SEAT_RADIUS = 2.8;

function getSeatPositions() {
  return Array.from({ length: AVATAR_COUNT }, (_, i) => {
    const angle = (i / AVATAR_COUNT) * Math.PI * 2 - Math.PI / 2;
    return new THREE.Vector3(
      SEAT_RADIUS * Math.cos(angle),
      0,
      SEAT_RADIUS * Math.sin(angle)
    );
  });
}

const AVATAR_CONFIGS = [
  { name: 'Aggressive Dominator', seat: 0 },
  { name: 'Logical Analyst', seat: 1 },
  { name: 'Data Driven Speaker', seat: 2 },
  { name: 'Corporate Professional', seat: 3 },
  { name: 'Introvert', seat: 4 },
];

const SEAT_POSITIONS = getSeatPositions();

export default function GDScene({ onWsEvent }) {
  const { register, getController } = useAvatarController();
  const [speakerSeatIndex, setSpeakerSeatIndex] = useState(null);
  const [targetSeatIndex, setTargetSeatIndex] = useState(null);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');

  useEffect(() => {
    if (!onWsEvent) return;

    const unsubs = [
      onWsEvent('SPEAK', (data) => {
        const seatIdx = data.seatIndex ?? (parseInt(data.speaker?.replace('P', '')) - 1) ?? 0;
        const targetRaw = data.target;
        let targetIdx;
        if (targetRaw === 'GENERAL' || targetRaw === 'USER') {
          targetIdx = (seatIdx + Math.floor(AVATAR_COUNT / 2)) % AVATAR_COUNT;
        } else {
          const parsed = parseInt(targetRaw?.replace('P', '')) - 1;
          targetIdx = parsed >= 0 ? parsed : (seatIdx + 2) % AVATAR_COUNT;
        }

        setSpeakerSeatIndex(seatIdx);
        setTargetSeatIndex(targetIdx);
        setCurrentEmotion(data.emotion || 'neutral');
      }),

      onWsEvent('STOP_SPEAKING', () => {
        setTimeout(() => {
          setSpeakerSeatIndex(null);
          setTargetSeatIndex(null);
        }, 400);
      }),

      onWsEvent('SIMULATION_END', () => {
        setSpeakerSeatIndex(null);
        setTargetSeatIndex(null);
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, [onWsEvent]);

  useEffect(() => {
    if (speakerSeatIndex === null) return;
    const ctrl = getController(speakerSeatIndex);
    if (ctrl) {
      ctrl.startTalking();
      ctrl.setEmotion(currentEmotion);
    }
    return () => {
      const c = getController(speakerSeatIndex);
      if (c) {
        c.stopTalking();
        c.setEmotion('neutral');
      }
    };
  }, [speakerSeatIndex, currentEmotion, getController]);

  return (
    <>
      <OrbitControls
        target={[0, 1.2, 0]}
        minDistance={3}
        maxDistance={12}
        maxPolarAngle={Math.PI / 2.1}
        enableDamping
        dampingFactor={0.08}
      />

      <Lighting />
      <ConferenceRoom />
      <RoundTable />

      {AVATAR_CONFIGS.map((config, index) => (
        <ErrorBoundary key={config.name} name={config.name}>
          <Suspense fallback={null}>
            <Avatar
              name={config.name}
              seatIndex={config.seat}
              position={SEAT_POSITIONS[index]}
              register={register}
              speakerSeatIndex={speakerSeatIndex}
              targetSeatIndex={targetSeatIndex}
              seatPositions={SEAT_POSITIONS}
              isSpeaking={speakerSeatIndex === config.seat}
            />
          </Suspense>
        </ErrorBoundary>
      ))}
    </>
  );
}
