import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/components/layout/ThemeProvider';
import {
  Eye, Brain, Mic, Shield, Users, Heart,
  Activity, AlertTriangle, Stethoscope, Code,
  Database, Cloud, Cpu, Globe, Zap, Server,
  Wifi, WifiOff, Volume2, Languages, Moon, Sun,
  ChevronDown, ArrowRight, Sparkles, Target,
  HeartHandshake, Lightbulb
} from 'lucide-react';
import logo from '@/assets/eyecan-logo.png';

const Index: React.FC = () => {
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();

  const features = [
    { icon: <Eye className="w-10 h-10" />, title: t('eyeTracking'), desc: t('eyeTrackingDesc') },
    { icon: <Brain className="w-10 h-10" />, title: t('smartAnalysis'), desc: t('smartAnalysisDesc') },
    { icon: <Activity className="w-10 h-10" />, title: t('instantResponse'), desc: t('instantResponseDesc') },
    { icon: <Globe className="w-10 h-10" />, title: t('mobileApp'), desc: t('mobileAppDesc') },
  ];

  const whoWeHelp = [
    { icon: <Shield className="w-14 h-14" />, title: t('warVictims'), desc: t('warVictimsDesc'), examples: t('warExamples') },
    { icon: <Users className="w-14 h-14" />, title: t('paralysisPatients'), desc: t('paralysisPatientsDesc'), examples: t('paralysisExamples') },
    { icon: <Heart className="w-14 h-14" />, title: t('traumaVictims'), desc: t('traumaVictimsDesc'), examples: t('traumaExamples') },
    { icon: <Stethoscope className="w-14 h-14" />, title: t('medicalCases'), desc: t('medicalCasesDesc'), examples: t('medicalExamples') },
  ];

  const team = [
    { name: 'Rama AlNajjar', role: t('ramaRole'), initials: 'RN' },
    { name: 'Maryam AlJalakh', role: t('maryamRole'), initials: 'MJ' },
    { name: 'Aya Gharaibeh', role: t('ayaRole'), initials: 'AG' },
    { name: 'Najwa AlJulani', role: t('najwaRole'), initials: 'NJ' },
  ];

  const technologies = [
    {
      category: t('ai'),
      icon: <Brain className="w-8 h-8" />,
      items: [
        { icon: <Eye className="w-6 h-6" />, name: 'Google Vision API', desc: t('visionApiDesc') },
        { icon: <Activity className="w-6 h-6" />, name: 'OpenCV', desc: t('openCvDesc') },
        { icon: <Brain className="w-6 h-6" />, name: 'Machine Learning', desc: t('mlDesc') },
      ]
    },
    {
      category: t('voiceAudio'),
      icon: <Volume2 className="w-8 h-8" />,
      items: [
        { icon: <Volume2 className="w-6 h-6" />, name: 'Google Text-to-Speech', desc: t('ttsDesc') },
        { icon: <Mic className="w-6 h-6" />, name: 'Voice Cloning', desc: t('voiceCloneDesc') },
        { icon: <Languages className="w-6 h-6" />, name: 'Multi-language Support', desc: t('multiLangDesc') },
      ]
    },
    {
      category: t('infrastructure'),
      icon: <Server className="w-8 h-8" />,
      items: [
        { icon: <Database className="w-6 h-6" />, name: 'Firebase', desc: t('firebaseDesc') },
        { icon: <Zap className="w-6 h-6" />, name: 'Real-time Sync', desc: t('realtimeDesc') },
        { icon: <WifiOff className="w-6 h-6" />, name: 'Offline Mode', desc: t('offlineDesc') },
      ]
    },
    {
      category: t('development'),
      icon: <Code className="w-8 h-8" />,
      items: [
        { icon: <Code className="w-6 h-6" />, name: 'Python', desc: t('pythonDesc') },
        { icon: <Globe className="w-6 h-6" />, name: 'React', desc: t('reactDesc') },
        { icon: <Cpu className="w-6 h-6" />, name: 'TensorFlow', desc: t('tensorflowDesc') },
      ]
    }
  ];

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/5 to-background">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Eyecan" className="w-14 h-14 object-contain" />

              <span className="text-2xl font-bold gradient-text">Eyecan</span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-foreground/70 hover:text-foreground transition-colors font-medium"
              >
                {t('features')}
              </button>
              <button
                onClick={() => scrollToSection('who-we-help')}
                className="text-foreground/70 hover:text-foreground transition-colors font-medium"
              >
                {t('whoWeHelp')}
              </button>
              <button
                onClick={() => scrollToSection('technologies')}
                className="text-foreground/70 hover:text-foreground transition-colors font-medium"
              >
                {t('technologies')}
              </button>
              <button
                onClick={() => scrollToSection('team')}
                className="text-foreground/70 hover:text-foreground transition-colors font-medium"
              >
                {t('team')}
              </button>
            </nav>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleLanguage}
                className="px-4 py-2 rounded-lg hover:bg-muted transition-colors font-medium"
              >
                {language === 'ar' ? 'EN' : 'عربي'}
              </button>

              <Link to="/simulation">
                <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
                  {t('tryNow')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5" />
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-4 z-10 text-center">
          <div className="mb-8 animate-float">
            <img
              src={logo}
              alt="Eyecan"
              className="w-80 h-80 md:w-96 md:h-96 object-contain mx-auto drop-shadow-2xl"
            />
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-8 gradient-text animate-fade-in">
            {t('heroTitle')}
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto animate-fade-in leading-relaxed">
            {t('heroSubtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center animate-fade-in">
            <Link to="/simulation">
              <Button size="lg" className="group bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all text-lg px-8 py-6 rounded-2xl">
                <Sparkles className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                {t('tryNow')}
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              onClick={() => scrollToSection('features')}
              className="text-lg px-8 py-6 rounded-2xl border-2"
            >
              {t('learnMore')}
              <ChevronDown className="w-5 h-5 ml-2 animate-bounce" />
            </Button>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 bg-gradient-to-b from-muted/20 to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
              <AlertTriangle className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-primary">{t('problemLabel')}</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-8">{t('problemTitle')}</h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              {t('problemDesc')}
            </p>
          </div>
        </div>
      </section>

      {/* Who We Help */}
      <section id="who-we-help" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-full mb-6">
              <HeartHandshake className="w-5 h-5 text-secondary" />
              <span className="text-sm font-semibold text-secondary">{t('impact')}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold">{t('whoWeHelpTitle')}</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {whoWeHelp.map((item, index) => (
              <Card key={index} className="group p-8 hover:shadow-2xl transition-all duration-500 border-2 hover:border-primary/20">
                <div className="text-primary mb-6 flex justify-center group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">{item.desc}</p>
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium text-primary mb-2">{t('examples')}:</p>
                  <p className="text-sm text-muted-foreground">{item.examples}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-gradient-to-b from-muted/20 to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full mb-6">
              <Lightbulb className="w-5 h-5 text-accent" />
              <span className="text-sm font-semibold text-accent">{t('innovation')}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">{t('featuresTitle')}</h2>
            <p className="text-xl text-muted-foreground">{t('featuresSubtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group p-8 hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-card to-card/50">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <div className="text-primary">{feature.icon}</div>
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technologies Section */}
      <section id="technologies" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-primary">{t('advanced')}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">{t('technologiesTitle')}</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">{t('technologiesSubtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {technologies.map((tech, index) => (
              <div key={index} className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                    {tech.icon}
                  </div>
                  <h3 className="text-2xl font-bold gradient-text">{tech.category}</h3>
                </div>

                <div className="space-y-4">
                  {tech.items.map((item, itemIndex) => (
                    <Card key={itemIndex} className="p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-primary/30">
                      <div className="flex items-start gap-4">
                        <div className="text-primary mt-1">{item.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg mb-2">{item.name}</h4>
                          <p className="text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <Card className="p-16 text-center bg-gradient-to-br from-card via-card/80 to-primary/5 border-2 border-primary/10">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 gradient-text">{t('missionTitle')}</h2>
            <p className="text-xl md:text-2xl max-w-5xl mx-auto leading-relaxed text-foreground/90">
              {t('missionText')}
            </p>
          </Card>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">{t('teamTitle')}</h2>
            <p className="text-xl text-muted-foreground">{t('teamSubtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="group p-8 text-center hover:shadow-2xl transition-all duration-500">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6 group-hover:scale-110 transition-transform">
                  {member.initials}
                </div>
                <h3 className="text-xl font-bold mb-2">{member.name}</h3>
                <p className="text-muted-foreground">{member.role}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-card border-t-2 border-border">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={logo} alt="Eyecan" className="w-20 h-20 object-contain" />
                <span className="text-2xl font-bold gradient-text">Eyecan</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {t('footerDesc')}
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">{t('quickLinks')}</h3>
              <div className="space-y-2">
                <button
                  onClick={() => scrollToSection('features')}
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('features')}
                </button>
                <Link to="/simulation" className="block text-muted-foreground hover:text-foreground transition-colors">
                  {t('prototype')}
                </Link>
                <button
                  onClick={() => scrollToSection('who-we-help')}
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('whoWeHelp')}
                </button>
                <button
                  onClick={() => scrollToSection('technologies')}
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('technologies')}
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">{t('support')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('contactDesc')}
              </p>
              <a href="mailto:support@eyecan.tech" className="text-primary hover:underline font-medium">
                support@eyecan.tech
              </a>
            </div>
          </div>

          <div className="border-t border-border pt-8 text-center">
            <p className="text-lg font-semibold mb-2 gradient-text">{t('madeWithLove')}</p>
            <p className="text-sm text-muted-foreground mb-2">
              © 2024 Eyecan. {t('rights')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('developedBy')}: Rama AlNajjar • Maryam AlJalakh • Aya Gharaibeh • Najwa AlJulani
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;