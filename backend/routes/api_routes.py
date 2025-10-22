import os
import base64
import cv2
import time
import mediapipe as mp
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
from google.cloud import vision, texttospeech

# ============================
# 1) Load Environment Variables
# ============================
load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# ============================
# 2) Firebase Setup
# ============================
firebase_path = os.getenv("FIREBASE_CREDENTIALS")
if firebase_path and os.path.exists(firebase_path):
    cred = credentials.Certificate(firebase_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
else:
    db = None

# ============================
# 3) Google Vision API
# ============================
vision_client = vision.ImageAnnotatorClient()

@app.route("/analyze_env", methods=["POST"])
def analyze_env():
    try:
        if "image" in request.files:
            content = request.files["image"].read()
        else:
            payload = request.get_json(force=True, silent=True) or {}
            b64 = payload.get("image_base64")
            if not b64:
                return jsonify({"error": "no image provided"}), 400
            content = base64.b64decode(b64.split(",")[-1])

        image = vision.Image(content=content)
        labels = vision_client.label_detection(image=image).label_annotations
        labels_out = [{"description": l.description, "score": l.score} for l in labels[:5]]
        text_resp = vision_client.text_detection(image=image).text_annotations
        text_out = text_resp[0].description if text_resp else ""

        return jsonify({"labels": labels_out, "text": text_out})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================
# 4) Google TTS
# ============================
tts_client = texttospeech.TextToSpeechClient()

@app.route("/speak", methods=["POST"])
def speak():
    try:
        data = request.get_json(force=True) or {}
        text = data.get("text")
        if not text:
            return jsonify({"error": "no text"}), 400

        lang = data.get("lang", "ar-XA")
        gender = data.get("gender", "female").lower()
        g_gender = (
            texttospeech.SsmlVoiceGender.FEMALE if gender == "female"
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
        return jsonify({"error": str(e)}), 500

# ============================
# 5) Eye Gaze Tracking + Dwell-Time
# ============================
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    refine_landmarks=True,
    max_num_faces=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

cap = cv2.VideoCapture(0)

# global state
ui_elements = []        # [ {x, y, w, h, text}, ... ]
last_element = None
dwell_start = None
DWELL_THRESHOLD = 1.5  # seconds

@app.route("/api/ui_elements", methods=["POST"])
def update_ui_elements():
    """Frontend يبعت كل الأزرار مع مواقعهم"""
    global ui_elements
    data = request.get_json(force=True) or {}
    ui_elements = data.get("elements", [])
    return jsonify({"status": "ok", "count": len(ui_elements)})

@app.route("/api/gaze", methods=["GET"])
def gaze():
    global last_element, dwell_start

    ret, frame = cap.read()
    if not ret:
        return jsonify({"error": "❌ Couldn't read from camera"}), 500

    h, w, _ = frame.shape
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb_frame)

    if not results.multi_face_landmarks:
        last_element = None
        dwell_start = None
        return jsonify({
            "msg": "⚠️ No face detected",
            "gaze_x": None,
            "gaze_y": None,
            "element": None,
            "selected": False,
            "width": w,
            "height": h
        }), 200

    landmarks = results.multi_face_landmarks[0].landmark
    eye = landmarks[468]  # مركز العين
    gaze_x = int(eye.x * w)
    gaze_y = int(eye.y * h)

    # check if gaze inside any UI element
    current_element = None
    for el in ui_elements:
        x, y, ew, eh, text = el["x"], el["y"], el["w"], el["h"], el.get("text", "")
        if x <= gaze_x <= x + ew and y <= gaze_y <= y + eh:
            current_element = text or f"element@({x},{y})"
            break

    selected = False
    now = time.time()

    if current_element:
        if current_element == last_element:
            if dwell_start and (now - dwell_start >= DWELL_THRESHOLD):
                selected = True
                dwell_start = None
        else:
            dwell_start = now
        last_element = current_element
    else:
        last_element = None
        dwell_start = None

    return jsonify({
        "gaze_x": gaze_x,
        "gaze_y": gaze_y,
        "element": current_element,
        "selected": selected,
        "width": w,
        "height": h
    }), 200

# ============================
# 6) Run App
# ============================
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port)
