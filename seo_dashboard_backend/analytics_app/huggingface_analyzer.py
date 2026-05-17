"""
Module d'analyse SEO avec Hugging Face (gratuit)
Utilise un modèle de zero-shot classification pour catégoriser les mots-clés
"""

import time
import os

# ================= AUTHENTIFICATION =================
# Le token est lu depuis les variables d'environnement (jamais en dur dans le code)
HF_TOKEN = os.environ.get("HUGGINGFACE_TOKEN")

# Chargement différé — le modèle n'est chargé qu'à la première utilisation
_classifier = None

def get_classifier():
    """Charge le modèle une seule fois (lazy loading)."""
    global _classifier
    if _classifier is None:
        try:
            from huggingface_hub import login
            from transformers import pipeline

            if HF_TOKEN:
                login(token=HF_TOKEN)
                print("Hugging Face authentifié")

            print("Chargement du modèle... (peut prendre quelques secondes)")
            _classifier = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli"
            )
            print("Modèle chargé avec succès")
        except Exception as e:
            print(f"Erreur chargement modèle Hugging Face: {e}")
            _classifier = None
    return _classifier


# ================= CATÉGORIES SEO =================
SEO_CATEGORIES = [
    "local SEO",
    "content marketing",
    "technical SEO",
    "brand SEO",
    "informational query",
    "transactional query",
]

# ================= FONCTIONS PRINCIPALES =================

def categorize_keyword(keyword):
    """
    Catégorise un mot-clé SEO en utilisant l'IA Hugging Face.
    """
    if not keyword or keyword.strip() == "":
        return {"category": "unknown", "confidence": 0}

    classifier = get_classifier()
    if not classifier:
        return {"keyword": keyword, "category": "unknown", "confidence": 0}

    try:
        result = classifier(keyword, SEO_CATEGORIES)
        return {
            "keyword": keyword,
            "category": result['labels'][0],
            "confidence": result['scores'][0],
            "all_scores": dict(zip(result['labels'], result['scores']))
        }
    except Exception as e:
        print(f"Erreur avec '{keyword}': {e}")
        return {"keyword": keyword, "category": "error", "confidence": 0}


def analyze_keywords_batch(keywords, batch_size=5):
    """
    Analyse un lot de mots-clés.
    """
    results = []
    total = len(keywords)
    print(f"Analyse de {total} mots-clés...")

    for i, keyword in enumerate(keywords):
        if keyword and keyword.strip():
            result = categorize_keyword(keyword)
            results.append(result)
            print(f"  {i+1}/{total}: {keyword[:50]} -> {result['category']} ({result['confidence']:.2f})")
            time.sleep(0.05)

    print(f"Analyse terminée : {len(results)} mots-clés catégorisés")
    return results


def get_category_recommendation(category):
    """
    Génère une recommandation SEO basée sur la catégorie détectée.
    """
    recommendations = {
        "local SEO": {
            "title": "Optimisez votre SEO local",
            "description": "Vos mots-clés sont principalement locaux. Ajoutez votre adresse sur Google Maps et collectez des avis.",
            "action": "Créer une fiche Google Business Profile",
            "priority": "Haute"
        },
        "content marketing": {
            "title": "Développez votre contenu",
            "description": "Créez des articles de blog, des guides et des FAQ pour répondre aux questions des utilisateurs.",
            "action": "Publier 2-3 articles par semaine",
            "priority": "Moyenne"
        },
        "technical SEO": {
            "title": "Améliorez votre SEO technique",
            "description": "Vérifiez la vitesse du site, l'indexation et les erreurs 404.",
            "action": "Faire un audit technique SEO",
            "priority": "Haute"
        },
        "brand SEO": {
            "title": "Renforcez votre marque",
            "description": "Développez votre présence sur les réseaux sociaux et les annuaires.",
            "action": "Créer des profils sociaux cohérents",
            "priority": "Moyenne"
        },
        "informational query": {
            "title": "Créez du contenu éducatif",
            "description": "Les utilisateurs cherchent des informations. Proposez des tutoriels et guides.",
            "action": "Créer une section blog/ressources",
            "priority": "Moyenne"
        },
        "transactional query": {
            "title": "Optimisez vos conversions",
            "description": "Les utilisateurs sont prêts à acheter. Simplifiez le parcours d'achat.",
            "action": "A/B tester les pages de paiement",
            "priority": "Haute"
        }
    }

    return recommendations.get(category, {
        "title": "Analyse SEO complète",
        "description": "Divers types de mots-clés détectés.",
        "action": "Audit SEO global",
        "priority": "Moyenne"
    })


def analyze_keywords_with_stats(keywords):
    """
    Analyse les mots-clés et retourne des statistiques.
    """
    if not keywords:
        return {
            "total": 0,
            "categories": {},
            "recommendations": [],
            "top_categories": []
        }

    analyses = analyze_keywords_batch(keywords)

    category_count = {}
    for analysis in analyses:
        cat = analysis.get('category', 'unknown')
        category_count[cat] = category_count.get(cat, 0) + 1

    sorted_categories = sorted(category_count.items(), key=lambda x: x[1], reverse=True)

    recommendations = []
    for cat, count in sorted_categories[:3]:
        rec = get_category_recommendation(cat)
        rec['keywords_count'] = count
        recommendations.append(rec)

    return {
        "total": len(analyses),
        "categories": category_count,
        "top_categories": [cat for cat, _ in sorted_categories],
        "recommendations": recommendations,
        "details": analyses
    }