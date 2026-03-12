import React from 'react';
import { Link } from 'react-router-dom';
import { MetaTags, StructuredData, getCanonical, getHreflangAlternates } from '../components/SEO';

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://clearrecap.com/' },
    { '@type': 'ListItem', position: 2, name: "Conditions Générales d'Utilisation" },
  ],
};

export default function CGU() {
  return (
    <div className="min-h-screen bg-white">
      <MetaTags
        title="Conditions Générales d'Utilisation — ClearRecap"
        description="Conditions Générales d'Utilisation de ClearRecap : transcription audio par IA, traitement des données, RGPD, modes en ligne et auto-hébergé."
        canonical={getCanonical('/cgu')}
        hreflangAlternates={getHreflangAlternates('/cgu')}
      />
      <StructuredData data={breadcrumbSchema} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-8 transition-colors">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Retour à l'accueil
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">Conditions Générales d'Utilisation</h1>
        <p className="text-sm text-slate-500 mb-10">Dernière mise à jour : 11 mars 2026</p>

        <div className="prose prose-slate max-w-none prose-headings:scroll-mt-20">

          {/* ──────────────────────────────────────────── Article 1 */}
          <h2>Article 1 — Objet et définitions</h2>
          <p>
            Les présentes Conditions Générales d'Utilisation (ci-après « <strong>CGU</strong> ») régissent l'accès et l'utilisation
            du service ClearRecap (ci-après « <strong>le Service</strong> »), édité par ClearRecap, accessible à l'adresse{' '}
            <a href="https://clearrecap.com" className="text-blue-600 hover:underline">clearrecap.com</a>.
          </p>
          <p>Aux fins des présentes, les termes suivants sont définis comme suit :</p>
          <ul>
            <li><strong>Service</strong> : la plateforme ClearRecap de transcription audio automatique (STT) et d'analyse par intelligence artificielle, accessible en mode en ligne ou auto-hébergé.</li>
            <li><strong>Utilisateur</strong> : toute personne physique accédant au Service, qu'elle agisse pour son propre compte ou pour le compte d'un Client.</li>
            <li><strong>Client</strong> : toute personne morale ou physique ayant souscrit un compte ClearRecap et accepté les présentes CGU.</li>
            <li><strong>Mode en ligne</strong> : mode de fonctionnement dans lequel le traitement audio et l'hébergement des résultats textuels sont assurés par l'infrastructure de ClearRecap, hébergée en France (Hostinger, Paris).</li>
            <li><strong>Mode auto-hébergé</strong> : mode de fonctionnement dans lequel l'intégralité du traitement et du stockage s'effectue sur l'infrastructure du Client. ClearRecap intervient alors exclusivement en tant que fournisseur logiciel.</li>
          </ul>

          {/* ──────────────────────────────────────────── Article 2 */}
          <h2>Article 2 — Accès et inscription</h2>
          <h3>2.1 Éligibilité</h3>
          <p>
            L'accès au Service est réservé aux personnes physiques majeures ou aux personnes morales valablement représentées.
            L'Utilisateur déclare disposer de la capacité juridique nécessaire pour s'engager au titre des présentes CGU.
          </p>
          <h3>2.2 Création de compte</h3>
          <p>
            L'utilisation du Service nécessite la création d'un compte personnel. L'Utilisateur s'engage à fournir des informations
            exactes et à jour, et à maintenir la confidentialité de ses identifiants de connexion. Toute utilisation du compte est
            présumée être le fait de l'Utilisateur titulaire.
          </p>
          <h3>2.3 Acceptation des CGU</h3>
          <p>
            L'inscription au Service vaut acceptation pleine et entière des présentes CGU. L'Utilisateur qui n'accepte pas les CGU
            doit s'abstenir d'utiliser le Service.
          </p>

          {/* ──────────────────────────────────────────── Article 3 */}
          <h2>Article 3 — Description des modes de traitement</h2>
          <h3>3.1 Mode en ligne (SaaS)</h3>
          <p>En Mode en ligne, le Service fonctionne selon les principes suivants :</p>
          <ul>
            <li><strong>Traitement audio one-shot</strong> : les fichiers audio sont traités en temps réel puis <strong>supprimés automatiquement et immédiatement</strong> après la transcription. Aucun fichier audio n'est conservé sur les serveurs de ClearRecap.</li>
            <li><strong>Hébergement des résultats textuels</strong> : les transcriptions et les résultats d'analyse IA sont stockés sur les serveurs de ClearRecap, hébergés en France (datacenter Hostinger, Paris).</li>
            <li><strong>Recours à des prestataires IA externes</strong> : le texte issu de la transcription peut être envoyé à des prestataires tiers d'intelligence artificielle (notamment OpenAI et ElevenLabs) pour des traitements complémentaires (analyse, synthèse vocale). Seul le texte est transmis — jamais les fichiers audio bruts.</li>
          </ul>
          <h3>3.2 Mode auto-hébergé (on-premise)</h3>
          <p>En Mode auto-hébergé :</p>
          <ul>
            <li>L'intégralité du traitement (transcription, analyse IA) et du stockage s'effectue sur l'infrastructure du Client.</li>
            <li>Aucune donnée ne transite par les serveurs de ClearRecap.</li>
            <li>ClearRecap intervient exclusivement en qualité de fournisseur du logiciel et ne saurait être considéré comme sous-traitant au sens du RGPD.</li>
          </ul>

          {/* ──────────────────────────────────────────── Article 4 */}
          <h2>Article 4 — Rôles au regard du RGPD</h2>
          <h3>4.1 Mode en ligne</h3>
          <ul>
            <li>Le <strong>Client</strong> est <strong>responsable de traitement</strong> au sens de l'article 4(7) du RGPD : il détermine les finalités et les moyens du traitement des données personnelles contenues dans les fichiers audio.</li>
            <li><strong>ClearRecap</strong> agit en qualité de <strong>sous-traitant</strong> au sens de l'article 28 du RGPD : il traite les données personnelles pour le compte du Client, selon ses instructions et dans le cadre défini par les présentes CGU.</li>
          </ul>
          <h3>4.2 Mode auto-hébergé</h3>
          <ul>
            <li>Le <strong>Client</strong> est <strong>responsable de traitement</strong> et assure l'ensemble des obligations afférentes.</li>
            <li><strong>ClearRecap</strong> n'est ni responsable de traitement, ni sous-traitant. ClearRecap est un simple <strong>fournisseur de logiciel</strong>.</li>
          </ul>

          {/* ──────────────────────────────────────────── Article 5 */}
          <h2>Article 5 — Traitement des fichiers audio</h2>
          <p>ClearRecap applique une politique stricte de traitement one-shot des fichiers audio :</p>
          <ul>
            <li>Les fichiers audio sont traités exclusivement pour les besoins de la transcription demandée par l'Utilisateur.</li>
            <li>Les fichiers audio sont <strong>supprimés automatiquement et intégralement</strong> dès la fin du traitement. Aucune copie, sauvegarde ou réplique n'est conservée.</li>
            <li>Les fichiers audio ne sont <strong>jamais utilisés pour l'entraînement, le fine-tuning ou l'amélioration</strong> de modèles d'intelligence artificielle, qu'ils soient propriétaires ou tiers.</li>
            <li>Les fichiers audio ne sont <strong>jamais transmis</strong> à des prestataires tiers. Seul le texte résultant de la transcription peut être transmis (cf. article 7).</li>
          </ul>

          {/* ──────────────────────────────────────────── Article 6 */}
          <h2>Article 6 — Traitement des données textuelles</h2>
          <h3>6.1 Hébergement</h3>
          <p>
            Les transcriptions et résultats d'analyse IA sont hébergés en France, sur les serveurs Hostinger situés à Paris.
          </p>
          <h3>6.2 Durée de conservation</h3>
          <p>Les données textuelles sont conservées :</p>
          <ul>
            <li><strong>Pendant toute la durée de vie du compte</strong> de l'Utilisateur ;</li>
            <li>Pendant une période de <strong>30 jours calendaires</strong> suivant la suppression du compte, afin de permettre une éventuelle récupération. Au-delà de ce délai, les données sont supprimées définitivement.</li>
          </ul>
          <h3>6.3 Droit de suppression</h3>
          <p>
            L'Utilisateur peut à tout moment supprimer ses transcriptions, ses projets et l'intégralité de ses données depuis
            l'interface du Service. La suppression est effective et irréversible.
          </p>

          {/* ──────────────────────────────────────────── Article 7 */}
          <h2>Article 7 — Prestataires tiers d'intelligence artificielle</h2>
          <h3>7.1 Nature des transferts</h3>
          <p>
            Dans le cadre du Mode en ligne, le texte issu des transcriptions peut être transmis à des prestataires tiers d'IA
            pour des traitements complémentaires (analyse sémantique, résumé, synthèse vocale, etc.).
            Seul le <strong>texte</strong> est transmis — jamais les fichiers audio bruts.
          </p>
          <h3>7.2 Liste des prestataires</h3>
          <p>À la date des présentes, les prestataires tiers utilisés sont :</p>
          <ul>
            <li><strong>OpenAI</strong> (OpenAI, L.P., San Francisco, États-Unis) — analyse et traitement textuel par IA</li>
            <li><strong>ElevenLabs</strong> (ElevenLabs, Inc., États-Unis) — synthèse vocale</li>
          </ul>
          <h3>7.3 Transferts hors Union européenne</h3>
          <p>
            Les prestataires ci-dessus étant établis aux États-Unis, les transferts de données textuelles vers ces prestataires
            constituent des transferts hors de l'Union européenne au sens des articles 44 à 49 du RGPD.
            Ces transferts sont encadrés par :
          </p>
          <ul>
            <li>Des <strong>Clauses Contractuelles Types</strong> (SCC) adoptées par la Commission européenne ;</li>
            <li>Des <strong>Data Processing Agreements</strong> (DPA) conclus avec chaque prestataire.</li>
          </ul>
          <p>
            ClearRecap s'engage à tenir à jour la liste des prestataires et à informer les Utilisateurs de tout changement
            conformément à l'article 13 des présentes CGU.
          </p>

          {/* ──────────────────────────────────────────── Article 8 */}
          <h2>Article 8 — Données sensibles</h2>
          <p>
            L'Utilisateur s'engage à <strong>ne pas soumettre via le Mode en ligne</strong> de fichiers audio contenant des données
            relevant des catégories particulières visées à l'article 9 du RGPD, notamment :
          </p>
          <ul>
            <li>des données de santé ;</li>
            <li>des données judiciaires ;</li>
            <li>des données biométriques aux fins d'identification ;</li>
            <li>des données révélant l'origine raciale ou ethnique, les opinions politiques, les convictions religieuses ou philosophiques, l'appartenance syndicale, ou l'orientation sexuelle.</li>
          </ul>
          <p>
            Sauf à ce que l'Utilisateur dispose d'une <strong>base légale appropriée</strong> (consentement explicite, intérêt public,
            obligation légale, etc.) et qu'il en assume l'entière responsabilité.
          </p>
          <p>
            <strong>ClearRecap décline toute responsabilité</strong> en cas de traitement de données sensibles via le Mode en ligne
            sans base légale valide. Pour le traitement de données sensibles, ClearRecap recommande l'utilisation du
            Mode auto-hébergé, qui garantit que les données ne quittent jamais l'infrastructure du Client.
          </p>

          {/* ──────────────────────────────────────────── Article 9 */}
          <h2>Article 9 — Limitation de responsabilité</h2>
          <h3>9.1 Exactitude des résultats</h3>
          <p>
            ClearRecap ne garantit pas l'exactitude, l'exhaustivité ou la fiabilité des transcriptions et des analyses
            produites par les modèles d'intelligence artificielle. Les résultats sont fournis <strong>à titre indicatif</strong> et
            ne sauraient se substituer à une vérification humaine, en particulier dans les contextes médicaux, juridiques
            ou réglementaires.
          </p>
          <h3>9.2 Contenu soumis par l'Utilisateur</h3>
          <p>
            L'Utilisateur est seul responsable du contenu des fichiers audio qu'il soumet au Service. ClearRecap ne saurait
            être tenu responsable de la nature, de la licéité ou du caractère approprié des contenus traités.
          </p>
          <h3>9.3 Prestataires tiers</h3>
          <p>
            ClearRecap ne saurait être tenu responsable des défaillances, interruptions de service, failles de sécurité ou
            modifications de politique de ses prestataires tiers d'intelligence artificielle. ClearRecap s'engage toutefois à
            sélectionner des prestataires offrant des garanties appropriées en matière de protection des données.
          </p>
          <h3>9.4 Plafond de responsabilité</h3>
          <p>
            En tout état de cause, la responsabilité totale de ClearRecap, toutes causes confondues, est limitée au
            <strong> montant total des sommes effectivement versées par le Client au cours des douze (12) mois</strong> précédant
            le fait générateur de responsabilité. Cette limitation s'applique dans les limites autorisées par la loi applicable.
          </p>

          {/* ──────────────────────────────────────────── Article 10 */}
          <h2>Article 10 — Gestion du compte et des données</h2>
          <h3>10.1 Suppression de données</h3>
          <p>
            L'Utilisateur peut à tout moment, depuis l'interface du Service, supprimer ses transcriptions, ses projets
            et les résultats d'analyse associés. La suppression est immédiate et irréversible.
          </p>
          <h3>10.2 Export de données</h3>
          <p>
            L'Utilisateur peut exporter ses transcriptions et résultats d'analyse dans les formats proposés par le Service
            (PDF, TXT, DOCX, etc.) avant toute suppression.
          </p>
          <h3>10.3 Suppression du compte</h3>
          <p>
            L'Utilisateur peut demander la suppression de son compte à tout moment. La suppression entraîne :
          </p>
          <ul>
            <li>La désactivation immédiate de l'accès au Service ;</li>
            <li>La conservation des données textuelles pendant 30 jours (période de grâce) ;</li>
            <li>La suppression définitive et irréversible de l'ensemble des données à l'expiration de ce délai.</li>
          </ul>
          <h3>10.4 Portabilité</h3>
          <p>
            Conformément à l'article 20 du RGPD, l'Utilisateur peut exercer son droit à la portabilité des données en
            contactant ClearRecap à l'adresse <a href="mailto:contact@clearrecap.fr" className="text-blue-600 hover:underline">contact@clearrecap.fr</a>.
          </p>

          {/* ──────────────────────────────────────────── Article 11 */}
          <h2>Article 11 — Propriété intellectuelle</h2>
          <h3>11.1 Contenu de l'Utilisateur</h3>
          <p>
            L'Utilisateur conserve l'intégralité de ses droits de propriété intellectuelle sur les fichiers audio qu'il soumet
            au Service ainsi que sur les transcriptions et résultats d'analyse générés à partir de ces fichiers.
          </p>
          <h3>11.2 Service ClearRecap</h3>
          <p>
            Le Service ClearRecap, incluant son interface, son code source, ses algorithmes, sa marque, ses logos et sa
            documentation, sont la propriété exclusive de ClearRecap. Toute reproduction, modification ou exploitation non
            autorisée est strictement interdite.
          </p>

          {/* ──────────────────────────────────────────── Article 12 */}
          <h2>Article 12 — Disponibilité du Service</h2>
          <p>
            ClearRecap s'engage à fournir ses meilleurs efforts pour assurer la disponibilité et la continuité du Service
            (<strong>obligation de moyens</strong>). ClearRecap ne saurait être tenu à une obligation de résultat.
          </p>
          <p>
            Le Service peut être temporairement interrompu pour des raisons de maintenance, de mise à jour ou en cas de
            force majeure. ClearRecap s'efforcera de notifier les Utilisateurs dans un délai raisonnable avant toute
            interruption programmée.
          </p>

          {/* ──────────────────────────────────────────── Article 13 */}
          <h2>Article 13 — Modification des CGU</h2>
          <p>
            ClearRecap se réserve le droit de modifier les présentes CGU à tout moment. Les Utilisateurs seront informés de
            toute modification substantielle par email ou par notification dans l'interface du Service, au moins
            <strong> trente (30) jours</strong> avant l'entrée en vigueur des nouvelles conditions.
          </p>
          <p>
            La poursuite de l'utilisation du Service après l'entrée en vigueur des CGU modifiées vaut acceptation des
            nouvelles conditions. En cas de désaccord, l'Utilisateur peut résilier son compte conformément à l'article 10.3.
          </p>

          {/* ──────────────────────────────────────────── Article 14 */}
          <h2>Article 14 — Droit applicable et juridiction compétente</h2>
          <p>
            Les présentes CGU sont régies par le <strong>droit français</strong>.
          </p>
          <p>
            En cas de litige relatif à l'interprétation, l'exécution ou la résiliation des présentes CGU, les parties
            s'efforceront de trouver une solution amiable. À défaut d'accord amiable dans un délai de trente (30) jours,
            le litige sera soumis aux <strong>tribunaux compétents de Paris</strong>.
          </p>

          {/* ──────────────────────────────────────────── Contact */}
          <h2>Contact</h2>
          <p>
            Pour toute question relative aux présentes CGU ou à l'exercice de vos droits, vous pouvez contacter ClearRecap à
            l'adresse suivante :
          </p>
          <p className="font-medium">
            ClearRecap<br />
            Email : <a href="mailto:contact@clearrecap.fr" className="text-blue-600 hover:underline">contact@clearrecap.fr</a>
          </p>
        </div>

        {/* ──────────────────────────────────────────── Footer links */}
        <div className="mt-16 pt-8 border-t border-slate-200 flex flex-wrap gap-6 text-sm text-slate-500">
          <Link to="/confidentialite" className="hover:text-slate-700 transition-colors">Politique de confidentialité</Link>
          <Link to="/securite-donnees" className="hover:text-slate-700 transition-colors">Sécurité des données</Link>
          <Link to="/conformite" className="hover:text-slate-700 transition-colors">Conformité</Link>
          <Link to="/" className="hover:text-slate-700 transition-colors">Accueil</Link>
        </div>
      </div>
    </div>
  );
}
