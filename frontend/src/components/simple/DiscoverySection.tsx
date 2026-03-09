import React from 'react';

function DiscoverySection() {
  return (
    <div className="mt-8 bg-slate-800/50 border-l-2 border-indigo-500 p-4 rounded-r-lg">
      <p className="text-sm font-medium text-slate-300 mb-2">Le saviez-vous ?</p>
      <p className="text-sm text-slate-400 leading-relaxed">
        VoiceIQ peut aussi analyser des réunions business, des cours,
        des consultations médicales et juridiques.
        Avec un abonnement, vous accédez à des profils métiers spécialisés,
        du chat IA pour poser des questions sur vos transcriptions,
        et des exports avancés (PDF, PowerPoint, sous-titres).
      </p>
    </div>
  );
}

export default DiscoverySection;
