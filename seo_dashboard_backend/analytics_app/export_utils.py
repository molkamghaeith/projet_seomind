import pandas as pd
from django.http import HttpResponse
from datetime import datetime
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


def build_excel_csv_response(df, filename):
    csv_content = df.to_csv(index=False, sep=';', lineterminator='\n')
    response = HttpResponse(
        '\ufeff' + csv_content,
        content_type='text/csv; charset=utf-8',
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


def export_seo_to_csv(seo_data, website_name):
    """Exporte les données SEO en CSV"""
    if not seo_data:
        df = pd.DataFrame(columns=['Mot-clé', 'Clics', 'Impressions', 'CTR (%)', 'Position'])
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="seo_report_{website_name}_{datetime.now().strftime("%Y%m%d")}.csv"'
        df.to_csv(response, index=False, encoding='utf-8-sig')
        return response
    
    df = pd.DataFrame(seo_data)
    
    column_mapping = {
        'keyword': 'Mot-clé',
        'clicks': 'Clics',
        'impressions': 'Impressions',
        'ctr': 'CTR (%)',
        'position': 'Position'
    }
    df = df.rename(columns=column_mapping)
    
    if 'CTR (%)' in df.columns:
        df['CTR (%)'] = df['CTR (%)'].apply(lambda x: f"{x*100:.2f}%" if isinstance(x, (int, float)) else x)
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="seo_report_{website_name}_{datetime.now().strftime("%Y%m%d")}.csv"'
    
    df.to_csv(response, index=False, encoding='utf-8-sig')
    return response


def export_analytics_to_csv(ga_data, website_name):
    """Exporte les données Google Analytics en CSV"""
    if not ga_data:
        df = pd.DataFrame(columns=['Date', 'Utilisateurs', 'Sessions', 'Pages vues'])
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="analytics_report_{website_name}_{datetime.now().strftime("%Y%m%d")}.csv"'
        df.to_csv(response, index=False, encoding='utf-8-sig')
        return response
    
    df = pd.DataFrame(ga_data)
    
    column_mapping = {
        'date': 'Date',
        'users': 'Utilisateurs',
        'sessions': 'Sessions',
        'views': 'Pages vues',
    }
    df = df.rename(columns=column_mapping)
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="analytics_report_{website_name}_{datetime.now().strftime("%Y%m%d")}.csv"'
    
    df.to_csv(response, index=False, encoding='utf-8-sig')
    return response


def export_seo_to_csv(seo_data, website_name):
    """Exporte les donnees SEO dans un CSV lisible directement par Excel."""
    filename = f'seo_report_{website_name}_{datetime.now().strftime("%Y%m%d")}.csv'

    if not seo_data:
        df = pd.DataFrame(columns=['Mot-clé', 'Clics', 'Impressions', 'CTR (%)', 'Position'])
        return build_excel_csv_response(df, filename)

    df = pd.DataFrame(seo_data)
    df = df.rename(columns={
        'keyword': 'Mot-clé',
        'clicks': 'Clics',
        'impressions': 'Impressions',
        'ctr': 'CTR (%)',
        'position': 'Position',
        'is_simulated': 'Donnée simulée',
    })

    if 'CTR (%)' in df.columns:
        df['CTR (%)'] = df['CTR (%)'].apply(
            lambda x: f"{x * 100:.2f}%" if isinstance(x, (int, float)) else x
        )

    columns = ['Mot-clé', 'Clics', 'Impressions', 'CTR (%)', 'Position']
    if 'Donnée simulée' in df.columns:
        columns.append('Donnée simulée')
    df = df[[column for column in columns if column in df.columns]]

    return build_excel_csv_response(df, filename)


def export_analytics_to_csv(ga_data, website_name):
    """Exporte les donnees Google Analytics dans un CSV lisible directement par Excel."""
    filename = f'analytics_report_{website_name}_{datetime.now().strftime("%Y%m%d")}.csv'

    if not ga_data:
        df = pd.DataFrame(columns=['Date', 'Utilisateurs', 'Sessions', 'Pages vues'])
        return build_excel_csv_response(df, filename)

    df = pd.DataFrame(ga_data)
    df = df.rename(columns={
        'date': 'Date',
        'users': 'Utilisateurs',
        'sessions': 'Sessions',
        'views': 'Pages vues',
    })

    return build_excel_csv_response(df, filename)


def export_full_report_pdf(gsc_data, ga_data, website_name, website_url):
    """Exporte un rapport complet en PDF - Version professionnelle"""
    
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # 🔧 Conversion des données pour éviter les erreurs de type
    converted_ga_data = []
    for item in ga_data:
        converted_item = {}
        for key, value in item.items():
            try:
                if isinstance(value, (int, float)):
                    converted_item[key] = value
                elif isinstance(value, str) and value.isdigit():
                    converted_item[key] = int(value)
                else:
                    converted_item[key] = value
            except (ValueError, TypeError):
                converted_item[key] = value
        converted_ga_data.append(converted_item)
    
    converted_gsc_data = []
    for item in gsc_data:
        converted_item = {}
        for key, value in item.items():
            if key in ['clicks', 'impressions', 'position']:
                try:
                    converted_item[key] = int(float(value)) if value else 0
                except (ValueError, TypeError):
                    converted_item[key] = 0
            elif key == 'ctr':
                try:
                    converted_item[key] = float(value) if value else 0
                except (ValueError, TypeError):
                    converted_item[key] = 0
            else:
                converted_item[key] = value
        converted_gsc_data.append(converted_item)
    
    ga_data = converted_ga_data
    gsc_data = converted_gsc_data
    
    # Couleurs SEOmind
    PRIMARY_COLOR = colors.HexColor('#6366f1')      # Violet
    SECONDARY_COLOR = colors.HexColor('#1f2937')    # Gris foncé
    ACCENT_COLOR = colors.HexColor('#10b981')       # Vert
    BORDER_COLOR = colors.HexColor('#e5e7eb')       # Gris clair
    TEXT_COLOR = colors.HexColor('#374151')         # Gris texte
    CARD_BG = colors.white                          # Fond blanc pour les cartes
    
    # ================= EN-TÊTE =================
    p.setStrokeColor(PRIMARY_COLOR)
    p.setLineWidth(3)
    p.line(50, height - 40, width - 50, height - 40)
    
    # Logo SEOmind - SANS ESPACE
    p.setFont("Helvetica-Bold", 24)
    p.setFillColor(PRIMARY_COLOR)
    p.drawString(50, height - 65, "SEO")
    p.setFillColor(SECONDARY_COLOR)
    p.drawString(100, height - 65, "mind")
    
    p.setFont("Helvetica", 9)
    p.setFillColor(TEXT_COLOR)
    p.drawString(50, height - 80, "Dashboard SEO Intelligent")
    
    p.setFont("Helvetica", 9)
    p.drawRightString(width - 50, height - 65, datetime.now().strftime('%d/%m/%Y'))
    p.drawRightString(width - 50, height - 80, datetime.now().strftime('%H:%M'))
    
    # ================= TITRE PRINCIPAL =================
    p.setFont("Helvetica-Bold", 20)
    p.setFillColor(SECONDARY_COLOR)
    p.drawCentredString(width / 2, height - 130, f"Rapport SEO")
    
    p.setFont("Helvetica", 12)
    p.setFillColor(TEXT_COLOR)
    p.drawCentredString(width / 2, height - 155, website_name)
    
    p.setFont("Helvetica", 9)
    p.setFillColor(colors.HexColor('#6b7280'))
    p.drawCentredString(width / 2, height - 172, website_url)
    
    p.setStrokeColor(BORDER_COLOR)
    p.setLineWidth(0.5)
    p.line(50, height - 190, width - 50, height - 190)
    
    y = height - 220
    
    # ================= SECTION GOOGLE ANALYTICS =================
    # Cercle numéro
    p.setFillColor(PRIMARY_COLOR)
    p.rect(50, y - 5, 20, 20, fill=1, stroke=0)
    p.setFillColor(colors.white)
    p.setFont("Helvetica-Bold", 12)
    p.drawString(55, y, "1")
    
    p.setFillColor(SECONDARY_COLOR)
    p.setFont("Helvetica-Bold", 14)
    p.drawString(80, y, "Google Analytics")
    y -= 30
    
    if ga_data:
        total_users = 0
        total_sessions = 0
        total_views = 0
        
        for item in ga_data:
            try:
                total_users += int(item.get('users', 0)) if item.get('users') else 0
            except (ValueError, TypeError):
                pass
            try:
                total_sessions += int(item.get('sessions', 0)) if item.get('sessions') else 0
            except (ValueError, TypeError):
                pass
            try:
                total_views += int(item.get('views', 0)) if item.get('views') else 0
            except (ValueError, TypeError):
                pass
        
        # ===== CARTES KPI AVEC BON ESPACEMENT =====
        # Carte Utilisateurs - Hauteur 65 pour meilleur espacement
        p.setFillColor(CARD_BG)
        p.setStrokeColor(PRIMARY_COLOR)
        p.setLineWidth(1.5)
        p.roundRect(50, y - 60, 150, 60, 10, fill=1, stroke=1)
        p.setFont("Helvetica-Bold", 22)
        p.setFillColor(PRIMARY_COLOR)
        p.drawString(70, y - 38, f"{total_users}")
        p.setFont("Helvetica", 10)
        p.setFillColor(TEXT_COLOR)
        p.drawString(70, y - 18, "Utilisateurs")
        
        # Carte Sessions
        p.setFillColor(CARD_BG)
        p.setStrokeColor(ACCENT_COLOR)
        p.roundRect(210, y - 60, 150, 60, 10, fill=1, stroke=1)
        p.setFont("Helvetica-Bold", 22)
        p.setFillColor(ACCENT_COLOR)
        p.drawString(230, y - 38, f"{total_sessions}")
        p.setFont("Helvetica", 10)
        p.setFillColor(TEXT_COLOR)
        p.drawString(230, y - 18, "Sessions")
        
        # Carte Pages vues
        p.setFillColor(CARD_BG)
        p.setStrokeColor(colors.HexColor('#f59e0b'))
        p.roundRect(370, y - 60, 150, 60, 10, fill=1, stroke=1)
        p.setFont("Helvetica-Bold", 22)
        p.setFillColor(colors.HexColor('#f59e0b'))
        p.drawString(390, y - 38, f"{total_views}")
        p.setFont("Helvetica", 10)
        p.setFillColor(TEXT_COLOR)
        p.drawString(390, y - 18, "Pages vues")
        
        y -= 80
        
        # Tableau des données
        p.setFont("Helvetica-Bold", 10)
        p.setFillColor(SECONDARY_COLOR)
        p.drawString(50, y, "Détail journalier")
        y -= 20
        
        # En-têtes du tableau
        p.setFillColor(PRIMARY_COLOR)
        p.rect(50, y - 18, 500, 18, fill=1, stroke=0)
        p.setFillColor(colors.white)
        p.setFont("Helvetica-Bold", 9)
        p.drawString(55, y - 12, "Date")
        p.drawString(180, y - 12, "Utilisateurs")
        p.drawString(280, y - 12, "Sessions")
        p.drawString(380, y - 12, "Pages vues")
        y -= 25
        
        p.setFont("Helvetica", 8)
        p.setFillColor(TEXT_COLOR)
        
        row_num = 0
        for item in ga_data[-10:]:
            if y < 80:
                p.showPage()
                y = height - 50
                p.setFillColor(PRIMARY_COLOR)
                p.rect(50, y - 18, 500, 18, fill=1, stroke=0)
                p.setFillColor(colors.white)
                p.setFont("Helvetica-Bold", 9)
                p.drawString(55, y - 12, "Date")
                p.drawString(180, y - 12, "Utilisateurs")
                p.drawString(280, y - 12, "Sessions")
                p.drawString(380, y - 12, "Pages vues")
                y -= 15
            
            if row_num % 2 == 0:
                p.setFillColor(colors.HexColor('#f9fafb'))
                p.rect(50, y - 12, 500, 14, fill=1, stroke=0)
            
            p.setFillColor(TEXT_COLOR)
            p.drawString(55, y - 6, str(item.get('date', '')))
            
            users_val = int(item.get('users', 0)) if item.get('users') else 0
            sessions_val = int(item.get('sessions', 0)) if item.get('sessions') else 0
            views_val = int(item.get('views', 0)) if item.get('views') else 0
            
            p.drawString(180, y - 6, str(users_val))
            p.drawString(280, y - 6, str(sessions_val))
            p.drawString(380, y - 6, str(views_val))
            y -= 14
            row_num += 1
    else:
        p.setFont("Helvetica", 10)
        p.setFillColor(TEXT_COLOR)
        p.drawString(50, y, "Aucune donnée Google Analytics disponible")
        y -= 30
    
    y -= 30
    
    # ================= SECTION SEARCH CONSOLE =================
    if y < 150:
        p.showPage()
        y = height - 50
    
    # Cercle numéro
    p.setFillColor(PRIMARY_COLOR)
    p.rect(50, y - 5, 20, 20, fill=1, stroke=0)
    p.setFillColor(colors.white)
    p.setFont("Helvetica-Bold", 12)
    p.drawString(55, y, "2")
    
    p.setFillColor(SECONDARY_COLOR)
    p.setFont("Helvetica-Bold", 14)
    p.drawString(80, y, "Search Console")
    y -= 30
    
    if gsc_data:
        total_clicks = 0
        total_impressions = 0
        
        for item in gsc_data:
            try:
                total_clicks += int(item.get('clicks', 0)) if item.get('clicks') else 0
            except (ValueError, TypeError):
                pass
            try:
                total_impressions += int(item.get('impressions', 0)) if item.get('impressions') else 0
            except (ValueError, TypeError):
                pass
        
        # ===== CARTES SEO AVEC BON ESPACEMENT =====
        # Carte Clics totaux - Hauteur 50
        p.setFillColor(CARD_BG)
        p.setStrokeColor(ACCENT_COLOR)
        p.roundRect(50, y - 45, 240, 45, 8, fill=1, stroke=1)
        p.setFont("Helvetica-Bold", 20)
        p.setFillColor(ACCENT_COLOR)
        p.drawString(70, y - 30, f"{total_clicks}")
        p.setFont("Helvetica", 9)
        p.setFillColor(TEXT_COLOR)
        p.drawString(70, y - 12, "Clics totaux")
        
        # Carte Impressions totales
        p.setFillColor(CARD_BG)
        p.setStrokeColor(colors.HexColor('#f59e0b'))
        p.roundRect(310, y - 45, 240, 45, 8, fill=1, stroke=1)
        p.setFont("Helvetica-Bold", 20)
        p.setFillColor(colors.HexColor('#f59e0b'))
        p.drawString(330, y - 30, f"{total_impressions}")
        p.setFont("Helvetica", 9)
        p.setFillColor(TEXT_COLOR)
        p.drawString(330, y - 12, "Impressions totales")
        
        y -= 65
        
        # En-têtes du tableau SEO
        p.setFillColor(PRIMARY_COLOR)
        p.rect(50, y - 18, 500, 18, fill=1, stroke=0)
        p.setFillColor(colors.white)
        p.setFont("Helvetica-Bold", 8)
        p.drawString(55, y - 12, "Mot-clé")
        p.drawString(260, y - 12, "Clics")
        p.drawString(320, y - 12, "Impressions")
        p.drawString(390, y - 12, "CTR")
        p.drawString(450, y - 12, "Position")
        y -= 22
        
        p.setFont("Helvetica", 7)
        p.setFillColor(TEXT_COLOR)
        
        row_num = 0
        for item in gsc_data[:15]:
            if y < 80:
                p.showPage()
                y = height - 50
                p.setFillColor(PRIMARY_COLOR)
                p.rect(50, y - 18, 500, 18, fill=1, stroke=0)
                p.setFillColor(colors.white)
                p.setFont("Helvetica-Bold", 8)
                p.drawString(55, y - 12, "Mot-clé")
                p.drawString(260, y - 12, "Clics")
                p.drawString(320, y - 12, "Impressions")
                p.drawString(390, y - 12, "CTR")
                p.drawString(450, y - 12, "Position")
                y -= 15
            
            if row_num % 2 == 0:
                p.setFillColor(colors.HexColor('#f9fafb'))
                p.rect(50, y - 10, 500, 12, fill=1, stroke=0)
            
            p.setFillColor(TEXT_COLOR)
            keyword = item.get('keyword', '')[:35]
            p.drawString(55, y - 5, keyword)
            
            clicks_val = int(item.get('clicks', 0)) if item.get('clicks') else 0
            impressions_val = int(item.get('impressions', 0)) if item.get('impressions') else 0
            ctr_val = float(item.get('ctr', 0)) if item.get('ctr') else 0
            position_val = float(item.get('position', 0)) if item.get('position') else 0
            
            p.drawString(260, y - 5, str(clicks_val))
            p.drawString(320, y - 5, str(impressions_val))
            p.drawString(390, y - 5, f"{ctr_val*100:.1f}%" if ctr_val else "0%")
            p.drawString(450, y - 5, f"{position_val:.1f}" if position_val else "0")
            y -= 12
            row_num += 1
    else:
        p.setFont("Helvetica", 10)
        p.setFillColor(TEXT_COLOR)
        p.drawString(50, y, "Aucune donnée Search Console disponible")
    
    # ================= PIED DE PAGE =================
    p.setStrokeColor(BORDER_COLOR)
    p.setLineWidth(0.5)
    p.line(50, 45, width - 50, 45)
    
    p.setFont("Helvetica", 8)
    p.setFillColor(colors.HexColor('#9ca3af'))
    p.drawString(50, 30, f"Rapport généré par SEOmind - Dashboard SEO Intelligent")
    p.drawRightString(width - 50, 30, datetime.now().strftime('%d/%m/%Y à %H:%M'))
    
    p.save()
    buffer.seek(0)
    
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="seo_full_report_{website_name}_{datetime.now().strftime("%Y%m%d")}.pdf"'
    
    return response
