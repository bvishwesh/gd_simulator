import os
from openai import OpenAI
import json
import random
import speech_recognition as sr
import asyncio
import edge_tts
import pygame
from dotenv import load_dotenv

# Load .env from the project root
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# 1. Secured API Key
api_key = os.getenv("OPENROUTER_API_KEY")
if not api_key:
    raise RuntimeError("Missing OPENROUTER_API_KEY in environment or .env file")

client = OpenAI(
    api_key=api_key,
    base_url="https://openrouter.ai/api/v1"
)

pygame.mixer.init()
recognizer = sr.Recognizer()

TOPIC = input("Enter GD Topic: ")

participants = {
    "P1": {"role": "Aggressive Dominator", "weight": 40},
    "P2": {"role": "Logical Analyst", "weight": 25},
    "P3": {"role": "Data Driven Speaker", "weight": 20},
    "P4": {"role": "Corporate Professional", "weight": 10},
    "P5": {"role": "Introvert", "weight": 5}
}

voice_map = {
    "P1": "en-US-GuyNeural",
    "P2": "en-US-JennyNeural",
    "P3": "en-US-BrianNeural",
    "P4": "en-US-AriaNeural",
    "P5": "en-US-ChristopherNeural"
}

# 2. Relationship Graph
relationships = {
    "P1": {"likes": [], "disagrees_with": []},
    "P2": {"likes": [], "disagrees_with": []},
    "P3": {"likes": [], "disagrees_with": []},
    "P4": {"likes": [], "disagrees_with": []},
    "P5": {"likes": [], "disagrees_with": []},
    "USER": {"likes": [], "disagrees_with": []}
}

history = []
turn = 1

async def speak(text, voice, current_turn):
    filename = f"temp_{current_turn}.mp3"
    
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(filename)

    pygame.mixer.music.load(filename)
    pygame.mixer.music.play()

    while pygame.mixer.music.get_busy():
        await asyncio.sleep(0.1)
        
    # Unload the file so it can be deleted
    pygame.mixer.music.unload()
    
    # Delete the file to save disk space
    try:
        os.remove(filename)
    except Exception as e:
        print(f"Could not delete {filename}: {e}")

def get_voice_input():
    with sr.Microphone() as source:
        print("\nListening...")
        recognizer.adjust_for_ambient_noise(source, duration=1)
        audio = recognizer.listen(source, timeout=10, phrase_time_limit=20)
    try:
        text = recognizer.recognize_google(audio)
        print("\nYou:", text)
        return text
    except Exception:
        print("Could not understand.")
        return ""

def save_history():
    with open("memory.json", "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)

def get_phase(turn):
    if turn <= 5: return "opening"
    elif turn <= 15: return "debate"
    return "conclusion"

def choose_speaker():
    ids = list(participants.keys())
    weights = [participants[p]["weight"] for p in ids]
    return random.choices(ids, weights=weights, k=1)[0]

# 3. Target Selection
def choose_target(speaker, history):
    if not history:
        return "GENERAL"
    
    # 70% chance to target the last speaker, 30% chance to target someone random
    last_speaker = history[-1]["speaker"]
    if random.random() < 0.7 and last_speaker != speaker:
        return last_speaker
    
    possible_targets = [p for p in participants.keys() if p != speaker] + ["USER"]
    return random.choice(possible_targets)

def choose_intent(phase):
    if phase == "opening":
        return random.choice(["introduce_argument", "share_view"])
    if phase == "debate":
        return random.choice(["challenge", "agree", "question", "counter_argument"])
    return random.choice(["summarize", "final_opinion"])

# 4. Update Relationship Graph dynamically
def update_relationships(speaker, target, intent):
    if target == "GENERAL": return
    
    if intent in ["challenge", "counter_argument"]:
        if target not in relationships[speaker]["disagrees_with"]:
            relationships[speaker]["disagrees_with"].append(target)
    elif intent in ["agree"]:
        if target not in relationships[speaker]["likes"]:
            relationships[speaker]["likes"].append(target)

print("\n===== GD STARTED =====\n")

while True:
    phase = get_phase(turn)
    speaker = choose_speaker()
    target = choose_target(speaker, history)
    intent = choose_intent(phase)
    
    # Update relationships before generating speech so the LLM knows the current state
    update_relationships(speaker, target, intent)
    
    recent_context = history[-10:]
    current_relationships = relationships[speaker]

    prompt = f"""
You are participating in a campus placement Group Discussion.

TOPIC: {TOPIC}
CURRENT PHASE: {phase}

YOUR IDENTITY: {speaker}
YOUR PERSONALITY: {participants[speaker]["role"]}

YOUR TARGET (Who you are addressing): {target}
YOUR INTENT: {intent}

YOUR CURRENT RELATIONSHIPS:
- People you agree with: {current_relationships['likes']}
- People you disagree with: {current_relationships['disagrees_with']}

RECENT DISCUSSION:
{json.dumps(recent_context, indent=2)}

RULES:
- Stay consistent with personality.
- Address your target directly if they are not 'GENERAL'.
- Let your relationships dictate your tone towards the target.
- Follow the intent.
- Use 2-4 sentences.
- Avoid repeating points.

Return ONLY the response text.
"""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        
        message = response.choices[0].message.content

        print(f"\n[{phase.upper()}]")
        print(f"{speaker} ({participants[speaker]['role']}) addressing {target}:")
        print(message)

        asyncio.run(speak(message, voice_map[speaker],turn))

        history.append({
            "speaker": speaker,
            "target": target,
            "phase": phase,
            "intent": intent,
            "message": message
        })
        save_history()

        if turn % 3 == 0:
            choice = input("\nDo you want to contribute? (y/n/exit): ")
            if choice.lower() == "exit":
                break
            if choice.lower() == "y":
                print("\nSpeak your point now...")
                user_message = get_voice_input()
                if user_message:
                    history.append({
                        "speaker": "USER",
                        "target": "GENERAL",
                        "phase": phase,
                        "message": user_message
                    })
                    save_history()

        turn += 1

    except Exception as e:
        print("\nERROR:")
        print(e)