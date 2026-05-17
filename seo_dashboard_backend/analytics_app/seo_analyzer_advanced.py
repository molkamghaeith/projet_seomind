                                                         """
Module d'analyse SEO avancée
Analyse technique du site et génère des corrections spécifiques
"""

import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import re


class SEOAnalyzer:
    """
    Analyseur SEO complet d'un site web
    Cette classe examine tous les aspects techniques SEO d'une page
    """
    
    def __init__(self, site_url):
        """
        Initialise l'analyseur avec l'URL du site
        
        Args:
            site_url (str): L'URL du site à analyser (ex: https://monsite.com)
        """
        self.site_url = site_url.rstrip('/')
        self.issues = []        # Liste des problèmes détectés
        self.recommendations = []  # Liste des bonnes pratiques
        
    def analyze_all(self):
        """
        Lance toutes les analyses et retourne les résultats
        
        Returns:
            dict: Score SEO + problèmes + recommandations
        """
        # Appel de toutes les méthodes d'analyse
        self.check_page_loading()
        self.check_meta_tags()
        self.check_images()
        self.check_headings()
        self.check_url_structure()
        
        return {
            "score": self.calculate_score(),
            "issues": self.issues,
            "recommendations": self.recommendations
        }
    
    def check_page_loading(self):
        """
        Vérifie si la page se charge correctement
        - Code HTTP (200 = OK, 404 = erreur, etc.)
        - Temps de réponse
        """
        try:
            # Tente de télécharger la page (timeout = 10 secondes)
            response = requests.get(self.site_url, timeout=10)
            
            # Code 200 = succès
            if response.status_code == 200:
                self.recommendations.append({
                    "type": "success",
                    "title": "✅ Site accessible",
                    "description": f"Le site répond correctement (code HTTP {response.status_code})"
                })
                return response
            else:
                self.issues.append({
                    "type": "error",
                    "title": "❌ Site inaccessible",
                    "description": f"Le site retourne une erreur HTTP {response.status_code}"
                })
                return None
                
        except requests.exceptions.Timeout:
            self.issues.append({
                "type": "error",
                "title": "⏱️ Site trop lent",
                "description": "Le site met plus de 10 secondes à répondre"
            })
        except Exception as e:
            self.issues.append({
                "type": "error",
                "title": "❌ Erreur de connexion",
                "description": str(e)
            })
        return None
    
    def check_meta_tags(self):
        """
        Analyse les balises meta essentielles :
        - Balise Title (titre de la page)
        - Meta description (description affichée dans Google)
        - Viewport (compatibilité mobile)
        """
        try:
            # Télécharger et analyser le HTML
            response = requests.get(self.site_url, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # ========== ANALYSE DE LA BALISE TITLE ==========
            title = soup.find('title')
            
            if not title or not title.string:
                self.issues.append({
                    "type": "critical",
                    "title": "📝 Balise Title manquante",
                    "description": "Chaque page doit avoir une balise <title>",
                    "suggestion": "Ajoutez <title>Votre Titre - Nom du Site</title>"
                })
            else:
                title_len = len(title.string)
                
                if title_len < 30:
                    self.issues.append({
                        "type": "warning",
                        "title": "⚠️ Titre trop court",
                        "description": f"Le titre fait {title_len} caractères (minimum 30)",
                        "suggestion": f"Ajoutez des mots-clés : {title.string} - Votre Ville"
                    })
                elif title_len > 60:
                    self.issues.append({
                        "type": "warning",
                        "title": "⚠️ Titre trop long",
                        "description": f"Le titre fait {title_len} caractères (maximum 60)",
                        "suggestion": f"Raccourcissez : {title.string[:57]}..."
                    })
                else:
                    self.recommendations.append({
                        "type": "success",
                        "title": "✅ Titre bien dimensionné",
                        "description": f"Le titre fait {title_len} caractères"
                    })
            
            # ========== ANALYSE DE LA META DESCRIPTION ==========
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            
            if not meta_desc or not meta_desc.get('content'):
                self.issues.append({
                    "type": "critical",
                    "title": "📄 Meta Description manquante",
                    "description": "Google affichera un texte automatique peu pertinent",
                    "suggestion": "Ajoutez une meta description de 150-160 caractères"
                })
            else:
                desc_len = len(meta_desc.get('content', ''))
                
                if desc_len < 120:
                    self.issues.append({
                        "type": "warning",
                        "title": "⚠️ Meta description trop courte",
                        "description": f"La description fait {desc_len} caractères (150 recommandés)",
                        "suggestion": "Développez la description avec plus d'informations"
                    })
                elif desc_len > 160:
                    self.issues.append({
                        "type": "warning",
                        "title": "⚠️ Meta description trop longue",
                        "description": f"La description fait {desc_len} caractères (max 160)",
                        "suggestion": "Raccourcissez la description pour éviter la coupure"
                    })
                else:
                    self.recommendations.append({
                        "type": "success",
                        "title": "✅ Meta description bien dimensionnée",
                        "description": f"La description fait {desc_len} caractères"
                    })
            
            # ========== ANALYSE DU VIEWPORT (MOBILE) ==========
            viewport = soup.find('meta', attrs={'name': 'viewport'})
            
            if not viewport:
                self.issues.append({
                    "type": "critical",
                    "title": "📱 Balise viewport manquante",
                    "description": "Le site n'est pas optimisé pour les mobiles",
                    "suggestion": "Ajoutez <meta name='viewport' content='width=device-width, initial-scale=1'>"
                })
                
        except Exception as e:
            self.issues.append({
                "type": "error",
                "title": "❌ Erreur d'analyse",
                "description": f"Impossible d'analyser les balises: {str(e)}"
            })
    
    def check_images(self):
        """
        Vérifie les attributs 'alt' des images
        L'attribut alt est important pour :
        - Le SEO (Google l'utilise pour comprendre l'image)
        - L'accessibilité (lecteurs d'écran pour malvoyants)
        """
        try:
            response = requests.get(self.site_url, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            images = soup.find_all('img')
            
            images_without_alt = []
            for img in images:
                alt = img.get('alt')
                if not alt or alt == '':
                    images_without_alt.append(img.get('src', 'image inconnue'))
            
            if images_without_alt:
                self.issues.append({
                    "type": "warning",
                    "title": f"🖼️ {len(images_without_alt)} image(s) sans attribut alt",
                    "description": "L'attribut 'alt' aide Google à comprendre l'image",
                    "suggestion": "Ajoutez alt='description de l'image'"
                })
            elif len(images) > 0:
                self.recommendations.append({
                    "type": "success",
                    "title": "✅ Toutes les images ont un attribut alt",
                    "description": f"{len(images)} image(s) vérifiée(s)"
                })
                
        except Exception as e:
            pass
    
    def check_headings(self):
        """
        Analyse la structure des titres (H1, H2, H3)
        Importance :
        - H1 : titre principal (1 seule fois)
        - H2 : sous-titres principaux
        - H3 : sous-sections
        """
        try:
            response = requests.get(self.site_url, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            h1_tags = soup.find_all('h1')
            h2_tags = soup.find_all('h2')
            h3_tags = soup.find_all('h3')
            
            # Analyse des H1
            if len(h1_tags) == 0:
                self.issues.append({
                    "type": "critical",
                    "title": "📌 Aucune balise H1 trouvée",
                    "description": "Le H1 est le titre principal de la page",
                    "suggestion": "Ajoutez <h1>Votre titre principal</h1>"
                })
            elif len(h1_tags) > 1:
                self.issues.append({
                    "type": "warning",
                    "title": "⚠️ Plusieurs balises H1",
                    "description": f"{len(h1_tags)} balises H1 trouvées (1 seule recommandée)",
                    "suggestion": "Conservez un seul H1 et utilisez H2 pour les sous-sections"
                })
            else:
                self.recommendations.append({
                    "type": "success",
                    "title": "✅ Structure H1 correcte",
                    "description": f"1 balise H1 : '{h1_tags[0].text[:50]}'"
                })
            
            # Analyse des H2
            if len(h2_tags) < 2:
                self.issues.append({
                    "type": "warning",
                    "title": "⚠️ Peu de balises H2",
                    "description": f"{len(h2_tags)} balise(s) H2 trouvée(s)",
                    "suggestion": "Structurez votre contenu avec des sous-titres H2"
                })
            else:
                self.recommendations.append({
                    "type": "success",
                    "title": "✅ Bonne structure H2",
                    "description": f"{len(h2_tags)} balises H2 trouvées"
                })
                
        except Exception as e:
            pass
    
    def check_url_structure(self):
        """
        Vérifie la structure de l'URL
        Une bonne URL SEO doit être :
        - Courte
        - Lisible
        - Contenir des mots-clés
        """
        parsed = urlparse(self.site_url)
        
        if parsed.path and len(parsed.path) > 50:
            self.issues.append({
                "type": "warning",
                "title": "🔗 URL trop longue",
                "description": f"L'URL fait {len(parsed.path)} caractères",
                "suggestion": "Utilisez des URLs courtes et descriptives"
            })
        elif parsed.path and len(parsed.path) > 0:
            self.recommendations.append({
                "type": "success",
                "title": "✅ URL bien structurée",
                "description": f"Longueur d'URL : {len(parsed.path)} caractères"
            })
    
    def calculate_score(self):
        """
        Calcule un score SEO sur 100 points
        Chaque problème critique enlève 15 points
        Chaque avertissement enlève 5 points
        """
        score = 100
        
        for issue in self.issues:
            if issue['type'] == 'critical':
                score -= 15
            elif issue['type'] == 'warning':
                score -= 5
            elif issue['type'] == 'error':
                score -= 10
        
        return max(0, min(100, score))

# ================= INTÉGRATION HUGGING FACE =================

def analyze_keywords_with_huggingface(search_console_data):
    """
    Analyse les mots-clés avec Hugging Face et génère des recommandations
    """
    from .huggingface_analyzer import analyze_keywords_batch, get_category_recommendation
    
    if not search_console_data:
        return None
    
    keywords = [row.get('keyword', '') for row in search_console_data if row.get('keyword')]
    
    if not keywords:
        return None
    
    # Analyser avec Hugging Face
    analyses = analyze_keywords_batch(keywords)
    
    if not analyses:
        return None
    
    # Compter les catégories
    category_count = {}
    for analysis in analyses:
        cat = analysis.get('category', 'unknown')
        category_count[cat] = category_count.get(cat, 0) + 1
    
    if not category_count:
        return None
    
    # Trouver la catégorie dominante
    dominant_category = max(category_count, key=category_count.get)
    
    # Obtenir la recommandation
    recommendation = get_category_recommendation(dominant_category)
    
    return {
        'title': recommendation['title'],
        'description': recommendation['description'],
        'recommendation_type': 'ai_huggingface',
        'priority': 1,
        'action': recommendation['action'],
        'details': {
            'dominant_category': dominant_category,
            'category_distribution': category_count,
            'keywords_analyzed': len(analyses)
        }
    }
def analyze_website_seo(site_url):
    """
    Fonction principale à appeler depuis l'API
    
    Args:
        site_url (str): URL du site à analyser
        
    Returns:
        dict: Résultats complets de l'analyse
    """
    analyzer = SEOAnalyzer(site_url)
    results = analyzer.analyze_all()
    return results


# Test du module (exécuté uniquement si on lance ce fichier directement)
if __name__ == "__main__":
    print("🔍 Test du module d'analyse SEO avancée")
    print("-" * 50)
    
    # Tester avec le site Titanium Gym
    results = analyze_website_seo("https://titanium-gym-xi.vercel.app/")
    
    print(f" Score SEO: {results['score']}/100")
    print(f"\n Problèmes détectés ({len(results['issues'])}):")
    for issue in results['issues']:
        print(f"  - {issue['title']}")
    print(f"\n Bonnes pratiques ({len(results['recommendations'])}):")
    for rec in results['recommendations']:
        print(f"  - {rec['title']}")