import asyncio
import edge_tts
import pygame

TEXT = "Hello, I am participant one."

VOICE = "en-US-AriaNeural"

async def generate():

    communicate = edge_tts.Communicate(
        TEXT,
        VOICE
    )

    await communicate.save(
        "speech.mp3"
    )

asyncio.run(generate())

pygame.mixer.init()

pygame.mixer.music.load(
    "speech.mp3"
)

pygame.mixer.music.play()

while pygame.mixer.music.get_busy():
    pass