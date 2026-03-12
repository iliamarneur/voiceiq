import React from 'react';
import { Link } from 'react-router-dom';
import { MetaTags, StructuredData, getCanonical, getHreflangAlternates } from '../components/SEO';

/* ─── Schemas ────────────────────────────────────────────── */

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://clearrecap.com/' },
    { '@type': 'ListItem', position: 2, name: 'Politique de Confidentialité' },
  ],
};

/* ─── Component ──────────────────────────────────────────── */

export default function PrivacyPolicy() {
  return (
    <>
      <MetaTags
        title="Politique de Confidentialité — ClearRecap"
        description="Politique de confidentialité de ClearRecap : données collectées, bases légales RGPD, durées de conservation, droits des utilisateurs et sécurité."
        canonical={getCanonical('/politique-confidentialite')}
        hreflangAlternates={getHreflangAlternates('/politique-confidentialite')}
      />
      <StructuredData data={breadcrumbSchema} />

      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-8"
          >
            &larr; Retour à l'accueil
          </Link>

          {/* Header */}
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            Politique de Confidentialité
          </h1>
          <p className="text-sm text-slate-500 mb-10">
            Dernière mise à jour : 11 mars 2026
          </p>

          <div className="prose prose-slate max-w-none space-y-10">

            {/* ─── 1. Identité du responsable ─────────────────── */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900">1. Identité du responsable de traitement</h2>
              <p className="text-slate-600 leading-relaxed">
                Le responsable du traitement des données personnelles est <strong>ClearRecap</strong>,
                éditeur de la plateforme de transcription et d'analyse audio par IA accessible à
                l'adresse <a href="https://clearrecap.com" className="text-indigo-600 hover:text-indigo-800 underline">clearrecap.com</a>.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Contact : <a href="mailto:contact@clearrecap.fr" className="text-indigo-600 hover:text-indigo-800 underline">contact@clearrecap.fr</a>
              </p>
            </section>

            {/* ─── 2. Données collectées ──────────────────────── */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900">2. Données collectées</h2>
              <p className="text-slate-600 leading-relaxed">
                Dans le cadre du <strong>mode en ligne</strong> (SaaS hébergé en France), ClearRecap collecte
                et traite les catégories de données suivantes :
              </p>

              <h3 className="text-lg font-medium text-slate-800 mt-6">2.1 Données de compte</h3>
              <ul className="list-disc list-inside text-slate-600 space-y-1 ml-2">
                <li>Nom et prénom</li>
                <li>Adresse e-mail</li>
                <li>Mot de passe (stocké sous forme hashée, jamais en clair)</li>
              </ul>

              <h3 className="text-lg font-medium text-slate-800 mt-6">2.2 Données de paiement</h3>
              <p className="text-slate-600 leading-relaxed">
                Les paiements sont intégralement traités par <strong>Stripe</strong>. ClearRecap ne stocke
                jamais vos données de carte bancaire. Seul un identifiant client Stripe est conservé
                pour assurer le suivi de votre abonnement.
              </p>

              <h3 className="text-lg font-medium text-slate-800 mt-6">2.3 Fichiers audio</h3>
              <p className="text-slate-600 leading-relaxed">
                Les fichiers audio sont traités en <strong>one-shot</strong> : ils sont analysés puis
                <strong> supprimés automatiquement et immédiatement</strong> après traitement. Aucun fichier
                audio n'est conservé sur nos serveurs.
              </p>

              <h3 className="text-lg font-medium text-slate-800 mt-6">2.4 Transcriptions et résultats d'analyse IA</h3>
              <p className="text-slate-600 leading-relaxed">
                Les transcriptions et les résultats d'analyse générés par l'IA sont stockés dans votre
                compte utilisateur et hébergés en France (datacenter Hostinger, Paris).
              </p>

              <h3 className="text-lg font-medium text-slate-800 mt-6">2.5 Données techniques</h3>
              <ul className="list-disc list-inside text-slate-600 space-y-1 ml-2">
                <li>Logs serveur (requêtes, erreurs)</li>
                <li>Adresse IP (anonymisée après 30 jours)</li>
                <li>Type de navigateur et système d'exploitation</li>
              </ul>
            </section>

            {/* ─── 3. Bases légales ───────────────────────────── */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900">3. Bases légales du traitement (Art. 6 RGPD)</h2>

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-700 border-b border-slate-200">Traitement</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-700 border-b border-slate-200">Base légale</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3">Traitement audio et transcription</td>
                      <td className="px-4 py-3">Exécution du contrat (Art. 6.1.b)</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3">Stockage des transcriptions et résultats IA</td>
                      <td className="px-4 py-3">Exécution du contrat (Art. 6.1.b)</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3">Gestion de compte et facturation</td>
                      <td className="px-4 py-3">Exécution du contrat (Art. 6.1.b)</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3">Logs serveur, sécurité et prévention des abus</td>
                      <td className="px-4 py-3">Intérêt légitime (Art. 6.1.f)</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Newsletter et communications marketing</td>
                      <td className="px-4 py-3">Consentement (Art. 6.1.a)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ─── 4. Finalités ───────────────────────────────── */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900">4. Finalités du traitement</h2>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
                <li><strong>Transcription audio</strong> : conversion de vos fichiers audio en texte via notre moteur de reconnaissance vocale.</li>
                <li><strong>Analyse par IA</strong> : génération de résumés, points clés, comptes rendus et autres analyses à partir des transcriptions.</li>
                <li><strong>Gestion de compte</strong> : création, authentification et administration de votre espace utilisateur.</li>
                <li><strong>Facturation</strong> : gestion des abonnements, suivi des minutes consommées et traitement des paiements.</li>
                <li><strong>Support technique</strong> : réponse à vos demandes d'assistance et résolution d'incidents.</li>
              </ul>
            </section>

            {/* ─── 5. Destinataires et sous-traitants ─────────── */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900">5. Destinataires et sous-traitants</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Vos données peuvent être partagées avec les sous-traitants suivants, dans le strict cadre
                des finalités décrites ci-dessus :
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-700 border-b border-slate-200">Sous-traitant</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-700 border-b border-slate-200">Fonction</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-700 border-b border-slate-200">Localisation</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-700 border-b border-slate-200">Garanties</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium">Hostinger</td>
                      <td className="px-4 py-3">Hébergement serveur</td>
                      <td className="px-4 py-3">France (Paris)</td>
                      <td className="px-4 py-3">DPA</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium">Stripe</td>
                      <td className="px-4 py-3">Traitement des paiements</td>
                      <td className="px-4 py-3">UE / US</td>
                      <td className="px-4 py-3">DPA + SCC</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium">OpenAI</td>
                      <td className="px-4 py-3">Analyse de texte (texte uniquement, jamais l'audio)</td>
                      <td className="px-4 py-3">US</td>
                      <td className="px-4 py-3">DPA + SCC</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">ElevenLabs</td>
                      <td className="px-4 py-3">Services vocaux (si applicable)</td>
                      <td className="px-4 py-3">US</td>
                      <td className="px-4 py-3">DPA + SCC</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-slate-600 leading-relaxed mt-4">
                Pour chaque sous-traitant situé hors de l'Union Européenne, un <strong>Data Processing
                Agreement (DPA)</strong> et des <strong>Clauses Contractuelles Types (SCC)</strong> sont en
                place conformément aux articles 28 et 46 du RGPD.
              </p>
            </section>

            {/* ─── 6. Transferts hors UE ──────────────────────── */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900">6. Transferts de données hors Union Européenne</h2>
              <p className="text-slate-600 leading-relaxed">
                Certains sous-traitants (OpenAI, ElevenLabs, Stripe) sont situés aux États-Unis.
                Les transferts sont encadrés par des <strong>Clauses Contractuelles Types (SCC)</strong> adoptées
                par la Commission Européenne et des <strong>Data Processing Agreements (DPA)</strong>.
              </p>
              <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 mt-4">
                <p className="text-sm text-indigo-800 font-medium">
                  Point important : seul le texte des transcriptions peut être transmis à ces
                  sous-traitants pour analyse. Les fichiers audio ne sont jamais envoyés hors de France
                  et sont supprimés immédiatement après traitement local.
                </p>
              </div>
            </section>

            {/* ─── 7. Durées de conservation ──────────────────── */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900">7. Durées de conservation</h2>

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-700 border-b border-slate-200">Type de données</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-700 border-b border-slate-200">Durée de conservation</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3">Fichiers audio</td>
                      <td className="px-4 py-3 font-medium">0 — suppression immédiate après traitement</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3">Transcriptions et résultats d'analyse</td>
                      <td className="px-4 py-3">Tant que le compte utilisateur est actif</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3">Données de compte</td>
                      <td className="px-4 py-3">Tant que le compte est actif</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3">Après suppression du compte</td>
                      <td className="px-4 py-3">Effacement complet sous 30 jours</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Logs techniques</td>
                      <td className="px-4 py-3">12 mois maximum</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ─── 8. Droits des personnes ────────────────────── */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900">8. Vos droits</h2>
              <p className="text-slate-600 leading-relaxed">
                Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez
                des droits suivants sur vos données personnelles :
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2 mt-3">
                <li><strong>Droit d'accès</strong> (Art. 15) : obtenir une copie de vos données personnelles.</li>
                <li><strong>Droit de rectification</strong> (Art. 16) : corriger vos données inexactes ou incomplètes.</li>
                <li><strong>Droit à l'effacement</strong> (Art. 17) : demander la suppression de vos données.</li>
                <li><strong>Droit à la portabilité</strong> (Art. 20) : recevoir vos données dans un format structuré et lisible par machine.</li>
                <li><strong>Droit d'opposition</strong> (Art. 21) : vous opposer au traitement de vos données.</li>
                <li><strong>Droit à la limitation</strong> (Art. 18) : demander la limitation du traitement dans certains cas.</li>
              </ul>
              <p className="text-slate-600 leading-relaxed mt-4">
                Pour exercer vos droits, contactez-nous à l'adresse{' '}
                <a href="mailto:contact@clearrecap.fr" className="text-indigo-600 hover:text-indigo-800 underline">
                  contact@clearrecap.fr
                </a>.
                Nous nous engageons à répondre dans un délai de 30 jours.
              </p>
              <p className="text-slate-600 leading-relaxed mt-3">
                Si vous estimez que le traitement de vos données ne respecte pas la réglementation,
                vous pouvez introduire une réclamation auprès de la{' '}
                <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) :{' '}
                <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline">
                  www.cnil.fr
                </a>.
              </p>
            </section>

            {/* ─── 9. Sécurité ────────────────────────────────── */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900">9. Mesures de sécurité</h2>
              <p className="text-slate-600 leading-relaxed">
                ClearRecap met en place les mesures techniques et organisationnelles suivantes pour
                protéger vos données :
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2 mt-3">
                <li><strong>Chiffrement en transit</strong> : toutes les communications sont protégées par TLS (HTTPS).</li>
                <li><strong>Hashage des mots de passe</strong> : les mots de passe sont hashés avec des algorithmes robustes (bcrypt) et ne sont jamais stockés en clair.</li>
                <li><strong>Accès restreint</strong> : l'accès aux données est limité aux personnels habilités, sur la base du besoin d'en connaître.</li>
                <li><strong>Aucune conservation audio</strong> : les fichiers audio sont supprimés immédiatement après traitement, éliminant le risque de fuite de données audio.</li>
                <li><strong>Hébergement en France</strong> : les données sont hébergées dans un datacenter Hostinger à Paris.</li>
              </ul>
            </section>

            {/* ─── 10. Cookies ────────────────────────────────── */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900">10. Cookies</h2>
              <p className="text-slate-600 leading-relaxed">
                ClearRecap n'utilise <strong>aucun cookie de tracking tiers</strong> (pas de Google Analytics,
                pas de pixels publicitaires, pas de cookies de réseaux sociaux).
              </p>
              <p className="text-slate-600 leading-relaxed mt-3">
                Seuls des <strong>cookies techniques strictement nécessaires</strong> sont utilisés :
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-1 ml-2 mt-2">
                <li>Cookie de session (authentification)</li>
                <li>Préférences utilisateur (thème, langue)</li>
              </ul>
              <p className="text-slate-600 leading-relaxed mt-3">
                Ces cookies techniques ne nécessitent pas de consentement conformément aux recommandations
                de la CNIL (article 82 de la loi Informatique et Libertés).
              </p>
            </section>

            {/* ─── 11. Mode auto-hébergé ──────────────────────── */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900">11. Mode auto-hébergé (on-premise)</h2>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 mt-3">
                <p className="text-slate-600 leading-relaxed">
                  Dans le <strong>mode auto-hébergé</strong>, ClearRecap est installé et exécuté intégralement
                  sur l'infrastructure du client. Dans cette configuration :
                </p>
                <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2 mt-3">
                  <li>ClearRecap <strong>ne collecte aucune donnée utilisateur</strong>.</li>
                  <li>Aucune donnée (audio, texte, compte) ne transite par les serveurs de ClearRecap.</li>
                  <li>Le client est <strong>seul responsable</strong> de la mise en place de sa propre politique
                    de confidentialité et de sa conformité RGPD.</li>
                  <li>ClearRecap fournit la documentation technique nécessaire pour faciliter la conformité.</li>
                </ul>
              </div>
            </section>

            {/* ─── 12. Modifications ──────────────────────────── */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900">12. Modifications de cette politique</h2>
              <p className="text-slate-600 leading-relaxed">
                ClearRecap se réserve le droit de modifier la présente politique de confidentialité.
                En cas de modification substantielle :
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-1 ml-2 mt-3">
                <li>Vous serez informé par <strong>e-mail</strong> ou par une <strong>bannière</strong> sur la plateforme.</li>
                <li>Les modifications prendront effet <strong>30 jours</strong> après notification.</li>
                <li>La date de dernière mise à jour sera mise à jour en haut de cette page.</li>
              </ul>
            </section>

            {/* ─── 13. Contact DPO ────────────────────────────── */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900">13. Contact — Délégué à la Protection des Données</h2>
              <p className="text-slate-600 leading-relaxed">
                Pour toute question relative à la protection de vos données personnelles ou pour exercer
                vos droits, vous pouvez nous contacter :
              </p>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 mt-3">
                <p className="text-slate-700">
                  <strong>ClearRecap — DPO</strong><br />
                  E-mail :{' '}
                  <a href="mailto:contact@clearrecap.fr" className="text-indigo-600 hover:text-indigo-800 underline">
                    contact@clearrecap.fr
                  </a>
                </p>
              </div>
            </section>

          </div>

          {/* ─── Footer links ────────────────────────────────── */}
          <div className="mt-16 pt-8 border-t border-slate-200 flex flex-wrap gap-6 text-sm text-slate-500">
            <Link to="/cgu" className="hover:text-indigo-600 transition-colors">
              Conditions Générales d'Utilisation
            </Link>
            <Link to="/securite-donnees" className="hover:text-indigo-600 transition-colors">
              Sécurité des données
            </Link>
            <Link to="/conformite" className="hover:text-indigo-600 transition-colors">
              Conformité & Certifications
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}
