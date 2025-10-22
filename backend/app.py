# app.py
import os
import json
import base64
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# -----------------------
# Load environment variables
# -----------------------
load_dotenv()

PORT = int(os.getenv("PORT", 5000))
GOOGLE_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
FIREBASE_CRED = os.getenv("FIREBASE_CREDENTIALS", "")

# -----------------------
# Optional imports
# -----------------------
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False

try:
    from google.cloud import vision, texttospeech, translate_v2 as translate, speech
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

# -----------------------
# Flask + CORS
# -----------------------
app = Flask(__name__)
CORS(app)

# -----------------------
# Google Cloud Setup
# -----------------------
# بدل هذا الجزء كله 👇
# if GOOGLE_CREDENTIALS and os.path.exists(GOOGLE_CREDENTIALS):
#     os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_CREDENTIALS
# else:
#     print("⚠️ Google credentials not found or path invalid.")

# استخدم هذا:
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\Lenovo\OneDrive\Desktop\eyecan-backend\eyecanfinal-fcff1bede2a7.json"
print("✅ Using Google credentials:", os.environ["GOOGLE_APPLICATION_CREDENTIALS"])


vision_client = tts_client = translate_client = stt_client = None
if GOOGLE_AVAILABLE:
    try:
        vision_client = vision.ImageAnnotatorClient()
        tts_client = texttospeech.TextToSpeechClient()
        translate_client = translate.Client()
        stt_client = speech.SpeechClient()
        print("✅ Google Cloud clients initialized successfully.")
    except Exception as e:
        print("⚠️ Google clients initialization failed:", e)

# -----------------------
# Firebase Setup (optional)
# -----------------------
db = None
if FIREBASE_AVAILABLE and FIREBASE_CRED and os.path.exists(FIREBASE_CRED):
    try:
        cred = credentials.Certificate(FIREBASE_CRED)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Firebase initialized successfully.")
    except Exception as e:
        print("⚠️ Firebase init failed:", e)

# -----------------------
# Local Data Store
# -----------------------
LOCAL_STORE = os.path.join(os.path.dirname(__file__), "mouse_store.json")

if os.path.exists(LOCAL_STORE):
    try:
        with open(LOCAL_STORE, "r", encoding="utf-8") as f:
            STORE = json.load(f)
    except Exception:
        STORE = {"mouse": None, "samples": []}
else:
    STORE = {"mouse": None, "samples": []}


def persist_store():
    try:
        with open(LOCAL_STORE, "w", encoding="utf-8") as f:
            json.dump(STORE, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("⚠️ Failed to persist store:", e)


def save_to_firestore(user_id: str, payload: dict):
    if not db:
        return False
    try:
        doc_ref = db.collection("eyecan_users").document(user_id)
        doc_ref.set(payload, merge=True)
        return True
    except Exception as e:
        print("⚠️ Firestore save failed:", e)
        return False

# -----------------------
# ROUTES
# -----------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/mouse", methods=["POST"])
def update_mouse():
    try:
        data = request.get_json(force=True) or {}
        x, y = data.get("x"), data.get("y")
        if x is None or y is None:
            return jsonify({"error": "❌ missing x or y"}), 400
        STORE["mouse"] = {"x": float(x), "y": float(y)}
        STORE["samples"].append(STORE["mouse"])
        persist_store()
        return jsonify({"msg": "✅ Mouse updated", "mouse": STORE["mouse"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/mouse", methods=["GET"])
def get_mouse():
    return jsonify({"mouse": STORE.get("mouse")})


# ---------- TTS ----------
@app.route("/speak", methods=["POST"])
def speak():
    if not tts_client:
        return jsonify({"error": "⚠️ Google TTS client not initialized."}), 500
    try:
        data = request.get_json(force=True) or {}
        text = data.get("text")
        if not text:
            return jsonify({"error": "❌ No text provided"}), 400

        lang = data.get("lang", "ar-XA")
        gender = data.get("gender", "female").lower()
        g_gender = (
            texttospeech.SsmlVoiceGender.FEMALE
            if gender == "female"
            else texttospeech.SsmlVoiceGender.MALE
        )

        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(language_code=lang, ssml_gender=g_gender)
        audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)

        resp = tts_client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )
        b64 = base64.b64encode(resp.audio_content).decode("utf-8")
        return jsonify({"audio_base64": b64, "mime": "audio/mpeg"})
    except Exception as e:
        print("⚠️ TTS Error:", e)
        return jsonify({"error": f"TTS failed: {str(e)}"}), 500


# ---------- Translate ----------
@app.route("/translate", methods=["POST"])
def translate_text():
    if not translate_client:
        return jsonify({"error": "⚠️ Google Translate not available"}), 500
    try:
        data = request.get_json(force=True) or {}
        text = data.get("text")
        target = data.get("target", "en")
        if not text:
            return jsonify({"error": "❌ No text provided"}), 400
        result = translate_client.translate(text, target_language=target)
        return jsonify(
            {
                "translated": result["translatedText"],
                "detected_source": result.get("detectedSourceLanguage"),
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------- OCR ----------
@app.route("/ocr", methods=["POST"])
def ocr():
    if not vision_client:
        return jsonify({"error": "⚠️ Google Vision not available"}), 500
    try:
        if "file" not in request.files:
            return jsonify({"error": "❌ No file uploaded"}), 400
        file = request.files["file"]
        content = file.read()
        image = vision.Image(content=content)
        response = vision_client.text_detection(image=image)
        texts = [t.description for t in response.text_annotations]
        return jsonify({"texts": texts})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------- Speech to Text ----------
@app.route("/listen", methods=["POST"])
def listen():
    if not stt_client:
        return jsonify({"error": "⚠️ Speech-to-Text not available"}), 500
    try:
        data = request.get_json(force=True) or {}
        audio_b64 = data.get("audio_base64")
        lang = data.get("lang", "en-US")
        if not audio_b64:
            return jsonify({"error": "❌ No audio data"}), 400

        audio = speech.RecognitionAudio(content=base64.b64decode(audio_b64))
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code=lang,
        )
        resp = stt_client.recognize(config=config, audio=audio)
        results = [r.alternatives[0].transcript for r in resp.results]
        return jsonify({"transcripts": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------- Logging ----------
@app.route("/api/log_sample", methods=["POST"])
def log_sample():
    try:
        data = request.get_json(force=True) or {}
        user_id = data.get("user_id", "default_user")
        x, y = data.get("x"), data.get("y")
        if x is None or y is None:
            return jsonify({"error": "❌ Invalid sample"}), 400
        STORE["samples"].append({"x": float(x), "y": float(y)})
        persist_store()
        if db:
            save_to_firestore(user_id, {"samples": STORE["samples"]})
        return jsonify({"msg": "✅ Sample logged", "total_samples": len(STORE["samples"])})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------- Status ----------
@app.route("/api/status", methods=["GET"])
def status():
    try:
        return jsonify(
            {
                "firebase_connected": db is not None,
                "sample_count": len(STORE.get("samples", [])),
                "last_mouse": STORE.get("mouse"),
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------- Gemini Chat ----------
@app.route("/chat", methods=["POST"])
def chat():
    try:
        if not GEMINI_API_KEY:
            return jsonify({"error": "⚠️ Gemini API key not set"}), 500
        data = request.get_json(force=True) or {}
        text = data.get("text")
        if not text:
            return jsonify({"error": "❌ No text provided"}), 400

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={GEMINI_API_KEY}"
        payload = {"contents": [{"parts": [{"text": text}]}]}
        headers = {"Content-Type": "application/json"}

        resp = requests.post(url, headers=headers, json=payload)
        if resp.status_code != 200:
            return jsonify({"error": f"Gemini API error: {resp.text}"}), 500

        data = resp.json()
        reply = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -----------------------
# Run the app
# -----------------------
if __name__ == "__main__":
    print("🚀 Eyecan backend started successfully on port", PORT)
    app.run(host="0.0.0.0", port=PORT, threaded=True)
