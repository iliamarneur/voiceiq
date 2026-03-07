"""Golden test transcripts for each profile scenario."""

# ── Generic ────────────────────────────────────────────────

GENERIC_PODCAST_FR = """
Bonjour et bienvenue dans ce podcast. Aujourd'hui nous recevons Marie Dupont, experte en intelligence artificielle.
Marie, pouvez-vous nous expliquer les dernieres avancees en IA generative ?
Bien sur. L'IA generative a fait des progres considerables ces deux dernieres annees. Les modeles de langage comme GPT-4
et Claude sont capables de generer du texte, du code, et meme des images avec une qualite remarquable.
Le point cle, c'est que ces modeles apprennent a partir de grandes quantites de donnees textuelles.
Ils utilisent une architecture appelee Transformer, inventee par Google en 2017.
Et quels sont les risques associes ?
Les risques principaux sont la desinformation, les biais dans les donnees d'entrainement,
et l'impact sur certains emplois. Il faut mettre en place des garde-fous ethiques.
En conclusion, l'IA generative est un outil puissant qui necessite une utilisation responsable.
Merci Marie pour cet eclairage. A la prochaine !
"""

GENERIC_SHORT_NOTE = """
Note rapide : penser a acheter du lait et du pain. Rappeler le dentiste pour le rendez-vous de mardi.
Verifier les emails importants avant 17h.
"""

# ── Business ───────────────────────────────────────────────

BUSINESS_WEEKLY_MEETING = """
Reunion hebdomadaire equipe produit - Lundi 3 mars 2025
Participants : Jean Martin (PM), Sophie Leclerc (Dev Lead), Pierre Durand (UX), Alice Moreau (QA)

Jean : Bonjour a tous. On commence par le point sur le sprint en cours. Sophie, ou en est-on ?
Sophie : On a termine 8 tickets sur 12. Il reste le module de paiement et les tests d'integration.
Le blocage principal c'est l'API de Stripe qui a change son format de webhook. Pierre doit revoir le design du checkout.
Pierre : Oui, j'ai un prototype pret. Je peux le montrer cette semaine. Le probleme c'est le delai de validation cote juridique.
Alice : Cote QA, j'ai trouve 3 bugs critiques sur le module de facturation. Bug numero 1 : le montant TTC est mal calcule
quand il y a une remise superieure a 50%. Bug 2 : le PDF de facture ne se genere pas pour les clients hors UE.
Bug 3 : timeout sur la page de paiement apres 30 secondes.
Jean : OK, ces bugs sont priorite P0. Sophie, tu peux assigner ca a ton equipe ?
Sophie : Oui. Je mets Thomas sur le calcul TTC, deadline mercredi. Le PDF, c'est Julien, deadline jeudi.
Le timeout, je le prends moi-meme, je vise demain.
Jean : Parfait. Niveau KPIs, on est a 15000 euros de MRR, objectif 20000 fin mars. Le taux de churn est a 4.2%,
en baisse par rapport aux 5.1% du mois dernier. Le NPS est a 42, stable.
Pierre : J'ai une question : est-ce qu'on lance la feature de multi-devises ce mois-ci ou on reporte ?
Jean : On reporte a avril. Decision prise : on se concentre sur la stabilite ce mois-ci.
Prochaine reunion lundi prochain, meme heure. Bonne semaine a tous.
"""

BUSINESS_CLIENT_CALL = """
Appel client - Compte Enterprise ACME Corp
Participants : Marc Leblanc (Account Manager), Sarah Johnson (CTO ACME)

Marc : Bonjour Sarah, merci de prendre le temps pour cet appel. Comment allez-vous ?
Sarah : Bien merci Marc. Je voulais discuter de plusieurs points. D'abord, la migration vers votre nouvelle API v3.
On a 200 endpoints a migrer et mon equipe estime 6 semaines de travail.
Marc : Compris. On peut mettre a disposition un ingenieur solution pour vous accompagner pendant 2 semaines.
Sarah : Ce serait parfait. Deuxieme point : on a besoin d'un SLA a 99.95% au lieu de 99.9% actuel.
Notre contrat arrive a renouvellement en juin et c'est une condition sine qua non.
Marc : Je vais en discuter avec notre directeur technique. Je vous reviens avec une proposition d'ici vendredi.
Sarah : Dernier point, le prix. On paye actuellement 8000 euros par mois. Avec l'augmentation des usages,
on aimerait un tarif degressif. On consomme 500000 appels API par mois.
Marc : Je comprends. Je prepare une proposition commerciale avec un palier a 300000 et un palier a 500000.
Engagement : je vous envoie tout ca par email avant vendredi 17h.
Sarah : Parfait. Merci Marc.
"""

# ── Education ──────────────────────────────────────────────

EDUCATION_LECTURE = """
Cours d'introduction a la biologie moleculaire - Licence 2 - Professeur Martin
Chapitre 3 : La replication de l'ADN

Aujourd'hui nous allons etudier le mecanisme de replication de l'ADN. C'est un processus fondamental
pour la division cellulaire. Prerequis : vous devez connaitre la structure de la double helice d'ADN
vue au chapitre 2.

Premier concept cle : la replication est semi-conservative. Cela signifie que chaque brin de la molecule
mere sert de matrice pour synthetiser un nouveau brin. L'experience de Meselson et Stahl en 1958
a demontre ce mecanisme grace a l'utilisation d'azote lourd N15.

L'enzyme principale est l'ADN polymerase III. Elle synthetise le nouveau brin dans le sens 5' vers 3'.
Attention, c'est un piege classique a l'examen : la polymerase ne peut PAS synthetiser dans le sens 3' vers 5'.
Elle a besoin d'une amorce ARN, synthetisee par la primase.

Sur le brin directeur, la synthese est continue. Sur le brin retarde, elle est discontinue,
produisant des fragments d'Okazaki d'environ 1000 a 2000 nucleotides.
La ligase assemble ensuite ces fragments.

Autres enzymes importantes : l'helicase deroule la double helice, la topoisomerase relache les tensions
en aval de la fourche de replication, et les proteines SSB stabilisent les brins simples.

Pour le partiel, retenez : semi-conservative, 5' vers 3', fragments d'Okazaki, et les 5 enzymes principales.
Exercice : dessinez une fourche de replication avec les enzymes et les brins.
"""

EDUCATION_TUTORIAL = """
Tutoriel Python : les decorateurs
Niveau intermediaire - Duree 15 minutes

Un decorateur en Python est une fonction qui prend une autre fonction en argument et etend son comportement
sans la modifier directement. C'est un exemple du design pattern Decorator.

Syntaxe de base : on utilise le symbole arobase suivi du nom du decorateur, place juste au-dessus
de la definition de la fonction.

Exemple simple : un decorateur de logging.
def mon_decorateur(func):
    def wrapper(*args, **kwargs):
        print(f"Appel de {func.__name__}")
        resultat = func(*args, **kwargs)
        print(f"Fin de {func.__name__}")
        return resultat
    return wrapper

Application courante : mesurer le temps d'execution, verifier les permissions,
mettre en cache les resultats avec functools.lru_cache.

Exercice 1 : creez un decorateur qui compte le nombre d'appels d'une fonction.
Exercice 2 : creez un decorateur avec argument qui limite le nombre d'appels.
Exercice 3 : utilisez functools.wraps pour preserver les metadonnees de la fonction decoree.
"""

# ── Medical ────────────────────────────────────────────────

MEDICAL_CONSULTATION = """
Consultation de medecine generale - Dr Martin
Patient : homme, 45 ans, cadre superieur

Motif de consultation : douleurs thoraciques intermittentes depuis 3 jours.

Anamnese : le patient rapporte des douleurs retrosternales oppressives survenant a l'effort,
irradiant vers le bras gauche. Duree 5 a 10 minutes, cedant au repos.
Pas de dyspnee associee. Pas de syncope. Pas de palpitations.
Antecedents : hypertension arterielle traitee par amlodipine 5mg, diabete de type 2 sous metformine 1000mg x2.
Tabagisme actif 20 paquets-annees. Pere decede d'un infarctus a 55 ans.
Allergie connue : penicilline (urticaire).

Examen clinique : PA 155/95 mmHg, FC 82/min, SpO2 98%. IMC 28.
Auscultation cardiaque : bruits reguliers, pas de souffle. Auscultation pulmonaire : claire.
ECG 12 derivations : rythme sinusal, pas de sus-decalage ST, ondes T negatives en V4-V5.

Assessment : suspicion de syndrome coronarien chronique. Facteurs de risque multiples :
HTA, diabete, tabac, heredite. Diagnostics differentiels : RGO, douleur parietal, anxiete.

Plan :
- Immediat : troponine en urgence, bilan lipidique complet
- Court terme : test d'effort ou coronarographie selon resultats, consultation cardiologie sous 48h
- Long terme : sevrage tabagique, reequilibrage diabete, objectif PA < 130/80
- Prescriptions : aspirine 75mg 1x/jour, trinitrine sublinguale en cas de douleur, arret tabac
- Reconsulter en urgence si douleur persistante > 15 minutes ou dyspnee aigue

Signes negatifs pertinents : pas de fievre, pas de frottement pericardique, pas d'asymetrie tensionnelle.
"""

MEDICAL_STAFF = """
Staff du matin - Service de cardiologie - 7h30
Presentes : Dr Dupont (chef de service), Dr Moreau, Dr Petit, IDE Mme Laurent

Dr Dupont : On commence par le patient chambre 12, Monsieur B., 67 ans, admis hier pour OAP.
Dr Moreau : Evolution favorable sous furosemide IV 80mg. Diurese 2400ml sur 24h.
BNP en baisse a 1200, etait a 3500 a l'admission. Sat 96% sous 2L. On peut passer au furosemide per os.
Dr Dupont : D'accord. Prevoyez une echo de controle demain. Points de vigilance : surveiller la kaliemie,
elle etait a 3.2 hier. Ajouter une supplementation potassium.
IDE Laurent : Le patient se plaint de vertiges au lever. Hypotension orthostatique probable.

Dr Dupont : Chambre 15, Madame C., 72 ans, J2 post-TAVI. Pas de complication.
Dr Petit : Pace-maker temporaire encore en place, pas de BAV. On peut retirer demain si le rythme reste stable.
Controle echo satisfaisant, gradient moyen a 8 mmHg. Pas de fuite peri-prothetique significative.
Dr Dupont : Bien. Anticoagulation par heparine, relais AVK a debuter aujourd'hui. INR cible 2-3.
Red flag : si BAV de haut degre, appeler le rythmologue immediatement.
"""

# ── Legal ──────────────────────────────────────────────────

LEGAL_CONTRACT_NEGOTIATION = """
Reunion de negociation contractuelle - Contrat de prestation SaaS
Participants : Me Duval (avocat Fournisseur), Me Garcia (avocat Client), M. Blanc (DG Fournisseur),
Mme Vert (DAF Client)

Me Duval : Nous proposons un contrat de 36 mois avec un engagement minimum de 50000 euros par an.
La clause de resiliation prevoit un preavis de 6 mois et des penalites de 30% du montant restant du.

Me Garcia : 30% de penalites est excessif. La jurisprudence recente, notamment l'arret de la Cour de cassation
du 10 janvier 2024, numero 22-15.789, tend a reduire les clauses penales disproportionnees.
Nous proposons 10% maximum.

Mme Vert : De plus, nous voulons une clause d'audit annuel sur les niveaux de service. Article L441-3 du Code de commerce.
En cas de non-respect du SLA pendant 3 mois consecutifs, nous voulons pouvoir resilier sans penalite.

Me Duval : Nous acceptons l'audit annuel. Pour les penalites, nous proposons un compromis a 20%.
Sur la resiliation pour SLA, nous proposons une periode de 6 mois de non-conformite, pas 3.

M. Blanc : Concernant la propriete intellectuelle, tous les developpements specifiques realises pour le client
restent notre propriete. Le client a une licence d'utilisation non-exclusive.

Me Garcia : Inacceptable. Les developpements finances a 100% par notre client doivent lui appartenir.
Article L111-1 du Code de la propriete intellectuelle. Nous proposons une cession des droits
pour les developpements specifiques, et une licence pour le socle commun.

Echeances a retenir :
- 15 mars : retour de Me Duval sur les clauses de PI modifiees
- 30 mars : version finale du contrat
- 15 avril : signature prevue
- 1er mai : debut de la prestation

Obligations du fournisseur : livraison de la plateforme, SLA 99.9%, support 24/7, formation initiale.
Obligations du client : paiement trimestriel, designation d'un chef de projet, fourniture des donnees.
"""

LEGAL_HEARING = """
Audience du tribunal de commerce - Affaire SARL TechPro contre SAS DataFlow
Objet : rupture abusive de contrat commercial

Me Martin pour TechPro : Mon client a subi un prejudice de 280000 euros suite a la rupture brutale
des relations commerciales etablies par DataFlow. Article L442-1 du Code de commerce.
La relation durait depuis 8 ans, le preavis donne etait de seulement 2 mois,
ce qui est manifestement insuffisant au regard de la duree de la relation.

Me Leroy pour DataFlow : Nous contestons le caractere brutal de la rupture. Notre client a donne
un preavis de 2 mois, ce qui est conforme aux usages du secteur. De plus, TechPro n'etait pas
en situation de dependance economique, leur chiffre d'affaires avec DataFlow ne representait que 15%
de leur CA total.

Le tribunal note que la jurisprudence de la Cour d'appel de Paris, arret du 5 septembre 2023,
numero 22/04567, retient qu'un preavis de 1 mois par annee de relation est raisonnable.
Pour 8 ans de relation, 8 mois de preavis auraient ete adequats.

Me Martin : Nous demandons 280000 euros de dommages-interets correspondant a la marge brute
sur 6 mois de preavis manquant, plus 20000 euros au titre de l'article 700 du CPC.

Decision mise en delibere au 15 avril 2025.
"""

# ── Mapping profil → transcripts ──────────────────────────

GOLDEN_TRANSCRIPTS = {
    "generic": {
        "podcast_fr": GENERIC_PODCAST_FR,
        "short_note": GENERIC_SHORT_NOTE,
    },
    "business": {
        "weekly_meeting": BUSINESS_WEEKLY_MEETING,
        "client_call": BUSINESS_CLIENT_CALL,
    },
    "education": {
        "lecture": EDUCATION_LECTURE,
        "tutorial": EDUCATION_TUTORIAL,
    },
    "medical": {
        "consultation": MEDICAL_CONSULTATION,
        "staff": MEDICAL_STAFF,
    },
    "legal": {
        "contract_negotiation": LEGAL_CONTRACT_NEGOTIATION,
        "hearing": LEGAL_HEARING,
    },
}
