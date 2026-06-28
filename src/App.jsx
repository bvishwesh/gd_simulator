import { Canvas } from '@react-three/fiber';
import { Suspense, useState, useCallback, useRef, useEffect } from 'react';
import { Leva } from 'leva';
import GDScene from './scenes/GDScene';
import GDOverlay from './components/GDOverlay';

const WS_URL = `ws://${window.location.hostname}:3000/ws`;

export default function App() {
  const [topic, setTopic] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speakerInfo, setSpeakerInfo] = useState({
    currentSpeaker: null,
    currentText: '',
    currentSpeakerName: '',
    isSpeaking: false,
    waitingForUser: false,
    connected: false,
  });

  const wsRef = useRef(null);
  const listenersRef = useRef(new Map());

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === 1) return wsRef.current;

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setSpeakerInfo((prev) => ({ ...prev, connected: true }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type } = data;
          if (listenersRef.current.has(type)) {
            listenersRef.current.get(type).forEach((cb) => cb(data));
          }
          if (listenersRef.current.has('*')) {
            listenersRef.current.get('*').forEach((cb) => cb(data));
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        setSpeakerInfo((prev) => ({ ...prev, connected: false }));
        wsRef.current = null;
        setTimeout(connectWs, 3000);
      };

      wsRef.current = ws;
      return ws;
    } catch (err) {
      setTimeout(connectWs, 3000);
      return null;
    }
  }, []);

  useEffect(() => {
    const ws = connectWs();
    return () => {
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [connectWs]);

  const sendWs = useCallback((data) => {
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    const ws = connectWs();
    if (ws) {
      ws.addEventListener('open', () => {
        ws.send(JSON.stringify(data));
      }, { once: true });
    }
    return false;
  }, [connectWs]);

  const onWsEvent = useCallback((type, callback) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type).add(callback);
    return () => {
      const set = listenersRef.current.get(type);
      if (set) set.delete(callback);
    };
  }, []);

  const handleGdEvent = useCallback((event) => {
    if (event.type === 'SPEAK') {
      setSpeakerInfo((prev) => ({
        ...prev,
        currentSpeaker: event.speaker,
        currentText: event.text,
        currentSpeakerName: event.speakerName,
        isSpeaking: true,
        waitingForUser: false,
      }));
    } else if (event.type === 'WAITING_FOR_USER') {
      setSpeakerInfo((prev) => ({ ...prev, waitingForUser: true }));
    } else if (event.type === 'USER_TIMEOUT') {
      setSpeakerInfo((prev) => ({ ...prev, waitingForUser: false }));
    } else if (event.type === 'SIMULATION_START') {
      setTopic(event.topic);
    } else if (event.type === 'SIMULATION_END') {
      setSpeakerInfo((prev) => ({
        ...prev, isSpeaking: false, waitingForUser: false,
        currentSpeaker: null, currentText: '', currentSpeakerName: '',
      }));
    }
  }, []);

  useEffect(() => {
    const unsubs = [
      onWsEvent('SPEAK', (d) => handleGdEvent(d)),
      onWsEvent('WAITING_FOR_USER', (d) => handleGdEvent(d)),
      onWsEvent('USER_TIMEOUT', (d) => handleGdEvent(d)),
      onWsEvent('SIMULATION_START', (d) => handleGdEvent(d)),
      onWsEvent('SIMULATION_END', (d) => handleGdEvent(d)),
    ];
    return () => unsubs.forEach((u) => u());
  }, [onWsEvent, handleGdEvent]);

  const handleStart = useCallback(
    (topicText) => {
      setTopic(topicText);
      sendWs({ type: 'START_SIMULATION', topic: topicText });
    },
    [sendWs]
  );

  const handleSendMessage = useCallback(
    (text) => {
      sendWs({ type: 'USER_MESSAGE', text });
    },
    [sendWs]
  );

  const handleRequestMic = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not available. Use text input instead.');
      return;
    }

    setIsListening(true);
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setIsListening(false);
      if (text.trim()) handleSendMessage(text.trim());
    };
    recognition.onerror = () => { setIsListening(false); };
    recognition.onend = () => { setIsListening(false); };
    recognition.start();
  }, [handleSendMessage]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 2.4, 6.5], fov: 45, near: 0.1, far: 50 }}
        dpr={[1, 2]}
        gl={{ outputColorSpace: 'srgb', toneMapping: 3, toneMappingExposure: 1.0 }}
        shadows
      >
        <Suspense fallback={null}>
          <GDScene onWsEvent={onWsEvent} sendWs={sendWs} />
        </Suspense>
      </Canvas>

      <GDOverlay
        connected={speakerInfo.connected}
        currentSpeaker={speakerInfo.currentSpeaker}
        currentText={speakerInfo.currentText}
        currentSpeakerName={speakerInfo.currentSpeakerName}
        isSpeaking={speakerInfo.isSpeaking}
        waitingForUser={speakerInfo.waitingForUser}
        topic={topic}
        onStart={handleStart}
        onSendMessage={handleSendMessage}
        onRequestMic={handleRequestMic}
        isListening={isListening}
      />

      <Leva collapsed />
    </div>
  );
}
