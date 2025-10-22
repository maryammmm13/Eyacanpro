import requests
import base64

url = "http://localhost:5000/speak"

payload = {
    "text": "مرحبا كيفك؟",
    "lang": "ar-XA",       # ممكن تغيّري لـ "en-US"
    "gender": "female"     # أو "male"
}

resp = requests.post(url, json=payload)

if resp.status_code == 200:
    data = resp.json()
    audio_base64 = data.get("audio_base64")
    if audio_base64:
        with open("voice.mp3", "wb") as f:
            f.write(base64.b64decode(audio_base64))
        print("✅ Saved as voice.mp3")
    else:
        print("⚠️ No audio returned:", data)
else:
    print("❌ Error:", resp.status_code, resp.text)
