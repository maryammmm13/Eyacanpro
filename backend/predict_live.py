import speech_recognition as sr

r = sr.Recognizer()
mic = sr.Microphone()

print("🎤 Recording for 5 seconds...")

with mic as source:
    r.adjust_for_ambient_noise(source)  # يوازن الضوضاء
    audio = r.record(source, duration=5)

print("Processing...")

try:
    text = r.recognize_google(audio, language="en-US")
    print("You said:", text)
except sr.UnknownValueError:
    print("Speech not understood")
except sr.RequestError as e:
    print("API error:", e)