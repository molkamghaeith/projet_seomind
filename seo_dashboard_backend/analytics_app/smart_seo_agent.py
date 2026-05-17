                                                                                                    
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import math
import asyncio
import aiohttp

# ================= NLP =================
try:
    import spacy
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    NLP_AVAILABLE = True
except ImportError:
    NLP_AVAILABLE = False
    print("NLP non disponible. Installez : pip install spacy scikit-learn")
    print("Puis : python -m spacy download fr_core_news_sm")

# ================= BENCHMARKS PAR SECTEUR =================
INDUSTRY_BENCHMARKS = {
    'default': {
        'name': 'Général',
        'avg_ctr': 0.035,
        'avg_position': 12.0,
        'avg_load_time': 1.8,
        'min_content': 800,
        'avg_pages_per_session': 2.5,
    },
    'sport_fitness': {
        'name': 'Sport & Fitness',
        'avg_ctr': 0.042,
        'avg_position': 8.0,
        'avg_load_time': 1.5,
        'min_content': 1200,
        'avg_pages_per_session': 3.0,
    },
    'ecommerce': {
        'name': 'E-commerce',
        'avg_ctr': 0.028,
        'avg_position': 15.0,
        'avg_load_time': 2.0,
        'min_content': 600,
        'avg_pages_per_session': 4.0,
    },
    'blog': {
        'name': 'Blog / Média',
        'avg_ctr': 0.038,
        'avg_position': 10.0,
        'avg_load_time': 1.5,
        'min_content': 1500,
        'avg_pages_per_session': 1.8,
    },
    'corporate': {
        'name': 'Site Corporate',
        'avg_ctr': 0.025,
        'avg_position': 18.0,
        'avg_load_time': 2.2,
        'min_content': 500,
        'avg_pages_per_session': 2.0,
    },
}

# ================= POIDS PAR CATÉGORIE =================
CATEGORY_WEIGHTS = {
    'sport_fitness': {'content': 0.35, 'performance': 0.35, 'seo': 0.30},
    'ecommerce':     {'content': 0.25, 'performance': 0.35, 'seo': 0.40},
    'blog':          {'content': 0.50, 'performance': 0.25, 'seo': 0.25},
    'corporate':     {'content': 0.30, 'performance': 0.30, 'seo': 0.40},
    'default':       {'content': 0.40, 'performance': 0.30, 'seo': 0.30},
}


class SmartSEOAgent:
    """
    Agent SEO intelligent avec analyse sémantique (NLP) et analyse des top pages.
    La page principale est téléchargée une seule fois (cache interne).
    """

    def __init__(self, site_url, ga_data=None, gsc_data=None, top_pages_data=None, fast_mode=False):
        self.site_url = site_url
        self.ga_data = ga_data or []
        self.gsc_data = gsc_data or []
        self.top_pages_data = top_pages_data or []
        self.fast_mode = fast_mode
        self.scores = {}
        self.recommendations = []
        self.benchmark = None
        self.industry = 'default'

        # Métriques extraites du contenu
        self.avg_ctr = 0
        self.avg_position = 0
        self.load_time = 0
        self.title_length = 0
        self.has_title = 0
        self.meta_desc_length = 0
        self.has_meta_desc = 0
        self.h1_count = 0
        self.h2_count = 0
        self.h3_count = 0
        self.images_without_alt = 0
        self.text_length = 0
        self.internal_links = 0

        # Cache HTTP — la page est téléchargée une seule fois
        self._cached_response = None
        self._cached_soup = None
        self._cached_text = None

        # NLP
        self.nlp = None
        if NLP_AVAILABLE:
            try:
                self.nlp = spacy.load("fr_core_news_sm")
            except OSError:
                print("Modèle spaCy non trouvé. Exécutez : python -m spacy download fr_core_news_sm")

    # =========================================================================
    # UTILITAIRES
    # =========================================================================

    def _fetch_page(self):
        """
        Télécharge la page principale une seule fois et met le résultat en cache.
        Retourne (response, soup) ou (None, None) en cas d'erreur.
        """
        if self._cached_soup is not None:
            return self._cached_response, self._cached_soup

        headers = {
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/120.0.0.0 Safari/537.36'
            )
        }
        try:
            response = requests.get(self.site_url, timeout=8, headers=headers)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            self._cached_response = response
            self._cached_soup = soup
            return response, soup
        except Exception as e:
            print(f"Erreur téléchargement page principale: {e}")
            return None, None

    def _get_clean_text(self, soup):
        """Extrait et nettoie le texte d'un objet BeautifulSoup."""
        for tag in soup(["script", "style"]):
            tag.decompose()
        text = soup.get_text()
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        return ' '.join(chunk for chunk in chunks if chunk)

    # =========================================================================
    # DÉTECTION DU SECTEUR
    # =========================================================================

    def detect_industry(self, soup, text):
        """Détecte automatiquement le secteur d'activité depuis le contenu."""
        text_lower = text.lower()
        keywords = {
            'sport_fitness': ['gym', 'fitness', 'musculation', 'sport', 'entraînement', 'coach', 'cardio', 'salle de sport'],
            'ecommerce':     ['acheter', 'panier', 'commander', 'prix', 'livraison', 'promotion', 'réduction'],
            'blog':          ['article', 'blog', 'news', 'actualité', 'conseil', 'tutoriel', 'guide'],
            'corporate':     ['entreprise', 'service', 'contact', 'propos', 'carrière', 'recrutement'],
        }
        scores = {
            industry: sum(1 for word in words if word in text_lower)
            for industry, words in keywords.items()
        }
        if max(scores.values()) > 0:
            return max(scores, key=scores.get)
        return 'default'

    # =========================================================================
    # PAGESPEED
    # =========================================================================

    async def get_pagespeed_metrics(self):
        """Récupère les métriques PageSpeed Insights via l'API Google."""
        if self.fast_mode:
            return None

        try:
            url = f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={self.site_url}"
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    data = await response.json()
                    lighthouse = data.get('lighthouseResult', {})
                    audits = lighthouse.get('audits', {})
                    categories = lighthouse.get('categories', {})
                    return {
                        'performance_score': categories.get('performance', {}).get('score', 0) * 100,
                        'seo_score': categories.get('seo', {}).get('score', 0) * 100,
                        'lcp': audits.get('largest-contentful-paint', {}).get('numericValue', 0) / 1000,
                        'cls': audits.get('cumulative-layout-shift', {}).get('numericValue', 0),
                        'fid': audits.get('max-potential-fid', {}).get('numericValue', 0),
                    }
        except Exception as e:
            print(f"Erreur PageSpeed: {e}")
            return None

    def analyze_performance_metrics(self, pagespeed_data):
        """Génère des recommandations à partir des données PageSpeed."""
        if not pagespeed_data:
            return []

        issues = []
        perf_score = pagespeed_data.get('performance_score', 0)
        lcp = pagespeed_data.get('lcp', 0)
        cls = pagespeed_data.get('cls', 0)

        if perf_score < 50:
            issues.append({'category': 'performance', 'title': 'Performance PageSpeed',
                           'message': f"Score PageSpeed: {perf_score:.0f}/100 — Site très lent (optimisez images, JS, CSS)",
                           'priority': 'high'})
        elif perf_score < 80:
            issues.append({'category': 'performance', 'title': 'Performance PageSpeed',
                           'message': f"Score PageSpeed: {perf_score:.0f}/100 — À améliorer",
                           'priority': 'medium'})

        if lcp > 4:
            issues.append({'category': 'performance', 'title': 'LCP (chargement)',
                           'message': f"LCP: {lcp:.1f}s (recommandé < 2.5s)",
                           'priority': 'high'})
        elif lcp > 2.5:
            issues.append({'category': 'performance', 'title': 'LCP (chargement)',
                           'message': f"LCP: {lcp:.1f}s à surveiller",
                           'priority': 'medium'})

        if cls > 0.25:
            issues.append({'category': 'performance', 'title': 'CLS (stabilité visuelle)',
                           'message': f"CLS: {cls:.3f} (recommandé < 0.1)",
                           'priority': 'high'})

        return issues

    # =========================================================================
    # ANALYSE DU CONTENU (métriques techniques)
    # =========================================================================

    def analyze_content_vector(self):
        """
        Analyse technique de la page principale.
        Utilise le cache — ne télécharge pas la page une deuxième fois.
        """
        response, soup = self._fetch_page()
        if not soup:
            return {
                'title_length': 0, 'has_title': 0,
                'meta_desc_length': 0, 'has_meta_desc': 0,
                'h1_count': 0, 'h2_count': 0, 'h3_count': 0,
                'img_count': 0, 'img_without_alt': 0,
                'internal_links': 0, 'external_links': 0,
                'text_length': 0, 'has_canonical': 0,
                'has_schema': 0, 'has_viewport': 0,
                'load_time': 0, 'page_size': 0,
            }

        # Titre
        title_tag = soup.find('title')
        title = title_tag.string.strip() if title_tag and title_tag.string else ""
        title_length = len(title)
        has_title = 1 if title else 0
        print(f"Titre trouvé: '{title[:60]}' ({title_length} caractères)")

        # Meta description
        meta_tag = soup.find('meta', attrs={'name': 'description'})
        meta_desc = meta_tag.get('content', '').strip() if meta_tag else ""
        meta_desc_length = len(meta_desc)
        has_meta_desc = 1 if meta_desc else 0
        print(f"Meta description: {meta_desc_length} caractères")

        # Balises Hx
        h1_count = len(soup.find_all('h1'))
        h2_count = len(soup.find_all('h2'))
        h3_count = len(soup.find_all('h3'))
        print(f"H1: {h1_count}, H2: {h2_count}, H3: {h3_count}")

        # Images
        images = soup.find_all('img')
        img_count = len(images)
        img_without_alt = len([img for img in images if not img.get('alt')])
        print(f"Images: {img_count} total, {img_without_alt} sans alt")

        # Liens internes / externes
        parsed_url = urlparse(self.site_url)
        main_domain = parsed_url.netloc.replace('www.', '')
        social_domains = [
            'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
            'youtube.com', 'tiktok.com', 'pinterest.com', 'whatsapp.com',
            'github.com', 'vercel.app',
        ]
        internal = 0
        external = 0
        for link in soup.find_all('a', href=True):
            href = link.get('href', '').strip()
            if not href or href in ('#', '') or href.startswith(('javascript:', 'mailto:', 'tel:')):
                continue
            if any(dom in href.lower() for dom in social_domains):
                continue
            if href.startswith('/') and not href.startswith('//'):
                internal += 1
            elif main_domain in href and 'http' in href:
                internal += 1
            elif href.startswith('http') and main_domain not in href:
                external += 1
        print(f"Liens: {internal} internes, {external} externes")

        # Contenu textuel
        text = soup.get_text()
        text_length = len(text)
        print(f"Contenu: {text_length} caractères")

        # Balises techniques
        canonical = soup.find('link', rel='canonical')
        has_canonical = 1 if canonical and canonical.get('href') else 0
        schema = soup.find('script', type='application/ld+json')
        has_schema = 1 if schema else 0
        viewport = soup.find('meta', attrs={'name': 'viewport'})
        has_viewport = 1 if viewport else 0

        load_time = response.elapsed.total_seconds()
        print(f"Temps de chargement: {load_time:.2f}s")

        return {
            'title_length': title_length,
            'has_title': has_title,
            'meta_desc_length': meta_desc_length,
            'has_meta_desc': has_meta_desc,
            'h1_count': h1_count,
            'h2_count': h2_count,
            'h3_count': h3_count,
            'img_count': img_count,
            'img_without_alt': img_without_alt,
            'internal_links': internal,
            'external_links': external,
            'text_length': text_length,
            'has_canonical': has_canonical,
            'has_schema': has_schema,
            'has_viewport': has_viewport,
            'load_time': load_time,
            'page_size': len(response.content) / 1024,
        }

    # =========================================================================
    # ANALYSE SÉMANTIQUE (NLP)
    # =========================================================================

    def analyze_semantic_content(self):
        """Analyse sémantique du contenu avec spaCy et TF-IDF."""
        if not self.nlp:
            return []

        _, soup = self._fetch_page()
        if not soup:
            return []

        recommendations = []
        try:
            clean_text = self._get_clean_text(soup)
            if not clean_text:
                return []

            doc = self.nlp(clean_text[:1_000_000])
            tokens = [
                token.lemma_.lower()
                for token in doc
                if not token.is_stop and not token.is_punct and token.is_alpha
            ]
            unique_lemmas = set(tokens)

            # Entités nommées
            entities = {}
            for ent in doc.ents:
                entities.setdefault(ent.label_, [])
                if ent.text not in entities[ent.label_]:
                    entities[ent.label_].append(ent.text)

            if entities.get('ORG'):
                orgs = ', '.join(entities['ORG'][:3])
                recommendations.append({
                    'category': 'semantic',
                    'title': 'Sujets connexes détectés',
                    'message': f"Organisations mentionnées : {orgs}. Enrichissez votre contenu sur ces thèmes.",
                    'priority': 'low',
                    'priority_score': 1,
                })
            if entities.get('LOC'):
                locs = ', '.join(entities['LOC'][:3])
                recommendations.append({
                    'category': 'semantic',
                    'title': 'Optimisation locale',
                    'message': f"Lieux mentionnés : {locs}. Renforcez le SEO local.",
                    'priority': 'medium',
                    'priority_score': 2,
                })

            # Similarité avec les mots-clés GSC
            main_keywords = (
                [kw['keyword'] for kw in self.gsc_data[:3] if kw.get('keyword')]
                or [self.site_url.split('/')[-1].replace('-', ' ')]
            )

            vectorizer = TfidfVectorizer()
            page_vector = vectorizer.fit_transform([clean_text])

            for kw in main_keywords:
                kw_clean = ' '.join(
                    token.lemma_.lower()
                    for token in self.nlp(kw)
                    if not token.is_stop
                )
                if not kw_clean:
                    continue
                kw_vector = vectorizer.transform([kw_clean])
                similarity = cosine_similarity(page_vector, kw_vector)[0][0]

                if similarity < 0.1:
                    recommendations.append({
                        'category': 'semantic',
                        'title': 'Pertinence sémantique',
                        'message': f"Très faible similarité avec le mot-clé '{kw}'. Enrichissez votre contenu.",
                        'priority': 'high',
                        'priority_score': 3,
                    })
                elif similarity < 0.3:
                    recommendations.append({
                        'category': 'semantic',
                        'title': 'Pertinence sémantique',
                        'message': f"Similarité moyenne avec '{kw}'. Ajoutez des termes connexes.",
                        'priority': 'medium',
                        'priority_score': 2,
                    })
                else:
                    recommendations.append({
                        'category': 'semantic',
                        'title': 'Pertinence sémantique',
                        'message': f"Bonne pertinence pour '{kw}'.",
                        'priority': 'low',
                        'priority_score': 1,
                    })

            # Richesse lexicale
            if tokens:
                lexical_richness = len(unique_lemmas) / len(tokens)
                if lexical_richness < 0.3:
                    recommendations.append({
                        'category': 'semantic',
                        'title': 'Richesse lexicale',
                        'message': "Vocabulaire limité. Utilisez des synonymes et termes variés.",
                        'priority': 'medium',
                        'priority_score': 2,
                    })

        except Exception as e:
            print(f"Erreur analyse NLP: {e}")

        return recommendations

    # =========================================================================
    # ANALYSE DES TOP PAGES
    # =========================================================================

    def analyze_single_page(self, page_url, page_path):
        """Analyse NLP d'une page individuelle (top pages)."""
        if not self.nlp:
            return None

        try:
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            response = requests.get(page_url, timeout=10, headers=headers)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            clean_text = self._get_clean_text(soup)

            if not clean_text or len(clean_text) < 200:
                return None

            doc = self.nlp(clean_text[:500_000])
            tokens = [
                token.lemma_.lower()
                for token in doc
                if not token.is_stop and not token.is_punct and token.is_alpha
            ]
            unique_lemmas = set(tokens)
            lexical_richness = len(unique_lemmas) / len(tokens) if tokens else 0

            # Mots-clés de référence
            main_keywords = (
                [kw['keyword'] for kw in self.gsc_data[:3] if kw.get('keyword')]
            )
            if not main_keywords:
                title_tag = soup.find('title')
                if title_tag and title_tag.string:
                    main_keywords = [title_tag.string.strip()]
            if not main_keywords:
                if page_path in ('/', ''):
                    main_keywords = ["accueil"]
                else:
                    segment = page_path.rstrip('/').split('/')[-1].replace('-', ' ')
                    main_keywords = [segment or "page"]

            vectorizer = TfidfVectorizer()
            page_vector = vectorizer.fit_transform([clean_text])
            best_similarity = 0
            best_kw = ""

            for kw in main_keywords:
                kw_clean = ' '.join(
                    token.lemma_.lower()
                    for token in self.nlp(kw)
                    if not token.is_stop
                )
                if kw_clean:
                    kw_vector = vectorizer.transform([kw_clean])
                    sim = cosine_similarity(page_vector, kw_vector)[0][0]
                    if sim > best_similarity:
                        best_similarity = sim
                        best_kw = kw

            if not best_kw:
                return None

            issues = []
            if lexical_richness < 0.3:
                issues.append("vocabulaire limité, utilisez des synonymes")
            if best_similarity < 0.1:
                issues.append(f"très faible similarité avec '{best_kw}'")
            elif best_similarity < 0.3:
                issues.append(f"similarité moyenne avec '{best_kw}', ajoutez des termes connexes")

            if not issues:
                return None

            priority = 'high' if best_similarity < 0.1 else 'medium'
            return {
                'category': 'top_page_content',
                'title': f"Analyse contenu : {page_path}",
                'message': f"Page {page_path} : " + ", ".join(issues),
                'priority': priority,
                'priority_score': 3 if priority == 'high' else 2,
            }

        except Exception as e:
            print(f"Erreur analyse page {page_url}: {e}")
            return None

    def analyze_top_pages(self):
        """Analyse les 5 pages les plus vues et génère des recommandations."""
        if not self.top_pages_data:
            return []

        recommendations = []
        base_url = self.site_url.rstrip('/')
        for page in self.top_pages_data[:5]:
            path = page.get('path', '')
            if not path:
                continue
            page_url = base_url + ('/' if path == '/' else path)
            rec = self.analyze_single_page(page_url, path)
            if rec:
                recommendations.append(rec)
        return recommendations

    # =========================================================================
    # ANALYSE DES PERFORMANCES (GA)
    # =========================================================================

    def analyze_performance_stats(self):
        """Calcule les statistiques de trafic depuis les données GA."""
        stats = {
            'total_users': 0, 'avg_users': 0,
            'total_sessions': 0, 'avg_sessions': 0,
            'total_views': 0, 'avg_views': 0,
            'trend': 0, 'volatility': 0,
        }

        if not self.ga_data:
            return stats

        users_list, sessions_list, views_list = [], [], []
        for item in self.ga_data:
            try:
                users_list.append(int(item.get('users', 0) or 0))
                sessions_list.append(int(item.get('sessions', 0) or 0))
                views_list.append(int(item.get('views', 0) or 0))
            except (ValueError, TypeError):
                pass

        if users_list:
            stats['total_users'] = sum(users_list)
            stats['avg_users'] = stats['total_users'] / len(users_list)
            stats['total_sessions'] = sum(sessions_list)
            stats['avg_sessions'] = stats['total_sessions'] / len(sessions_list)
            stats['total_views'] = sum(views_list)
            stats['avg_views'] = stats['total_views'] / len(views_list)

            if len(users_list) >= 14:
                recent = sum(users_list[-7:])
                previous = sum(users_list[-14:-7])
                stats['trend'] = ((recent - previous) / (previous + 1)) * 100
                mean = stats['avg_users']
                variance = sum((x - mean) ** 2 for x in users_list) / len(users_list)
                stats['volatility'] = math.sqrt(variance)

        return stats

    # =========================================================================
    # ANALYSE SEO (Search Console)
    # =========================================================================

    def analyze_seo_correlations(self):
        """Calcule les métriques SEO depuis les données Search Console."""
        seo_metrics = {
            'total_clicks': 0, 'total_impressions': 0,
            'avg_ctr': 0, 'avg_position': 0,
            'keyword_count': 0, 'ctr_variance': 0, 'position_variance': 0,
        }

        if not self.gsc_data:
            return seo_metrics

        clicks_list, impressions_list, ctr_list, position_list = [], [], [], []
        for item in self.gsc_data:
            try:
                clicks_list.append(int(item.get('clicks', 0) or 0))
                impressions_list.append(int(item.get('impressions', 0) or 0))
                ctr_list.append(float(item.get('ctr', 0) or 0))
                position_list.append(float(item.get('position', 0) or 0))
            except (ValueError, TypeError):
                pass

        if clicks_list:
            seo_metrics['total_clicks'] = sum(clicks_list)
            seo_metrics['total_impressions'] = sum(impressions_list)
            seo_metrics['keyword_count'] = len(clicks_list)

            total_imp = seo_metrics['total_impressions']
            if total_imp > 0:
                seo_metrics['avg_ctr'] = seo_metrics['total_clicks'] / total_imp

            if position_list:
                seo_metrics['avg_position'] = sum(position_list) / len(position_list)
                mean_pos = seo_metrics['avg_position']
                seo_metrics['position_variance'] = (
                    sum((p - mean_pos) ** 2 for p in position_list) / len(position_list)
                )

            if ctr_list:
                mean_ctr = seo_metrics['avg_ctr']
                seo_metrics['ctr_variance'] = (
                    sum((c - mean_ctr) ** 2 for c in ctr_list) / len(ctr_list)
                )

        return seo_metrics

    # =========================================================================
    # CALCUL DES SCORES
    # =========================================================================

    def generate_scores(self, content, performance, seo, industry='default'):
        """Génère les scores pondérés par secteur."""

        # ── Score contenu ──────────────────────────────────────────────────
        content_score = 0
        content_weight = 0

        def add(score, weight):
            nonlocal content_score, content_weight
            content_score += score * weight
            content_weight += weight

        if content.get('has_title'):
            diff = abs(content.get('title_length', 0) - 45)
            add(max(0, 100 - diff * 2), 0.15)

        meta_score = 0
        if content.get('has_meta_desc'):
            diff = abs(content.get('meta_desc_length', 0) - 120)
            meta_score = max(0, 100 - diff * 0.8)
        add(meta_score, 0.10)

        h1 = content.get('h1_count', 0)
        add(100 if h1 == 1 else (50 if h1 > 1 else 0), 0.10)

        h2h3_ratio = (content.get('h2_count', 0) + content.get('h3_count', 0)) / 10
        add(min(100, h2h3_ratio * 100), 0.10)

        if content.get('img_count', 0) > 0:
            alt_ratio = 1 - content.get('img_without_alt', 0) / content['img_count']
            add(alt_ratio * 100, 0.10)
        else:
            content_weight += 0.10

        add(min(100, content.get('internal_links', 0) * 5), 0.10)
        add(min(100, content.get('text_length', 0) / 20), 0.15)

        tech = (
            content.get('has_canonical', 0) * 33 +
            content.get('has_schema', 0) * 33 +
            content.get('has_viewport', 0) * 34
        )
        add(tech, 0.10)

        load_time = content.get('load_time', 0)
        load_score = 100 if load_time < 1 else (70 if load_time < 2 else (40 if load_time < 3 else 10))
        add(load_score, 0.10)

        self.scores['content'] = (content_score / content_weight) if content_weight else 0

        # ── Score performance (trafic GA) ───────────────────────────────────
        if performance.get('total_users', 0) > 0:
            traffic_score = min(100, performance['total_users'] / 500 * 100)
            engagement_score = 0
            if performance.get('avg_sessions', 0) > 0:
                pps = performance['avg_views'] / performance['avg_sessions']
                engagement_score = min(100, pps * 50)
            self.scores['performance'] = traffic_score * 0.6 + engagement_score * 0.4
        else:
            self.scores['performance'] = 0

        # ── Score SEO (Search Console) ──────────────────────────────────────
        if seo.get('total_impressions', 0) > 0:
            ctr_score = min(100, (seo.get('avg_ctr', 0) / 0.05) * 100)
            position_score = max(0, 100 - seo.get('avg_position', 0) * 3)
            self.scores['seo'] = ctr_score * 0.4 + position_score * 0.6
            print(
                f"SEO — CTR: {seo.get('avg_ctr', 0):.3f} ({ctr_score:.0f}/100) "
                f"Position: {seo.get('avg_position', 0):.1f} ({position_score:.0f}/100) "
                f"= {self.scores['seo']:.0f}/100"
            )
        else:
            self.scores['seo'] = 0

        # ── Score global ────────────────────────────────────────────────────
        weights = CATEGORY_WEIGHTS.get(industry, CATEGORY_WEIGHTS['default'])
        self.scores['global'] = (
            self.scores.get('content', 0) * weights['content'] +
            self.scores.get('performance', 0) * weights['performance'] +
            self.scores.get('seo', 0) * weights['seo']
        )

        self.benchmark = INDUSTRY_BENCHMARKS.get(industry, INDUSTRY_BENCHMARKS['default'])
        if self.avg_ctr > 0 and self.benchmark['avg_ctr'] > 0:
            self.scores['competitiveness'] = min(150, (self.avg_ctr / self.benchmark['avg_ctr']) * 100)

    # =========================================================================
    # GÉNÉRATION DES RECOMMANDATIONS
    # =========================================================================

    def generate_recommendations(self):
        """Génère les recommandations triées par priorité."""
        recs = []

        def add(category, title, message, priority):
            recs.append({
                'category': category,
                'title': title,
                'message': message,
                'priority': priority,
                'priority_score': {'high': 3, 'medium': 2, 'low': 1}.get(priority, 2),
            })

        # Titre
        if not self.has_title:
            add('title', 'Titre', "Balise title manquante — ajoutez un titre de 30-60 caractères.", 'high')
        elif self.title_length < 30:
            add('title', 'Titre', f"Titre trop court: {self.title_length} caractères (idéal 30-60)", 'medium')
        elif self.title_length > 60:
            add('title', 'Titre', f"Titre trop long: {self.title_length} caractères (idéal 30-60)", 'medium')
        else:
            add('title', 'Titre', f"Titre: {self.title_length} caractères (bonne longueur)", 'low')

        # Meta description
        if not self.has_meta_desc:
            add('meta', 'Meta description', "Meta description manquante — ajoutez une description de 50-160 caractères.", 'high')
        elif self.meta_desc_length < 50:
            add('meta', 'Meta description', f"Meta description trop courte: {self.meta_desc_length} caractères (min 50)", 'medium')
        elif self.meta_desc_length > 160:
            add('meta', 'Meta description', f"Meta description trop longue: {self.meta_desc_length} caractères (max 160)", 'medium')
        else:
            add('meta', 'Meta description', f"Meta description: {self.meta_desc_length} caractères", 'low')

        # H1
        if self.h1_count == 0:
            add('structure', 'Structure H1', "Aucune balise H1 trouvée (recommandé: 1 seule)", 'high')
        elif self.h1_count > 1:
            add('structure', 'Structure H1', f"{self.h1_count} balises H1 trouvées (recommandé: 1 seule)", 'medium')
        else:
            add('structure', 'Structure H1', "Une seule balise H1 — correct", 'low')

        # Images
        if self.images_without_alt > 0:
            add('content', 'Images', f"{self.images_without_alt} images sans attribut alt", 'medium')
        else:
            add('content', 'Images', "Toutes les images ont un attribut alt", 'low')

        # Contenu
        if self.text_length < 500:
            add('content', 'Contenu', f"Contenu trop court: {self.text_length} caractères (min 800)", 'high')
        elif self.text_length < 800:
            add('content', 'Contenu', f"Contenu moyen: {self.text_length} caractères (viser 800+)", 'medium')
        else:
            add('content', 'Contenu', f"Contenu riche: {self.text_length} caractères", 'low')

        # Liens internes
        if self.internal_links < 3:
            add('content', 'Liens internes', f"Peu de liens internes: {self.internal_links} (5+ recommandé)", 'medium')
        elif self.internal_links < 10:
            add('content', 'Liens internes', f"{self.internal_links} liens internes (peut être amélioré)", 'low')
        else:
            add('content', 'Liens internes', f"{self.internal_links} liens internes (bon maillage)", 'low')

        # Temps de réponse
        if self.load_time > 3:
            add('technical', 'Temps de réponse', f"Serveur très lent: {self.load_time:.1f}s (recommandé < 2s)", 'high')
        elif self.load_time > 2:
            add('technical', 'Temps de réponse', f"Serveur lent: {self.load_time:.1f}s (recommandé < 2s)", 'medium')
        else:
            add('technical', 'Temps de réponse', f"Serveur rapide: {self.load_time:.1f}s", 'low')

        # Trafic
        perf = self.scores.get('performance', 0)
        if perf > 0:
            if perf < 30:
                add('traffic', 'Trafic', f"Trafic très faible: {perf:.0f}/100", 'high')
            elif perf < 60:
                add('traffic', 'Trafic', f"Trafic à améliorer: {perf:.0f}/100", 'medium')
            else:
                add('traffic', 'Trafic', f"Bon trafic: {perf:.0f}/100", 'low')

        # CTR
        if self.avg_ctr > 0:
            ctr_pct = self.avg_ctr * 100
            if ctr_pct < 2:
                add('seo', 'Taux de clic (CTR)', f"CTR très faible: {ctr_pct:.1f}% (viser 3-5%)", 'high')
            elif ctr_pct < 3:
                add('seo', 'Taux de clic (CTR)', f"CTR faible: {ctr_pct:.1f}% (viser 3-5%)", 'medium')
            else:
                add('seo', 'Taux de clic (CTR)', f"Bon CTR: {ctr_pct:.1f}%", 'low')

        # Position
        if self.avg_position > 0:
            if self.avg_position > 20:
                add('seo', 'Position Google', f"Position faible: {self.avg_position:.1f} (viser page 1)", 'high')
            elif self.avg_position > 10:
                add('seo', 'Position Google', f"Position à améliorer: {self.avg_position:.1f} (viser page 1)", 'medium')
            else:
                add('seo', 'Position Google', f"Bonne position: {self.avg_position:.1f}", 'low')

        # Tri et ajout (max 8)
        recs.sort(key=lambda x: x['priority_score'], reverse=True)
        for rec in recs:
            self.recommendations.append(rec)

        # Score global en tête
        g = self.scores.get('global', 0)
        interpretation = (
            "Faible — travail important à fournir" if g < 40
            else "Moyen — plusieurs points à corriger" if g < 70
            else "Bon — bien optimisé"
        )
        weights = CATEGORY_WEIGHTS.get(self.industry, CATEGORY_WEIGHTS['default'])
        score_msg = (
            f"Score SEO global: {g:.0f}/100 ({interpretation})\n"
            f"  • Contenu: {self.scores.get('content', 0):.0f}/100 (poids {weights['content']*100:.0f}%)\n"
            f"  • Trafic: {self.scores.get('performance', 0):.0f}/100 (poids {weights['performance']*100:.0f}%)\n"
            f"  • SEO (position/CTR): {self.scores.get('seo', 0):.0f}/100 (poids {weights['seo']*100:.0f}%)"
        )
        self.recommendations.insert(0, {
            'category': 'global',
            'title': 'Score SEO',
            'message': score_msg,
            'priority': 'high',
            'priority_score': 3,
            'gain': 0,
        })

        # Benchmark secteur
        if self.benchmark and self.industry != 'default' and self.avg_ctr > 0:
            self.recommendations.append({
                'category': 'benchmark',
                'title': 'Comparaison secteur',
                'message': (
                    f"Référence {self.benchmark['name']}: "
                    f"CTR {self.benchmark['avg_ctr']*100:.0f}% | "
                    f"Position {self.benchmark['avg_position']:.0f}"
                ),
                'priority': 'low',
                'priority_score': 1,
                'gain': 0,
            })

    # =========================================================================
    # MÉTHODE PRINCIPALE
    # =========================================================================

    def enrich_recommendation(self, rec):
        """Ajoute des informations utiles pour l'interface IA."""
        category = rec.get('category', 'content')
        priority = rec.get('priority', 'medium')

        impact_by_priority = {'high': 'high', 'medium': 'medium', 'low': 'low'}
        gain_by_priority = {'high': 15, 'medium': 8, 'low': 3}
        difficulty_by_category = {
            'title': 'easy',
            'meta': 'easy',
            'structure': 'medium',
            'content': 'medium',
            'technical': 'hard',
            'traffic': 'medium',
            'seo': 'medium',
            'semantic': 'medium',
            'top_page_content': 'medium',
            'benchmark': 'easy',
            'global': 'medium',
        }
        action_steps_by_category = {
            'title': [
                "Rédiger un titre clair de 30 à 60 caractères.",
                "Placer le mot-clé principal au début si possible.",
                "Garder le nom de marque à la fin du titre.",
            ],
            'meta': [
                "Rédiger une meta description de 50 à 160 caractères.",
                "Ajouter une promesse claire et un appel à l'action.",
                "Inclure le mot-clé principal naturellement.",
            ],
            'structure': [
                "Garder une seule balise H1 sur la page.",
                "Utiliser des H2/H3 pour organiser les sections.",
                "Vérifier que le H1 décrit précisément la page.",
            ],
            'content': [
                "Ajouter du contenu utile autour du sujet principal.",
                "Répondre aux questions fréquentes des visiteurs.",
                "Ajouter des liens internes vers les pages importantes.",
            ],
            'technical': [
                "Compresser les images et activer le lazy loading.",
                "Réduire les scripts inutiles.",
                "Vérifier les balises canonical, viewport et schema.",
            ],
            'traffic': [
                "Optimiser les pages qui reçoivent déjà du trafic.",
                "Ajouter des appels à l'action visibles.",
                "Améliorer le maillage interne depuis les pages fortes.",
            ],
            'seo': [
                "Améliorer le title et la meta description.",
                "Renforcer le contenu lié au mot-clé ciblé.",
                "Ajouter des liens internes vers la page concernée.",
            ],
            'semantic': [
                "Ajouter des synonymes et termes associés.",
                "Développer les sections autour des intentions de recherche.",
                "Structurer le contenu avec des sous-titres explicites.",
            ],
            'top_page_content': [
                "Optimiser cette page en priorité car elle reçoit déjà du trafic.",
                "Ajouter des mots-clés secondaires et du contenu utile.",
                "Ajouter des liens vers une page de conversion.",
            ],
            'global': [
                "Traiter d'abord les recommandations de priorité haute.",
                "Corriger ensuite les optimisations de contenu.",
                "Mesurer l'évolution après quelques jours.",
            ],
            'benchmark': [
                "Comparer le CTR et la position avec la référence du secteur.",
                "Prioriser les mots-clés proches de la première page.",
            ],
        }

        rec['impact'] = rec.get('impact') or impact_by_priority.get(priority, 'medium')
        rec['difficulty'] = rec.get('difficulty') or difficulty_by_category.get(category, 'medium')
        rec['estimated_gain'] = rec.get(
            'estimated_gain',
            rec.get('gain', gain_by_priority.get(priority, 5)),
        )
        rec['action_steps'] = rec.get('action_steps') or action_steps_by_category.get(
            category,
            [
                "Analyser la page concernée.",
                "Appliquer la correction recommandée.",
                "Mesurer l'effet après indexation.",
            ],
        )
        rec['is_actionable'] = category not in ['global', 'benchmark'] and priority in ['high', 'medium']
        return rec

    def is_positive_low_priority(self, rec):
        if rec.get('priority') != 'low':
            return False
        if rec.get('category') in ['global', 'benchmark']:
            return False

        message = (rec.get('message') or rec.get('description') or '').lower()
        positive_markers = [
            'bonne longueur',
            'correct',
            'toutes les images',
            'contenu riche',
            'bon maillage',
            'serveur rapide',
            'bon trafic',
            'bon ctr',
            'bonne position',
        ]
        return any(marker in message for marker in positive_markers)

    def finalize_recommendations(self, recommendations):
        """Dedoublonne, enrichit et reduit le bruit des recommandations."""
        seen = set()
        final_items = []

        for rec in recommendations:
            key = (
                rec.get('category'),
                rec.get('title'),
                rec.get('message') or rec.get('description'),
            )
            if key in seen:
                continue
            seen.add(key)

            if self.is_positive_low_priority(rec):
                continue

            final_items.append(self.enrich_recommendation(rec))

        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        score_cards = [item for item in final_items if item.get('category') == 'global']
        other_items = [item for item in final_items if item.get('category') != 'global']
        other_items.sort(
            key=lambda item: (
                priority_order.get(item.get('priority', 'medium'), 9),
                -int(item.get('estimated_gain', 0) or 0),
            )
        )

        return score_cards + other_items[:12]

    def analyze(self):
        """Lance l'analyse complète et retourne les recommandations."""
        print(f"Agent SEO: Analyse de {self.site_url}")

        # 1. Contenu (utilise le cache)
        content_analysis = self.analyze_content_vector()
        semantic_analysis = [] if self.fast_mode else self.analyze_semantic_content()

        # 2. Performances GA
        performance_analysis = self.analyze_performance_stats()

        # 3. Search Console
        seo_analysis = self.analyze_seo_correlations()

        # 4. Top pages
        top_pages_analysis = [] if self.fast_mode else self.analyze_top_pages()

        # 5. Stocker les métriques dans l'instance
        self.avg_ctr = seo_analysis.get('avg_ctr', 0)
        self.avg_position = seo_analysis.get('avg_position', 0)
        self.load_time = content_analysis.get('load_time', 0)
        self.title_length = content_analysis.get('title_length', 0)
        self.has_title = content_analysis.get('has_title', 0)
        self.meta_desc_length = content_analysis.get('meta_desc_length', 0)
        self.has_meta_desc = content_analysis.get('has_meta_desc', 0)
        self.h1_count = content_analysis.get('h1_count', 0)
        self.h2_count = content_analysis.get('h2_count', 0)
        self.h3_count = content_analysis.get('h3_count', 0)
        self.images_without_alt = content_analysis.get('img_without_alt', 0)
        self.text_length = content_analysis.get('text_length', 0)
        self.internal_links = content_analysis.get('internal_links', 0)

        # 6. Secteur (utilise le cache)
        _, soup = self._fetch_page()
        if soup:
            self.industry = self.detect_industry(soup, soup.get_text())
        print(f"Secteur: {INDUSTRY_BENCHMARKS.get(self.industry, INDUSTRY_BENCHMARKS['default'])['name']}")

        # 7. PageSpeed
        pagespeed_issues = []
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            pagespeed_data = loop.run_until_complete(self.get_pagespeed_metrics())
            pagespeed_issues = self.analyze_performance_metrics(pagespeed_data)
            loop.close()
        except Exception as e:
            print(f"PageSpeed ignoré: {e}")

        # 8. Scores
        self.generate_scores(content_analysis, performance_analysis, seo_analysis, self.industry)

        # 9. Recommandations
        self.generate_recommendations()
        for rec in semantic_analysis:
            self.recommendations.append(rec)
        for rec in top_pages_analysis:
            self.recommendations.append(rec)
        for issue in pagespeed_issues:
            self.recommendations.append({
                'category': issue['category'],
                'title': issue['title'],
                'message': issue['message'],
                'priority': issue['priority'],
                'priority_score': 3 if issue['priority'] == 'high' else (2 if issue['priority'] == 'medium' else 1),
                'gain': 0,
            })

        return self.finalize_recommendations(self.recommendations)


# =============================================================================
# FONCTION PUBLIQUE
# =============================================================================

def get_smart_seo_recommendations(site_url, ga_data=None, gsc_data=None, top_pages_data=None, fast_mode=False):
    """Point d'entrée principal pour obtenir les recommandations SEO intelligentes."""
    agent = SmartSEOAgent(site_url, ga_data, gsc_data, top_pages_data, fast_mode=fast_mode)
    return agent.analyze()