import os
import winsound
from google.cloud import texttospeech, dialogflow_v2 as dialogflow

class DialogflowTTS:
    def __init__(self, project_id, credentials_path):
        self.project_id = project_id
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

        # إعداد العملاء
        self.session_client = dialogflow.SessionsClient()
        self.tts_client = texttospeech.TextToSpeechClient()

    def detect_intent(self, text, session_id="12345", language_code="en-US"):
        session = self.session_client.session_path(self.project_id, session_id)
        text_input = dialogflow.TextInput(text=text, language_code=language_code)
        query_input = dialogflow.QueryInput(text=text_input)

        response = self.session_client.detect_intent(
            request={"session": session, "query_input": query_input}
        )
        return response.query_result.fulfillment_text

    def text_to_speech(self, text, output_file="output.wav"):
        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.LINEAR16
        )

        response = self.tts_client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )

        with open(output_file, "wb") as out:
            out.write(response.audio_content)

        winsound.PlaySound(output_file, winsound.SND_FILENAME)
