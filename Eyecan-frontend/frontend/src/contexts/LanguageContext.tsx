import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  dir: 'rtl' | 'ltr';
  t: (key: string) => string;
}

const translations = {
  ar: {
    // Navigation
    home: 'الرئيسية',
    features: 'المميزات',
    whoWeHelp: 'من نساعد',
    technology: 'التقنيات',
    team: 'الفريق',
    simulation: 'المحاكاة',

    // Hero
    heroTitle: 'نظارة ذكية تُعيد القدرة على التعبير',
    heroSubtitle: 'للأشخاص الذين فقدوا النطق أو الحركة. جسر حقيقي يُعيد الصلة بين الإنسان والعالم من حوله',
    tryNow: 'جرّب النظارة',
    learnMore: 'تعرف أكثر',

    // Problem Section
    problemTitle: 'المشكلة التي نحلها',
    problemDesc: 'ملايين الأشخاص حول العالم فقدوا القدرة على التعبير بسبب الحروب والإصابات والأمراض. نحن نؤمن بأن كل شخص يستحق أن يُسمع صوته',

    // Who We Help
    whoWeHelpTitle: 'من نساعد؟',
    warVictims: 'المصابين بإعاقات ناتجة عن الحرب',
    warVictimsDesc: 'الأشخاص الذين فقدوا القدرة على النطق أو الحركة بسبب الانفجارات والقنابل',
    warExamples: 'إصابات الرأس • تلف الأحبال الصوتية • إصابات العمود الفقري',

    paralysisPatients: 'مرضى الشلل',
    paralysisPatientsDesc: 'الأشخاص المصابين بالشلل النصفي أو الكلي مع احتفاظهم بالوعي العقلي',
    paralysisExamples: 'الشلل الدماغي • إصابات النخاع الشوكي • السكتة الدماغية',

    traumaVictims: 'ضحايا الصدمة النفسية',
    traumaVictimsDesc: 'من يعانون من صدمة نفسية عميقة سببت فقدان القدرة على النطق',
    traumaExamples: 'اضطراب ما بعد الصدمة • الخرس النفسي • اضطرابات القلق الشديد',

    medicalCases: 'حالات طبية متقدمة',
    medicalCasesDesc: 'أي شخص واعٍ عقلياً لكنه غير قادر على الحركة أو التعبير اللفظي',
    medicalExamples: 'التصلب الجانبي الضموري • الوهن العضلي الشديد • إصابات الحبل الصوتي',

    // Features
    featuresTitle: 'مميزات النظارة الذكية',
    featuresSubtitle: 'تقنية ثورية تُعيد الأمل والقدرة على التواصل',

    eyeTracking: 'تتبع العين عالي الدقة',
    eyeTrackingDesc: 'تقنية متقدمة لرصد حركات العين بدقة تصل إلى 0.5 درجة',

    smartAnalysis: 'تحليل البيئة الذكي',
    smartAnalysisDesc: 'كاميرا ذكية تتعرف على الأشياء وتقترح العبارات المناسبة',

    instantResponse: 'استجابة فورية',
    instantResponseDesc: 'زمن استجابة أقل من 100 مللي ثانية للحصول على تجربة طبيعية',

    mobileApp: 'تطبيق مصاحب',
    mobileAppDesc: 'تطبيق موبايل للتحكم والتخصيص وإضافة عبارات جديدة',

    // Technology
    techTitle: 'التقنيات المتقدمة',
    techSubtitle: 'مزج من أحدث التقنيات العالمية لإنشاء حل شامل ومتطور',

    aiTitle: 'الذكاء الاصطناعي',
    visionApi: 'تحليل الصور والبيئة المحيطة',
    openCv: 'تتبع حركة العين بدقة عالية',
    machineLearning: 'التعلم من سلوك المستخدم',

    voiceTitle: 'النطق والصوت',
    tts: 'تحويل النص إلى كلام طبيعي',
    voiceCloning: 'محاكاة صوت المستخدم الأصلي',
    multiLanguage: 'دعم العربية والإنجليزية',

    infraTitle: 'البنية التحتية',
    firebase: 'قاعدة بيانات سحابية آمنة',
    realTimeSync: 'مزامنة فورية للبيانات',
    offlineMode: 'عمل بدون اتصال بالإنترنت',

    devTitle: 'التطوير',
    python: 'خوارزميات الذكاء الاصطناعي',
    react: 'واجهة المستخدم التفاعلية',
    tensorflow: 'نماذج التعلم العميق',

    // Mission
    missionTitle: 'رسالتنا',
    missionText: 'Eyecan ليست مجرد نظارة، بل جسر حقيقي يُعيد الصلة بين الإنسان والعالم من حوله. نؤمن بأن التكنولوجيا يجب أن تخدم الإنسانية، وأن كل شخص يستحق أن يُسمع صوته ويعبر عن مشاعره',

    // Team
    teamTitle: 'الفريق',
    rama: 'راما النجار',
    ramaRole: ' Full Stack / UI,UX',
    maryam: 'مريم الجلخ',
    maryamRole: 'Leder / Full stack ',
    aya: 'آية غرايبة',
    ayaRole: 'Cyper secuirty ',
    najwa: 'نجوى الجولاني',
    najwaRole: 'AI Expert / Machine Learning',

    // Footer
    quickLinks: 'روابط سريعة',
    support: 'الدعم والمساعدة',
    contactUs: 'تواصل معنا',
    humanitarian: 'هذا مشروع إنساني يهدف لمساعدة الأشخاص ذوي الاحتياجات الخاصة',
    problemLabel: 'التحدي',
    examples: 'أمثلة الحالات',
    impact: 'التأثير الإنساني',
    innovation: 'الابتكار',
    advanced: 'التقنية المتقدمة',
    prototype: 'النموذج الأولي',
    contactDesc: 'تواصل معنا لأي استفسار أو مساعدة',
    footerDesc: 'نظارة ذكية تُعيد القدرة على التعبير للأشخاص الذين فقدوا النطق أو الحركة',
    teamSubtitle: 'فريق متخصص يعمل بشغف لخدمة الإنسانية',
    technologies: 'التقنيات',
    madeWithLove: 'صُنع بكل حب لخدمة الإنسانية',
    rights: 'جميع الحقوق محفوظة',
    developedBy: 'طُور بواسطة',

    // Simulation Page
    simulationTitle: 'محاكاة النظارة الذكية',
    categories: 'الفئات',
    greetings: 'تحيات',
    thanks: 'شكر',
    questions: 'أسئلة',
    emergency: 'طوارئ',
    feelings: 'مشاعر',
    needs: 'احتياجات',
    daily: 'يومية',
    medical: 'طبية',

    micOn: 'الميكروفون مفتوح',
    micOff: 'الميكروفون مغلق',
    listening: 'جاري الاستماع...',
    suggestions: 'الاقتراحات',
    exitSimulation: 'إنهاء المحاكاة',
    settings: 'الإعدادات',
    dwellTime: 'وقت التثبيت',
    language: 'اللغة',
    voiceType: 'نوع الصوت',
    male: 'ذكر',
    female: 'أنثى',
    scrollUp: 'تمرير لأعلى',
    scrollDown: 'تمرير لأسفل',
  },

  en: {
    // Navigation
    home: 'Home',
    features: 'Features',
    whoWeHelp: 'Who We Help',
    technology: 'Technology',
    team: 'Team',
    simulation: 'Simulation',

    // Hero
    heroTitle: 'Smart Glasses That Restore Expression',
    heroSubtitle: 'For those who have lost speech or movement. A real bridge reconnecting humans with the world around them',
    tryNow: 'Try the Glasses',
    learnMore: 'Learn More',

    // Problem Section
    problemTitle: 'The Problem We Solve',
    problemDesc: 'Millions of people worldwide have lost the ability to express themselves due to wars, injuries, and diseases. We believe everyone deserves to have their voice heard',

    // Who We Help
    whoWeHelpTitle: 'Who We Help?',
    warVictims: 'War Injury Victims',
    warVictimsDesc: 'People who lost speech or movement due to explosions and bombs',
    warExamples: 'Head injuries • Vocal cord damage • Spinal injuries',

    paralysisPatients: 'Paralysis Patients',
    paralysisPatientsDesc: 'People with partial or complete paralysis who retain mental consciousness',
    paralysisExamples: 'Cerebral palsy • Spinal cord injuries • Stroke',

    traumaVictims: 'Trauma Victims',
    traumaVictimsDesc: 'Those suffering from deep psychological trauma causing speech loss',
    traumaExamples: 'PTSD • Selective mutism • Severe anxiety disorders',

    medicalCases: 'Advanced Medical Cases',
    medicalCasesDesc: 'Anyone mentally conscious but unable to move or express verbally',
    medicalExamples: 'ALS • Severe muscular dystrophy • Vocal cord injuries',

    // Features
    featuresTitle: 'Smart Glasses Features',
    featuresSubtitle: 'Revolutionary technology restoring hope and communication ability',

    eyeTracking: 'High-Precision Eye Tracking',
    eyeTrackingDesc: 'Advanced technology tracking eye movements with 0.5-degree accuracy',

    smartAnalysis: 'Smart Environment Analysis',
    smartAnalysisDesc: 'Smart camera recognizing objects and suggesting appropriate phrases',

    instantResponse: 'Instant Response',
    instantResponseDesc: 'Response time under 100ms for natural experience',

    mobileApp: 'Companion App',
    mobileAppDesc: 'Mobile app for control, customization, and adding new phrases',

    // Technology
    techTitle: 'Advanced Technologies',
    techSubtitle: 'Blend of cutting-edge global technologies for comprehensive solution',

    aiTitle: 'Artificial Intelligence',
    visionApi: 'Image and environment analysis',
    openCv: 'High-precision eye tracking',
    machineLearning: 'Learning from user behavior',

    voiceTitle: 'Speech and Voice',
    tts: 'Natural text-to-speech conversion',
    voiceCloning: 'User voice simulation',
    multiLanguage: 'Arabic and English support',

    infraTitle: 'Infrastructure',
    firebase: 'Secure cloud database',
    realTimeSync: 'Real-time data sync',
    offlineMode: 'Offline functionality',

    devTitle: 'Development',
    python: 'AI algorithms',
    react: 'Interactive user interface',
    tensorflow: 'Deep learning models',

    // Mission
    missionTitle: 'Our Mission',
    missionText: 'Eyecan is not just glasses, but a real bridge reconnecting humans with the world around them. We believe technology should serve humanity, and everyone deserves to have their voice heard and express their feelings',

    // Team
    teamTitle: 'The Team',
    rama: 'Rama AlNajjar',
    ramaRole: 'Full Stack Developer',
    maryam: 'Maryam AlJalakh',
    maryamRole: 'UI/UX Designer',
    aya: 'Aya Gharaibeh',
    ayaRole: 'AI Engineer',
    najwa: 'Najwa AlJulani',
    najwaRole: 'Project Manager',

    // Footer
    quickLinks: 'Quick Links',
    support: 'Support & Help',
    contactUs: 'Contact Us',
    humanitarian: 'This is a humanitarian project aimed at helping people with special needs',
    madeWithLove: 'Made with love to serve humanity',
    rights: 'All rights reserved',
    developedBy: 'Developed by',

    // Simulation Page
    simulationTitle: 'Smart Glasses Simulation',
    categories: 'Categories',
    greetings: 'Greetings',
    thanks: 'Thanks',
    questions: 'Questions',
    emergency: 'Emergency',
    feelings: 'Feelings',
    needs: 'Needs',
    daily: 'Daily',
    medical: 'Medical',
    social: 'Social',
    responses: 'Responses',

    micOn: 'Microphone On',
    micOff: 'Microphone Off',
    listening: 'Listening...',
    suggestions: 'Suggestions',
    exitSimulation: 'Exit Simulation',
    settings: 'Settings',
    dwellTime: 'Dwell Time',
    language: 'Language',
    voiceType: 'Voice Type',
    male: 'Male',
    female: 'Female',
    scrollUp: 'Scroll Up',
    scrollDown: 'Scroll Down',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'ar';
  });

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['ar']] || key;
  };

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, dir, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};