const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('Missing OPENROUTER_API_KEY in .env');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://openrouter.ai/api/v1',
});

const VOICE_MAP = {
  P1: 'en-US-GuyNeural',
  P2: 'en-US-JennyNeural',
  P3: 'en-US-BrianNeural',
  P4: 'en-US-AriaNeural',
  P5: 'en-US-ChristopherNeural',
};

const PARTICIPANTS = [
  { id: 'P1', name: 'Aggressive Dominator', weight: 40, seatIndex: 0 },
  { id: 'P2', name: 'Logical Analyst', weight: 25, seatIndex: 1 },
  { id: 'P3', name: 'Data Driven Speaker', weight: 20, seatIndex: 2 },
  { id: 'P4', name: 'Corporate Professional', weight: 10, seatIndex: 3 },
  { id: 'P5', name: 'Introvert', weight: 5, seatIndex: 4 },
];

const AUDIO_DIR = path.join(__dirname, 'dist', 'audio');

try { fs.mkdirSync(AUDIO_DIR, { recursive: true }); } catch (_) {}

function chooseWeighted(arr) {
  const total = arr.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const item of arr) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return arr[arr.length - 1];
}

function getPhase(turn) {
  if (turn <= 5) return 'opening';
  if (turn <= 15) return 'debate';
  return 'conclusion';
}

function getIntent(phase) {
  if (phase === 'opening') {
    const opts = ['introduce_argument', 'share_view'];
    return opts[Math.floor(Math.random() * opts.length)];
  }
  if (phase === 'debate') {
    const opts = ['challenge', 'agree', 'question', 'counter_argument'];
    return opts[Math.floor(Math.random() * opts.length)];
  }
  const opts = ['summarize', 'final_opinion'];
  return opts[Math.floor(Math.random() * opts.length)];
}

function chooseTarget(speakerId, history) {
  if (history.length === 0) return 'GENERAL';
  const lastSpeaker = history[history.length - 1].speaker;
  if (Math.random() < 0.7 && lastSpeaker !== speakerId) {
    return lastSpeaker;
  }
  const others = PARTICIPANTS.filter(p => p.id !== speakerId).map(p => p.id);
  others.push('USER');
  return others[Math.floor(Math.random() * others.length)];
}

function pickEmotion(intent) {
  const map = {
    introduce_argument: 'confident',
    share_view: 'neutral',
    challenge: 'angry',
    agree: 'agreeing',
    question: 'thinking',
    counter_argument: 'skeptical',
    summarize: 'confident',
    final_opinion: 'happy',
  };
  return map[intent] || 'neutral';
}

function buildPrompt(topic, phase, speaker, target, intent, history) {
  const participant = PARTICIPANTS.find(p => p.id === speaker);
  const recentHistory = history.slice(-12);
  return `
You are participating in a campus placement Group Discussion.

TOPIC: ${topic}
CURRENT PHASE: ${phase}

YOUR IDENTITY: ${speaker}
YOUR PERSONALITY: ${participant.name}

YOUR TARGET (Who you are addressing): ${target}
YOUR INTENT: ${intent}

RECENT DISCUSSION:
${JSON.stringify(recentHistory, null, 2)}

RULES:
- Stay consistent with personality.
- Address your target directly if they are not 'GENERAL'.
- Follow the intent.
- Use 2-4 sentences.
- Avoid repeating points.
- Be concise and natural.

Return ONLY the response text.`.trim();
}

function generateAudio(text, speakerId, turn) {
  return new Promise((resolve) => {
    const voice = VOICE_MAP[speakerId] || 'en-US-GuyNeural';
    const filename = `turn_${turn}.mp3`;
    const filepath = path.join(AUDIO_DIR, filename);

    const proc = spawn('python', [
      '-m', 'edge_tts',
      '--voice', voice,
      '--text', text,
      '--write-media', filepath,
    ]);

    let errOutput = '';
    proc.stderr.on('data', (d) => { errOutput += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(filepath)) {
        resolve(`/audio/${filename}`);
      } else {
        console.warn(`TTS failed (${code}): ${errOutput.substring(0, 100)}`);
        resolve(null);
      }
    });

    proc.on('error', (err) => {
      console.warn('TTS spawn error:', err.message);
      resolve(null);
    });
  });
}

const app = express();
app.use(express.json());

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.static(path.join(__dirname, 'dist')));

app.get('/api/status', (req, res) => {
  res.json({ running: !!currentSimulation });
});

app.post('/api/user-message', (req, res) => {
  const { text } = req.body;
  if (!currentSimulation || !text || !text.trim()) {
    return res.status(400).json({ error: 'No active simulation or empty message' });
  }
  currentSimulation.handleUserMessage(text.trim());
  res.json({ ok: true });
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/ws')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    next();
  }
});

let currentSimulation = null;

class Simulation {
  constructor(topic, ws) {
    this.topic = topic;
    this.ws = ws;
    this.history = [];
    this.turn = 0;
    this.running = false;
    this.userWaiting = false;
    this.userTimeout = null;
    this.speakTimeout = null;
    this.currentSpeakerId = null;

    // Pre-generation cache properties
    this.nextTurnCache = null;
    this.preGeneratingPromise = null;
    this.userWantsToSpeak = false;
    this.queuedUserMessage = null;

    // Cancelable delay state
    this._delayResolve = null;
    this._delayTimeout = null;
  }

  send(event) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(event));
    }
  }

  async preGenerateNextTurn() {
    try {
      const nextTurnNum = this.turn + 1;
      const phase = getPhase(nextTurnNum);
      const speaker = chooseWeighted(PARTICIPANTS);
      const target = chooseTarget(speaker.id, this.history);
      const intent = getIntent(phase);
      const emotion = pickEmotion(intent);

      const prompt = buildPrompt(this.topic, phase, speaker.id, target, intent, this.history);

      const response = await openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
      });

      const text = response.choices[0].message.content.trim();
      const audioUrl = await generateAudio(text, speaker.id, nextTurnNum);

      this.nextTurnCache = {
        speaker,
        target,
        text,
        emotion,
        intent,
        phase,
        turn: nextTurnNum,
        audioUrl,
      };
    } catch (err) {
      console.error('Pre-generation error:', err.message);
      this.nextTurnCache = null;
    }
  }

  async start() {
    this.running = true;
    this.send({ type: 'SIMULATION_START', topic: this.topic });

    let consecutiveErrors = 0;

    // Pre-generate the first turn so it starts instantly
    await this.preGenerateNextTurn();

    while (this.running && consecutiveErrors < 3) {
      let turnData = this.nextTurnCache;

      // If cache is empty (due to user interruption input or failure), generate it now
      if (!turnData) {
        this.turn++;
        await this.preGenerateNextTurn();
        turnData = this.nextTurnCache;
      }

      if (!turnData) {
        console.error('Could not obtain turn data.');
        consecutiveErrors++;
        await this._delay(2000);
        continue;
      }

      this.turn = turnData.turn;
      const { speaker, target, text, emotion, intent, phase, audioUrl } = turnData;

      console.log(`\n[TURN ${this.turn}] ${speaker.id} (${speaker.name}) → ${target} | ${intent}`);
      console.log(`  "${text.substring(0, 80)}..."`);

      this.currentSpeakerId = speaker.id;

      this.send({
        type: 'SPEAK',
        speaker: speaker.id,
        speakerName: speaker.name,
        seatIndex: speaker.seatIndex,
        target,
        text,
        emotion,
        intent,
        phase,
        turn: this.turn,
        audioUrl: audioUrl || undefined,
      });

      if (audioUrl) {
        this.send({
          type: 'SPEAK_AUDIO',
          speaker: speaker.id,
          url: audioUrl,
          duration: Math.max(2000, text.length * 65 + 1000),
        });
      }

      this.history.push({ speaker: speaker.id, target, phase, intent, message: text, emotion });

      // Start pre-generating the next speaker's turn asynchronously in the background
      this.nextTurnCache = null;
      this.preGeneratingPromise = this.preGenerateNextTurn();

      // Wait for the speaking animation to finish
      const speakDuration = Math.max(2000, text.length * 65 + 1000);
      await this._delay(speakDuration);

      // Clean up speaking states
      this.send({ type: 'STOP_SPEAKING', speaker: speaker.id });
      this.currentSpeakerId = null;

      consecutiveErrors = 0;

      // Wait for the user ONLY if they requested interruption
      if (this.userWantsToSpeak) {
        this.userWantsToSpeak = false;
        await this._askUser();
      }

      // Await pre-generation to complete before looping
      if (this.preGeneratingPromise) {
        await this.preGeneratingPromise;
        this.preGeneratingPromise = null;
      }

      await this._delay(600);
    }

    if (consecutiveErrors >= 3) {
      this.send({ type: 'SIMULATION_ERROR', message: 'Too many errors, stopping.' });
    }

    this.send({ type: 'SIMULATION_END', turnCount: this.turn });
    this.running = false;
    currentSimulation = null;
  }

  _askUser() {
    return new Promise((resolve) => {
      if (this.queuedUserMessage !== null) {
        const msg = this.queuedUserMessage;
        this.queuedUserMessage = null;
        this.userWaiting = true;
        this.handleUserMessage(msg);
        resolve();
        return;
      }

      this.userWaiting = true;
      this.send({ type: 'WAITING_FOR_USER', turn: this.turn });

      this.userTimeout = setTimeout(() => {
        if (this.userWaiting) {
          this.userWaiting = false;
          this.send({ type: 'USER_TIMEOUT' });
          resolve();
        }
      }, 30000);

      this._resolveUser = resolve;
    });
  }

  handleUserMessage(text) {
    if (!this.userWaiting) return;
    this.userWaiting = false;
    if (this.userTimeout) clearTimeout(this.userTimeout);

    const messageText = (text || '').trim();

    if (messageText) {
      // Discard pre-generated next turn cache since conversation context has changed
      this.nextTurnCache = null;
      this.preGeneratingPromise = null;

      this.history.push({
        speaker: 'USER',
        target: 'GENERAL',
        phase: getPhase(this.turn),
        message: messageText,
      });
      console.log(`User contributed: "${messageText}"`);
    } else {
      // User cancelled or silent timeout: keep nextTurnCache and resume instantly!
      console.log('User cancelled or remained silent. Resuming pre-generated turn.');
    }

    if (this._resolveUser) {
      this._resolveUser();
      this._resolveUser = null;
    }
  }

  handleUserInterrupt() {
    if (!this.running) return;
    console.log('User requested to speak next (interruption queued).');
    this.userWantsToSpeak = true;
  }

  stop() {
    this.running = false;
    this._cancelDelay();
    if (this.userTimeout) clearTimeout(this.userTimeout);
    if (this.userWaiting && this._resolveUser) {
      this._resolveUser();
    }
    this.send({ type: 'SIMULATION_END', turnCount: this.turn });
    currentSimulation = null;
  }

  _delay(ms) {
    return new Promise((resolve) => {
      this._delayResolve = resolve;
      this._delayTimeout = setTimeout(() => {
        this._delayResolve = null;
        resolve();
      }, ms);
    });
  }

  _cancelDelay() {
    if (this._delayTimeout) {
      clearTimeout(this._delayTimeout);
      this._delayTimeout = null;
    }
    if (this._delayResolve) {
      this._delayResolve();
      this._delayResolve = null;
    }
  }
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === 'START_SIMULATION') {
        if (currentSimulation) currentSimulation.stop();
        const topic = msg.topic || 'Artificial Intelligence: Boon or Bane for Society?';
        currentSimulation = new Simulation(topic, ws);
        currentSimulation.start();
      }

      if (msg.type === 'STOP_SIMULATION') {
        if (currentSimulation) currentSimulation.stop();
      }

      if (msg.type === 'USER_MESSAGE') {
        if (currentSimulation) {
          if (currentSimulation.userWaiting) {
            currentSimulation.handleUserMessage(msg.text);
          } else if (currentSimulation.userWantsToSpeak) {
            currentSimulation.queuedUserMessage = msg.text;
          }
        }
      }

      if (msg.type === 'USER_INTERRUPT') {
        if (currentSimulation) currentSimulation.handleUserInterrupt();
      }
    } catch (err) {
      console.error('WS message error:', err.message);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (currentSimulation) currentSimulation.stop();
  });

  ws.send(JSON.stringify({ type: 'CONNECTED' }));
});

server.listen(PORT, () => {
  console.log(`GD Simulator server running on http://localhost:${PORT}`);
  console.log(`WebSocket at ws://localhost:${PORT}/ws`);
});
