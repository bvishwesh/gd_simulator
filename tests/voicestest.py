# import pyttsx3

# engine = pyttsx3.init()

# voices = engine.getProperty("voices")

# for i, voice in enumerate(voices):
#     print(i)
#     print("Name:", voice.name)
#     print("ID:", voice.id)
#     print("-"*50)




import asyncio
import edge_tts

async def list_voices():

    voices = await edge_tts.list_voices()

    for v in voices[:30]:
        print(v["ShortName"])

asyncio.run(
    list_voices()
)