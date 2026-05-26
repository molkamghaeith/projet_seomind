# Presentation de soutenance - SeoMind

## Informations generales

**Titre du projet :** SeoMind - Dashboard SEO intelligent avec recommandations IA  
**Type :** Application web full-stack  
**Technologies principales :** React, Vite, Django, Django REST Framework, JWT, Google Analytics, Google Search Console, GitHub API, NLP  
**Objectif :** Transformer les donnees SEO en recommandations actionnables, puis automatiser certaines corrections.

---

## Slide 1 - Page de garde

**SeoMind**  
Dashboard SEO intelligent pour l'analyse, la recommandation et l'automatisation des optimisations SEO.

**A presenter oralement :**
Bonjour, je vais vous presenter SeoMind, une application web qui aide les utilisateurs a analyser la performance SEO de leurs sites, comprendre les problemes prioritaires et appliquer certaines corrections plus facilement.

---

## Slide 2 - Contexte et problematique

Le SEO est essentiel pour la visibilite d'un site web, mais les donnees sont souvent dispersees entre plusieurs outils :

- Google Analytics pour le trafic ;
- Google Search Console pour les clics, impressions, CTR et positions ;
- analyse technique du site ;
- code source du projet pour appliquer les corrections.

**Problematique :**  
Comment centraliser les donnees SEO, les rendre comprehensibles et proposer des actions concretes pour ameliorer un site web ?

**A presenter oralement :**
Le probleme principal n'est pas seulement d'avoir des donnees. Le vrai besoin est de transformer ces donnees en decisions simples : quoi corriger, pourquoi, avec quelle priorite et comment l'appliquer.

---

## Slide 3 - Solution proposee

SeoMind est une plateforme web qui permet de :

- creer un compte et se connecter de facon securisee ;
- connecter Google Analytics et Search Console ;
- ajouter et suivre plusieurs sites web ;
- consulter les statistiques SEO et trafic ;
- calculer un score SEO global et des sous-scores ;
- generer des recommandations intelligentes ;
- proposer des corrections automatiques ;
- creer une Pull Request GitHub pour appliquer certaines optimisations.

**A presenter oralement :**
L'idee est d'offrir une experience complete : analyse, interpretation, recommandation et passage a l'action.

---

## Slide 4 - Objectifs du projet

**Objectifs fonctionnels :**

- authentification utilisateur ;
- gestion des sites web ;
- integration Google OAuth ;
- dashboard analytics ;
- score SEO ;
- recommandations IA ;
- exports CSV/PDF ;
- integration GitHub.

**Objectifs techniques :**

- architecture full-stack separee ;
- API REST securisee ;
- interface moderne et responsive ;
- traitement de donnees SEO ;
- analyse NLP du contenu ;
- automatisation par API externe.

**A presenter oralement :**
Le projet combine plusieurs dimensions : developpement web, securite, integration d'API, analyse de donnees et automatisation.

---

## Slide 5 - Architecture generale

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
   +--> Analyse SEO locale et NLP
```

**Principe important :**
Le frontend ne communique pas directement avec Google ou GitHub. Le backend centralise les appels externes, les tokens, les permissions et la logique metier.

**A presenter oralement :**
Cette separation permet d'avoir une interface claire cote utilisateur et une couche backend responsable de la securite, des traitements et des integrations.

---

## Slide 6 - Technologies utilisees

**Frontend :**

- React ;
- Vite ;
- React Router ;
- Axios ;
- Recharts ;
- lucide-react ;
- react-hot-toast.

**Backend :**

- Python ;
- Django ;
- Django REST Framework ;
- JWT ;
- BeautifulSoup ;
- spaCy et scikit-learn pour le NLP ;
- APIs Google ;
- GitHub REST API ;
- ReportLab et Pandas pour les exports.

**A presenter oralement :**
React permet de construire une interface dynamique. Django REST Framework fournit une API robuste. Les bibliotheques d'analyse permettent d'aller au-dela de l'affichage simple des donnees.

---

## Slide 7 - Authentification et securite

SeoMind utilise une authentification basee sur JWT :

- login avec email/mot de passe ;
- stockage des tokens `access` et `refresh` ;
- ajout automatique du token dans les requetes API ;
- rafraichissement du token si necessaire ;
- routes protegees cote frontend ;
- permissions cote backend ;
- verification que chaque site appartient bien a l'utilisateur.

**A presenter oralement :**
La securite est importante car l'application manipule des donnees de sites, des tokens OAuth et des actions GitHub. Le backend reste donc le point de controle principal.

---

## Slide 8 - Dashboard SEO

Le dashboard permet de visualiser :

- les utilisateurs, sessions et pages vues ;
- le trafic organique ;
- les donnees Search Console ;
- les mots-cles ;
- les pages les plus consultees ;
- le score SEO ;
- des graphiques d'evolution ;
- l'export CSV et PDF.

**A presenter oralement :**
Cette page est le centre de l'application. Elle donne une vision rapide de la performance du site et permet de detecter les tendances importantes.

---

## Slide 9 - Calcul du score SEO

Le score SEO est calcule sur plusieurs dimensions :

- **Technique :** balises, viewport, canonical, structure HTML, performance ;
- **Contenu :** longueur, richesse textuelle, titres, structure ;
- **Visibilite :** impressions, CTR, position moyenne ;
- **Trafic :** utilisateurs, sessions, vues ;
- **Global :** synthese des sous-scores.

Chaque score est donne sur 100.

**A presenter oralement :**
Le score global permet d'avoir une lecture rapide, mais les sous-scores sont plus utiles pour comprendre l'origine du probleme.

---

## Slide 10 - Recommandations intelligentes

Les recommandations peuvent concerner :

- les titres ;
- les meta descriptions ;
- la structure HTML ;
- le contenu ;
- les images sans attribut `alt` ;
- la performance ;
- les mots-cles ;
- les opportunites SEO.

Chaque recommandation possede :

- une categorie ;
- une priorite ;
- un impact ;
- une difficulte ;
- une correction suggeree.

**A presenter oralement :**
Le but est de ne pas seulement signaler une erreur, mais de guider l'utilisateur vers une action concrete et priorisee.

---

## Slide 11 - Analyse NLP

SeoMind contient une analyse semantique du contenu :

- extraction du texte de la page ;
- nettoyage et lemmatisation ;
- suppression des mots vides ;
- extraction d'entites nommees ;
- densite de mots-cles ;
- similarite TF-IDF et cosine similarity ;
- comparaison entre contenu et mots-cles Search Console.

**A presenter oralement :**
Cette partie permet d'evaluer si le contenu du site est coherent avec les requetes qui generent de la visibilite dans les moteurs de recherche.

---

## Slide 12 - Automatisation avec GitHub

SeoMind peut connecter un compte GitHub puis :

- lister les depots ;
- choisir une branche ;
- generer une correction ;
- creer une nouvelle branche ;
- modifier un fichier cible ;
- ouvrir une Pull Request.

**A presenter oralement :**
Cette fonctionnalite reduit la distance entre recommandation et implementation. L'utilisateur peut passer d'une analyse SEO a une proposition de correction directement dans son depot.

---

## Slide 13 - Scenario de demonstration

1. Connexion a l'application.
2. Ajout ou selection d'un site.
3. Consultation du dashboard.
4. Affichage du score SEO.
5. Consultation des recommandations IA.
6. Generation d'une correction.
7. Connexion GitHub.
8. Creation d'une Pull Request.

**A presenter oralement :**
Pour la demonstration, je vais suivre le parcours d'un utilisateur qui veut comprendre l'etat SEO de son site et appliquer une amelioration.

---

## Slide 14 - Difficultes rencontrees

- gestion des flux OAuth Google et GitHub ;
- synchronisation entre frontend, backend et APIs externes ;
- gestion des tokens JWT et OAuth ;
- traitement de donnees parfois absentes dans Search Console ;
- calcul d'un score SEO comprehensible ;
- temps d'analyse NLP ;
- creation automatique de Pull Request.

**A presenter oralement :**
La difficulte principale etait de faire fonctionner ensemble plusieurs services externes, tout en gardant une experience utilisateur simple.

---

## Slide 15 - Limites et perspectives

**Limites actuelles :**

- certaines donnees peuvent etre simulees si Google ne retourne pas assez d'informations ;
- les corrections sont principalement basees sur des regles ;
- SQLite est utilise en developpement ;
- les tests automatiques peuvent etre renforces ;
- les tokens OAuth doivent etre chiffres pour une production reelle.

**Perspectives :**

- ajouter une IA generative pour produire des corrections plus riches ;
- migrer vers PostgreSQL ;
- ajouter un historique detaille des scores ;
- ameliorer les tests ;
- ajouter une pipeline CI/CD ;
- renforcer la securite des tokens.

**A presenter oralement :**
Le projet est fonctionnel comme prototype avance, mais plusieurs ameliorations permettraient de le rapprocher d'une version production.

---

## Slide 16 - Conclusion

SeoMind reunit :

- analyse de donnees SEO ;
- dashboard de suivi ;
- score intelligent ;
- recommandations actionnables ;
- analyse NLP ;
- automatisation GitHub.

**Conclusion orale :**
SeoMind montre comment une application web peut transformer des donnees techniques en actions concretes. Le projet combine le developpement full-stack, l'integration d'APIs, l'analyse de donnees et l'automatisation pour aider l'utilisateur a ameliorer la visibilite de son site.

---

# Questions possibles du jury

## Pourquoi avoir utilise Django ?

Django offre une structure robuste pour creer rapidement une API securisee, gerer les modeles, l'authentification, les permissions et les integrations externes.

## Pourquoi React ?

React permet de construire une interface dynamique et reactive, adaptee a un dashboard avec graphiques, chargement de donnees et navigation fluide.

## Quelle est la difference entre Google Analytics et Search Console ?

Google Analytics mesure le comportement des visiteurs sur le site : utilisateurs, sessions, pages vues. Search Console mesure la visibilite dans Google : clics, impressions, CTR et position moyenne.

## Est-ce que les recommandations sont generees par une IA generative ?

Pas completement. Le projet utilise des analyses SEO, des regles, du NLP et des modules optionnels. Les corrections actuelles sont surtout basees sur des templates intelligents. Une perspective serait d'ajouter un LLM pour generer des corrections plus contextuelles.

## Comment le score SEO est-il calcule ?

Il est calcule a partir de plusieurs sous-scores : technique, contenu, visibilite et trafic. Ces sous-scores sont ensuite combines pour obtenir un score global.

## Quelles sont les donnees sensibles ?

Les tokens JWT, les tokens Google OAuth, les tokens GitHub, les informations utilisateur et les donnees liees aux sites web.

## Comment ameliorer la securite ?

En chiffrant les tokens OAuth, en utilisant HTTPS, en mettant `DEBUG=False`, en configurant strictement les scopes OAuth et en utilisant un gestionnaire de secrets.

## Quelle est la fonctionnalite la plus originale ?

L'integration entre recommandations SEO et GitHub : l'application ne se limite pas a analyser, elle peut aussi proposer une correction et ouvrir une Pull Request.

