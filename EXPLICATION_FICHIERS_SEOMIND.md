# Explication des fichiers du projet SeoMind

Ce document explique le role des principaux fichiers du projet.  
Il est organise par partie : racine, backend Django, frontend React.

---

# 1. Vue generale du projet

SeoMind est une application web full-stack composee de deux grandes parties :

- `seo_dashboard_backend` : le backend Django / Django REST Framework.
- `seo_dashboard_frontend` : le frontend React / Vite.

Le frontend affiche les pages et communique avec le backend via Axios.  
Le backend gere l'authentification, les sites, les donnees Google, les recommandations SEO, les exports et l'integration GitHub.

---

# 2. Fichiers a la racine

## `DOCUMENTATION_PROJET_SEOMIND.md`

Documentation principale du projet.  
Elle decrit les objectifs, l'architecture, les technologies, les endpoints, les fonctionnalites, les limites et les perspectives.

## `PRESENTATION_SOUTENANCE_SEOMIND.md`

Premiere version du contenu de presentation pour la soutenance.  
Elle contient les slides, les notes orales et des questions possibles du jury.

## `PRESENTATION_SOUTENANCE_SEOMIND_ORGANISEE.md`

Version plus organisee de la presentation.  
Elle est structuree en parties : introduction, besoin, conception, realisation, demonstration, limites et conclusion.

## `presentation-seomind.html`

Diaporama HTML de la premiere presentation.  
Il peut etre ouvert directement dans le navigateur.

## `presentation-seomind-organisee.html`

Diaporama HTML de la presentation organisee.  
C'est la version la plus adaptee pour une soutenance universitaire.

## `.gitignore`

Fichier qui indique a Git les fichiers ou dossiers a ignorer : environnements virtuels, fichiers temporaires, dependances, builds, etc.

---

# 3. Backend Django : `seo_dashboard_backend`

## `manage.py`

Point d'entree des commandes Django.  
Il sert a lancer le serveur, appliquer les migrations, creer un superutilisateur ou lancer les tests.

Exemples :

```bash
python manage.py runserver
python manage.py migrate
python manage.py test
```

## `requirements.txt`

Liste des dependances Python du backend.  
Il permet d'installer les bibliotheques necessaires avec :

```bash
pip install -r requirements.txt
```

Remarque : certaines dependances utilisees dans le code doivent etre verifiees ou ajoutees, comme `djangorestframework-simplejwt`, `google-api-python-client`, `pandas`, `reportlab`, `spacy` ou `scikit-learn`.

## `package-lock.json`

Fichier genere automatiquement par npm.  
Dans ce backend, il n'est pas central pour Django. Il peut provenir d'une installation npm effectuee par erreur ou pour un outil annexe.

---

# 4. Configuration Django : `seo_dashboard_backend/config`

## `config/settings.py`

Fichier de configuration principal de Django.

Il contient :

- la cle secrete ;
- le mode debug ;
- les applications installees ;
- la configuration CORS ;
- la configuration JWT ;
- la base de donnees SQLite ;
- les variables Google OAuth ;
- les variables GitHub OAuth ;
- la configuration email ;
- la langue et le fuseau horaire.

C'est un fichier tres important, car il controle le comportement global du backend.

## `config/urls.py`

Fichier des routes principales du backend.

Il relie :

- `/api/auth/` vers l'application `accounts` ;
- `/api/` vers l'application `analytics_app` ;
- `/api/token/refresh/` vers le refresh JWT ;
- `/admin/` vers l'administration Django.

## `config/asgi.py`

Point d'entree ASGI pour deployer Django avec des serveurs compatibles ASGI.  
Il est surtout utile en production ou pour les applications asynchrones.

## `config/wsgi.py`

Point d'entree WSGI pour deployer Django avec des serveurs classiques comme Gunicorn ou uWSGI.

## `config/__init__.py`

Fichier qui indique a Python que `config` est un package.

---

# 5. Application comptes : `seo_dashboard_backend/accounts`

Cette application gere les utilisateurs, l'authentification, Google login, le profil et l'administration.

## `accounts/models.py`

Contient les modeles lies aux comptes et aux acces Google.

Principaux modeles :

- `GoogleAnalyticsToken` : stocke les tokens Google de l'utilisateur ;
- `Site` : ancien modele de site rattache a un utilisateur ;
- `UserGAPropertyAccess` : stocke les proprietes Google Analytics accessibles par un utilisateur.

## `accounts/serializers.py`

Transforme les donnees Python/Django en JSON et inversement.  
Il sert notamment a valider les donnees d'inscription.

## `accounts/views.py`

Contient la logique des endpoints utilisateurs.

Il gere notamment :

- l'inscription ;
- la connexion classique ;
- la connexion Google ;
- la mise a jour du profil ;
- la recuperation du role utilisateur ;
- la reinitialisation du mot de passe ;
- l'administration des utilisateurs ;
- l'activation/desactivation des comptes ;
- la liste des proprietes Google pour l'administration.

## `accounts/urls.py`

Declare les routes de l'application `accounts`.

Exemples :

- `/api/auth/register/`
- `/api/auth/login/`
- `/api/auth/google/`
- `/api/auth/profile/update/`
- `/api/auth/admin/users/`

## `accounts/admin.py`

Permet d'enregistrer certains modeles dans l'administration Django.

## `accounts/apps.py`

Configuration de l'application Django `accounts`.

## `accounts/tests.py`

Fichier prevu pour les tests automatiques de l'application comptes.  
Il est actuellement peu utilise.

## `accounts/migrations/`

Dossier contenant l'historique des modifications de la base de donnees pour l'application `accounts`.

Les fichiers `0001_initial.py`, `0002_site.py`, `0003_usergapropertyaccess.py` sont generes par Django lorsque les modeles evoluent.

## `accounts/__init__.py`

Indique a Python que `accounts` est un package.

---

# 6. Application SEO et Analytics : `seo_dashboard_backend/analytics_app`

Cette application contient le coeur metier du projet SeoMind.

Elle gere :

- les sites web ;
- Google Analytics ;
- Search Console ;
- le score SEO ;
- les recommandations ;
- l'analyse NLP ;
- les exports ;
- GitHub.

## `analytics_app/models.py`

Definit les modeles principaux du coeur SEO.

Principaux modeles :

- `Website` : site web ajoute par un utilisateur ;
- `Analysis` : historique d'une analyse SEO ;
- `Recommendation` : ancien modele de recommandation ;
- `SEORecommendation` : recommandation SEO detaillee avec categorie, priorite, impact, difficulte et statut ;
- `GitHubToken` : token GitHub de l'utilisateur.

## `analytics_app/serializers.py`

Transforme les modeles `Website`, `Analysis` ou recommandations en donnees JSON pour l'API.  
Il permet aussi de valider les donnees envoyees depuis le frontend.

## `analytics_app/views.py`

Fichier principal de logique backend SEO.

Il gere notamment :

- ajout et liste des sites ;
- suppression d'un site ;
- connexion Google Analytics ;
- callback OAuth Google ;
- verification de l'etat de connexion Google ;
- liste des proprietes GA4 ;
- recuperation des donnees Google Analytics ;
- recuperation des donnees Search Console ;
- generation des recommandations SEO ;
- calcul du score SEO ;
- opportunites SEO ;
- analyse semantique ;
- exports CSV/PDF ;
- donnees top pages ;
- trafic organique ;
- reinitialisation du mot de passe cote analytics.

C'est l'un des fichiers les plus importants du backend.

## `analytics_app/urls.py`

Declare les routes du coeur SEO.

Exemples :

- `/api/sites/`
- `/api/add-site/`
- `/api/google-analytics/login/`
- `/api/search-console/data/`
- `/api/recommendations/<website_id>/`
- `/api/seo-score/<website_id>/`
- `/api/semantic-analysis/<website_id>/`
- `/api/export/full-pdf/<website_id>/`
- `/api/github/create-branch-pr/`

## `analytics_app/views_github.py`

Gere toute l'integration GitHub.

Il permet :

- de lancer OAuth GitHub ;
- de recevoir le callback GitHub ;
- de stocker le token GitHub ;
- de lister les depots ;
- de lister les branches ;
- de recuperer un fichier ;
- de proposer un fichier candidat ;
- de previsualiser une correction ;
- de creer une branche ;
- de modifier un fichier ;
- de creer une Pull Request.

C'est un point fort du projet, car il relie les recommandations SEO au code source.

## `analytics_app/smart_seo_agent.py`

Agent SEO intelligent principal.

Il analyse :

- la page web ;
- le HTML ;
- les balises SEO ;
- les titres ;
- les images ;
- les liens ;
- les donnees Google Analytics ;
- les donnees Search Console ;
- la richesse semantique si le NLP est disponible.

Il calcule aussi des scores et genere des recommandations.

## `analytics_app/seo_agent.py`

Ancien ou second agent SEO base sur des regles.  
Il analyse des problemes SEO et produit des recommandations.

Il est utile pour comprendre la logique metier SEO, meme si `smart_seo_agent.py` est plus central.

## `analytics_app/seo_analyzer_advanced.py`

Analyseur SEO technique plus detaille.

Il verifie :

- l'accessibilite du site ;
- les meta tags ;
- les titres ;
- les images sans `alt` ;
- la structure des URLs ;
- certains problemes techniques.

## `analytics_app/nlp_analyzer.py`

Module d'analyse semantique.

Il utilise :

- spaCy ;
- TF-IDF ;
- cosine similarity ;
- BeautifulSoup.

Il permet :

- d'extraire le texte d'une page ;
- de nettoyer le contenu ;
- de lemmatiser ;
- de mesurer la similarite entre le contenu et des mots-cles ;
- de generer des recommandations semantiques.

## `analytics_app/huggingface_analyzer.py`

Module optionnel utilisant Hugging Face.

Il peut classifier des mots-cles SEO en categories comme :

- local SEO ;
- technical SEO ;
- content marketing ;
- brand SEO ;
- informational query ;
- transactional query.

Important : cette partie est optionnelle et depend des dependances `transformers` et `huggingface_hub`.

## `analytics_app/ga_utils.py`

Fichier utilitaire pour Google Analytics.

Il contient des fonctions reutilisables pour :

- recuperer les credentials Google ;
- rafraichir les tokens ;
- recuperer les top pages ;
- recuperer le trafic organique ;
- recuperer les tendances de trafic.

## `analytics_app/export_utils.py`

Gere les exports.

Il permet de generer :

- des fichiers CSV ;
- des rapports PDF complets.

Il utilise notamment Pandas pour les CSV et ReportLab pour les PDF.

## `analytics_app/admin.py`

Permet d'enregistrer les modeles dans l'interface d'administration Django.

## `analytics_app/apps.py`

Configuration de l'application Django `analytics_app`.

## `analytics_app/tests.py`

Fichier prevu pour les tests automatiques de l'application SEO.  
Il peut etre complete pour tester les endpoints, les scores et les recommandations.

## `analytics_app/migrations/`

Dossier contenant l'historique des changements de base de donnees.

Exemples :

- creation du modele `Website` ;
- ajout des proprietes Google ;
- ajout des recommandations SEO ;
- ajout de l'historique d'analyse ;
- ajout du modele `GitHubToken`.

## `analytics_app/__init__.py`

Indique a Python que `analytics_app` est un package.

---

# 7. Frontend React : `seo_dashboard_frontend`

Le frontend est l'interface utilisateur de SeoMind.

Il est construit avec :

- React ;
- Vite ;
- React Router ;
- Axios ;
- Recharts ;
- lucide-react ;
- react-hot-toast.

## `package.json`

Declare le projet frontend, ses scripts et ses dependances.

Scripts importants :

- `npm run dev` : lance le serveur de developpement ;
- `npm run build` : compile le frontend ;
- `npm run lint` : verifie le code avec ESLint ;
- `npm run preview` : previsualise le build.

## `package-lock.json`

Fichier genere automatiquement par npm.  
Il verrouille les versions exactes des dependances installees.

## `vite.config.js`

Configuration de Vite.  
Il configure le plugin React et le comportement du serveur/build frontend.

## `index.html`

Page HTML de base de l'application React.  
React est injecte dans cette page via `src/main.jsx`.

## `eslint.config.js`

Configuration d'ESLint.  
Elle sert a detecter les erreurs et mauvaises pratiques dans le code frontend.

## `README.md`

Documentation frontend generee ou adaptee pour expliquer le lancement du frontend.

---

# 8. Frontend : fichiers principaux dans `src`

## `src/main.jsx`

Point d'entree React.  
Il monte l'application dans le DOM et charge `App.jsx`.

## `src/App.jsx`

Fichier central du routing frontend.

Il definit les routes :

- `/`
- `/login`
- `/register`
- `/dashboard`
- `/ai-recommendations`
- `/profile`
- `/admin`
- `/github-connected`

Il affiche aussi la navbar selon la page et configure les notifications.

## `src/App.css`

Styles generaux lies a l'application.

## `src/index.css`

Styles globaux charges au demarrage du frontend.

---

# 9. Frontend : services

## `src/services/api.js`

Service Axios principal.

Il configure :

- l'URL de base de l'API ;
- l'ajout automatique du token JWT ;
- le refresh automatique du token ;
- la redirection vers `/login` si la session expire.

C'est le pont principal entre React et Django.

## `src/services/githubApi.js`

Service dedie aux appels GitHub via le backend.

Il contient des fonctions pour :

- lancer la connexion GitHub ;
- recuperer les depots ;
- recuperer les branches ;
- recuperer un fichier ;
- creer une branche et une Pull Request ;
- deconnecter GitHub.

---

# 10. Frontend : contexte et theme

## `src/context/ThemeContext.jsx`

Fournit un contexte React pour gerer le theme de l'application.

## `src/context/themeContext.js`

Exporte le contexte de theme.

## `src/context/useTheme.js`

Hook personnalise pour utiliser facilement le theme dans les composants.

## `src/styles/theme.js`

Contient les couleurs, ombres, espacements et constantes de style reutilisables.

## `src/styles/global.css`

Styles globaux supplementaires.

---

# 11. Frontend : composants

## `src/components/Navbar.jsx`

Barre de navigation principale apres connexion.  
Elle permet de naviguer entre les pages importantes.

## `src/components/ProtectedRoute.jsx`

Composant qui protege certaines routes.  
Il verifie si l'utilisateur est connecte avant d'afficher la page.

## `src/components/PeriodSelector.jsx`

Composant de selection de periode.  
Il permet de choisir une periode pour les statistiques du dashboard.

## `src/components/SEORecommendations.jsx`

Composant central pour les recommandations SEO.

Il gere :

- le chargement des recommandations ;
- l'affichage des priorites ;
- la generation de corrections ;
- la partie GitHub ;
- la creation de Pull Request.

## `src/components/GitHubPRPanel.jsx`

Composant lie a l'interface GitHub / Pull Request.  
Il aide a afficher ou organiser les actions liees a GitHub.

---

# 12. Frontend : pages

## `src/pages/Home.jsx`

Page d'accueil de l'application.

## `src/pages/Login.jsx`

Page de connexion.

Elle gere :

- connexion email/mot de passe ;
- connexion Google ;
- stockage des tokens JWT ;
- redirection apres connexion.

## `src/pages/Register.jsx`

Page d'inscription.

Elle permet a l'utilisateur de creer un compte, souvent en attente d'activation par l'administrateur.

## `src/pages/ForgotPassword.jsx`

Page de demande de reinitialisation de mot de passe.

## `src/pages/ResetPassword.jsx`

Page qui permet de definir un nouveau mot de passe apres reception du lien de reinitialisation.

## `src/pages/Profile.jsx`

Page profil utilisateur.

Elle permet notamment :

- de voir/modifier certaines informations du profil ;
- de se deconnecter ;
- de nettoyer les informations de session ;
- de deconnecter GitHub.

## `src/pages/Dashboard.jsx`

Page principale de suivi SEO et analytics.

Elle gere :

- la liste des sites ;
- l'ajout de site ;
- la connexion Google ;
- la selection d'une propriete GA4 ;
- les donnees Analytics ;
- les donnees Search Console ;
- les graphiques ;
- le score SEO ;
- les exports ;
- les top pages ;
- le trafic organique.

C'est l'une des pages les plus importantes du projet.

## `src/pages/SiteAnalysisLoading.jsx`

Page de chargement apres ajout ou verification d'un site.

Elle sert a :

- verifier le site ;
- associer la propriete Google ;
- preparer les donnees avant redirection vers le dashboard.

## `src/pages/AIRecommendations.jsx`

Page dediee aux recommandations SEO.

Elle affiche :

- le site selectionne ;
- les opportunites SEO ;
- les scores ;
- le composant `SEORecommendations`.

## `src/pages/AdminDashboard.jsx`

Page d'administration.

Elle permet a l'administrateur de :

- voir les utilisateurs ;
- creer des utilisateurs ;
- activer/desactiver un compte ;
- modifier ou supprimer un utilisateur ;
- consulter des statistiques admin.

## `src/pages/GitHubConnected.jsx`

Page de retour apres connexion GitHub.  
Elle sert a informer l'application que GitHub est connecte, puis a revenir vers la page des recommandations.

## `src/pages/Demo.jsx`

Page de demonstration.  
Elle peut servir a montrer l'interface ou certaines fonctionnalites sans suivre le parcours complet.

---

# 13. Frontend : assets et public

## `src/assets/seo.png`

Image liee au SEO, utilisee dans l'interface ou les supports.

## `src/assets/home.png`

Image pour la page d'accueil ou les supports visuels.

## `src/assets/hero.png`

Image principale de presentation / hero.

## `src/assets/login.png`

Image utilisee pour la page de connexion ou la presentation.

## `src/assets/dashboard.png`

Capture ou illustration du dashboard.

## `src/assets/analytics.png`

Image liee aux analytics.

## `src/assets/react.svg`

Logo React.

## `src/assets/vite.svg`

Logo Vite.

## `public/favicon.svg`

Icone affichee dans l'onglet du navigateur.

## `public/icons.svg`

Fichier SVG contenant des icones publiques.

---

# 14. Ce qu'il faut savoir expliquer en soutenance

## Si le jury demande : "Comment fonctionne votre projet ?"

Reponse simple :

SeoMind est compose d'un frontend React et d'un backend Django REST. L'utilisateur se connecte, ajoute un site et connecte Google. Le backend recupere les donnees Google Analytics et Search Console, analyse le site, calcule un score SEO et genere des recommandations. L'utilisateur peut ensuite exporter les resultats ou appliquer certaines corrections via GitHub.

## Si le jury demande : "Quel fichier est le plus important cote frontend ?"

Reponse :

`App.jsx` pour les routes, `api.js` pour la communication avec le backend, `Dashboard.jsx` pour le tableau de bord, et `AIRecommendations.jsx` avec `SEORecommendations.jsx` pour la partie recommandations.

## Si le jury demande : "Quel fichier est le plus important cote backend ?"

Reponse :

`views.py` contient la logique principale SEO et Google, `views_github.py` gere GitHub, `smart_seo_agent.py` calcule les analyses et recommandations, et `models.py` definit les donnees.

## Si le jury demande : "Ou est l'IA ?"

Reponse :

L'intelligence du projet se trouve dans l'analyse SEO, les regles de recommandation et l'analyse NLP. Les fichiers importants sont `smart_seo_agent.py`, `nlp_analyzer.py` et, optionnellement, `huggingface_analyzer.py`.

## Si le jury demande : "Comment le frontend communique avec le backend ?"

Reponse :

Le frontend utilise Axios dans `src/services/api.js`. Chaque requete est envoyee vers l'API Django REST, avec un token JWT dans le header `Authorization`.

