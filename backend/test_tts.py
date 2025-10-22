from google.cloud import texttospeech
import os

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "C:/Users/qusay/Downloads/eyecan-backend/eyecanfinal-9cb8399f0273.json"

client = texttospeech.TextToSpeechClient()
synthesis_input = texttospeech.SynthesisInput(text="مرحبا راما، التجربة ناجحة!")

voice = texttospeech.VoiceSelectionParams(
    language_code="ar-XA", ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
)
audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)

response = client.synthesize_speech(
    input=synthesis_input, voice=voice, audio_config=audio_config
)

with open("test_output.mp3", "wb") as out:
    out.write(response.audio_content)
    print("✅ تم إنشاء الصوت بنجاح!")
