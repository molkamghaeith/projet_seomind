# Documentation complete du projet SEOmind

## 1. Presentation generale

SEOmind est une application web de dashboard SEO intelligent. Le projet aide un utilisateur a connecter son site web avec Google Analytics et Google Search Console, a consulter ses indicateurs SEO, a obtenir des recommandations automatiques, puis a appliquer certaines corrections via GitHub sous forme de Pull Request.

L'application est decoupee en deux parties principales :

- `seo_dashboard_backend` : API backend construite avec Django et Django REST Framework.
- `seo_dashboard_frontend` : interface utilisateur construite avec React et Vite.

Le but principal du projet est de transformer des donnees SEO parfois difficiles a lire en actions simples : analyser, comprendre, corriger et suivre l'evolution.

## 2. Objectifs fonctionnels

Le projet permet de :

- creer un compte utilisateur ;
- connecter un utilisateur avec email/mot de passe ou Google ;
- proteger les routes avec des tokens JWT ;
- activer ou desactiver des utilisateurs depuis une interface admin ;
- connecter Google Analytics et Google Search Console via OAuth ;
- lister les proprietes Google Analytics disponibles ;
- ajouter un site web lie a une propriete GA4 ;
- afficher les donnees de trafic du site ;
- afficher les mots-cles Search Console ;
- afficher les pages les plus consultees ;
- calculer un score SEO global et des sous-scores ;
- generer des recommandations SEO intelligentes ;
- proposer des corrections automatiques simples ;
- exporter les donnees en CSV et en PDF ;
- connecter GitHub ;
- creer une branche, modifier un fichier et ouvrir une Pull Request.

## 3. Architecture globale

Structure simplifiee du projet :

```txt
pfe/
  seo_dashboard_backend/
    manage.py
    config/
    accounts/
    analytics_app/

  seo_dashboard_frontend/
    index.html
    package.json
    src/
      App.jsx
      pages/
      components/
      services/
      context/

  PROJECT_EXPLICATION.md
  IA_RECOMMANDATIONS_EXPLICATION.md
  DOCUMENTATION_PROJET_SEOMIND.md
```

Schema logique :

```txt
Utilisateur
   |
   v
Frontend React
   |
   v
API Django REST
   |
   +--> Base de donnees SQLite
   +--> Google Analytics API
   +--> Google Search Console API
   +--> GitHub API
   +--> Analyse SEO locale
```

Le frontend ne parle pas directement a Google ou GitHub. Il appelle le backend, et le backend gere les tokens, les appels API externes et la logique metier.

## 4. Technologies utilisees

### Backend

Le backend utilise principalement :

- Python ;
- Django ;
- Django REST Framework ;
- Simple JWT pour l'authentification ;
- django-cors-headers pour autoriser le frontend ;
- SQLite en developpement ;
- Google OAuth et Google API Client ;
- GitHub REST API ;
- BeautifulSoup pour analyser le HTML des sites ;
- spaCy pour l'analyse NLP et la lemmatisation ;
- scikit-learn pour TF-IDF et la similarite cosinus ;
- Hugging Face Transformers pour une categorisation optionnelle des mots-cles ;
- Requests pour les appels HTTP ;
- Pandas pour les exports CSV ;
- ReportLab pour les exports PDF.

Fichier important :

```txt
seo_dashboard_backend/requirements.txt
```

Remarque : le code utilise aussi certaines dependances qui doivent etre presentes dans l'environnement Python, par exemple `djangorestframework-simplejwt`, `google-api-python-client`, `google-auth`, `pandas` et `reportlab`.

### Frontend

Le frontend utilise :

- React ;
- Vite ;
- React Router ;
- Axios ;
- Recharts ;
- react-hot-toast ;
- lucide-react ;
- react-icons.

Fichier important :

```txt
seo_dashboard_frontend/package.json
```

## 5. Configuration du backend

Le fichier principal de configuration est :

```txt
seo_dashboard_backend/config/settings.py
```

Il contient :

- la configuration Django ;
- la configuration JWT ;
- la configuration CORS ;
- les URLs du frontend ;
- les identifiants Google OAuth ;
- les identifiants GitHub OAuth ;
- la configuration email ;
- la base de donnees ;
- les applications installees.

Variables d'environnement importantes :

```env
SECRET_KEY=
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
FRONTEND_URL=http://localhost:5173

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_WEB_CLIENT_ID=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=

EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
```

La variable `FRONTEND_URL` est importante car elle est utilisee pour les redirections OAuth et les liens de reinitialisation de mot de passe.

## 6. Configuration du frontend

Le frontend utilise l'URL de l'API depuis :

```txt
seo_dashboard_frontend/src/services/api.js
```

Par defaut, l'API pointe vers :

```txt
http://127.0.0.1:8000/api
```

Variable d'environnement frontend utile :

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_GOOGLE_CLIENT_ID=
```

Le fichier `api.js` ajoute automatiquement le token JWT `access` dans les requetes. Si le backend retourne `401`, il essaye de rafraichir le token avec `refresh`.

## 7. Lancement du projet en local

### Backend

Depuis le dossier backend :

```bash
cd seo_dashboard_backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

URL backend :

```txt
http://127.0.0.1:8000
```

### Frontend

Depuis le dossier frontend :

```bash
cd seo_dashboard_frontend
npm install
npm run dev
```

URL frontend :

```txt
http://localhost:5173
```

## 8. Applications Django

### Application `accounts`

Cette application gere :

- inscription ;
- connexion ;
- connexion Google ;
- reinitialisation du mot de passe ;
- role utilisateur ;
- actions admin sur les utilisateurs.

Fichiers principaux :

```txt
seo_dashboard_backend/accounts/models.py
seo_dashboard_backend/accounts/serializers.py
seo_dashboard_backend/accounts/views.py
seo_dashboard_backend/accounts/urls.py
```

Modeles importants :

```txt
GoogleAnalyticsToken
Site
```

`GoogleAnalyticsToken` stocke les tokens Google associes a un utilisateur.

### Application `analytics_app`

Cette application contient le coeur metier SEO :

- gestion des sites web ;
- connexion Google Analytics ;
- lecture des donnees GA4 ;
- lecture des donnees Search Console ;
- simulation de donnees Search Console ;
- score SEO ;
- recommandations IA ;
- exports CSV/PDF ;
- integration GitHub.

Fichiers principaux :

```txt
seo_dashboard_backend/analytics_app/models.py
seo_dashboard_backend/analytics_app/views.py
seo_dashboard_backend/analytics_app/ga_utils.py
seo_dashboard_backend/analytics_app/smart_seo_agent.py
seo_dashboard_backend/analytics_app/seo_analyzer_advanced.py
seo_dashboard_backend/analytics_app/export_utils.py
seo_dashboard_backend/analytics_app/views_github.py
seo_dashboard_backend/analytics_app/urls.py
```

## 9. Modeles de donnees

### `Website`

Represente un site ajoute par un utilisateur.

Champs principaux :

- `user` : proprietaire du site ;
- `url` : URL du site ;
- `nom_site` : nom affiche ;
- `property_id` : identifiant de la propriete Google Analytics ;
- `property_name` : nom de la propriete Google Analytics ;
- `created_at` ;
- `updated_at`.

Ce modele est central : presque toutes les analyses SEO sont rattachees a un `Website`.

### `Analysis`

Represente une analyse SEO historisee.

Champs principaux :

- `website` ;
- `trafic` ;
- `clics` ;
- `impressions` ;
- `ctr` ;
- `position` ;
- `score_technique` ;
- `score_contenu` ;
- `score_visibilite` ;
- `score_trafic` ;
- `score_global` ;
- `resume` ;
- `date_analyse`.

Chaque appel a l'endpoint du score SEO peut creer une nouvelle entree d'historique.

### `SEORecommendation`

Represente une recommandation SEO.

Champs principaux :

- `website` ;
- `analysis` ;
- `title` ;
- `description` ;
- `category` ;
- `priority` ;
- `impact` ;
- `difficulty` ;
- `status` ;
- `suggested_fix` ;
- `is_read` ;
- `is_applied`.

Les recommandations peuvent etre classees par priorite, impact et difficulte.

### `GitHubToken`

Stocke le token GitHub d'un utilisateur.

Champs principaux :

- `user` ;
- `access_token` ;
- `github_username` ;
- `connected_at`.

## 10. Routes backend principales

Les routes globales sont declarees dans :

```txt
seo_dashboard_backend/config/urls.py
```

Base API :

```txt
/api/
```

### Authentification

```txt
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/google/
POST /api/token/refresh/
POST /api/auth/forgot-password/
POST /api/auth/reset-password-confirm/
GET  /api/auth/me/
```

### Administration

```txt
GET    /api/auth/admin/users/
POST   /api/auth/admin/users/create/
PUT    /api/auth/admin/users/<user_id>/update/
DELETE /api/auth/admin/users/<user_id>/delete/
GET    /api/auth/admin/stats/
```

### Sites

```txt
POST   /api/add-site/
GET    /api/sites/
DELETE /api/delete-site/<id>/
```

### Google Analytics et Search Console

```txt
GET  /api/google-analytics/login/
GET  /api/google-analytics/status/
GET  /api/google-analytics/callback/
GET  /api/google-analytics/properties/
GET  /api/google-analytics/data/<property_id>/
POST /api/google-analytics/verify-url/
GET  /api/search-console/data/
```

### SEO, recommandations et exports

```txt
GET  /api/recommendations/<website_id>/
GET  /api/seo-score/<website_id>/
GET  /api/analysis-history/<website_id>/
GET  /api/seo-opportunities/<website_id>/
POST /api/auto-fix/<website_id>/
GET  /api/export/seo-csv/<website_id>/
GET  /api/export/analytics-csv/<website_id>/
GET  /api/export/full-pdf/<website_id>/
GET  /api/analyze-seo/<website_id>/
GET  /api/semantic-analysis/<website_id>/
```

### GitHub

```txt
GET  /api/github/login/
GET  /api/github/callback/
GET  /api/github/repos/
GET  /api/github/branches/<owner>/<repo>/
GET  /api/github/candidate-files/<owner>/<repo>/
POST /api/github/file/
POST /api/github/preview-fix/
POST /api/github/create-branch-pr/
```

## 11. Flux utilisateur complet

Voici le scenario principal :

1. L'utilisateur cree un compte depuis `/register`.
2. Le backend cree le compte.
3. L'utilisateur se connecte depuis `/login`.
4. Le frontend stocke les tokens `access` et `refresh` dans `localStorage`.
5. L'utilisateur ouvre `/dashboard`.
6. Il connecte Google Analytics et Search Console.
7. Le backend lance le flux OAuth Google.
8. Google renvoie un `code` au backend.
9. Le backend echange le `code` contre des tokens Google.
10. Le backend sauvegarde les tokens dans `GoogleAnalyticsToken`.
11. L'utilisateur charge ses proprietes GA4.
12. Il ajoute un site avec URL, nom et propriete GA4.
13. Il selectionne le site dans le dashboard.
14. Le dashboard charge les donnees Analytics, Search Console, pages vues, trafic organique et score SEO.
15. L'utilisateur ouvre la page IA SEO.
16. Le frontend lit le site selectionne depuis `localStorage`.
17. Le backend genere les recommandations.
18. L'utilisateur peut demander une correction automatique.
19. Il peut connecter GitHub.
20. Il choisit un depot, une branche et un fichier.
21. Le backend cree une nouvelle branche, applique la correction et ouvre une Pull Request.

## 12. Fonctionnement du dashboard

Le dashboard est gere principalement par :

```txt
seo_dashboard_frontend/src/pages/Dashboard.jsx
```

Il affiche :

- la liste des sites de l'utilisateur ;
- l'etat de connexion Google ;
- les proprietes Google Analytics ;
- les donnees de trafic ;
- les mots-cles Search Console ;
- les pages les plus consultees ;
- le trafic organique ;
- le score SEO ;
- des actions prioritaires ;
- les boutons d'export CSV/PDF.

Le site selectionne est sauvegarde dans `localStorage` avec ces cles :

```txt
selected_dashboard_site_id
selected_dashboard_site_url
selected_dashboard_site_name
```

Ces cles permettent a la page IA SEO d'utiliser automatiquement le meme site.

## 13. Donnees Google Analytics

Les donnees GA4 sont recuperees via l'API `analyticsdata`.

Le backend recupere notamment :

- utilisateurs actifs ;
- sessions ;
- vues de pages ;
- pages les plus consultees ;
- trafic organique ;
- tendance de trafic.

Fichiers importants :

```txt
seo_dashboard_backend/analytics_app/views.py
seo_dashboard_backend/analytics_app/ga_utils.py
```

Fonctions utiles :

```txt
get_ga_data
fetch_top_pages
fetch_organic_traffic
fetch_traffic_trend
```

## 14. Donnees Search Console

Search Console permet d'obtenir les performances SEO dans Google :

- mots-cles ;
- clics ;
- impressions ;
- CTR ;
- position moyenne.

Le CTR signifie :

```txt
CTR = clics / impressions
```

Exemple :

```txt
10 clics / 200 impressions = 5%
```

La position moyenne indique la place moyenne du site dans les resultats Google. Plus la position est petite, meilleur est le resultat.

## 15. Simulation des donnees Search Console

Un site recent peut ne pas encore avoir de donnees dans Google Search Console. Pour eviter un dashboard vide, le backend genere des donnees simulees.

Fonction :

```txt
build_simulated_search_console_data(site_url)
```

Le systeme analyse le nom de domaine et essaye de detecter un secteur :

- fitness ;
- restaurant ;
- hotel ;
- ecommerce ;
- sante ;
- education ;
- immobilier ;
- agence digitale ;
- general.

Chaque mot-cle simule contient :

```txt
keyword
clicks
impressions
ctr
position
is_simulated
```

Point important : les donnees simulees doivent etre affichees comme simulees. Elles servent a demontrer le fonctionnement et a proposer une experience utile quand Google ne renvoie pas encore assez d'informations.

## 16. Score SEO

Le score SEO est calcule par :

```txt
GET /api/seo-score/<website_id>/
```

Fonction backend :

```txt
get_seo_score
```

Le score utilise `SmartSEOAgent`, qui analyse :

- le contenu de la page ;
- la structure HTML ;
- les balises SEO ;
- la performance ;
- les donnees Google Analytics ;
- les donnees Search Console.

Sous-scores retournes :

```txt
score_global
score_technique
score_contenu
score_visibilite
score_trafic
score_source
```

Interpretation simple :

- `score_technique` : qualite technique de la page, balises, viewport, canonical, schema, temps de chargement ;
- `score_contenu` : qualite du contenu, longueur, titres, structure, richesse textuelle ;
- `score_visibilite` : resultats Search Console, impressions, CTR, position ;
- `score_trafic` : resultats Analytics, utilisateurs, sessions, vues ;
- `score_global` : synthese generale.

Chaque score est donne sur 100.

## 17. Agent SEO intelligent

Le fichier principal est :

```txt
seo_dashboard_backend/analytics_app/smart_seo_agent.py
```

La classe importante est :

```txt
SmartSEOAgent
```

Elle peut :

- telecharger la page principale du site ;
- analyser le HTML avec BeautifulSoup ;
- extraire le texte propre ;
- faire une analyse NLP si spaCy et le modele `fr_core_news_sm` sont disponibles ;
- calculer une similarite semantique avec TF-IDF et cosine similarity ;
- detecter le secteur d'activite ;
- analyser les titres ;
- verifier la meta description ;
- compter les H1, H2, H3 ;
- detecter les images sans `alt` ;
- compter les liens internes et externes ;
- verifier certaines balises techniques ;
- analyser les donnees GA et GSC ;
- produire des scores ;
- generer des recommandations.

Le systeme contient aussi des benchmarks par secteur. Exemple : un site ecommerce, un blog ou un site de fitness ne sont pas notes exactement de la meme maniere.

## 18. NLP et analyse semantique

Oui, le backend contient bien une partie NLP. Elle n'est pas seulement dans le frontend et elle ne se limite pas aux donnees Google.

Fichiers concernes :

```txt
seo_dashboard_backend/analytics_app/nlp_analyzer.py
seo_dashboard_backend/analytics_app/smart_seo_agent.py
seo_dashboard_backend/analytics_app/huggingface_analyzer.py
seo_dashboard_backend/analytics_app/seo_analyzer_advanced.py
```

### `nlp_analyzer.py`

Ce fichier contient la classe :

```txt
SemanticAnalyzer
```

Elle utilise :

- spaCy avec le modele francais `fr_core_news_sm` ;
- scikit-learn avec `TfidfVectorizer` ;
- `cosine_similarity` pour mesurer la proximite semantique.

Elle permet de :

- recuperer le contenu texte d'une page ;
- nettoyer le texte ;
- lemmatiser les mots ;
- supprimer stopwords et ponctuation ;
- extraire des entites nommees ;
- calculer la densite de mots-cles ;
- comparer le contenu de la page avec des mots-cles cibles ;
- generer des recommandations semantiques.

Endpoint associe :

```txt
GET /api/semantic-analysis/<website_id>/
```

Fonction backend :

```txt
semantic_analysis
```

### NLP dans `SmartSEOAgent`

`SmartSEOAgent` integre aussi une analyse semantique. Si les librairies NLP sont installees, il charge :

```txt
spacy
TfidfVectorizer
cosine_similarity
```

Puis il analyse :

- la richesse semantique du contenu ;
- les entites presentes dans la page ;
- la correspondance entre les mots-cles Search Console et le contenu ;
- la pertinence semantique des top pages.

Important : quand le frontend appelle les recommandations avec :

```txt
GET /api/recommendations/<website_id>/?fast=1
```

le mode rapide peut eviter certaines analyses semantiques longues pour accelerer l'affichage.

### Hugging Face

Le backend contient aussi :

```txt
seo_dashboard_backend/analytics_app/huggingface_analyzer.py
```

Ce module peut utiliser un modele Hugging Face de zero-shot classification :

```txt
facebook/bart-large-mnli
```

Il sert a categoriser des mots-cles SEO, par exemple :

- local SEO ;
- content marketing ;
- technical SEO ;
- brand SEO ;
- informational query ;
- transactional query.

Cette partie est optionnelle et depend des dependances `transformers` et `huggingface_hub`, ainsi que d'un eventuel `HUGGINGFACE_TOKEN`.

## 19. Recommandations IA

Les recommandations sont appelees depuis :

```txt
GET /api/recommendations/<website_id>/?fast=1
```

Le parametre `fast=1` permet d'accelerer l'affichage en evitant certaines analyses plus longues.

Les recommandations peuvent concerner :

- les titres ;
- les meta descriptions ;
- la structure HTML ;
- le contenu ;
- la technique ;
- la performance ;
- le trafic ;
- les opportunites de mots-cles.

Chaque recommandation contient generalement :

```txt
title
message ou description
category
priority
impact
difficulty
```

Les recommandations sont triees par priorite :

```txt
high -> medium -> low
```

## 20. Generation de correction automatique

Endpoint :

```txt
POST /api/auto-fix/<website_id>/
```

Le frontend envoie une recommandation au backend. Le backend genere une correction simple selon le type de probleme.

Exemples de corrections possibles :

- nouveau `<title>` ;
- nouvelle `<meta name="description">` ;
- nouveau `<h1>` ;
- ajout d'un attribut `alt` sur une image ;
- bloc de contenu conseille ;
- snippet de liens internes ;
- recommandation de performance.

Important : dans l'etat actuel, la correction est surtout basee sur des regles, des templates et les analyses SEO/NLP internes. Ce n'est pas encore une IA generative externe complete comme un LLM qui reecrit tout le contenu de maniere contextuelle.

## 21. Integration GitHub

L'integration GitHub est geree par :

```txt
seo_dashboard_backend/analytics_app/views_github.py
seo_dashboard_frontend/src/components/SEORecommendations.jsx
```

Flux GitHub :

1. L'utilisateur clique sur connexion GitHub.
2. Le backend cree une URL OAuth GitHub.
3. GitHub renvoie un `code`.
4. Le backend echange le `code` contre un token.
5. Le token est stocke dans `GitHubToken`.
6. Le frontend charge les depots.
7. L'utilisateur choisit un depot.
8. Le frontend charge les branches.
9. L'utilisateur choisit une branche.
10. Le backend scanne les fichiers candidats.
11. L'utilisateur choisit un fichier.
12. Le backend applique la correction dans le contenu.
13. Le backend genere un diff.
14. Le backend cree une branche.
15. Le backend commit le fichier modifie.
16. Le backend ouvre une Pull Request.

Nom de branche genere :

```txt
seo-fix/<titre-recommandation>-YYYYMMDD-HHMMSS
```

Message de commit typique :

```txt
fix(seo): apply recommendation in <file>
```

La Pull Request contient :

- le type de correction ;
- la priorite ;
- le fichier modifie ;
- la recommandation ;
- un apercu du diff.

## 22. Exports CSV et PDF

Les exports sont geres par :

```txt
seo_dashboard_backend/analytics_app/export_utils.py
```

### Export SEO CSV

Endpoint :

```txt
GET /api/export/seo-csv/<website_id>/
```

Contenu :

- mot-cle ;
- clics ;
- impressions ;
- CTR ;
- position ;
- indication si la donnee est simulee.

Le separateur utilise est `;` pour une meilleure compatibilite avec Excel.

### Export Analytics CSV

Endpoint :

```txt
GET /api/export/analytics-csv/<website_id>/
```

Contenu :

- date ;
- utilisateurs ;
- sessions ;
- pages vues.

### Export PDF complet

Endpoint :

```txt
GET /api/export/full-pdf/<website_id>/
```

Le PDF contient un rapport plus presentable avec :

- resume Google Analytics ;
- resume Search Console ;
- total utilisateurs ;
- total sessions ;
- total pages vues ;
- total clics ;
- total impressions ;
- tableau de mots-cles.

## 23. Pages frontend

Les routes principales sont definies dans :

```txt
seo_dashboard_frontend/src/App.jsx
```

Pages importantes :

```txt
/                 -> Home
/login            -> Login
/register         -> Register
/forgot-password  -> ForgotPassword
/reset-password   -> ResetPassword
/dashboard        -> Dashboard protege
/ai-recommendations -> IA SEO protegee
/admin/users      -> AdminDashboard protege
/demo             -> Demo
```

### `Home.jsx`

Page d'accueil du projet.

### `Login.jsx`

Permet :

- connexion email/mot de passe ;
- connexion Google ;
- stockage des tokens JWT.

### `Register.jsx`

Permet de creer un compte.

### `Dashboard.jsx`

Page centrale du projet. Elle affiche les donnees SEO et Analytics.

### `AIRecommendations.jsx`

Page dediee aux recommandations IA, aux opportunites et au score SEO.

### `AdminDashboard.jsx`

Page admin pour gerer les utilisateurs.

### `SEORecommendations.jsx`

Composant qui :

- charge les recommandations ;
- genere une correction ;
- affiche la correction ;
- connecte GitHub ;
- permet de creer une Pull Request.

## 24. Gestion de l'authentification

Le backend utilise JWT.

Au login, le backend retourne :

```txt
access
refresh
```

Le frontend stocke ces tokens dans `localStorage`.

Chaque requete API ajoute :

```txt
Authorization: Bearer <access>
```

Si le token `access` expire, `api.js` tente de demander un nouveau token avec :

```txt
POST /api/token/refresh/
```

Si le refresh echoue, l'utilisateur est redirige vers `/login`.

## 25. Securite et points sensibles

Points deja presents :

- authentification JWT ;
- routes protegees cote frontend ;
- permissions `IsAuthenticated` cote backend ;
- verification que les sites appartiennent bien a l'utilisateur ;
- CORS limite a `FRONTEND_URL` ;
- OAuth Google et GitHub.

Points a ameliorer pour la production :

- chiffrer les tokens Google et GitHub en base ;
- mettre `DEBUG=False` ;
- utiliser une vraie base de donnees comme PostgreSQL ;
- configurer `ALLOWED_HOSTS` proprement ;
- utiliser HTTPS ;
- proteger les secrets dans un gestionnaire de secrets ;
- ajouter une politique de rotation ou suppression des tokens ;
- renforcer les scopes OAuth au strict necessaire.

## 26. Limites actuelles du projet

Le projet fonctionne comme prototype avance, mais certaines limites existent :

- certains tests automatiques ne sont pas encore ecrits ;
- Search Console peut retourner peu ou pas de donnees pour un site recent ;
- les donnees Search Console peuvent etre simulees ;
- les pages les plus consultees ne sont pas simulees ;
- le NLP depend de spaCy, scikit-learn et du modele `fr_core_news_sm` ;
- Hugging Face est present comme module optionnel, mais pas forcement active dans tous les flux ;
- la generation de correction repose surtout sur des regles ;
- SQLite est utilise en developpement ;
- les tokens OAuth sont stockes en base sans chiffrement applicatif ;
- certains textes source peuvent contenir des problemes d'encodage ;
- certaines dependances Python utilisees par le code doivent etre verifiees dans `requirements.txt`.

## 27. Tests et validation

Commandes utiles :

```bash
cd seo_dashboard_backend
python manage.py check
python manage.py test
```

```bash
cd seo_dashboard_frontend
npm run lint
npm run build
```

Ces commandes permettent de verifier :

- la configuration Django ;
- les tests backend ;
- la qualite du code frontend ;
- la compilation frontend.

## 28. Ameliorations recommandees

Ameliorations prioritaires :

- ajouter des tests backend pour auth, sites, Google, score et exports ;
- ajouter des tests frontend pour les pages principales ;
- chiffrer les tokens Google/GitHub ;
- centraliser la logique des scores et recommandations ;
- ajouter une page detaillee par site ;
- afficher l'historique des scores ;
- rendre plus visible le caractere simule des donnees Search Console ;
- ameliorer la gestion des erreurs dans le dashboard ;
- ajouter un vrai systeme de notifications pour chaque bloc ;
- mieux exposer les resultats NLP dans l'interface ;
- remplacer certaines corrections template par une vraie IA generative.

Ameliorations techniques :

- nettoyer l'encodage des fichiers ;
- verifier et completer `requirements.txt` ;
- migrer vers PostgreSQL pour la production ;
- ajouter une documentation `.env.example` ;
- ajouter un README racine ;
- ajouter une pipeline CI ;
- ajouter un formatteur comme Black pour Python et Prettier pour React.

## 29. Resume court pour presentation

SEOmind est une plateforme web d'analyse SEO qui connecte Google Analytics, Google Search Console et GitHub. L'utilisateur ajoute un site, consulte ses statistiques, recoit un score SEO, visualise des recommandations intelligentes basees sur des donnees SEO et des analyses NLP, genere des corrections et peut les appliquer directement dans son depot GitHub via Pull Request.

Le backend Django gere l'authentification, les integrations externes, les analyses SEO, l'analyse semantique NLP, les exports et la securite des donnees. Le frontend React fournit une interface claire pour consulter les donnees, choisir un site, suivre les scores et appliquer les recommandations.

Le projet reunit donc trois axes importants :

- analyse de donnees SEO ;
- aide a la decision par recommandations ;
- automatisation technique avec GitHub.

## 30. Resume ultra court

SEOmind est un dashboard SEO intelligent construit avec Django et React. Il analyse les donnees Google Analytics, Search Console et le contenu semantique du site avec du NLP, calcule un score SEO, genere des recommandations, propose des corrections et peut creer automatiquement une Pull Request GitHub pour appliquer certaines optimisations.
