import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, CheckCircle, AlertCircle, MessageSquare, Wrench, HelpCircle, FileText, Shield } from 'lucide-react';
import { MetaTags, StructuredData, getCanonical, getHreflangAlternates } from '../components/SEO';
import axios from 'axios';

const CATEGORIES = [
  { id: 'devis', label: 'Demande de devis', icon: FileText, description: 'Tarifs personnalisés, déploiement sur mesure, volume' },
  { id: 'technique', label: 'Problème technique', icon: Wrench, description: 'Bug, erreur, transcription incorrecte' },
  { id: 'support', label: 'Support & utilisation', icon: HelpCircle, description: 'Question sur les fonctionnalités, aide à la prise en main' },
  { id: 'partenariat', label: 'Partenariat', icon: MessageSquare, description: 'Intégration, revendeur, collaboration' },
  { id: 'rgpd', label: 'RGPD & données', icon: Shield, description: 'Exercice de droits, DPO, conformité' },
];

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://clearrecap.com/' },
    { '@type': 'ListItem', position: 2, name: 'Contact' },
  ],
};

/** Simple arithmetic CAPTCHA */
function generateCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { question: `${a} + ${b} = ?`, answer: a + b };
}

export default function Contact() {
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [honeypot, setHoneypot] = useState(''); // hidden field — bots fill this
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitTime, setSubmitTime] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // Track when form was loaded (spam bots submit instantly)
  useEffect(() => {
    setSubmitTime(Date.now());
  }, []);

  const validate = (): string | null => {
    if (!category) return 'Veuillez sélectionner une catégorie.';
    if (!name.trim() || name.trim().length < 2) return 'Veuillez indiquer votre nom.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Veuillez indiquer un email valide.';
    if (!subject.trim() || subject.trim().length < 3) return 'Veuillez indiquer un objet.';
    if (!message.trim() || message.trim().length < 10) return 'Votre message doit faire au moins 10 caractères.';
    if (parseInt(captchaInput, 10) !== captcha.answer) return 'Vérification incorrecte. Recalculez le résultat.';
    if (honeypot) return 'Erreur de validation.'; // bot detected
    if (Date.now() - submitTime < 3000) return 'Veuillez patienter quelques secondes avant d\'envoyer.'; // too fast = bot
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const err = validate();
    if (err) {
      setError(err);
      setCaptcha(generateCaptcha());
      setCaptchaInput('');
      return;
    }

    setSending(true);
    try {
      await axios.post('/api/contact', {
        category,
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      setSent(true);
    } catch (e: any) {
      const detail = e.response?.data?.detail || 'Une erreur est survenue. Réessayez plus tard.';
      setError(detail);
      setCaptcha(generateCaptcha());
      setCaptchaInput('');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-white">
        <MetaTags
          title="Message envoyé — ClearRecap"
          description="Votre message a bien été envoyé. Nous reviendrons vers vous rapidement."
          canonical={getCanonical('/contact')}
          hreflangAlternates={getHreflangAlternates('/contact')}
        />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}>
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-slate-900 mb-3">Message envoyé</h1>
            <p className="text-slate-600 mb-8">
              Merci pour votre message. Nous vous répondrons sous 24 à 48 heures ouvrées.
            </p>
            <Link to="/" className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
              Retour à l'accueil
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <MetaTags
        title="Contact — ClearRecap"
        description="Contactez l'équipe ClearRecap : devis, support technique, partenariat, questions RGPD. Réponse sous 48h."
        canonical={getCanonical('/contact')}
        hreflangAlternates={getHreflangAlternates('/contact')}
      />
      <StructuredData data={breadcrumbSchema} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-8 transition-colors">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Retour à l'accueil
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">Contactez-nous</h1>
        <p className="text-slate-500 mb-10">Une question, un besoin ? Sélectionnez la catégorie qui correspond et nous vous répondons sous 48h.</p>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-8" noValidate>
          {/* ── Category selector ── */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">Quel est votre besoin ?</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const selected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${selected ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <div>
                      <div className={`text-sm font-semibold ${selected ? 'text-indigo-700' : 'text-slate-700'}`}>{cat.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{cat.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Name & Email ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-name" className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                maxLength={100}
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                maxLength={200}
                autoComplete="email"
              />
            </div>
          </div>

          {/* ── Honeypot (hidden from humans) ── */}
          <div className="absolute -left-[9999px]" aria-hidden="true" tabIndex={-1}>
            <label htmlFor="contact-website">Website</label>
            <input
              id="contact-website"
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {/* ── Subject ── */}
          <div>
            <label htmlFor="contact-subject" className="block text-sm font-medium text-slate-700 mb-1">Objet</label>
            <input
              id="contact-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Résumez votre demande en quelques mots"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              maxLength={200}
            />
          </div>

          {/* ── Message ── */}
          <div>
            <label htmlFor="contact-message" className="block text-sm font-medium text-slate-700 mb-1">Message</label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Décrivez votre demande en détail..."
              rows={6}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors resize-y"
              maxLength={5000}
            />
            <div className="text-xs text-slate-400 mt-1 text-right">{message.length}/5000</div>
          </div>

          {/* ── CAPTCHA ── */}
          <div>
            <label htmlFor="contact-captcha" className="block text-sm font-medium text-slate-700 mb-1">
              Vérification anti-spam : <span className="font-semibold text-indigo-600">{captcha.question}</span>
            </label>
            <input
              id="contact-captcha"
              type="text"
              inputMode="numeric"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              placeholder="Votre réponse"
              className="w-32 px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              maxLength={3}
              autoComplete="off"
            />
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Envoi en cours...' : 'Envoyer le message'}
          </button>
        </form>

        {/* ── Direct email fallback ── */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Vous pouvez aussi nous écrire directement à{' '}
            <a href="mailto:contact@clearrecap.com" className="text-indigo-600 hover:underline font-medium">contact@clearrecap.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
