import React from 'react';
import { Landmark, ShieldAlert, Clock, Scale, FileWarning, Gavel } from 'lucide-react';
import VerticalLanding from '../components/Landing/VerticalLanding';

export default function LandingJuridique() {
  return (
    <VerticalLanding
      path="/transcription-juridique"
      metaTitle="Transcription Juridique Confidentielle — Audiences & Consultations"
      metaDescription="Transcription juridique sécurisée en local. Synthèse, obligations par partie, risques, échéances. Secret professionnel garanti."
      heroIcon={Landmark}
      heroIconGradient="from-amber-500 to-orange-600"
      headline="Transcription Juridique Confidentielle"
      subheadline="Synthèse juridique, obligations par partie, risques identifiés et échéances extraites automatiquement. Le secret professionnel reste garanti."
      badge="100% Local • Secret professionnel • CLOUD Act éliminé"
      painPoints={[
        {
          icon: Clock,
          title: 'Retranscription manuelle longue',
          description: 'Audiences, arbitrages, consultations — des heures de retranscription manuelle. ClearRecap génère des synthèses juridiques structurées en minutes.',
        },
        {
          icon: ShieldAlert,
          title: 'Secret professionnel menacé',
          description: 'Les solutions cloud US sont soumises au CLOUD Act. ClearRecap traite tout en local — aucune donnée ne quitte votre cabinet.',
        },
        {
          icon: FileWarning,
          title: 'Risque d\'oublier des obligations',
          description: 'Dans un échange complexe, des obligations ou échéances peuvent être oubliées. L\'IA les extrait et les structure automatiquement.',
        },
      ]}
      featuresTitle="Analyses IA spécialisées Juridique"
      featuresGradient="from-amber-500 to-orange-600"
      features={[
        { name: 'Synthèse juridique', description: 'Résumé structuré de l\'échange avec les points de droit clés' },
        { name: 'Obligations par partie', description: 'Engagements identifiés pour chaque partie prenante' },
        { name: 'Risques juridiques', description: 'Points de vigilance et risques potentiels signalés par l\'IA' },
        { name: 'Échéances et délais', description: 'Dates limites, délais de prescription et calendrier extrait' },
        { name: 'Références légales', description: 'Articles de loi et jurisprudence mentionnés dans l\'échange' },
        { name: 'Plan d\'actions', description: 'Prochaines étapes structurées pour chaque dossier' },
        { name: 'Diarisation des locuteurs', description: 'Distinction des intervenants (avocat, client, juge, parties)' },
        { name: 'Confidentialité totale', description: '100% local — aucun transfert, aucun sous-traitant cloud' },
        { name: 'Export professionnel', description: 'PDF, Markdown, SRT — formats adaptés aux dossiers juridiques' },
      ]}
      faqItems={[
        {
          question: 'Le secret professionnel est-il garanti ?',
          answer: 'Oui. ClearRecap fonctionne intégralement en local sur votre infrastructure. Aucune donnée audio ou texte ne quitte votre réseau. Il n\'y a aucun sous-traitant cloud, aucun transfert international, aucun risque CLOUD Act.',
        },
        {
          question: 'Peut-on transcrire des audiences et des arbitrages ?',
          answer: 'Oui. ClearRecap traite des fichiers audio jusqu\'à 3 heures. La diarisation identifie les différents intervenants, et le profil Juridique génère une synthèse structurée avec obligations et échéances.',
        },
        {
          question: 'Comment ClearRecap se compare-t-il à un sténotypiste ?',
          answer: 'ClearRecap ne remplace pas un sténotypiste assermenté pour les procès-verbaux officiels. Il est conçu comme outil d\'aide : brouillon de retranscription, synthèse juridique, extraction d\'obligations — à relire et valider par l\'avocat.',
        },
        {
          question: 'L\'installation on-premise est-elle possible dans un cabinet ?',
          answer: 'Oui. Un serveur avec GPU NVIDIA et Docker suffit. L\'installation prend quelques heures et ne nécessite aucune connexion internet pour le traitement quotidien.',
        },
      ]}
    />
  );
}
