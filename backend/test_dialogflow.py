import os
from dotenv import load_dotenv
import google.generativeai as genai
from services.dialogflow_tts_winsound import DialogflowTTS

# ======================
# 1) تحميل .env
# ======================
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("❌ Missing GEMINI_API_KEY environment variable")

# تهيئة Gemini مع إعدادات الجيل
generation_config = {
    "temperature": 0.9,  # أكثر إبداعية وطبيعية
    "top_p": 0.8,
    "top_k": 40,
    "max_output_tokens": 100,  # تحديد طول الرد (قصير)
}

# إنشاء النموذج مع إعدادات مخصصة
gemini_model = genai.GenerativeModel(
    "gemini-1.5-flash",
    generation_config=generation_config,
    system_instruction="Always respond in very short, natural, human-like conversations (1-2 sentences maximum). Be empathetic, conversational, and avoid formal language."
)

# بدء محادثة مع تاريخ فارغ
chat = gemini_model.start_chat(history=[])

# ======================
# 2) إعدادات المشروع
# ======================
PROJECT_ID = "eyecanpro-c03cf"
CREDENTIALS_PATH = r"C:\Users\Lenovo\my-app\eyecan-backend\eyecanfinal-9cb8399f0273.json"

# إنشاء خدمة TTS (Dialogflow TTS engine)
service = DialogflowTTS(PROJECT_ID, CREDENTIALS_PATH)

# ======================
# 3) وظيفة للتحقق من طول الرد
# ======================
def validate_response_length(text, max_words=20):
    """
    تقصير الرد إذا كان طويلاً جداً
    """
    words = text.split()
    if len(words) > max_words:
        # أخذ الجملة الأولى أو الجزء الأول من الرد
        if ". " in text:
            # إذا كان هناك جمل متعددة، خذ الأولى فقط
            shortened = text.split(". ")[0] + "."
        else:
            # إذا كانت جملة واحدة، خذ الكلمات الأولى
            shortened = " ".join(words[:max_words]) + "..."
        return shortened
    return text

# ======================
# 4) تجربة الإدخال مع توجيه للردود القصيرة
# ======================
user_input = "i am sad"

# إضافة تعليمات إضافية للردود القصيرة
prompt = f"""
Please respond to this in a very short, natural way (1-2 sentences max).
Keep it conversational and empathetic.

User: {user_input}
Assistant: 
"""

# إرسال الرسالة مع الحفاظ على تاريخ المحادثة
gemini_response = chat.send_message(prompt)

# استخراج النص من الرد
response_text = gemini_response.text if hasattr(gemini_response, "text") else str(gemini_response)

# التحقق من طول الرد وتقصيره إذا لزم الأمر
response_text = validate_response_length(response_text, max_words=15)

print("Gemini response:", response_text)

# تمرير النص لTTS
service.text_to_speech(response_text)

# ======================
# 5) مثال لكيفية الاستمرار في المحادثة
# ======================
def continue_conversation(user_message):
    """
    استمرار المحادثة مع التحقق من طول الرد
    """
    prompt = f"User: {user_message}\nAssistant: "
    
    response = chat.send_message(prompt)
    response_text = response.text if hasattr(response, "text") else str(response)
    
    # التحقق من طول الرد
    response_text = validate_response_length(response_text, max_words=15)
    
    print("Gemini response:", response_text)
    service.text_to_speech(response_text)
    
    return response_text

# مثال للاستخدام المستمر:
# next_response = continue_conversation("Why do you think that?")