import { useState, useRef, useEffect, useCallback } from 'react';

const speakerColors = {
  P1: '#ff6b6b',
  P2: '#4ecdc4',
  P3: '#45b7d1',
  P4: '#f9ca24',
  P5: '#a29bfe',
  USER: '#ffffff',
};

export default function GDOverlay({
  connected,
  currentSpeaker,
  currentText,
  currentSpeakerName,
  isSpeaking,
  waitingForUser,
  topic,
  userTimeout,
  onStart,
  onSendMessage,
  onRequestMic,
  isListening,
}) {
  const [inputText, setInputText] = useState('');
  const [showTopicInput, setShowTopicInput] = useState(!topic);
  const [topicText, setTopicText] = useState(topic || '');
  const [simStarted, setSimStarted] = useState(false);
  const chatRef = useRef(null);
  const [chatHistory, setChatHistory] = useState([]);
  const textRef = useRef(currentText);
  const speakerRef = useRef(currentSpeaker);

  textRef.current = currentText;
  speakerRef.current = currentSpeaker;

  useEffect(() => {
    if (currentText && currentSpeaker) {
      setChatHistory((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.speaker === currentSpeaker && last.turn === Date.now()) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...last,
            text: currentText,
            isLive: true,
          };
          return updated;
        }
        if (last && last.speaker === currentSpeaker && last.isLive) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...last,
            text: currentText,
            isLive: true,
          };
          return updated;
        }
        return [
          ...prev,
          {
            speaker: currentSpeaker,
            speakerName: currentSpeakerName || currentSpeaker,
            text: currentText,
            turn: Date.now(),
            isLive: true,
          },
        ];
      });
    }
  }, [currentText, currentSpeaker, currentSpeakerName]);

  useEffect(() => {
    if (!isSpeaking && speakerRef.current) {
      setChatHistory((prev) => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].speaker === speakerRef.current && updated[i].isLive) {
            updated[i] = { ...updated[i], isLive: false };
            break;
          }
        }
        return updated;
      });
    }
  }, [isSpeaking]);

  useEffect(() => {
    if (waitingForUser) {
      setChatHistory((prev) => [
        ...prev,
        {
          speaker: 'SYSTEM',
          text: '🎤 Your turn to speak! Type your message or use the mic.',
          turn: Date.now(),
          isSystem: true,
        },
      ]);
    }
  }, [waitingForUser]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setChatHistory((prev) => [
      ...prev,
      {
        speaker: 'USER',
        speakerName: 'You',
        text,
        turn: Date.now(),
        isLive: false,
      },
    ]);
    onSendMessage(text);
    setInputText('');
  }, [inputText, onSendMessage]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleStart = useCallback(() => {
    if (!topicText.trim()) return;
    setShowTopicInput(false);
    setSimStarted(true);
    onStart(topicText.trim());
  }, [topicText, onStart]);

  const color = currentSpeaker ? speakerColors[currentSpeaker] || '#fff' : '#fff';

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none',
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      {showTopicInput && !simStarted && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
          zIndex: 100,
          pointerEvents: 'auto',
        }}>
          <div style={{
            background: '#1e1e2e',
            padding: '40px',
            borderRadius: '16px',
            border: '1px solid #333',
            textAlign: 'center',
            maxWidth: '500px',
            width: '90%',
          }}>
            <h1 style={{ color: '#fff', margin: '0 0 8px', fontSize: '24px', fontWeight: 700 }}>
              Group Discussion Simulator
            </h1>
            <p style={{ color: '#888', margin: '0 0 24px', fontSize: '14px' }}>
              Enter a topic to start the discussion
            </p>
            <input
              value={topicText}
              onChange={(e) => setTopicText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              placeholder="Enter GD topic..."
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                borderRadius: '8px',
                border: '1px solid #444',
                background: '#2a2a3e',
                color: '#fff',
                outline: 'none',
                marginBottom: '16px',
                boxSizing: 'border-box',
              }}
              autoFocus
            />
            <button
              onClick={handleStart}
              style={{
                padding: '12px 32px',
                fontSize: '16px',
                borderRadius: '8px',
                border: 'none',
                background: '#4ecdc4',
                color: '#000',
                cursor: 'pointer',
                fontWeight: 600,
                opacity: topicText.trim() ? 1 : 0.5,
              }}
              disabled={!topicText.trim()}
            >
              Start Discussion
            </button>
          </div>
        </div>
      )}

      {simStarted && (
        <>
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            pointerEvents: 'none',
            textAlign: 'center',
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              padding: '8px 20px',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <span style={{
                color: connected ? '#4ecdc4' : '#ff6b6b',
                fontSize: '10px',
                marginRight: '8px',
              }}>
                ●
              </span>
              <span style={{ color: '#aaa', fontSize: '13px' }}>
                {topic || topicText}
              </span>
            </div>
          </div>

          <div style={{
            position: 'absolute',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            pointerEvents: 'none',
            textAlign: 'center',
            maxWidth: '600px',
            width: '90%',
          }}>
            {isSpeaking && currentText && (
              <div style={{
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                padding: '12px 20px',
                borderRadius: '12px',
                border: `1px solid ${color}44`,
                transition: 'border-color 0.3s',
              }}>
                <div style={{
                  color,
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>
                  {currentSpeakerName || currentSpeaker}
                </div>
                <div style={{ color: '#ddd', fontSize: '14px', lineHeight: 1.5 }}>
                  {currentText}
                </div>
              </div>
            )}
          </div>

          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            pointerEvents: 'auto',
            display: 'flex',
            gap: '8px',
            maxWidth: '600px',
            width: '90%',
            alignItems: 'center',
          }}>
            <button
              onClick={onRequestMic}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: `2px solid ${isListening ? '#ff6b6b' : '#555'}`,
                background: isListening ? 'rgba(255,107,107,0.2)' : 'rgba(255,255,255,0.05)',
                color: isListening ? '#ff6b6b' : '#888',
                cursor: waitingForUser ? 'pointer' : 'not-allowed',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                flexShrink: 0,
                opacity: waitingForUser ? 1 : 0.4,
              }}
              title={isListening ? 'Listening...' : 'Click to speak'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>

            <div style={{
              flex: 1,
              display: 'flex',
              borderRadius: '22px',
              overflow: 'hidden',
              border: '1px solid #444',
              background: 'rgba(30,30,46,0.9)',
              backdropFilter: 'blur(8px)',
            }}>
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={waitingForUser ? 'Type your response...' : 'Listening to discussion...'}
                disabled={!waitingForUser}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: 'none',
                  background: 'transparent',
                  color: '#fff',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSend}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  background: waitingForUser && inputText.trim() ? '#4ecdc4' : 'transparent',
                  color: waitingForUser && inputText.trim() ? '#000' : '#555',
                  cursor: waitingForUser && inputText.trim() ? 'pointer' : 'default',
                  fontWeight: 600,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
              >
                Send
              </button>
            </div>
          </div>

          <div style={{
            position: 'absolute',
            right: '16px',
            top: '16px',
            bottom: '100px',
            width: '280px',
            zIndex: 50,
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              color: '#888',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px 8px 0 0',
            }}>
              Conversation Log
            </div>
            <div
              ref={chatRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '0 0 8px 8px',
              }}
            >
              {chatHistory.map((entry, i) => (
                <div
                  key={entry.turn + '-' + i}
                  style={{
                    padding: '6px 8px',
                    marginBottom: '4px',
                    borderRadius: '6px',
                    background: entry.isSystem
                      ? 'rgba(78,205,196,0.1)'
                      : entry.speaker === 'USER'
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(255,255,255,0.03)',
                    borderLeft: `3px solid ${speakerColors[entry.speaker] || '#555'}`,
                    opacity: entry.isLive ? 1 : 0.7,
                    transition: 'opacity 0.3s',
                  }}
                >
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: speakerColors[entry.speaker] || '#888',
                    marginBottom: '2px',
                  }}>
                    {entry.speakerName || entry.speaker}
                    {entry.isLive && <span style={{ color: '#4ecdc4', marginLeft: '4px' }}>●</span>}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: entry.isSystem ? '#4ecdc4' : '#ccc',
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                  }}>
                    {entry.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
