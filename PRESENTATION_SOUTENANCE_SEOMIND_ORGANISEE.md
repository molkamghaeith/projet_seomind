# Presentation organisee de soutenance - SeoMind

## Plan general de la soutenance

**Duree conseillee :** 12 a 15 minutes  
**Objectif :** presenter clairement le besoin, la solution, la conception, la realisation, la demonstration et les perspectives.

La presentation est organisee en 6 parties :

1. Introduction et contexte
2. Analyse du besoin
3. Conception de la solution
4. Realisation technique
5. Demonstration et resultats
6. Limites, perspectives et conclusion

---

# Partie 1 - Introduction et contexte

## Slide 1 - Page de garde

**SeoMind**  
Dashboard SEO intelligent pour l'analyse et l'optimisation des sites web.

**Elements a afficher :**

- Nom du projet : SeoMind
- Sujet : Dashboard SEO intelligent
- Type : Application web full-stack
- Technologies principales : React, Django REST Framework, Google APIs, GitHub API, NLP

**Discours :**
Bonjour, je vais vous presenter SeoMind, une application web qui permet d'analyser la performance SEO d'un site, de generer des recommandations intelligentes et d'automatiser certaines corrections via GitHub.

---

## Slide 2 - Contexte general

Aujourd'hui, la visibilite d'un site web depend fortement du referencement naturel, aussi appele SEO.

Pour suivre cette visibilite, un utilisateur doit souvent consulter plusieurs sources :

- Google Analytics pour le trafic ;
- Google Search Console pour les clics, impressions, CTR et positions ;
- le contenu HTML du site ;
- le code source pour appliquer les corrections.

**Discours :**
Le SEO est un domaine important, mais les donnees sont souvent dispersees. L'utilisateur peut avoir beaucoup d'informations, sans forcement savoir quelle action prioriser.

---

## Slide 3 - Problematique

**Problematique principale :**

Comment centraliser les donnees SEO d'un site web, les analyser automatiquement et proposer des recommandations claires, priorisees et actionnables ?

**Sous-problemes :**

- recuperer des donnees fiables depuis Google ;
- analyser la structure et le contenu d'un site ;
- produire un score simple a comprendre ;
- generer des recommandations utiles ;
- faciliter le passage de la recommandation a la correction.

**Discours :**
Le probleme n'est pas seulement de collecter des donnees, mais de les transformer en decisions concretes.

---

## Slide 4 - Objectifs du projet

**Objectif principal :**

Developper une plateforme web permettant de suivre, analyser et ameliorer le SEO d'un site.

**Objectifs fonctionnels :**

- authentification utilisateur ;
- connexion a Google Analytics et Search Console ;
- ajout et gestion des sites web ;
- affichage d'un dashboard SEO ;
- calcul d'un score SEO ;
- generation de recommandations ;
- export des rapports ;
- integration GitHub pour appliquer certaines corrections.

**Objectifs techniques :**

- frontend moderne avec React ;
- backend REST avec Django ;
- securisation avec JWT ;
- integration d'APIs externes ;
- analyse HTML et NLP ;
- architecture modulaire.

---

# Partie 2 - Analyse du besoin

## Slide 5 - Acteurs du systeme

**Utilisateur standard :**

- cree un compte ;
- ajoute ses sites ;
- connecte Google ;
- consulte ses donnees SEO ;
- applique les recommandations.

**Administrateur :**

- consulte les utilisateurs ;
- active ou desactive des comptes ;
- gere certains elements d'administration.

**Services externes :**

- Google Analytics ;
- Google Search Console ;
- GitHub.

**Discours :**
Le systeme est centre sur l'utilisateur, mais il s'appuie sur plusieurs services externes pour obtenir les donnees et automatiser les actions.

---

## Slide 6 - Fonctionnalites principales

SeoMind propose les fonctionnalites suivantes :

1. Authentification et gestion du compte
2. Connexion Google OAuth
3. Gestion des sites web
4. Dashboard Analytics et SEO
5. Score SEO global et detaille
6. Recommandations intelligentes
7. Corrections automatiques simples
8. Export CSV et PDF
9. Connexion GitHub et Pull Request
10. Interface d'administration

**Discours :**
Ces fonctionnalites couvrent un parcours complet : l'utilisateur se connecte, ajoute un site, analyse les performances, recoit des recommandations et peut appliquer une correction.

---

## Slide 7 - Parcours utilisateur

**Parcours principal :**

1. Creation du compte ou connexion
2. Connexion Google
3. Selection d'une propriete Google Analytics
4. Ajout du site web
5. Consultation du dashboard
6. Analyse du score SEO
7. Consultation des recommandations
8. Generation d'une correction
9. Creation d'une Pull Request GitHub

**Discours :**
Ce parcours montre que le projet ne s'arrete pas a l'affichage des statistiques. Il accompagne l'utilisateur jusqu'a l'action technique.

---

# Partie 3 - Conception de la solution

## Slide 8 - Architecture globale

```txt
Utilisateur
   |
   v
Frontend React
   |
   v
API Django REST
   |
   +--> Base de donnees
   +--> Google Analytics API
   +--> Google Search Console API
   +--> Analyse HTML / NLP
   +--> GitHub API
```

**Principe de conception :**

Le frontend ne communique pas directement avec Google ou GitHub. Toutes les operations sensibles passent par le backend.

**Discours :**
Cette architecture separe l'interface utilisateur de la logique metier. Elle permet aussi de mieux controler les permissions et les tokens.

---

## Slide 9 - Architecture backend

Le backend est organise autour de deux applications principales :

**accounts**

- inscription ;
- connexion ;
- connexion Google ;
- profil utilisateur ;
- administration des utilisateurs ;
- stockage des tokens Google.

**analytics_app**

- gestion des sites ;
- donnees Google Analytics ;
- donnees Search Console ;
- score SEO ;
- recommandations ;
- analyse NLP ;
- exports ;
- integration GitHub.

**Discours :**
La separation en applications Django permet de distinguer la gestion des utilisateurs de la partie metier SEO.

---

## Slide 10 - Architecture frontend

Le frontend est construit avec React et Vite.

**Pages principales :**

- `Home`
- `Login`
- `Register`
- `Profile`
- `Dashboard`
- `AIRecommendations`
- `AdminDashboard`
- `GitHubConnected`

**Composants importants :**

- `Navbar`
- `ProtectedRoute`
- `PeriodSelector`
- `SEORecommendations`
- `GitHubPRPanel`

**Discours :**
Le frontend est organise par pages et composants reutilisables. Les routes protegees garantissent que certaines pages ne sont accessibles qu'aux utilisateurs connectes.

---

## Slide 11 - Modele de donnees

**Principales entites :**

- `User` : utilisateur Django ;
- `GoogleAnalyticsToken` : tokens Google de l'utilisateur ;
- `Website` : site web ajoute par l'utilisateur ;
- `Analysis` : historique d'analyse SEO ;
- `SEORecommendation` : recommandation generee ;
- `GitHubToken` : token GitHub de l'utilisateur.

**Relations importantes :**

- un utilisateur peut avoir plusieurs sites ;
- un site peut avoir plusieurs analyses ;
- un site peut avoir plusieurs recommandations ;
- un utilisateur peut avoir un token Google et un token GitHub.

**Discours :**
Le modele est construit autour du site web. Les analyses, scores et recommandations sont rattaches a ce site.

---

# Partie 4 - Realisation technique

## Slide 12 - Authentification et securite

SeoMind utilise JWT pour securiser les requetes.

**Fonctionnement :**

- l'utilisateur se connecte ;
- le backend retourne un token `access` et un token `refresh` ;
- le frontend ajoute le token dans chaque requete ;
- si le token expire, le frontend tente de le rafraichir ;
- les endpoints sensibles exigent un utilisateur authentifie.

**Mesures presentes :**

- routes protegees cote frontend ;
- permissions cote backend ;
- verification que les donnees appartiennent a l'utilisateur ;
- OAuth Google et GitHub.

---

## Slide 13 - Integration Google

Google est utilise pour recuperer :

**Depuis Google Analytics :**

- utilisateurs ;
- sessions ;
- pages vues ;
- trafic organique ;
- pages les plus consultees.

**Depuis Google Search Console :**

- clics ;
- impressions ;
- CTR ;
- position moyenne ;
- mots-cles.

**Discours :**
Ces donnees permettent de mesurer a la fois le trafic reel du site et sa visibilite dans les resultats Google.

---

## Slide 14 - Dashboard SEO

Le dashboard presente une vue synthetique de la performance du site.

**Elements affiches :**

- statistiques de trafic ;
- donnees SEO ;
- graphiques d'evolution ;
- mots-cles ;
- top pages ;
- score SEO ;
- choix de periode ;
- exports.

**Discours :**
Le dashboard donne une lecture rapide de l'etat du site. Il est pense pour aider l'utilisateur a comprendre la tendance generale et les points importants.

---

## Slide 15 - Score SEO

Le score SEO est compose de plusieurs sous-scores :

| Sous-score | Role |
| --- | --- |
| Technique | Verifie les balises, la structure, le mobile et la performance |
| Contenu | Analyse la richesse du contenu et les titres |
| Visibilite | Exploite les donnees Search Console |
| Trafic | Exploite les donnees Google Analytics |
| Global | Resume l'etat SEO general |

Chaque score est exprime sur 100.

**Discours :**
Le score global est utile pour une vision rapide, mais les sous-scores permettent surtout de comprendre l'origine des problemes.

---

## Slide 16 - Recommandations intelligentes

Les recommandations sont generees a partir :

- des donnees Google ;
- de l'analyse du HTML ;
- des balises SEO ;
- du contenu textuel ;
- de regles metier SEO ;
- d'une analyse NLP lorsque les dependances sont disponibles.

**Exemples de recommandations :**

- titre trop court ou manquant ;
- meta description absente ;
- images sans attribut `alt` ;
- contenu insuffisant ;
- faible CTR ;
- opportunites de mots-cles.

**Important :**
Dans l'etat actuel, il ne s'agit pas d'une IA generative complete. C'est une intelligence basee sur des regles SEO, des donnees et du NLP.

---

## Slide 17 - Analyse NLP

L'analyse NLP permet d'etudier le contenu textuel du site.

**Traitements effectues :**

- extraction du texte ;
- nettoyage ;
- lemmatisation ;
- suppression des stopwords ;
- extraction d'entites ;
- densite de mots-cles ;
- similarite semantique avec TF-IDF et cosine similarity.

**But :**

Verifier si le contenu du site est coherent avec les mots-cles et les opportunites SEO.

---

## Slide 18 - Integration GitHub

L'integration GitHub permet de passer d'une recommandation a une correction technique.

**Fonctionnement :**

1. Connexion GitHub via OAuth
2. Recuperation des depots
3. Selection d'un depot et d'une branche
4. Selection ou detection d'un fichier candidat
5. Generation d'une correction
6. Creation d'une nouvelle branche
7. Creation d'une Pull Request

**Discours :**
Cette fonctionnalite est un point fort du projet, car elle relie l'analyse SEO au processus de developpement.

---

# Partie 5 - Demonstration et resultats

## Slide 19 - Scenario de demonstration

**Demo conseillee :**

1. Ouvrir l'application
2. Se connecter
3. Aller au dashboard
4. Selectionner un site
5. Montrer les statistiques
6. Montrer le score SEO
7. Ouvrir la page recommandations IA
8. Generer une correction
9. Montrer la partie GitHub
10. Expliquer la creation de Pull Request

**Discours :**
La demonstration suit le parcours complet d'un utilisateur qui veut ameliorer le SEO de son site.

---

## Slide 20 - Apports du projet

**Apports fonctionnels :**

- centralisation des donnees SEO ;
- interpretation simple des indicateurs ;
- recommandations priorisees ;
- exports de rapports ;
- automatisation avec GitHub.

**Apports techniques :**

- API REST securisee ;
- integration de plusieurs APIs externes ;
- analyse HTML ;
- analyse NLP ;
- architecture modulaire ;
- interface utilisateur complete.

**Discours :**
Le projet montre comment combiner plusieurs briques techniques pour construire un outil utile et coherent.

---

# Partie 6 - Limites, perspectives et conclusion

## Slide 21 - Difficultes rencontrees

**Difficultes principales :**

- configuration des flux OAuth Google et GitHub ;
- gestion des tokens ;
- synchronisation entre frontend et backend ;
- donnees Google parfois absentes ou incompletes ;
- temps de traitement des analyses ;
- generation de corrections fiables ;
- creation automatique de Pull Request.

**Discours :**
La principale difficulte etait de faire fonctionner ensemble plusieurs services externes tout en gardant une experience utilisateur fluide.

---

## Slide 22 - Limites actuelles

**Limites du prototype :**

- certaines donnees Search Console peuvent etre simulees ;
- les corrections sont principalement basees sur des regles ;
- Hugging Face est optionnel ;
- SQLite est utilise en developpement ;
- certains tests automatiques doivent etre ajoutes ;
- les tokens OAuth devraient etre chiffres pour une version production ;
- le fichier `requirements.txt` doit etre complete avec toutes les dependances utilisees.

**Discours :**
Ces limites ne bloquent pas la demonstration du concept, mais elles doivent etre traitees pour une mise en production.

---

## Slide 23 - Perspectives

**Ameliorations possibles :**

- ajouter une IA generative pour produire des corrections plus contextuelles ;
- afficher un historique detaille des scores ;
- migrer vers PostgreSQL ;
- ajouter des tests backend et frontend ;
- mettre en place une pipeline CI/CD ;
- chiffrer les tokens OAuth ;
- ameliorer la page detaillee par site ;
- enrichir l'analyse NLP dans l'interface.

**Discours :**
Les perspectives montrent que SeoMind peut evoluer vers une plateforme SEO plus complete et plus proche d'un outil professionnel.

---

## Slide 24 - Conclusion

SeoMind est une application web full-stack qui permet de :

- centraliser les donnees SEO ;
- analyser la performance d'un site ;
- calculer un score SEO ;
- generer des recommandations intelligentes ;
- proposer des corrections ;
- automatiser certaines actions via GitHub.

**Conclusion orale :**
Pour conclure, SeoMind repond a une problematique concrete : transformer des donnees SEO complexes en actions simples et priorisees. Le projet combine developpement web, securite, APIs externes, analyse de donnees, NLP et automatisation technique.

---

# Questions possibles du jury

## Quelle est la difference entre Google Analytics et Search Console ?

Google Analytics mesure le comportement des visiteurs sur le site : utilisateurs, sessions et pages vues.  
Search Console mesure la visibilite du site dans Google : clics, impressions, CTR et position moyenne.

## Pourquoi avoir utilise Django REST Framework ?

Django REST Framework permet de construire rapidement une API REST structuree, securisee et connectee aux modeles Django.

## Pourquoi avoir utilise React ?

React facilite la creation d'une interface dynamique, adaptee a un dashboard avec graphiques, chargement de donnees et navigation entre pages.

## Est-ce que le projet utilise une vraie IA ?

Le projet utilise surtout des regles SEO, de l'analyse de donnees et du NLP. Hugging Face est present comme module optionnel. Il ne faut pas le presenter comme une IA generative complete.

## Comment fonctionne le score SEO ?

Le score est calcule a partir de plusieurs dimensions : technique, contenu, visibilite et trafic. Ces sous-scores sont combines pour obtenir un score global.

## Quel est le point fort du projet ?

Le point fort est le lien entre analyse SEO et automatisation GitHub. L'application ne se contente pas de recommander, elle peut aussi aider a appliquer une correction via Pull Request.

## Que faudrait-il faire pour passer en production ?

Il faudrait renforcer la securite des tokens, utiliser PostgreSQL, ajouter des tests, configurer HTTPS, completer les dependances et mettre en place une pipeline CI/CD.

