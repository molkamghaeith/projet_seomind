import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import re

class SEOAgent:
    """Agent intelligent pour analyser un site et générer des recommandations SEO"""
    
    def __init__(self, site_url, ga_data=None, gsc_data=None):
        self.site_url = site_url
        self.ga_data = ga_data if ga_data is not None else []
        self.gsc_data = gsc_data if gsc_data is not None else []
        self.recommendations = []
        
    def analyze(self):
        """Lance l'analyse complète du site"""
        print(f" Agent SEO: Analyse du site {self.site_url}")
        
        # 1. Analyser le contenu du site
        self.analyze_website_content()
        
        # 2. Analyser les données GA
        self.analyze_analytics_data()
        
        # 3. Analyser les données Search Console
        self.analyze_search_console_data()
        
        # 4. Générer des recommandations
        self.generate_recommendations()
        
        return self.recommendations
    
    def analyze_website_content(self):
        """Consulte le site et analyse son contenu"""
        try:
            response = requests.get(self.site_url, timeout=10, headers={
                'User-Agent': 'Mozilla/5.0 (compatible; SEOAgent/1.0)'
            })
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # ==================== BALISES DE BASE ====================
            
            # 1. Vérifier la balise title
            title = soup.find('title')
            if not title or not title.string or len(title.string) < 10:
                self.add_issue('title', ' Balise title manquante ou trop courte (moins de 10 caractères)', 'high')
            elif len(title.string) > 60:
                self.add_issue('title', f' Titre trop long: {len(title.string)} caractères (max 60 recommandé)', 'medium')
            elif len(title.string) < 30:
                self.add_issue('title', f' Titre trop court: {len(title.string)} caractères (idéal 30-60)', 'medium')
            else:
                self.add_issue('title', f' Titre bien dimensionné: {len(title.string)} caractères', 'low')
            
            # 2. Vérifier la meta description
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if not meta_desc or not meta_desc.get('content'):
                self.add_issue('meta', ' Meta description manquante - Ajoutez une description de 50-160 caractères', 'high')
            elif len(meta_desc.get('content', '')) < 50:
                self.add_issue('meta', f' Meta description trop courte: {len(meta_desc.get("content", ""))} caractères (minimum 50)', 'medium')
            elif len(meta_desc.get('content', '')) > 160:
                self.add_issue('meta', f' Meta description trop longue: {len(meta_desc.get("content", ""))} caractères (max 160)', 'medium')
            else:
                self.add_issue('meta', f' Meta description bien dimensionnée: {len(meta_desc.get("content", ""))} caractères', 'low')
            
            # 3. Vérifier la meta keywords (optionnel mais intéressant)
            meta_keywords = soup.find('meta', attrs={'name': 'keywords'})
            if not meta_keywords or not meta_keywords.get('content'):
                self.add_issue('meta', ' Meta keywords manquante - Peut aider pour certains moteurs', 'low')
            
            # ==================== STRUCTURE HTML ====================
            
            # 4. Vérifier les balises H1
            h1_tags = soup.find_all('h1')
            if len(h1_tags) == 0:
                self.add_issue('structure', ' Aucune balise H1 trouvée - Ajoutez un titre principal', 'high')
            elif len(h1_tags) > 1:
                self.add_issue('structure', f' {len(h1_tags)} balises H1 trouvées (une seule recommandée pour le SEO)', 'medium')
            else:
                h1_text = h1_tags[0].get_text().strip()
                self.add_issue('structure', f' Une seule balise H1: "{h1_text[:50]}"', 'low')
            
            # 5. Vérifier les balises H2
            h2_tags = soup.find_all('h2')
            if len(h2_tags) == 0:
                self.add_issue('structure', ' Aucune balise H2 trouvée - Structurez votre contenu avec des sous-titres', 'medium')
            elif len(h2_tags) < 2:
                self.add_issue('structure', f' Seulement {len(h2_tags)} balise H2 trouvée - Ajoutez plus de sous-titres', 'low')
            else:
                self.add_issue('structure', f' {len(h2_tags)} balises H2 trouvées - Bonne structure', 'low')
            
            # 6. Vérifier les balises H3
            h3_tags = soup.find_all('h3')
            if len(h3_tags) == 0:
                self.add_issue('structure', ' Aucune balise H3 trouvée - Utilisez des H3 pour hiérarchiser le contenu', 'low')
            
            # 7. Vérifier la hiérarchie (H1 puis H2 puis H3)
            if len(h1_tags) == 1 and len(h2_tags) > 0 and len(h3_tags) > 0:
                self.add_issue('structure', ' Bonne hiérarchie HTML (H1 → H2 → H3)', 'low')
            elif len(h1_tags) == 1 and len(h2_tags) > 0:
                self.add_issue('structure', ' Hiérarchie correcte mais pourrait ajouter des H3', 'low')
            
            # ==================== IMAGES ====================
            
            # 8. Vérifier les images sans alt
            images = soup.find_all('img')
            images_without_alt = [img for img in images if not img.get('alt')]
            if images_without_alt:
                self.add_issue('content', f' {len(images_without_alt)} images sans attribut alt (sur {len(images)} total)', 'medium')
            else:
                self.add_issue('content', f' Toutes les {len(images)} images ont un attribut alt', 'low')
            
            # 9. Vérifier les images sans attribut loading="lazy"
            images_without_lazy = [img for img in images if not img.get('loading')]
            if images_without_lazy and len(images) > 3:
                self.add_issue('technical', f' {len(images_without_lazy)} images sans lazy loading - Ajoutez loading="lazy" pour accélérer le chargement', 'medium')
            
            # 10. Vérifier les images trop grandes (approximatif via src)
            large_images = [img for img in images if img.get('src') and ('large' in img['src'].lower() or 'big' in img['src'].lower())]
            if large_images:
                self.add_issue('technical', f' {len(large_images)} images potentiellement trop grandes - Optimisez leur poids', 'medium')
            
            # ==================== LIENS ====================
            
            # 11. Vérifier les liens internes
            links = soup.find_all('a', href=True)
            internal_links = [link for link in links if self.site_url in link['href'] or link['href'].startswith('/')]
            external_links = [link for link in links if link['href'].startswith('http') and self.site_url not in link['href']]
            
            if len(internal_links) < 5:
                self.add_issue('content', f' Peu de liens internes ({len(internal_links)}) - Améliorez le maillage interne', 'medium')
            else:
                self.add_issue('content', f' {len(internal_links)} liens internes trouvés', 'low')
            
            # 12. Vérifier les liens externes
            if len(external_links) == 0:
                self.add_issue('content', ' Aucun lien externe - Les liens vers des sites autorités peuvent améliorer le SEO', 'low')
            
            # 13. Vérifier les liens brisés (simplifié)
            broken_links = []
            for link in links[:10]:  # Limiter pour la performance
                href = link.get('href', '')
                if href.startswith('http') and not href.startswith('https://' + self.site_url):
                    broken_links.append(href)
            if broken_links:
                self.add_issue('technical', f' {len(broken_links)} liens externes à vérifier', 'low')
            
            # 14. Vérifier les liens avec texte vide
            empty_links = [link for link in links if not link.get_text().strip()]
            if empty_links:
                self.add_issue('content', f' {len(empty_links)} liens sans texte descriptif', 'medium')
            
            # ==================== CONTENU ====================
            
            # 15. Vérifier la présence du mot-clé principal
            text = soup.get_text().lower()
            domain = urlparse(self.site_url).netloc.replace('www.', '').replace('.com', '').replace('.tn', '').replace('.vercel.app', '')
            main_keywords = [domain, 'titanium', 'gym', 'sport', 'fitness', 'musculation']
            found_keywords = [kw for kw in main_keywords if kw in text]
            if len(found_keywords) < 2:
                self.add_issue('content', f' Mots-clés principaux peu présents: trouvé {found_keywords}', 'medium')
            else:
                self.add_issue('content', f' Mots-clés trouvés: {found_keywords}', 'low')
            
            # 16. Vérifier la taille du contenu
            text_length = len(text)
            if text_length < 500:
                self.add_issue('content', f' Contenu trop court: {text_length} caractères (minimum 500 recommandé)', 'high')
            elif text_length < 1000:
                self.add_issue('content', f' Contenu moyen: {text_length} caractères (idéal 1000+)', 'medium')
            else:
                self.add_issue('content', f' Bonne quantité de contenu: {text_length} caractères', 'low')
            
            # 17. Vérifier la densité des mots-clés
            if len(main_keywords) > 0 and text_length > 0:
                keyword_density = {}
                for kw in main_keywords[:3]:
                    if kw in text:
                        count = text.count(kw)
                        density = (count * len(kw)) / text_length * 100
                        if 0.5 < density < 3:
                            keyword_density[kw] = f"{density:.1f}% "
                        elif density > 3:
                            keyword_density[kw] = f"{density:.1f}%  trop élevé"
                if keyword_density:
                    self.add_issue('content', f' Densité mots-clés: {keyword_density}', 'low')
            
            # ==================== TECHNIQUE ====================
            
            # 18. Vérifier la présence de schema.org / données structurées
            schema_scripts = soup.find_all('script', type='application/ld+json')
            if len(schema_scripts) == 0:
                self.add_issue('technical', '🔍 Données structurées (schema.org) manquantes - Ajoutez pour améliorer le référencement', 'medium')
            else:
                self.add_issue('technical', f' {len(schema_scripts)} données structurées trouvées', 'low')
            
            # 19. Vérifier les balises meta robots
            robots = soup.find('meta', attrs={'name': 'robots'})
            if robots and 'noindex' in robots.get('content', ''):
                self.add_issue('technical', ' La balise "noindex" est présente - Le site n\'est pas indexé par Google', 'high')
            
            # 20. Vérifier la balise canonical
            canonical = soup.find('link', rel='canonical')
            if not canonical or not canonical.get('href'):
                self.add_issue('technical', ' Balise canonique manquante - Risque de contenu dupliqué', 'medium')
            else:
                self.add_issue('technical', f' Balise canonique: {canonical.get("href")[:50]}', 'low')
            
            # 21. Vérifier le charset
            charset = soup.find('meta', charset=True)
            if not charset:
                self.add_issue('technical', ' Déclaration de charset manquante (UTF-8 recommandé)', 'low')
            
            # 22. Vérifier la viewport (responsive)
            viewport = soup.find('meta', attrs={'name': 'viewport'})
            if not viewport:
                self.add_issue('technical', '📱 Balise viewport manquante - Le site risque de ne pas être responsive', 'high')
            
            # 23. Vérifier le favicon
            favicon = soup.find('link', rel='icon') or soup.find('link', rel='shortcut icon')
            if not favicon:
                self.add_issue('technical', ' Favicon manquant - Améliore l\'identité visuelle dans les onglets', 'low')
            
            # 24. Vérifier la présence de HTTPS
            if not self.site_url.startswith('https'):
                self.add_issue('technical', ' HTTPS non utilisé - Passez à HTTPS pour la sécurité et le SEO', 'high')
            
            # 25. Vérifier la présence de www
            if 'www.' not in self.site_url:
                self.add_issue('technical', ' Version non-www utilisée - Uniformisez avec ou sans www', 'low')
            
            # 26. Vérifier les balises de langue
            html_lang = soup.find('html').get('lang')
            if not html_lang:
                self.add_issue('technical', ' Attribut lang manquant sur la balise HTML', 'medium')
            else:
                self.add_issue('technical', f' Langue détectée: {html_lang}', 'low')
            
            # ==================== PERFORMANCE ====================
            
            # 27. Vérifier le temps de réponse approximatif
            if response.elapsed.total_seconds() > 2:
                self.add_issue('technical', f' Temps de chargement élevé: {response.elapsed.total_seconds():.1f}s (idéal < 2s)', 'high')
            elif response.elapsed.total_seconds() > 1:
                self.add_issue('technical', f' Temps de chargement moyen: {response.elapsed.total_seconds():.1f}s', 'medium')
            else:
                self.add_issue('technical', f' Bon temps de chargement: {response.elapsed.total_seconds():.1f}s', 'low')
            
            # 28. Vérifier la taille de la page
            page_size = len(response.content) / 1024  # en KB
            if page_size > 500:
                self.add_issue('technical', f' Page lourde: {page_size:.0f}KB (idéal < 500KB)', 'medium')
            
            # 29. Vérifier les scripts externes nombreux
            scripts = soup.find_all('script', src=True)
            if len(scripts) > 10:
                self.add_issue('technical', f' {len(scripts)} scripts externes - Peut ralentir le chargement', 'low')
            
            # 30. Vérifier les CSS externes
            stylesheets = soup.find_all('link', rel='stylesheet')
            if len(stylesheets) > 5:
                self.add_issue('technical', f' {len(stylesheets)} feuilles CSS - Minimisez le nombre de requêtes', 'low')
            
        except requests.exceptions.Timeout:
            self.add_issue('technical', ' Timeout - Le site met trop de temps à répondre', 'high')
        except requests.exceptions.ConnectionError:
            self.add_issue('technical', ' Erreur de connexion - Le site est inaccessible', 'high')
        except Exception as e:
            self.add_issue('technical', f' Erreur technique: {str(e)[:100]}', 'high')
    
    def analyze_analytics_data(self):
        """Analyse les données Google Analytics"""
        if self.ga_data and isinstance(self.ga_data, list) and len(self.ga_data) > 0:
            # Calculer le trafic total
            total_users = sum([day.get('users', 0) for day in self.ga_data if isinstance(day, dict)])
            total_sessions = sum([day.get('sessions', 0) for day in self.ga_data if isinstance(day, dict)])
            total_views = sum([day.get('views', 0) for day in self.ga_data if isinstance(day, dict)])
            
            # Trafic
            if total_users < 50:
                self.add_issue('traffic', f' Trafic très faible: {total_users} visiteurs - Améliorez votre référencement', 'high')
            elif total_users < 200:
                self.add_issue('traffic', f' Trafic faible: {total_users} visiteurs - Travaillez votre SEO', 'medium')
            elif total_users < 500:
                self.add_issue('traffic', f' Trafic moyen: {total_users} visiteurs - Bon début, continuez', 'low')
            else:
                self.add_issue('traffic', f' Bon trafic: {total_users} visiteurs', 'low')
            
            # Pages vues par visiteur
            if total_users > 0:
                pages_per_user = total_views / total_users
                if pages_per_user < 2:
                    self.add_issue('engagement', f' Faible nombre de pages par visiteur: {pages_per_user:.1f}', 'medium')
                elif pages_per_user > 5:
                    self.add_issue('engagement', f' Excellent engagement: {pages_per_user:.1f} pages par visiteur', 'low')
            
            # Taux de rebond
            bounce_rates = [day.get('bounceRate', 0) for day in self.ga_data if isinstance(day, dict) and day.get('bounceRate')]
            if bounce_rates:
                avg_bounce = sum(bounce_rates) / len(bounce_rates)
                if avg_bounce > 0.7:
                    self.add_issue('engagement', f' Taux de rebond élevé: {avg_bounce*100:.1f}% - Améliorez l\'expérience utilisateur', 'high')
                elif avg_bounce > 0.5:
                    self.add_issue('engagement', f' Taux de rebond moyen: {avg_bounce*100:.1f}% - Peut être amélioré', 'medium')
                else:
                    self.add_issue('engagement', f' Bon taux de rebond: {avg_bounce*100:.1f}%', 'low')
            
            # Pages vues par session
            if total_sessions > 0:
                pages_per_session = total_views / total_sessions
                if pages_per_session < 1.5:
                    self.add_issue('engagement', f' Faible nombre de pages par session: {pages_per_session:.1f} - Encouragez la navigation', 'medium')
                elif pages_per_session > 3:
                    self.add_issue('engagement', f' Bon nombre de pages par session: {pages_per_session:.1f}', 'low')
            
            # Tendance (si assez de données)
            if len(self.ga_data) >= 7:
                recent_users = sum([day.get('users', 0) for day in self.ga_data[-7:]])
                previous_users = sum([day.get('users', 0) for day in self.ga_data[-14:-7]])
                if previous_users > 0:
                    trend = ((recent_users - previous_users) / previous_users) * 100
                    if trend > 20:
                        self.add_issue('traffic', f' Bonne tendance: +{trend:.0f}% de visiteurs sur la dernière semaine', 'low')
                    elif trend < -20:
                        self.add_issue('traffic', f' Tendance négative: {trend:.0f}% de visiteurs - Analysez les causes', 'medium')
    
    def analyze_search_console_data(self):
        """Analyse les données Google Search Console"""
        if self.gsc_data and isinstance(self.gsc_data, list) and len(self.gsc_data) > 0:
            total_clicks = sum([row.get('clicks', 0) for row in self.gsc_data])
            total_impressions = sum([row.get('impressions', 0) for row in self.gsc_data])
            total_keywords = len(self.gsc_data)
            
            # CTR
            if total_impressions > 0:
                avg_ctr = total_clicks / total_impressions
                if avg_ctr < 0.01:
                    self.add_issue('seo', f' CTR très faible: {avg_ctr*100:.1f}% - Améliorez vos titres et meta descriptions', 'high')
                elif avg_ctr < 0.03:
                    self.add_issue('seo', f' CTR faible: {avg_ctr*100:.1f}% - Optimisez vos titres', 'medium')
                elif avg_ctr < 0.05:
                    self.add_issue('seo', f' CTR moyen: {avg_ctr*100:.1f}% - Peut être amélioré', 'low')
                else:
                    self.add_issue('seo', f' Bon CTR: {avg_ctr*100:.1f}%', 'low')
            
            # Position moyenne
            positions = [row.get('position', 0) for row in self.gsc_data if row.get('position')]
            if positions:
                avg_position = sum(positions) / len(positions)
                if avg_position > 30:
                    self.add_issue('seo', f' Position moyenne très basse: {avg_position:.1f} - Travaillez votre contenu et backlinks', 'high')
                elif avg_position > 15:
                    self.add_issue('seo', f' Position moyenne basse: {avg_position:.1f} - Optimisez votre contenu', 'medium')
                elif avg_position > 5:
                    self.add_issue('seo', f' Position moyenne correcte: {avg_position:.1f} - Continuez les efforts', 'low')
                else:
                    self.add_issue('seo', f' Excellente position moyenne: {avg_position:.1f}', 'low')
            
            # Nombre de mots-clés
            if total_keywords < 5:
                self.add_issue('seo', f' Peu de mots-clés positionnés: {total_keywords} - Travaillez votre contenu', 'medium')
            else:
                self.add_issue('seo', f' {total_keywords} mots-clés positionnés', 'low')
            
            # Top mot-clé
            if self.gsc_data:
                top_keyword = max(self.gsc_data, key=lambda x: x.get('clicks', 0))
                if top_keyword.get('clicks', 0) > 0:
                    self.add_issue('opportunity', f' Meilleur mot-clé: "{top_keyword.get("keyword", "")[:30]}" - {top_keyword.get("clicks")} clics', 'low')
            
            # Opportunités
            for row in self.gsc_data[:5]:
                impressions = row.get('impressions', 0)
                clicks = row.get('clicks', 0)
                position = row.get('position', 0)
                if impressions > 50 and clicks < 3:
                    self.add_issue('opportunity', f'💡 Opportunité: "{row.get("keyword", "")[:30]}" a {impressions} impressions mais peu de clics', 'medium')
                if position > 10 and position < 20 and impressions > 100:
                    self.add_issue('opportunity', f' Potentiel: "{row.get("keyword", "")[:30]}" position {position:.0f} - Optimisez pour passer en page 1', 'medium')
    
    def add_issue(self, category, message, priority='medium'):
        """Ajoute une issue à la liste des recommandations"""
        titles = {
            'title': ' Optimisation des titres',
            'meta': ' Meta descriptions',
            'structure': ' Structure HTML',
            'content': ' Contenu',
            'technical': ' Technique',
            'traffic': ' Trafic',
            'engagement': ' Engagement utilisateur',
            'seo': ' Performance SEO',
            'opportunity': ' Opportunité SEO'
        }
        
        priority_levels = {'high': 3, 'medium': 2, 'low': 1}
        
        self.recommendations.append({
            'category': category,
            'title': titles.get(category, ' Recommandation'),
            'message': message,
            'priority': priority,
            'priority_score': priority_levels.get(priority, 2)
        })
    
    def generate_recommendations(self):
        """Génère les recommandations finales triées par priorité"""
        self.recommendations.sort(key=lambda x: x['priority_score'], reverse=True)


def get_seo_recommendations(site_url, ga_data=None, gsc_data=None):
    """Fonction principale pour obtenir les recommandations SEO"""
    agent = SEOAgent(site_url, ga_data, gsc_data)
    recommendations = agent.analyze()
    return recommendations