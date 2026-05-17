"""
Module d'analyse sémantique pour le SEO
Utilise spaCy pour l'analyse NLP et scikit-learn pour les similarités
"""

import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import requests
from bs4 import BeautifulSoup
import re

class SemanticAnalyzer:
    """
    Analyseur sémantique pour le contenu web
    Permet d'analyser la qualité SEO d'une page
    """
    
    def __init__(self):
        """Initialise l'analyseur avec le modèle de langue français"""
        try:
            # Chargement du modèle de langue français
            self.nlp = spacy.load("fr_core_news_sm")
            print(" Modèle NLP chargé avec succès")
        except OSError:
            print(" Modèle non trouvé. Lancez: python -m spacy download fr_core_news_sm")
            raise

    def get_page_content(self, url):
        """
        Récupère et nettoie le contenu textuel d'une page web.
        
        Args:
            url (str): L'URL de la page à analyser
            
        Returns:
            str: Le contenu textuel nettoyé
        """
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Suppression des balises script et style
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()
            
            text = soup.get_text()
            # Nettoyage basique
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            return text
        except Exception as e:
            print(f"Erreur lors de l'extraction du contenu: {e}")
            return ""

    def preprocess_text(self, text):
        """
        Nettoie et lemmatise le texte pour l'analyse.
        
        Args:
            text (str): Le texte à traiter
            
        Returns:
            str: Texte lemmatisé sans stopwords
        """
        if not text:
            return ""
        doc = self.nlp(text)
        # Garde uniquement les mots non-stopwords et non-punctuations, puis les lemmatise
        tokens = [token.lemma_.lower() for token in doc if not token.is_stop and not token.is_punct and token.is_alpha]
        return " ".join(tokens)

    def calculate_similarity(self, text1, text2):
        """
        Calcule la similarité cosinus entre deux textes.
        
        Args:
            text1 (str): Premier texte
            text2 (str): Deuxième texte
            
        Returns:
            float: Score de similarité entre 0 et 1
        """
        if not text1 or not text2:
            return 0.0
        
        # Prétraitement des textes
        processed1 = self.preprocess_text(text1)
        processed2 = self.preprocess_text(text2)
        
        if not processed1 or not processed2:
            return 0.0
        
        # Création du vecteur TF-IDF
        vectorizer = TfidfVectorizer().fit_transform([processed1, processed2])
        vectors = vectorizer.toarray()
        
        # Calcul de la similarité cosinus
        cosine_sim = cosine_similarity(vectors)
        # La similarité est une matrice 2x2, on prend la valeur (0,1)
        return cosine_sim[0, 1]

    def extract_key_entities(self, text):
        """
        Extrait les entités nommées (personnes, organisations, lieux) du texte.
        
        Args:
            text (str): Le texte à analyser
            
        Returns:
            dict: Dictionnaire des entités par catégorie
        """
        doc = self.nlp(text)
        entities = {}
        for ent in doc.ents:
            if ent.label_ not in entities:
                entities[ent.label_] = []
            if ent.text not in entities[ent.label_]:
                entities[ent.label_].append(ent.text)
        return entities

    def analyze_keyword_density(self, text, keyword):
        """
        Analyse la densité d'un mot-clé dans le texte.
        
        Args:
            text (str): Le texte à analyser
            keyword (str): Le mot-clé à rechercher
            
        Returns:
            dict: Densité et occurrences
        """
        if not text or not keyword:
            return {"density": 0, "count": 0, "total_words": 0}
        
        words = text.lower().split()
        keyword_lower = keyword.lower()
        count = words.count(keyword_lower)
        total_words = len(words)
        density = (count / total_words) * 100 if total_words > 0 else 0
        
        return {
            "count": count,
            "total_words": total_words,
            "density": round(density, 2)
        }

    def check_semantic_coverage(self, url, target_keywords):
        """
        Vérifie la couverture sémantique de la page pour des mots-clés cibles.
        
        Args:
            url (str): URL de la page à analyser
            target_keywords (list): Liste des mots-clés cibles
            
        Returns:
            dict: Résultats de l'analyse sémantique
        """
        content = self.get_page_content(url)
        if not content:
            return {"error": "Impossible de récupérer le contenu"}
        
        processed_content = self.preprocess_text(content)
        results = {}
        
        for keyword in target_keywords:
            processed_keyword = self.preprocess_text(keyword)
            similarity = self.calculate_similarity(processed_content, processed_keyword)
            density = self.analyze_keyword_density(content, keyword)
            
            results[keyword] = {
                "similarity": round(similarity, 3),
                "density": density["density"],
                "occurrences": density["count"]
            }
        
        return results

    def generate_seo_recommendations(self, url, target_keywords):
        """
        Génère des recommandations SEO basées sur l'analyse sémantique.
        
        Args:
            url (str): URL de la page à analyser
            target_keywords (list): Liste des mots-clés cibles
            
        Returns:
            list: Recommandations SEO
        """
        analysis = self.check_semantic_coverage(url, target_keywords)
        
        if "error" in analysis:
            return [{"type": "error", "message": analysis["error"]}]
        
        recommendations = []
        
        for keyword, data in analysis.items():
            if data["similarity"] < 0.3:
                recommendations.append({
                    "type": "warning",
                    "priority": "high",
                    "keyword": keyword,
                    "message": f" Le mot-clé '{keyword}' est peu présent dans votre contenu",
                    "suggestion": f"Ajoutez le mot-clé '{keyword}' naturellement dans votre texte"
                })
            elif data["density"] > 3:
                recommendations.append({
                    "type": "warning",
                    "priority": "medium",
                    "keyword": keyword,
                    "message": f" Le mot-clé '{keyword}' est trop répété (densité {data['density']}%)",
                    "suggestion": "Réduisez la répétition pour éviter la sur-optimisation"
                })
            elif data["density"] < 0.5 and data["similarity"] < 0.5:
                recommendations.append({
                    "type": "info",
                    "priority": "low",
                    "keyword": keyword,
                    "message": f" Le mot-clé '{keyword}' pourrait être mieux intégré",
                    "suggestion": "Ajoutez des synonymes et variations du mot-clé"
                })
        
        return recommendations


# Test du module
if __name__ == "__main__":
    print(" Test du module d'analyse sémantique")
    print("-" * 50)
    
    # Initialisation
    analyzer = SemanticAnalyzer()
    
    # Test avec un exemple
    test_url = "https://fr.wikipedia.org/wiki/SEO"
    test_keywords = ["référencement", "optimisation", "moteur de recherche", "Google"]
    
    print(f"Analyse de l'URL: {test_url}")
    print(f"Mots-clés cibles: {test_keywords}")
    print("-" * 50)
    
    # Analyse sémantique
    results = analyzer.check_semantic_coverage(test_url, test_keywords)
    
    for keyword, data in results.items():
        print(f"\n Mot-clé: {keyword}")
        print(f"   Similarité: {data['similarity']}")
        print(f"   Densité: {data['density']}%")
        print(f"   Occurrences: {data['occurrences']}")
    
    # Recommandations
    print("\n" + "-" * 50)
    print(" Recommandations SEO:")
    recommendations = analyzer.generate_seo_recommendations(test_url, test_keywords)
    for rec in recommendations:
        print(f"   {rec['message']}")
        if 'suggestion' in rec:
            print(f"    Suggestion: {rec['suggestion']}")