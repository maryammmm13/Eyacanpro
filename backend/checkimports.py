# check_imports.py

modules = [
    "os",
    "dotenv",
    "google.generativeai",
    "flask",
    "flask_cors",
    "google.cloud.speech",
    "google.cloud.texttospeech",
    "google.cloud.translate",
    "google.cloud.vision",
    "google.cloud.aiplatform",
    "requests",
]

for m in modules:
    try:
        __import__(m)
        print(f"✅ {m} imported successfully")
    except Exception as e:
        print(f"❌ {m} failed: {e}")
