import { useState, useEffect, Suspense, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import ConferenceRoom from '../components/ConferenceRoom';
import RoundTable from '../components/RoundTable';
import Lighting from '../components/Lighting';
import Avatar from '../components/Avatar';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAvatarController } from '../hooks/useAvatarController';
import { gdEventBus } from '../utils/eventBus';

const AVATAR_COUNT = 6;
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
  const [lookSpeakerIndex, setLookSpeakerIndex] = useState(null);
  const [lookTargetIndex, setLookTargetIndex] = useState(null);
  const [talkingSpeakerIndex, setTalkingSpeakerIndex] = useState(null);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const speakingRef = useRef(null);

  useEffect(() => {
    if (!onWsEvent) return;

    const unsubs = [
      onWsEvent('SPEAK', (data) => {
        const seatIdx = data.seatIndex ?? (parseInt(data.speaker?.replace('P', '')) - 1) ?? 0;
        const targetRaw = data.target;
        let targetIdx;
        if (targetRaw === 'USER') {
          targetIdx = 5; // Look directly at USER seat
        } else if (targetRaw === 'GENERAL') {
          targetIdx = (seatIdx + 3) % 6; // Look across the table
        } else {
          const parsed = parseInt(targetRaw?.replace('P', '')) - 1;
          targetIdx = parsed >= 0 ? parsed : (seatIdx + 2) % 6;
        }

        // Set eye contact target immediately when turn starts
        setLookSpeakerIndex(seatIdx);
        setLookTargetIndex(targetIdx);
      }),

      onWsEvent('STOP_SPEAKING', () => {
      }),

      onWsEvent('WAITING_FOR_USER', () => {
        // When waiting for the user to speak, all avatars look at the USER (seat 5)
        setLookSpeakerIndex(5);
        setLookTargetIndex(5);
      }),

      onWsEvent('SIMULATION_END', () => {
        setLookSpeakerIndex(null);
        setLookTargetIndex(null);
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, [onWsEvent]);

  // Subscribe to gdEventBus to drive jaw talking animation synchronously with HTML5 audio
  useEffect(() => {
    const unsubscribe = gdEventBus.subscribe((event) => {
      if (event.type === 'START_TALKING') {
        setTalkingSpeakerIndex(event.seatIndex);
        setCurrentEmotion(event.emotion || 'neutral');
      } else if (event.type === 'STOP_TALKING') {
        setTalkingSpeakerIndex((prev) => {
          if (prev === event.seatIndex) {
            return null;
          }
          return prev;
        });
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (talkingSpeakerIndex === null) {
      if (speakingRef.current !== null) {
        const prev = speakingRef.current;
        const ctrl = getController(prev);
        if (ctrl) { ctrl.stopTalking(); ctrl.setEmotion('neutral'); }
        speakingRef.current = null;
      }
      return;
    }

    if (speakingRef.current !== null && speakingRef.current !== talkingSpeakerIndex) {
      const prev = speakingRef.current;
      const ctrl = getController(prev);
      if (ctrl) { ctrl.stopTalking(); ctrl.setEmotion('neutral'); }
    }

    const ctrl = getController(talkingSpeakerIndex);
    if (ctrl) {
      ctrl.startTalking();
      ctrl.setEmotion(currentEmotion);
    }
    speakingRef.current = talkingSpeakerIndex;
  }, [talkingSpeakerIndex, currentEmotion, getController]);

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
              speakerSeatIndex={lookSpeakerIndex}
              targetSeatIndex={lookTargetIndex}
              seatPositions={SEAT_POSITIONS}
              isSpeaking={talkingSpeakerIndex === config.seat}
            />
          </Suspense>
        </ErrorBoundary>
      ))}
    </>
  );
}
