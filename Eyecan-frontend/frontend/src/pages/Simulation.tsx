// Simulation.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Mic,
  MicOff,
  Settings,
  Power,
  Smile,
  Heart,
  HelpCircle,
  AlertTriangle,
  Activity,
  Calendar,
  Stethoscope,
  Users,
  MessageCircle,
  MapPin,
  Utensils
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

/**
 * Simulation.tsx
 *
 * - يدعم تشغيل TTS محلي عبر speechSynthesis أو عن طريق backend (/speak).
 * - يدعم STT محلي عبر Web Speech API أو عن طريق backend (/listen).
 * - يرسل/يستقبل audio بصيغة base64 للـ backend.
 *
 * ملاحظة: تأكد أن الباك يعمل على http://localhost:5000 أو عدّل BACKEND_BASE.
 */

// === تعديل هذا لو الباك على عنوان آخر ===
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:5000";

interface Category {
  id: string;
  icon: React.ReactNode;
  label: string;
  phrases: string[];
}

const Simulation: React.FC = () => {
  const { t, language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>("greetings");
  const [micActive, setMicActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [micDialogOpen, setMicDialogOpen] = useState(false);
  const [dwellTime, setDwellTime] = useState(2000);
  const [voiceType, setVoiceType] = useState<"male" | "female">("female");
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [gazeTimer, setGazeTimer] = useState<NodeJS.Timeout | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<string>("");
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState<string>("");
  const [useBackend, setUseBackend] = useState<boolean>(true); // NEW: use backend STT/TTS switch

  // NEW: fetching state for suggestions
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState<boolean>(false);

  // Recording refs/state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recognitionRef = useRef<any>(null); // for Web Speech API
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Categories (same list as عندك)
  const categories: Category[] = [
    {
      id: "greetings",
      icon: <Smile className="w-6 h-6" />,
      label: t("greetings"),
      phrases:
        language === "ar"
          ? [
            "مرحبا",
            "كيفك؟",
            "صباح الخير",
            "مساء الخير",
            "السلام عليكم",
            "أهلاً",
            "كيف حالك؟",
            "شو أخبارك؟",
            "وينك من زمان",
            "تشرفت بلقائك",
            "نورت",
            "يا هلا",
            "صباح النور",
            "مساء النور",
            "الله يسعدك",
            "منور المكان"
          ]
          : [
            "Hello",
            "How are you?",
            "Good morning",
            "Good evening",
            "Hi there",
            "Hey",
            "What's up?",
            "Nice to meet you",
            "Long time no see",
            "How have you been?",
            "Good to see you",
            "How's it going?",
            "How's everything?",
            "Welcome",
            "Greetings",
            "Howdy"
          ]
    },
    // ... (باقي التصنيفات كما في ملفك) ...
    {
      id: "thanks",
      icon: <Heart className="w-6 h-6" />,
      label: t("thanks"),
      phrases:
        language === "ar"
          ? ["شكراً", "شكراً كتير", "تسلم", "يعطيك العافية", "الله يخليك", "ما قصرت", "ممنون", "مشكور", "جزاك الله خير", "بارك الله فيك", "تسلم إيدك", "يا ريت", "من عيوني", "كتر خيرك", "الله يوفقك", "يسعد قلبك"]
          : ["Thank you", "Thanks a lot", "Thanks", "I appreciate it", "Much appreciated", "Thank you so much", "You're the best", "God bless", "Cheers", "Thanks mate", "I owe you one", "You rock", "Thanks buddy", "Grateful", "You're amazing", "Many thanks"]
    },
    {
      id: "questions",
      icon: <HelpCircle className="w-6 h-6" />,
      label: t("questions"),
      phrases:
        language === "ar"
          ? ["شو اسمك؟", "وين أنا؟", "كم الساعة؟", "ممكن تساعدني؟", "شو صار؟", "متى رح نروح؟", "ليش هيك؟", "كيف بقدر؟", "مين هذا؟", "شو هذا؟", "بكم هذا؟", "من وين؟", "لوين رايح؟", "شو رأيك؟", "بتعرف؟", "ممكن أسأل؟"]
          : ["What's your name?", "Where am I?", "What time is it?", "Can you help me?", "What happened?", "When are we going?", "Why?", "How?", "Who is this?", "What is this?", "How much?", "Where from?", "Where to?", "What do you think?", "Do you know?", "May I ask?"]
    },
    {
      id: "emergency",
      icon: <AlertTriangle className="w-6 h-6" />,
      label: t("emergency"),
      phrases:
        language === "ar"
          ? ["ساعدوني!", "بدي دكتور", "عندي وجع", "اتصل بالإسعاف", "ضروري", "بسرعة", "حالة طارئة", "بدي دواء", "مش قادر أتنفس", "خطر", "النجدة", "بموت من الوجع", "دوخة", "غثيان", "ضغطي نازل", "قلبي بوجعني"]
          : ["Help me!", "I need a doctor", "I'm in pain", "Call 911", "Emergency", "Urgent", "Quick", "I need medicine", "Can't breathe", "Danger", "Help", "It's serious", "Call ambulance", "Need help now", "Heart pain", "Dizzy"]
    },
    {
      id: "feelings",
      icon: <Heart className="w-6 h-6" />,
      label: t("feelings"),
      phrases:
        language === "ar"
          ? ["أنا مبسوط", "أنا زعلان", "تعبان كتير", "خايف", "مرتاح", "بحبك", "مشتاقلك", "قلقان", "فرحان", "مكتئب", "متضايق", "حاسس حالي تمام", "مش مرتاح", "مبسوط منك", "زهقان", "حاسس بالوحدة"]
          : ["I'm happy", "I'm sad", "I'm tired", "I'm scared", "I'm comfortable", "I love you", "I miss you", "I'm worried", "I'm excited", "I'm depressed", "I'm upset", "I feel good", "Not feeling well", "I'm grateful", "I'm bored", "Feeling lonely"]
    },
    {
      id: "needs",
      icon: <Activity className="w-6 h-6" />,
      label: t("needs"),
      phrases:
        language === "ar"
          ? ["بدي ماء", "جوعان", "بدي أنام", "بدي الحمام", "بدي أطلع برا", "بدي أرتاح", "عطشان", "برد", "حر عليّ", "بدي أقعد", "بدي أقوم", "بدي أغير ملابسي", "بدي آكل", "بدي قهوة", "بدي دش", "بدي أتمشى"]
          : ["I need water", "I'm hungry", "I want to sleep", "Need bathroom", "Want to go out", "Need rest", "I'm thirsty", "I'm cold", "I'm hot", "Want to sit", "Want to stand", "Need to change", "Want food", "Want coffee", "Need a shower", "Want to walk"]
    },
    {
      id: "daily",
      icon: <Calendar className="w-6 h-6" />,
      label: t("daily"),
      phrases:
        language === "ar"
          ? ["صباح الخير", "تصبح على خير", "وقت الفطور", "وقت الغدا", "وقت العشا", "وقت النوم", "يلا نروح", "استنى شوي", "خلص", "لسه", "بكرا", "اليوم", "إمبارح", "بعد شوي", "هلق", "كمان شوي"]
          : ["Good morning", "Good night", "Breakfast time", "Lunch time", "Dinner time", "Bedtime", "Let's go", "Wait a bit", "Done", "Not yet", "Tomorrow", "Today", "Yesterday", "In a while", "Now", "Soon"]
    },
    {
      id: "medical",
      icon: <Stethoscope className="w-6 h-6" />,
      label: t("medical"),
      phrases:
        language === "ar"
          ? ["بدي دواء", "موعد الدكتور", "فحص", "ضغط الدم", "السكر", "الحرارة", "وجع راس", "وجع بطن", "دوخة", "غثيان", "حساسية", "كحة", "رشح", "ضيق نفس", "وجع ظهر", "تعب عام"]
          : ["Need medicine", "Doctor appointment", "Check-up", "Blood pressure", "Blood sugar", "Temperature", "Headache", "Stomach ache", "Dizzy", "Nausea", "Allergy", "Cough", "Cold", "Short of breath", "Back pain", "Fatigue"]
    },
    {
      id: "social",
      icon: <Users className="w-6 h-6" />,
      label: t("social"),
      phrases:
        language === "ar"
          ? ["كيف العيلة؟", "سلملي عليهم", "الله معك", "بالتوفيق", "مبروك", "ألف سلامة", "معليش", "ما في مشكلة", "عفواً", "آسف", "مع السلامة", "تعال هون", "روح", "استنى", "خليك", "بشوفك بعدين"]
          : ["How is family?", "Say hi to them", "God be with you", "Good luck", "Congratulations", "Get well soon", "It's okay", "No problem", "Excuse me", "Sorry", "Goodbye", "Come here", "Go", "Wait", "Stay", "See you later"]
    },
    {
      id: "responses",
      icon: <MessageCircle className="w-6 h-6" />,
      label: t("responses"),
      phrases:
        language === "ar"
          ? ["أيوة", "لا", "ممكن", "أكيد", "موافق", "مش موافق", "ما بعرف", "يمكن", "طبعاً", "أبداً", "صح", "غلط", "تمام", "ماشي", "إن شاء الله", "بلكي"]
          : ["Yes", "No", "Maybe", "Sure", "I agree", "I disagree", "I don't know", "Perhaps", "Of course", "Never", "Right", "Wrong", "Okay", "Fine", "Hopefully", "Possibly"]
    },
    {
      id: "places",
      icon: <MapPin className="w-6 h-6" />,
      label: language === "ar" ? "أماكن" : "Places",
      phrases:
        language === "ar"
          ? ["البيت", "المستشفى", "المدرسة", "السوق", "المطعم", "الحديقة", "المسجد", "الكنيسة", "المطار", "الفندق", "المكتبة", "الصيدلية", "البنك", "المحطة", "المول", "الشاطئ"]
          : ["Home", "Hospital", "School", "Market", "Restaurant", "Park", "Mosque", "Church", "Airport", "Hotel", "Library", "Pharmacy", "Bank", "Station", "Mall", "Beach"]
    },
    {
      id: "food",
      icon: <Utensils className="w-6 h-6" />,
      label: language === "ar" ? "طعام" : "Food",
      phrases:
        language === "ar"
          ? ["خبز", "رز", "لحمة", "دجاج", "سمك", "خضار", "فواكه", "حليب", "جبنة", "بيض", "شاي", "قهوة", "عصير", "ماء", "حلويات", "شوربة"]
          : ["Bread", "Rice", "Meat", "Chicken", "Fish", "Vegetables", "Fruits", "Milk", "Cheese", "Eggs", "Tea", "Coffee", "Juice", "Water", "Sweets", "Soup"]
    }
  ];

  const currentCategory = categories.find((c) => c.id === selectedCategory) || categories[0];

  // ------------------------
  // Utilities: WAV encoder (16kHz PCM)
  // ------------------------
  // We will record using MediaRecorder (default sampling), then convert to WAV 16k PCM
  // helper: downsample and write WAV header
  const blobToArrayBuffer = (blob: Blob) =>
    new Promise<ArrayBuffer>((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as ArrayBuffer);
      reader.onerror = rej;
      reader.readAsArrayBuffer(blob);
    });

  const downsampleBuffer = (buffer: Float32Array, sampleRate: number, outSampleRate: number) => {
    if (outSampleRate === sampleRate) return buffer;
    const sampleRateRatio = sampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0,
        count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  };

  const floatTo16BitPCM = (floatBuffer: Float32Array) => {
    const output = new DataView(new ArrayBuffer(floatBuffer.length * 2));
    let offset = 0;
    for (let i = 0; i < floatBuffer.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, floatBuffer[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return output;
  };

  const encodeWAV = (samples: Float32Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, "RIFF");
    /* file length */
    view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, "WAVE");
    /* format chunk identifier */
    writeString(view, 12, "fmt ");
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sampleRate * blockAlign) */
    view.setUint32(28, sampleRate * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, "data");
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    // write the PCM samples
    const pcm = floatTo16BitPCM(samples);
    for (let i = 0; i < pcm.byteLength; i++) {
      view.setUint8(44 + i, (pcm as DataView).getUint8(i));
    }
    return new Blob([view], { type: "audio/wav" });
  };

  const writeString = (view: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // ------------------------
  // Recording + send to backend
  // ------------------------
  const startRecording = async () => {
    try {
      setIsRecording(true);
      recordedChunksRef.current = [];

      // use MediaRecorder to get raw audio blob
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options: MediaRecorderOptions = {};
      // prefer webm/opus if available; we'll convert afterward
      if (MediaRecorder.isTypeSupported("audio/webm")) options.mimeType = "audio/webm";
      else if (MediaRecorder.isTypeSupported("audio/ogg")) options.mimeType = "audio/ogg";
      mediaRecorderRef.current = new MediaRecorder(stream, options);

      mediaRecorderRef.current.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        // create blob from chunks
        const blob = new Blob(recordedChunksRef.current);
        // convert to WAV 16k
        try {
          const arrayBuffer = await blobToArrayBuffer(blob);
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const decoded = await audioCtx.decodeAudioData(arrayBuffer);
          const channelData = decoded.getChannelData(0);
          const down = downsampleBuffer(channelData, decoded.sampleRate, 16000);
          const wavBlob = encodeWAV(down, 16000);
          // base64
          const base64 = await blobToBase64(wavBlob);
          // send to backend or handle locally:
          if (useBackend) {
            await sendAudioToBackendForSTT(base64);
          } else {
            // local STT fallback: use Web Speech API? (we can't feed recorded audio into recognition easily)
            // So show message to use web speech recognition instead
            toast({ description: language === "ar" ? "استخدم ميزة التعرف المحلي من المتصفح (Web Speech API)" : "Use local recognition from browser (Web Speech API)" });
          }
        } catch (err) {
          console.error("Recording conversion error", err);
          toast({ description: "Recording error" });
        }
      };

      mediaRecorderRef.current.start();
    } catch (err) {
      console.error("startRecording error", err);
      toast({ description: language === "ar" ? "فشل الوصول للمايك" : "Could not access microphone" });
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      // stop tracks
      const tracks = (mediaRecorderRef.current as any).stream?.getTracks?.();
      if (tracks && tracks.length) tracks.forEach((t: MediaStreamTrack) => t.stop());
      mediaRecorderRef.current = null;
    } else {
      setIsRecording(false);
    }
  };

  const blobToBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // remove "data:audio/wav;base64," prefix if present
        const parts = dataUrl.split(",");
        const base64 = parts.length > 1 ? parts[1] : parts[0];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const sendAudioToBackendForSTT = async (base64wav: string) => {
    try {
      // backend expects JSON { audio_base64: <base64 string>, lang: "ar-SA" or "en-US" }
      const lang = language === "ar" ? "ar-SA" : "en-US";
      const resp = await fetch(`${backendUrl}/listen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio_base64: base64wav, lang })
      });
      const json = await resp.json();
      if (resp.ok) {
        // backend returns { transcripts: [...] }
        const transcripts = json.transcripts || [];
        const txt = transcripts.length ? transcripts[0] : "";
        setTranscript(txt);
        // Use AI backend /chat to fetch smart suggestions (instead of only local heuristics)
        if (txt) {
          await fetchSuggestions(txt);
        }
      } else {
        console.error("STT backend error", json);
        toast({ description: language === "ar" ? "فشل تحويل الصوت لنص" : "STT failed" });
      }
    } catch (err) {
      console.error("sendAudioToBackendForSTT error", err);
      toast({ description: "STT error" });
    }
  };

  // ------------------------
  // Local Web Speech API (recognition) — alternative for real-time recognition
  // ------------------------
  const startLocalRecognition = () => {
    // only if browser supports
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ description: language === "ar" ? "المتصفح لا يدعم التعرف الصوتي المحلي" : "Browser doesn't support Web Speech API" });
      return;
    }
    try {
      const recog = new SpeechRecognition();
      recog.lang = language === "ar" ? "ar-SA" : "en-US";
      recog.interimResults = false;
      recog.maxAlternatives = 1;
      recog.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setTranscript(text);
        // call backend chat for suggestions
        fetchSuggestions(text);
      };
      recog.onerror = (ev: any) => {
        console.error("recog error", ev);
      };
      recog.onend = () => {
        setIsRecording(false);
      };
      recognitionRef.current = recog;
      recog.start();
      setIsRecording(true);
    } catch (err) {
      console.error("startLocalRecognition error", err);
      toast({ description: "Local recognition error" });
    }
  };

  const stopLocalRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { }
      recognitionRef.current = null;
      setIsRecording(false);
    }
  };

  // ------------------------
  // TTS: request backend or local
  // ------------------------
  const requestTTS = async (text: string) => {
    if (!text) return;
    if (!useBackend) {
      // local TTS
      speakLocal(text);
      return;
    }
    try {
      const resp = await fetch(`${backendUrl}/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: language === "ar" ? "ar-XA" : "en-US", gender: voiceType })
      });
      const json = await resp.json();
      if (!resp.ok) {
        console.error("TTS error", json);
        toast({ description: "TTS backend failed" });
        return;
      }
      const audioB64 = json.audio_base64;
      if (!audioB64) {
        toast({ description: "No audio returned" });
        return;
      }
      // create audio and play
      const audioBlob = base64ToBlob(audioB64, "audio/mpeg");
      playBlob(audioBlob);
    } catch (err) {
      console.error("requestTTS error", err);
      toast({ description: "TTS request error" });
    }
  };

  const base64ToBlob = (b64Data: string, contentType = "", sliceSize = 512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
  };

  const playBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
    }
    audioPlayerRef.current.src = url;
    audioPlayerRef.current.play().catch((e) => console.warn("play error", e));
    // revoke after finished
    audioPlayerRef.current.onended = () => {
      URL.revokeObjectURL(url);
    };
  };

  // local speechSynthesis
  const speakLocal = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = language === "ar" ? "ar-SA" : "en-US";
      u.rate = 0.95;
      u.pitch = voiceType === "female" ? 1.2 : 0.9;
      window.speechSynthesis.speak(u);
      toast({ description: text });
    } else {
      toast({ description: language === "ar" ? "المتصفح لا يدعم تحويل النص لصوت" : "Browser doesn't support speechSynthesis" });
    }
  };

  // ------------------------
  // Small helper to propose responses (can call AI backend later)
  // ------------------------
  const generateSuggestionsForText = (txt: string) => {
    if (!txt) return [];
    // simple heuristics; replaceable by backend AI
    if (/help|ساعد|emergency|إسعاف/i.test(txt)) {
      return language === "ar" ? ["اتصل بالإسعاف", "أنا بحاجة لمساعدة", "حالة طارئة"] : ["Call emergency", "I need help", "Emergency"];
    }
    if (/hello|hi|مرحبا/i.test(txt)) {
      return language === "ar" ? ["أهلاً", "كيف فيني ساعدك؟"] : ["Hi there", "How can I help?"];
    }
    return language === "ar" ? ["نعم من فضلك", "لا شكراً", "ممكن بعدين"] : ["Yes please", "No thanks", "Maybe later"];
  };

  // ------------------------
  // New: fetchSuggestions -> calls backend /chat to get AI replies (Gemini or other)
  // ------------------------
  const fetchSuggestions = async (txt: string) => {
    if (!txt) return;
    setIsFetchingSuggestions(true);
    try {
      const resp = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // send the message and language so backend can call Gemini/LLM appropriately
        body: JSON.stringify({ message: txt, lang: language === "ar" ? "ar" : "en" })
      });
      const json: any = await resp.json();
      if (!resp.ok) {
        console.error("chat backend error", json);
        // fallback to local heuristics
        setSuggestions(generateSuggestionsForText(txt));
        return;
      }

      // Attempt to parse suggestions from different possible shapes:
      // Preferred: { suggestions: ["a","b","c"] }
      let parsed: string[] = [];

      if (Array.isArray(json.suggestions)) {
        parsed = json.suggestions;
      } else if (Array.isArray(json.transcripts) && json.transcripts.length > 0 && json.suggestions) {
        parsed = Array.isArray(json.suggestions) ? json.suggestions : [];
      } else if (Array.isArray(json.choices)) {
        // choices could be [{ text: "..." }, ...]
        parsed = json.choices.map((c: any) => (typeof c === "string" ? c : c.text ?? c.message ?? "")).filter(Boolean);
      } else if (typeof json === "string") {
        parsed = [json];
      } else if (json.output && Array.isArray(json.output)) {
        // some LLM wrappers use .output -> [{ content: [...] }]
        parsed = json.output
          .flatMap((o: any) => {
            if (Array.isArray(o.content)) {
              return o.content.map((c: any) => c.text || c);
            }
            return o.text ? [o.text] : [];
          })
          .filter(Boolean);
      } else if (json.result && Array.isArray(json.result)) {
        parsed = json.result;
      } else if (json.text) {
        parsed = [json.text];
      }

      // if still empty, fallback to local generator
      if (!parsed || parsed.length === 0) {
        parsed = generateSuggestionsForText(txt);
      }

      // limit to top 3 suggestions (you can change)
      setSuggestions(parsed.slice(0, 3));
    } catch (err) {
      console.error("fetchSuggestions error", err);
      setSuggestions(generateSuggestionsForText(txt));
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  // ------------------------
  // Event handlers for UI (mouse-enter = gaze simulation)
  // ------------------------
  const handleMouseEnter = useCallback(
    (elementId: string, action?: () => void) => {
      setHoveredElement(elementId);

      if (gazeTimer) clearTimeout(gazeTimer);

      const timer = setTimeout(() => {
        if (action) action();

        const element = document.getElementById(elementId);
        if (element) {
          element.classList.add("ring-4", "ring-primary", "scale-105");
          setTimeout(() => {
            element.classList.remove("ring-4", "ring-primary", "scale-105");
          }, 500);
        }
      }, dwellTime);

      setGazeTimer(timer);
    },
    [dwellTime, gazeTimer]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredElement(null);
    if (gazeTimer) {
      clearTimeout(gazeTimer);
      setGazeTimer(null);
    }
  }, [gazeTimer]);

  // ------------------------
  // Microphone button handler
  // ------------------------
  const toggleMic = async () => {
    if (micActive) {
      // turning off
      setMicActive(false);
      setMicDialogOpen(false);
      setTranscript("");
      setSuggestions([]);
      stopRecording();
      stopLocalRecognition();
      return;
    }

    // turning on
    setMicActive(true);
    setMicDialogOpen(true);
    setTranscript("");
    setSuggestions([]);

    if (useBackend) {
      // record then send to backend
      // we can either use MediaRecorder OR use Web Speech API
      // choose MediaRecorder approach here (sends WAV 16k)
      await startRecording();
      // auto-stop after 4 seconds to avoid long recordings (you can change)
      setTimeout(() => {
        stopRecording();
      }, 4000);
    } else {
      // use local Web Speech API realtime recognition
      startLocalRecognition();
    }
  };

  // ------------------------
  // When user clicks a suggested reply or phrase -> play via TTS
  // ------------------------
  const onPhraseClick = (phrase: string) => {
    requestTTS(phrase);
    setSelectedPhrase(phrase);
    setTimeout(() => setSelectedPhrase(""), 2500);
  };

  // When user clicks suggestion
  const onSuggestionClick = (s: string) => {
    requestTTS(s);
    // close mic dialog and stop mic
    setMicDialogOpen(false);
    setMicActive(false);
    stopLocalRecognition();
    stopRecording();
    setTranscript("");
    setSuggestions([]);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      stopLocalRecognition();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------
  // Render
  // ------------------------
  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-background via-background/95 to-primary/5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button
            id="power-btn"
            variant="ghost"
            size="icon"
            className="rounded-full bg-destructive/10 hover:bg-destructive/20 transition-all duration-300"
            onMouseEnter={() =>
              handleMouseEnter("power-btn", () => {
                window.location.href = "/";
              })
            }
            onMouseLeave={handleMouseLeave}
            title={t("powerOff")}
          >
            <Power className="h-5 w-5 text-destructive" />
          </Button>

          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t("simulationTitle")}
          </h1>
        </div>

        <Button
          id="settings-btn"
          variant="ghost"
          size="icon"
          className="rounded-full bg-background/80 hover:bg-background transition-all duration-300"
          onMouseEnter={() => handleMouseEnter("settings-btn", () => setSettingsOpen(true))}
          onMouseLeave={handleMouseLeave}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-4">
        {/* Categories */}
        <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4">
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {categories.map((category) => (
              <div
                key={category.id}
                id={`cat-${category.id}`}
                className={`relative p-3 rounded-lg cursor-pointer transition-all duration-300 ${selectedCategory === category.id ? "bg-primary text-primary-foreground shadow-lg" : "bg-background hover:bg-accent"
                  } ${hoveredElement === `cat-${category.id}` ? "ring-2 ring-primary/50" : ""}`}
                onMouseEnter={() => handleMouseEnter(`cat-${category.id}`, () => setSelectedCategory(category.id))}
                onMouseLeave={handleMouseLeave}
              >
                <div className="flex flex-col items-center gap-1">
                  {category.icon}
                  <span className="text-[10px] text-center">{category.label}</span>
                </div>
                {hoveredElement === `cat-${category.id}` && <div className="absolute inset-0 rounded-lg animate-pulse bg-primary/20" />}
              </div>
            ))}
          </div>
        </div>

        {/* Phrases Grid */}
        <div className="flex-1 bg-card/50 backdrop-blur-sm rounded-lg p-4 overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 h-full overflow-y-auto">
            {currentCategory.phrases.map((phrase, index) => (
              <div
                key={index}
                id={`phrase-${index}`}
                className={`relative p-4 bg-background rounded-lg cursor-pointer transition-all duration-300 hover:shadow-lg ${hoveredElement === `phrase-${index}` ? "ring-2 ring-primary scale-105" : ""
                  } ${selectedPhrase === phrase ? "bg-primary/10" : ""}`}
                onMouseEnter={() =>
                  handleMouseEnter(`phrase-${index}`, () => {
                    onPhraseClick(phrase);
                  })
                }
                onMouseLeave={handleMouseLeave}
              >
                <p className="text-center font-medium">{phrase}</p>
                {hoveredElement === `phrase-${index}` && <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 animate-pulse" />}
              </div>
            ))}
          </div>
        </div>

        {/* Microphone Button */}
        <div className="flex justify-center">
          <Button
            id="mic-btn"
            variant={micActive ? "destructive" : "default"}
            size="lg"
            className={`rounded-full w-20 h-20 transition-all duration-300 ${micActive ? "animate-pulse shadow-lg shadow-destructive/50" : ""} ${hoveredElement === "mic-btn" ? "scale-110" : ""}`}
            onMouseEnter={() =>
              handleMouseEnter("mic-btn", () => {
                toggleMic();
              })
            }
            onMouseLeave={handleMouseLeave}
          >
            {micActive ? <Mic className="h-8 w-8" /> : <MicOff className="h-8 w-8" />}
          </Button>
        </div>
      </div>

      {/* Microphone Dialog */}
      <Dialog open={micDialogOpen} onOpenChange={setMicDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">{language === "ar" ? "الاستماع للبيئة المحيطة" : "Listening to Environment"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Transcript */}
            {transcript && (
              <Card className="p-4 bg-muted animate-fade-in">
                <p className="text-sm text-muted-foreground mb-1">{language === "ar" ? "ما سمعته:" : "What I heard:"}</p>
                <p className="font-medium">{transcript}</p>
              </Card>
            )}

            {/* AI Suggestions */}
            {isFetchingSuggestions && (
              <div className="p-3 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "جاري توليد الردود..." : "Generating suggestions..."}</p>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "ردود مقترحة:" : "Suggested responses:"}</p>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    id={`suggestion-${index}`}
                    className={`p-3 bg-background rounded-lg cursor-pointer transition-all duration-300 hover:bg-accent ${hoveredElement === `suggestion-${index}` ? "ring-2 ring-primary scale-105" : ""}`}
                    onMouseEnter={() => handleMouseEnter(`suggestion-${index}`, () => onSuggestionClick(suggestion))}
                    onMouseLeave={handleMouseLeave}
                    // keep onMouseEnter behavior as original; user can still click the suggestion if prefer
                    onClick={() => onSuggestionClick(suggestion)}
                  >
                    <p className="text-sm">{suggestion}</p>
                  </div>
                ))}
              </div>
            )}

            {!transcript && (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2">
                  <div className="animate-pulse w-2 h-2 bg-primary rounded-full" />
                  <div className="animate-pulse w-2 h-2 bg-primary rounded-full delay-150" />
                  <div className="animate-pulse w-2 h-2 bg-primary rounded-full delay-300" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">{language === "ar" ? "جاري الاستماع..." : "Listening..."}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>
                {t("dwellTime")}: {dwellTime}ms
              </Label>
              <Slider value={[dwellTime]} onValueChange={(value) => setDwellTime(value[0])} min={500} max={3000} step={100} />
            </div>

            <div className="space-y-2">
              <Label>{t("voiceType")}</Label>
              <Select value={voiceType} onValueChange={(value: "male" | "female") => setVoiceType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t("male")}</SelectItem>
                  <SelectItem value="female">{t("female")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{language === "ar" ? "مصدر الصوت/تحويل الكلام" : "Speech Source (STT/TTS)"}</Label>
              <div className="flex gap-2">
                <Button
                  variant={!useBackend ? "default" : "outline"}
                  onClick={() => setUseBackend(false)}
                  className="flex-1"
                >
                  {language === "ar" ? "من المتصفح" : "Browser"}
                </Button>
                <Button
                  variant={useBackend ? "default" : "outline"}
                  onClick={() => setUseBackend(true)}
                  className="flex-1"
                >
                  {language === "ar" ? "من الخادم" : "Backend"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === "ar"
                  ? "اختَر مصدر STT/TTS. الخادم يوفّر دقة أفضل عند وجود API."
                  : "Choose STT/TTS source. Backend gives better accuracy if available."}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{language === "ar" ? "معايرة تتبع العين" : "Eye Tracking Calibration"}</Label>
              <Button
                onClick={() => {
                  setCalibrationMode(true);
                  setSettingsOpen(false);
                  toast({
                    title: language === "ar" ? "وضع المعايرة" : "Calibration Mode",
                    description: language === "ar" ? "انظر إلى النقاط الحمراء لمعايرة تتبع العين" : "Look at the red dots to calibrate eye tracking",
                  });
                  setTimeout(() => setCalibrationMode(false), 10000);
                }}
                className="w-full"
              >
                {language === "ar" ? "بدء المعايرة" : "Start Calibration"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calibration Overlay */}
      {calibrationMode && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="relative w-full h-full">
            {[
              { top: "10%", left: "10%" },
              { top: "10%", right: "10%" },
              { top: "50%", left: "50%" },
              { bottom: "10%", left: "10%" },
              { bottom: "10%", right: "10%" }
            ].map((position, index) => (
              <div key={index} className="absolute w-8 h-8 bg-red-500 rounded-full animate-pulse" style={position} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Simulation;
