from google.cloud import texttospeech
import os
import base64

print("Step 1: Start script")

# تأكد إن الباث للـ JSON مضبوط
json_path = "C:/Users/qusay/Downloads/eyecan-backend/eyecanfinal-9cb8399f0273.json"
print("Step 2: JSON path:", json_path)

if not os.path.exists(json_path):
    print("❌ JSON file not found!")
else:
    print("✅ JSON file exists")

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = json_path

print("Step 3: Create TTS client")
try:
    client = texttospeech.TextToSpeechClient()
    print("✅ TTS client created")
except Exception as e:
    print("❌ Error creating TTS client:", e)

print("Step 4: Synthesize speech")
synthesis_input = texttospeech.SynthesisInput(text="Hello from Eyecan test!")

voice = texttospeech.VoiceSelectionParams(
    language_code="en-US", 
    ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
)

audio_config = texttospeech.AudioConfig(
    audio_encoding=texttospeech.AudioEncoding.MP3
)

try:
    response = client.synthesize_speech(
        input=synthesis_input, voice=voice, audio_config=audio_config
    )
    with open("output.mp3", "wb") as out:
        out.write(response.audio_content)
    print("✅ TTS success, output.mp3 created!")
except Exception as e:
    print("❌ TTS error:", e)
