import cv2
import numpy as np
from collections import deque
import time
import os
import threading
import queue
from google.cloud import vision
from google.cloud.vision_v1 import types
import mediapipe as mp
from dotenv import load_dotenv
import google.generativeai as genai
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import speech_recognition as sr
from google.cloud import speech_v1p1beta1 as speech
from google.cloud import translate_v2 as translate
import io
import base64

# ======================
# Load environment variables and initialize AI services
# ======================
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("❌ Missing GEMINI_API_KEY environment variable")

# Initialize Gemini AI
genai.configure(api_key=api_key)
gemini_model = genai.GenerativeModel("gemini-1.5-flash")

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing

# ======================
# TTS Service (Simplified)
# ======================
class TTSService:
    def __init__(self):
        print("TTS Service Initialized")
    
    def text_to_speech(self, text):
        """Convert text to speech"""
        print(f"SPEAKING: {text}")
        # In production, this would connect to Dialogflow TTS
        return {"status": "success", "message": f"Would speak: {text}"}

# ======================
# Kalman Filter for Smoothing
# ======================
class KalmanFilter:
    def __init__(self, process_noise=0.01, measurement_noise=1.0):
        self.process_noise = process_noise
        self.measurement_noise = measurement_noise
        self.predicted_measurement = np.zeros(2)
        self.error_estimate = 1.0
        self.last_measurement = np.zeros(2)

    def update(self, measurement):
        if np.all(self.last_measurement == 0):
            self.last_measurement = measurement
            return measurement

        prior_error_estimate = self.error_estimate + self.process_noise
        kalman_gain = prior_error_estimate / (prior_error_estimate + self.measurement_noise)
        self.predicted_measurement = self.last_measurement + kalman_gain * (measurement - self.last_measurement)
        self.error_estimate = (1 - kalman_gain) * prior_error_estimate
        self.last_measurement = self.predicted_measurement
        return self.predicted_measurement

# ======================
# Speech-to-Text Service
# ======================
class SpeechToTextService:
    def __init__(self):
        try:
            self.recognizer = sr.Recognizer()
            self.microphone = sr.Microphone()
            
            # Adjust for ambient noise
            print("Adjusting for ambient noise...")
            with self.microphone as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=1)
            print("Speech-to-text service initialized successfully")
        except Exception as e:
            print(f"Failed to initialize microphone: {e}")
            self.microphone = None

    def transcribe_audio(self, audio_data=None):
        """Transcribe audio using Google Speech-to-Text"""
        try:
            if audio_data:
                # Process audio data from frontend
                if isinstance(audio_data, str) and audio_data.startswith('data:audio'):
                    # Handle base64 audio data
                    audio_data = base64.b64decode(audio_data.split(',')[1])
                
                # Use audio data
                with sr.AudioFile(io.BytesIO(audio_data)) as source:
                    audio = self.recognizer.record(source)
                    text = self.recognizer.recognize_google(audio)
                    return text
            else:
                # Record audio from microphone
                if not self.microphone:
                    return "Microphone not available"
                
                with self.microphone as source:
                    print("Listening for command...")
                    audio_data = self.recognizer.listen(source, timeout=3, phrase_time_limit=5)
                    text = self.recognizer.recognize_google(audio_data)
                    return text
        except sr.WaitTimeoutError:
            return "No speech detected"
        except sr.UnknownValueError:
            return "Could not understand audio"
        except Exception as e:
            print(f"Speech recognition error: {e}")
            return f"Error: {str(e)}"

# ======================
# AI Response Service
# ======================
class AIResponseService:
    def __init__(self):
        self.last_response_time = 0
        self.response_cooldown = 5  # seconds between AI responses
    
    def get_ai_response(self, user_input):
        """Get short AI response using Gemini"""
        current_time = time.time()
        
        # Check cooldown to avoid spamming AI
        if current_time - self.last_response_time < self.response_cooldown:
            return "Please wait before asking another question"
            
        try:
            prompt = f"""User is using an eye-tracking accessibility system. 
            They said: "{user_input}"
            
            Provide a very short, helpful response (1 sentence maximum).
            Focus on being concise and directly helpful."""
            
            response = gemini_model.generate_content(prompt)
            self.last_response_time = current_time
            
            return response.text if response and response.text else "I didn't understand that."
                
        except Exception as e:
            print(f"AI response error: {e}")
            return "Sorry, I'm having trouble responding right now."

# ======================
# Vision API Processor (for enhanced eye detection)
# ======================
class VisionAPIProcessor:
    def __init__(self, credentials_path):
        try:
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
            self.vision_client = vision.ImageAnnotatorClient()
            self.input_queue = queue.Queue(maxsize=1)
            self.output_queue = queue.Queue(maxsize=1)
            self.running = True
            self.thread = threading.Thread(target=self._process_frames)
            self.thread.daemon = True
            self.thread.start()
        except Exception as e:
            print(f"Failed to initialize Vision API: {e}")
            self.running = False

    def _process_frames(self):
        while self.running:
            try:
                frame_data = self.input_queue.get(timeout=1)
                if frame_data is None:
                    break

                # Process the frame using Vision API
                if isinstance(frame_data, str) and frame_data.startswith('data:image'):
                    # Handle base64 image data
                    frame_data = base64.b64decode(frame_data.split(',')[1])
                
                image = types.Image(content=frame_data)
                response = self.vision_client.face_detection(image=image)
                faces = response.face_annotations

                left_eye, right_eye = None, None

                for face in faces:
                    for landmark in face.landmarks:
                        if landmark.type == vision.FaceAnnotation.Landmark.Type.LEFT_EYE:
                            left_eye = (landmark.position.x, landmark.position.y)
                        elif landmark.type == vision.FaceAnnotation.Landmark.Type.RIGHT_EYE:
                            right_eye = (landmark.position.x, landmark.position.y)

                    if left_eye and right_eye:
                        break

                self.output_queue.put((left_eye, right_eye))
            except queue.Empty:
                continue
            except Exception as e:
                print(f"Vision API processing error: {e}")
                self.output_queue.put((None, None))

    def stop(self):
        self.running = False
        if hasattr(self, 'thread'):
            self.thread.join()

# ======================
# Gaze Direction Estimator
# ======================
class GazeDirectionEstimator:
    def __init__(self, screen_width=1280, screen_height=720):
        self.screen_width = screen_width
        self.screen_height = screen_height
        self.gaze_history = deque(maxlen=15)
        self.calibration_factors = {'x_sensitivity': 3.5, 'y_sensitivity': 3.0}
        self.kalman = KalmanFilter(process_noise=0.005, measurement_noise=0.5)
        
        # Enhanced gaze tracking parameters
        self.eye_center_history = deque(maxlen=10)
        self.pupil_movement_history = deque(maxlen=15)
        self.smoothing_factor = 0.2
        self.base_eye_ratio = 0.3
        
    def calculate_pupil_center(self, eye_points):
        """Calculate the approximate pupil center from eye landmarks"""
        if len(eye_points) < 6:
            return None
            
        inner_corner = eye_points[0]
        outer_corner = eye_points[3]
        top_center = eye_points[1]
        bottom_center = eye_points[5]
        
        eye_width = abs(outer_corner[0] - inner_corner[0])
        eye_height = abs(bottom_center[1] - top_center[1])
        
        if eye_width == 0:
            return None
            
        eye_aspect_ratio = eye_height / eye_width if eye_height > 0 else 0.3
        
        eye_center_x = inner_corner[0] + eye_width * 0.5
        eye_center_y = top_center[1] + eye_height * 0.5
        
        if eye_aspect_ratio > 0.4:
            pupil_y = eye_center_y - (eye_aspect_ratio - 0.3) * eye_height * 0.2
        else:
            pupil_y = eye_center_y + (0.3 - eye_aspect_ratio) * eye_height * 0.2
            
        pupil_x = eye_center_x + (eye_aspect_ratio - 0.3) * eye_width * 0.1
        
        return (int(pupil_x), int(pupil_y))
    
    def calculate_eye_orientation(self, eye_points):
        """Calculate eye orientation based on angles"""
        if len(eye_points) < 6:
            return (0.5, 0.5)

        inner_corner = eye_points[0]
        outer_corner = eye_points[3]
        top_edge = eye_points[1]
        bottom_edge = eye_points[5]
        
        eye_center_x = (inner_corner[0] + outer_corner[0]) // 2
        eye_center_y = (inner_corner[1] + outer_corner[1]) // 2
        
        eye_width = abs(outer_corner[0] - inner_corner[0])
        eye_height = abs(top_edge[1] - bottom_edge[1])
        
        if eye_width == 0 or eye_height == 0:
            return (0.5, 0.5)
        
        horizontal_ratio = eye_center_x / self.screen_width
        vertical_ratio = eye_center_y / self.screen_height
        
        eye_aspect_ratio = eye_height / eye_width
        
        horizontal_adjustment = 0.5 + (horizontal_ratio - 0.5) * self.calibration_factors['x_sensitivity'] * (1.0 + (eye_aspect_ratio - 0.3) * 0.5)
        vertical_adjustment = 0.5 + (vertical_ratio - 0.5) * self.calibration_factors['y_sensitivity'] * (1.0 + (0.3 - eye_aspect_ratio) * 0.8)
        
        return (horizontal_adjustment, vertical_adjustment)
    
    def estimate_gaze_from_eye_landmarks(self, left_eye_points, right_eye_points, frame_shape):
        """Enhanced gaze estimation using eye landmarks"""
        if not left_eye_points or not right_eye_points or len(left_eye_points) < 6 or len(right_eye_points) < 6:
            return None

        left_pupil = self.calculate_pupil_center(left_eye_points)
        right_pupil = self.calculate_pupil_center(right_eye_points)
        
        if not left_pupil and not right_pupil:
            return None
        
        left_eye_center = ((left_eye_points[0][0] + left_eye_points[3][0]) // 2, 
                          (left_eye_points[0][1] + left_eye_points[3][1]) // 2)
        right_eye_center = ((right_eye_points[0][0] + right_eye_points[3][0]) // 2, 
                           (right_eye_points[0][1] + right_eye_points[3][1]) // 2)
        
        left_orientation = self.calculate_eye_orientation(left_eye_points)
        right_orientation = self.calculate_eye_orientation(right_eye_points)
        
        left_gaze_vector = (left_pupil[0] - left_eye_center[0], left_pupil[1] - left_eye_center[1]) if left_pupil else (0, 0)
        right_gaze_vector = (right_pupil[0] - right_eye_center[0], right_pupil[1] - right_eye_center[1]) if right_pupil else (0, 0)
        
        left_gaze_magnitude = max(1, np.sqrt(left_gaze_vector[0]**2 + left_gaze_vector[1]**2))
        right_gaze_magnitude = max(1, np.sqrt(right_gaze_vector[0]**2 + right_gaze_vector[1]**2))
        
        left_gaze_normalized = (left_gaze_vector[0] / left_gaze_magnitude, 
                               left_gaze_vector[1] / left_gaze_magnitude)
        right_gaze_normalized = (right_gaze_vector[0] / right_gaze_magnitude, 
                                right_gaze_vector[1] / right_gaze_magnitude)
        
        avg_horizontal = (left_orientation[0] * 0.6 + right_orientation[0] * 0.4)
        avg_vertical = (left_orientation[1] * 0.6 + right_orientation[1] * 0.4)
        
        gaze_dx = (avg_horizontal - 0.5) * self.calibration_factors['x_sensitivity'] * 1.5
        gaze_dy = (avg_vertical - 0.5) * self.calibration_factors['y_sensitivity'] * 1.2
        
        gaze_dx += (left_gaze_normalized[0] + right_gaze_normalized[0]) * 0.3
        gaze_dy += (left_gaze_normalized[1] + right_gaze_normalized[1]) * 0.3
        
        combined_x = (left_eye_center[0] + right_eye_center[0]) // 2
        combined_y = (left_eye_center[1] + right_eye_center[1]) // 2
        
        screen_x = int(combined_x + gaze_dx * (self.screen_width * 0.25))
        screen_y = int(combined_y + gaze_dy * (self.screen_height * 0.25))
        
        screen_x = max(0, min(self.screen_width - 1, screen_x))
        screen_y = max(0, min(self.screen_height - 1, screen_y))
        
        gaze_point = np.array([screen_x, screen_y])
        smoothed_gaze = self.kalman.update(gaze_point)
        
        self.gaze_history.append((smoothed_gaze[0], smoothed_gaze[1]))
        
        if len(self.gaze_history) > 1:
            weights = np.linspace(0.5, 1.0, len(self.gaze_history))
            weights /= weights.sum()
            
            avg_x = sum(p[0] * w for p, w in zip(self.gaze_history, weights))
            avg_y = sum(p[1] * w for p, w in zip(self.gaze_history, weights))
            
            smoothed_gaze[0] = self.smoothing_factor * smoothed_gaze[0] + (1 - self.smoothing_factor) * avg_x
            smoothed_gaze[1] = self.smoothing_factor * smoothed_gaze[1] + (1 - self.smoothing_factor) * avg_y
        
        return (int(smoothed_gaze[0]), int(smoothed_gaze[1]))
    
    def update_calibration(self, calibration_data):
        """Update sensitivity factors based on calibration data"""
        if not calibration_data:
            return

        x_offsets = []
        y_offsets = []

        for gaze_point, screen_point in calibration_data:
            dx = (gaze_point[0] - screen_point[0]) / (self.screen_width / 2)
            dy = (gaze_point[1] - screen_point[1]) / (self.screen_height / 2)
            x_offsets.append(abs(dx))
            y_offsets.append(abs(dy))

        if x_offsets:
            avg_x_offset = np.mean(x_offsets)
            self.calibration_factors['x_sensitivity'] = max(2.5, min(6.0, 3.5 / (avg_x_offset + 0.1)))

        if y_offsets:
            avg_y_offset = np.mean(y_offsets)
            self.calibration_factors['y_sensitivity'] = max(2.5, min(6.0, 3.0 / (avg_y_offset + 0.1)))

# ======================
# Button/Element Detector
# ======================
class ElementDetector:
    """Detect when user is looking at a UI element and speak its text"""
    def __init__(self, tts_service):
        self.tts_service = tts_service
        self.elements = []  # List of elements with coordinates and text
        self.dwell_time = 1.5  # Seconds to look at element before speaking
        self.dwell_start_time = None
        self.current_element = None
        self.last_spoken_element = None
        self.last_spoken_time = 0
        self.cooldown_time = 3.0  # Seconds before same element can be spoken again
        
    def update_elements(self, elements_data):
        """Update the list of elements from frontend"""
        self.elements = elements_data
        
    def check_gaze_on_elements(self, gaze_point):
        """Check if gaze is on any element and speak if dwell time is reached"""
        if not gaze_point or not self.elements:
            return None
            
        current_time = time.time()
        
        # Check if gaze is on any element
        for element in self.elements:
            x, y, width, height, text, element_type = element
            if (x <= gaze_point[0] <= x + width and 
                y <= gaze_point[1] <= y + height):
                
                # If this is a new element, reset dwell timer
                if text != self.current_element:
                    self.current_element = text
                    self.dwell_start_time = current_time
                    return f"Looking at: {text}"
                
                # If still looking at the same element
                if (current_time - self.dwell_start_time >= self.dwell_time and 
                    (self.last_spoken_element != text or 
                     current_time - self.last_spoken_time >= self.cooldown_time)):
                    
                    # Speak the element text
                    self.tts_service.text_to_speech(text)
                    self.last_spoken_element = text
                    self.last_spoken_time = current_time
                    return f"Speaking: {text}"
                
                return f"Looking at: {text} ({int(current_time - self.dwell_start_time)}s)"
        
        # If not looking at any element
        self.current_element = None
        self.dwell_start_time = None
        return None

# ======================
# Main Gaze Interaction System
# ======================
class GazeInteractionSystem:
    def __init__(self, screen_width=1280, screen_height=720):
        self.screen_width = screen_width
        self.screen_height = screen_height
        
        # Setup services
        self.tts_service = TTSService()
        self.speech_service = SpeechToTextService()
        self.ai_service = AIResponseService()
        
        # Setup MediaPipe for eye tracking
        self.setup_mediapipe()
        
        # Setup Vision API (if credentials available)
        self.vision_processor = None
        self.setup_vision_api()
        
        # Setup gaze estimator
        self.gaze_estimator = GazeDirectionEstimator(screen_width, screen_height)
        
        # Setup element detector
        self.element_detector = ElementDetector(self.tts_service)
        
        # Gaze tracking variables
        self.gaze_history = deque(maxlen=10)
        self.current_gaze_point = (0, 0)
        
        # Calibration
        self.calibration_points = [
            (int(screen_width * 0.2), int(screen_height * 0.2)),
            (int(screen_width * 0.5), int(screen_height * 0.2)),
            (int(screen_width * 0.8), int(screen_height * 0.2)),
            (int(screen_width * 0.2), int(screen_height * 0.5)),
            (int(screen_width * 0.5), int(screen_height * 0.5)),
            (int(screen_width * 0.8), int(screen_height * 0.5)),
            (int(screen_width * 0.2), int(screen_height * 0.8)),
            (int(screen_width * 0.5), int(screen_height * 0.8)),
            (int(screen_width * 0.8), int(screen_height * 0.8))
        ]
        self.current_calibration_point = 0
        self.calibration_data = []
        self.calibration_complete = False
        
        # Speech mode
        self.speech_mode_active = False
        self.last_speech_activation = 0
        
        print("Gaze Interaction System Initialized")

    def setup_mediapipe(self):
        """Setup MediaPipe for eye tracking"""
        try:
            self.mp_face_mesh = mp.solutions.face_mesh
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )

            self.LEFT_EYE_INDICES = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
            self.RIGHT_EYE_INDICES = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]

            print("✅ MediaPipe Face Mesh initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize MediaPipe: {e}")
            raise

    def setup_vision_api(self):
        """Setup Google Vision API if credentials are available"""
        credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if credentials_path and os.path.exists(credentials_path):
            try:
                self.vision_processor = VisionAPIProcessor(credentials_path)
                print("✅ Vision API initialized successfully")
            except Exception as e:
                print(f"❌ Failed to initialize Vision API: {e}")
                self.vision_processor = None
        else:
            print("ℹ️ Vision API not configured (missing credentials)")
            self.vision_processor = None

    def detect_eyes_mediapipe(self, frame):
        """Detect eyes using MediaPipe"""
        if frame is None:
            return [], []
            
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_frame)
        
        left_eye_points = []
        right_eye_points = []
        
        if results.multi_face_landmarks:
            for face_landmarks in results.multi_face_landmarks:
                # Extract left eye points
                for idx in self.LEFT_EYE_INDICES:
                    if idx < len(face_landmarks.landmark):
                        landmark = face_landmarks.landmark[idx]
                        x = int(landmark.x * frame.shape[1])
                        y = int(landmark.y * frame.shape[0])
                        left_eye_points.append((x, y))
                
                # Extract right eye points
                for idx in self.RIGHT_EYE_INDICES:
                    if idx < len(face_landmarks.landmark):
                        landmark = face_landmarks.landmark[idx]
                        x = int(landmark.x * frame.shape[1])
                        y = int(landmark.y * frame.shape[0])
                        right_eye_points.append((x, y))
        
        return left_eye_points, right_eye_points

    def detect_eyes_vision_api(self, frame_data):
        """Detect eyes using Vision API"""
        if not self.vision_processor:
            return None, None
            
        try:
            if not self.vision_processor.input_queue.full():
                self.vision_processor.input_queue.put(frame_data)
            
            try:
                left_eye, right_eye = self.vision_processor.output_queue.get_nowait()
                return left_eye, right_eye
            except queue.Empty:
                return None, None
        except Exception as e:
            print(f"Vision API detection error: {e}")
            return None, None

    def estimate_gaze(self, frame=None, frame_data=None):
        """Estimate gaze direction using combined approaches"""
        # Detect eyes using MediaPipe
        mediapipe_left, mediapipe_right = self.detect_eyes_mediapipe(frame)
        
        # Optionally use Vision API for enhanced detection
        vision_left, vision_right = None, None
        if frame_data and self.vision_processor:
            vision_left, vision_right = self.detect_eyes_vision_api(frame_data)
        
        # Use MediaPipe as primary, Vision API as fallback
        left_eye_points = mediapipe_left if mediapipe_left else []
        right_eye_points = mediapipe_right if mediapipe_right else []
        
        # If MediaPipe didn't detect eyes well, try to use Vision API points
        if (not left_eye_points or not right_eye_points) and vision_left and vision_right:
            # Create simple eye points from Vision API detection
            left_eye_points = [
                (int(vision_left[0] * (frame.shape[1] if frame else 1280) - 10), 
                 int(vision_left[1] * (frame.shape[0] if frame else 720) - 5)),
                (int(vision_left[0] * (frame.shape[1] if frame else 1280)), 
                 int(vision_left[1] * (frame.shape[0] if frame else 720) - 10)),
                (int(vision_left[0] * (frame.shape[1] if frame else 1280) + 10), 
                 int(vision_left[1] * (frame.shape[0] if frame else 720) - 5)),
                (int(vision_left[0] * (frame.shape[1] if frame else 1280) + 10), 
                 int(vision_left[1] * (frame.shape[0] if frame else 720) + 5)),
                (int(vision_left[0] * (frame.shape[1] if frame else 1280)), 
                 int(vision_left[1] * (frame.shape[0] if frame else 720) + 10)),
                (int(vision_left[0] * (frame.shape[1] if frame else 1280) - 10), 
                 int(vision_left[1] * (frame.shape[0] if frame else 720) + 5))
            ]
            right_eye_points = [
                (int(vision_right[0] * (frame.shape[1] if frame else 1280) - 10), 
                 int(vision_right[1] * (frame.shape[0] if frame else 720) - 5)),
                (int(vision_right[0] * (frame.shape[1] if frame else 1280)), 
                 int(vision_right[1] * (frame.shape[0] if frame else 720) - 10)),
                (int(vision_right[0] * (frame.shape[1] if frame else 1280) + 10), 
                 int(vision_right[1] * (frame.shape[0] if frame else 720) - 5)),
                (int(vision_right[0] * (frame.shape[1] if frame else 1280) + 10), 
                 int(vision_right[1] * (frame.shape[0] if frame else 720) + 5)),
                (int(vision_right[0] * (frame.shape[1] if frame else 1280)), 
                 int(vision_right[1] * (frame.shape[0] if frame else 720) + 10)),
                (int(vision_right[0] * (frame.shape[1] if frame else 1280) - 10), 
                 int(vision_right[1] * (frame.shape[0] if frame else 720) + 5))
            ]
        
        # Estimate gaze
        frame_shape = frame.shape if frame is not None else (720, 1280, 3)
        gaze_point = self.gaze_estimator.estimate_gaze_from_eye_landmarks(
            left_eye_points, right_eye_points, frame_shape
        )
        
        self.current_gaze_point = gaze_point or (0, 0)
        
        return {
            "gaze_point": gaze_point,
            "left_eye_points": left_eye_points,
            "right_eye_points": right_eye_points,
            "vision_left": vision_left,
            "vision_right": vision_right
        }

    def update_elements(self, elements_data):
        """Update the list of UI elements from the website"""
        self.element_detector.update_elements(elements_data)

    def check_gaze_on_elements(self, gaze_point):
        """Check if gaze is on any UI element"""
        return self.element_detector.check_gaze_on_elements(gaze_point)

    def activate_speech_mode(self):
        """Activate speech mode to listen for a command"""
        self.speech_mode_active = True
        self.last_speech_activation = time.time()
        return "Speech mode activated. I'm listening..."

    def process_speech_command(self, audio_data=None):
        """Process speech command and get AI response"""
        if not self.speech_mode_active:
            return {"error": "Speech mode not active"}
            
        # Listen for speech
        transcript = self.speech_service.transcribe_audio(audio_data)
        
        if transcript and "no speech" not in transcript.lower() and "error" not in transcript.lower():
            # Get AI response
            response = self.ai_service.get_ai_response(transcript)
            
            # Speak the response
            self.tts_service.text_to_speech(response)
            
            # Deactivate speech mode
            self.speech_mode_active = False
            
            return {
                "transcript": transcript,
                "response": response
            }
        
        # Deactivate if no speech detected
        self.speech_mode_active = False
        return {"error": "No speech detected"}

    def process_calibration(self, gaze_point):
        """Process calibration data collection"""
        if not gaze_point:
            return False, "No gaze detected"
            
        current_time = time.time()
        screen_point = self.calibration_points[self.current_calibration_point]
        
        # Add to calibration data
        self.calibration_data.append((gaze_point, screen_point))
        
        # Move to next point
        self.current_calibration_point += 1
        
        if self.current_calibration_point < len(self.calibration_points):
            return False, f"Calibration point {self.current_calibration_point + 1}/{len(self.calibration_points)}"
        else:
            # Calibration complete
            self.gaze_estimator.update_calibration(self.calibration_data)
            self.calibration_complete = True
            return True, "Calibration complete!"

    def reset_calibration(self):
        """Reset calibration process"""
        self.current_calibration_point = 0
        self.calibration_data = []
        self.calibration_complete = False
        return "Calibration reset"

# ======================
# Initialize the interaction system
# ======================
interaction_system = GazeInteractionSystem()

# ======================
# Flask Routes for API Endpoints
# ======================

@app.route('/api/process_frame', methods=['POST'])
def process_frame():
    """Process a frame from the webcam"""
    try:
        data = request.json
        frame_data = data.get('frame_data', None)
        
        # Estimate gaze
        result = interaction_system.estimate_gaze(frame_data=frame_data)
        
        # Check for interactions with UI elements
        interaction_result = interaction_system.check_gaze_on_elements(result['gaze_point'])
        
        response_data = {
            'gaze_point': result['gaze_point'],
            'interaction': interaction_result,
            'calibration_complete': interaction_system.calibration_complete
        }
        
        return jsonify({'status': 'success', 'data': response_data})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/api/ui_elements', methods=['POST'])
def update_ui_elements():
    """Update UI elements from the website"""
    try:
        elements_data = request.json.get('elements', [])
        interaction_system.update_elements(elements_data)
        return jsonify({'status': 'success', 'message': 'UI elements updated'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/api/speech/activate', methods=['POST'])
def activate_speech():
    """Activate speech mode"""
    try:
        result = interaction_system.activate_speech_mode()
        return jsonify({'status': 'success', 'message': result})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/api/speech/process', methods=['POST'])
def process_speech():
    """Process speech command"""
    try:
        audio_data = request.json.get('audio_data', None)
        result = interaction_system.process_speech_command(audio_data)
        return jsonify({'status': 'success', 'data': result})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/api/calibration/start', methods=['POST'])
def start_calibration():
    """Start calibration process"""
    try:
        interaction_system.reset_calibration()
        return jsonify({'status': 'success', 'message': 'Calibration started'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/api/calibration/process', methods=['POST'])
def process_calibration():
    """Process calibration data"""
    try:
        gaze_point = request.json.get('gaze_point', None)
        if gaze_point:
            complete, message = interaction_system.process_calibration(gaze_point)
            return jsonify({'status': 'success', 'complete': complete, 'message': message})
        else:
            return jsonify({'status': 'error', 'message': 'No gaze point provided'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get current system status"""
    try:
        status = {
            'gaze_point': interaction_system.current_gaze_point,
            'speech_mode_active': interaction_system.speech_mode_active,
            'calibration_complete': interaction_system.calibration_complete,
            'ui_elements_count': len(interaction_system.element_detector.elements)
        }
        return jsonify({'status': 'success', 'data': status})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

# ======================
# Main Application Entry Point
# ======================
if __name__ == "__main__":
    print("Starting Interactive Eye Tracking Backend...")
    print("Available endpoints:")
    print("  POST /api/process_frame - Process webcam frame")
    print("  POST /api/ui_elements - Update UI elements from website")
    print("  POST /api/speech/activate - Activate speech mode")
    print("  POST /api/speech/process - Process speech command")
    print("  POST /api/calibration/start - Start calibration")
    print("  POST /api/calibration/process - Process calibration data")
    print("  GET /api/status - Get system status")
    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)