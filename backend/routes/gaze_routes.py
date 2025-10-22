from flask import Blueprint, jsonify
import cv2
import mediapipe as mp

gaze_bp = Blueprint("gaze", __name__)

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    refine_landmarks=True,
    max_num_faces=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

cap = cv2.VideoCapture(0)

@gaze_bp.route("/gaze", methods=["GET"])
def gaze():
    ret, frame = cap.read()
    if not ret:
        return jsonify({"error": "❌ Couldn't read from camera"}), 500

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb_frame)

    h, w, _ = frame.shape
    gaze_x, gaze_y, direction = None, None, None

    if results.multi_face_landmarks:
        right_eye = results.multi_face_landmarks[0].landmark[474]
        gaze_x = int(right_eye.x * w)
        gaze_y = int(right_eye.y * h)

        # 👁️ اتجاه النظر (بسيط كبداية)
        if gaze_y is not None:
            if gaze_y < h // 2:
                direction = "up"
            else:
                direction = "down"

    return jsonify({
        "gaze_x": gaze_x,
        "gaze_y": gaze_y,
        "direction": direction,
        "width": w,
        "height": h
    }), 200
