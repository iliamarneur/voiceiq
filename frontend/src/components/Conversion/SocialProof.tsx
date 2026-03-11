import React, { useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Globe, Brain, FileText, Users, Mic2 } from 'lucide-react';

interface CounterProps {
  end: number;
  suffix?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

function AnimatedCounter({ end, suffix = '', label, icon: Icon }: CounterProps) {
  const ref = React.useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let current = 0;
    const step = Math.ceil(end / 40);
    const interval = setInterval(() => {
      current += step;
      if (current >= end) {
        setCount(end);
        clearInterval(interval);
      } else {
        setCount(current);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [inView, end]);

  return (
    <div ref={ref} className="text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-indigo-50 flex items-center justify-center">
        <Icon className="w-6 h-6 text-indigo-600" />
      </div>
      <motion.p
        className="text-3xl font-extrabold text-slate-800"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
      >
        {count}{suffix}
      </motion.p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
}

interface SocialProofProps {
  className?: string;
}

export default function SocialProof({ className = '' }: SocialProofProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <AnimatedCounter end={12} label="Langues supportées" icon={Globe} />
        <AnimatedCounter end={9} label="Analyses IA par profil" icon={Brain} />
        <AnimatedCounter end={5} label="Profils métier" icon={Mic2} />
        <AnimatedCounter end={8} suffix="+" label="Formats d'export" icon={FileText} />
      </div>
    </div>
  );
}
