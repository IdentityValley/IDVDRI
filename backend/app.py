import os
import json
import pandas as pd
from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
# Optional LLM integration (disabled if SDK/credentials not available)
try:
    from vertexai.preview.generative_models import GenerativeModel
    _vertex_available = True
except Exception:
    _vertex_available = False

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# Define the path to the CSV file (absolute, based on this file's location)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CSV_FILE_PATH = os.path.join(BASE_DIR, 'Indicator_Shortlist_with_Q_Rationale.csv')
COMPANIES_FILE = 'companies.json'

# Initialize Vertex AI lazily only if available; avoid crashing without auth
_model = None
if _vertex_available:
    try:
        _model = GenerativeModel("gemini-pro")
    except Exception:
        _model = None

# --- Static Indicators (hardcoded from CSV) ---
INDICATORS_STATIC = [
    {
        'Criterion/Metric Name': 'Digital Literacy Policy & Governance',
        'DRG Short Code': '1',
        'Question': 'To what extent does the organisation have a formal accessibility policy/strategy with an active governance body overseeing its implementation?',
        'Rationale': 'Policy and governance turn intentions into accountable practice, ensuring digital literacy efforts are resourced, coordinated, and sustained.',
        'Scoring Logic': '0=None; 1=Initial; 2=Formal policy; 3=Policy with governance; 4=Active governance; 5=Embedded practice',
        'Legend': 'None – no policy or governance; Ad hoc – informal practices/awareness; Formal policy – policy exists and communicated; Policy with governance – governance body meets occasionally; Active governance – governance with monitoring and updates; Embedded practice – regular review and visible influence on decisions;',
        'Primary DRG': 'DRG#1: Digital Literacy',
        'Other Applicable DRGs': '–'
    },
    {
        'Criterion/Metric Name': 'Capacity building',
        'DRG Short Code': '1',
        'Question': 'To what extent does the organisation provide training and capacity building for staff on the responsible use of digital technologies (e.g., data use, privacy, accessibility, AI)?',
        'Rationale': 'Equipping staff with practical skills embeds responsible practices in day‑to‑day work, reducing risks and improving user outcomes.',
        'Scoring Logic': '0=None; 1=Ad hoc; 2=Basic; 3=Structured; 4=Embedded',
        'Legend': 'None – no training on responsible use of digital technologies; Ad hoc – occasional, one-off sessions without follow-up; Basic – training available for some staff, but limited in scope or depth; Structured – regular program for relevant staff, supporting practical application; Embedded – training part of ongoing staff development and business processes, regularly updated and improved',
        'Primary DRG': 'DRG#1: Digital Literacy',
        'Other Applicable DRGs': ''
    },
    {
        'Criterion/Metric Name': 'Multilingual & Clear Communication',
        'DRG Short Code': '1',
        'Question': 'How broadly and reliably are key digital services and user communications offered in the main languages of your user base, with usable, quality translations?',
        'Rationale': 'Multilingual services promote inclusion and equal access, reducing barriers for users who do not speak the default language.',
        'Scoring Logic': '0 = No multilingual support; 1 = Minimal coverage; 2 = Basic multilingual provision; 3 = Moderate coverage; 4 = High coverage; 5 = Best practice / fully inclusive',
        'Legend': 'Minimal – few document/services, poorly translated; Basic – key user-facing services and policies available in 1-2 additional major languages; Moderate – core services consistently available in 2+ languages covering the majority of user base; High – Broad range of services and support available in several languages, translations are professionally maintained and updated; Best-practice – Comprehensive multilingual support across all digital content and customer support channels, tailored to user demographics, regularly reviewed',
        'Primary DRG': 'DRG#1: Digital Literacy',
        'Other Applicable DRGs': 'DRG#6: Transparency'
    },
    {
        'Criterion/Metric Name': 'Security Certification/Compliance',
        'DRG Short Code': '2',
        'Question': 'Which statement best describes the organisations adoption and ongoing maintenance of recognised security standards (e.g., ISO/IEC 27001, SOC 2)?',
        'Rationale': 'Recognised standards and their maintenance signal robust security practices and strengthen trust with customers and regulators.',
        'Scoring Logic': '0=None; 1=Aligned; 2=In progress; 3=Certified; 4=Maintained; 5=Best practice',
        'Legend': 'None – no recognized certification; Aligned – practices informally aligned with a standard but no certification; In progress – formal certification process underway; Certified – formally certified to one recognized standard (e.g., ISO/IEC 27001, SOC 2); Maintained – certification actively renewed, monitored, and internally audited; Best practice – certification maintained with regular external audits and demonstrated continuous improvement',
        'Primary DRG': 'DRG#2: Cybersecurity',
        'Other Applicable DRGs': 'DRG#5: Trustworthy Algorithms'
    },
    {
        'Criterion/Metric Name': 'Security Awareness Training Coverage',
        'DRG Short Code': '2',
        'Question': 'To what extent does the organisation run a regular cybersecurity awareness program with required refreshers for relevant staff?',
        'Rationale': 'People are a primary attack vector; consistent awareness training reduces the likelihood and impact of security incidents.',
        'Scoring Logic': '0=None; 1=Ad hoc; 2=Basic; 3=Structured; 4=Mandatory; 5=Embedded',
        'Legend': 'None – no cybersecurity awareness training offered; Ad hoc – occasional or optional training without consistency; Basic – limited training (e.g., onboarding only or selected roles); Structured – organisation-wide program exists but not enforced; Mandatory – regular, compulsory training with refreshers for all staff; Embedded – training is continuous, role-specific, regularly updated, and effectiveness is measure',
        'Primary DRG': 'DRG#2: Cybersecurity',
        'Other Applicable DRGs': 'DRG#1: Digital Literacy'
    },
    {
        'Criterion/Metric Name': 'Incident response plan',
        'DRG Short Code': '2',
        'Question': 'Does the organisation have a formal, documented incident response plan covering detection, response, and recovery?',
        'Rationale': 'A documented plan enables fast, coordinated action during incidents, limiting damage and speeding recovery.',
        'Scoring Logic': '0 = No; 3= Yes',
        'Legend': 'None – no formalised incident response plan or process; Exists – formal, documented incident response strategy and process established (covering detection, response, and recovery)',
        'Primary DRG': 'DRG#2: Cybersecurity',
        'Other Applicable DRGs': ''
    },
    {
        'Criterion/Metric Name': 'Data Subject Requests (Volume & Response Time)',
        'DRG Short Code': '3',
        'Question': 'How consistent and timely is the organisations process for handling data subject requests (e.g., access, correction, deletion), and how clear is the user experience?',
        'Rationale': 'Reliable handling of requests demonstrates respect for individual rights, improves user trust, and reduces operational and reputational risk.',
        'Scoring Logic': '0=None; 1=Ad hoc; 2=Manual; 3=Consistent; 4=Timely; 5=User-centric',
        'Legend': 'None – no process to handle data subject requests; Ad hoc – requests handled inconsistently, delays common; Manual – process exists but slow, depends on individual staff capacity; Consistent – requests handled reliably with defined steps, usually resolved within a reasonable timeframe; Timely – requests resolved quickly and predictably, supported by tools or streamlined processes; User-centric – requests resolved promptly with clear communication and support, process designed to be transparent and user-friendly',
        'Primary DRG': 'DRG#3: Privacy',
        'Other Applicable DRGs': 'DRG#6: Transparency, DRG#7: Human Agency'
    },
    {
        'Criterion/Metric Name': 'Privacy Governance & Accountability',
        'DRG Short Code': '3',
        'Question': 'What level of privacy governance is in place (e.g., assigned responsibility, dedicated DPO, clear reporting and oversight)?',
        'Rationale': 'Clear accountability ensures privacy risks are managed proactively and escalated appropriately across the organisation.',
        'Scoring Logic': '0=None; 1=Informal; 2=Assigned; 3=Dedicated; 4=Structured; 5=Integrated',
        'Legend': 'None – no privacy governance; Informal – handled ad hoc by IT/legal without mandate; Assigned – responsibility added to existing role (e.g., compliance officer); Dedicated – appointed DPO or privacy lead, limited influence; Structured – DPO with clear mandate, reporting line, regular oversight; Integrated – privacy embedded across departments with executive/board visibility',
        'Primary DRG': 'DRG#3: Privacy',
        'Other Applicable DRGs': 'DRG#6: Transparency'
    },
    {
        'Criterion/Metric Name': 'PET adoption',
        'DRG Short Code': '3',
        'Question': 'To what extent does the organisation adopt privacy‑enhancing technologies (beyond baseline compliance) in systems handling sensitive data?',
        'Rationale': 'Going beyond minimum compliance with PETs reduces data exposure and enables privacy‑preserving innovation.',
        'Scoring Logic': '0=None; 1=Emerging; 2=Established; 3=Leading',
        'Legend': 'None – only baseline compliance (e.g., anonymisation, encryption); Emerging – pilots of PETs in limited projects (e.g., secure enclaves, small-scale differential privacy); Established – PETs systematically applied in core processes (e.g., tokenization, differential privacy in production, privacy-preserving ML); Leading – PETs as differentiator with cutting-edge use (e.g., homomorphic encryption, zero-knowledge proofs, multi-party computation across business lines)',
        'Primary DRG': 'DRG#3: Privacy',
        'Other Applicable DRGs': 'DRG#2: Cybersecurity'
    },
    {
        'Criterion/Metric Name': 'User Consent and Preference Management',
        'DRG Short Code': '4',
        'Question': 'How effectively can users view and manage consent and data preferences through usable tools and dashboards?',
        'Rationale': 'Meaningful user control supports fairness and autonomy and lowers complaints by making choices clear and actionable.',
        'Scoring Logic': '0=None; 1=Basic; 2=Standard; 3=Enhanced; 4=Comprehensive; 5=User-centric',
        'Legend': 'None – no user control mechanisms; Basic – limited options (e.g., cookie banner with accept only); Standard – consent dashboards or preference managers with basic choices; Enhanced – users can access, correct, or delete data via clear processes; Comprehensive – self-service tools covering multiple rights (consent, data access, deletion, portability); User-centric – intuitive, transparent tools with real-time control and clear explanations',
        'Primary DRG': 'DRG#4: Data Fairness',
        'Other Applicable DRGs': 'DRG#7: Human Agency & Identity'
    },
    {
        'Criterion/Metric Name': 'Interoperability & Portability',
        'DRG Short Code': '4',
        'Question': 'To what extent does the organisation provide data in standard, machine‑readable formats and make it easy for users to transfer their data or switch providers?',
        'Rationale': 'Practical portability reduces lock‑in, empowers users, and fosters competition and innovation.',
        'Scoring Logic': '0=None; 1=Limited; 2=Standardised; 3=Portable',
        'Legend': 'None – no machine-readable data outputs; Limited – data only available in hard-to-use or proprietary formats (e.g., PDF); Standardised – data available in common, machine-readable formats (e.g., CSV, XML, JSON) aligned with open standards; Portable – data provided in a way that enables easy transfer or switching to another provider/service (e.g., standardised exports, direct import functions, or interoperable APIs)',
        'Primary DRG': 'DRG#4: Data Fairness',
        'Other Applicable DRGs': 'DRG#6: Transparency'
    },
    {
        'Criterion/Metric Name': 'Participation in Data Altruism',
        'DRG Short Code': '4',
        'Question': 'Does the organisation participate in recognised data‑altruism initiatives or voluntarily provide data for public‑good research projects?',
        'Rationale': 'Responsible sharing for public benefit creates societal value and builds transparency and trust.',
        'Scoring Logic': '0=None; 3=Exists',
        'Legend': 'None – organisation does not provide data voluntarily for public-good purposes; Exists – organisation participates in recognised data altruism initiatives, is formally registered (e.g., under EU Data Governance Act), or provides data voluntarily to research efforts or other public-good projects',
        'Primary DRG': 'DRG#4: Data Fairness',
        'Other Applicable DRGs': '–'
    },
    {
        'Criterion/Metric Name': 'Algorithmic Impact Assessments Conducted',
        'DRG Short Code': '5',
        'Question': 'To what extent does the organisation assess the ethical and societal impacts of algorithms and automated decision‑making before and during deployment?',
        'Rationale': 'Impact assessments help identify and mitigate risks such as bias, unfair outcomes, and unintended harms.',
        'Scoring Logic': '0=None; 1=Ad hoc; 2=Planned; 3=Applied; 4=Systematic; 5=Embedded',
        'Legend': 'None – no ethical or impact assessment of algorithms; Ad hoc – informal checks or discussions only; Planned – framework for assessments exists but not consistently applied; Applied – assessments conducted for some algorithms affecting users; Systematic – assessments required and carried out for all significant algorithmic systems; Embedded – assessments fully integrated into governance with transparency and external review',
        'Primary DRG': 'DRG#5: Trustworthy Algorithms',
        'Other Applicable DRGs': 'DRG#6: Transparency'
    },
    {
        'Criterion/Metric Name': 'AI Ethics Board & Oversight',
        'DRG Short Code': '5',
        'Question': 'What form of ethical oversight exists for algorithmic projects (e.g., guidelines for teams, assigned oversight, or a reviewing committee)?',
        'Rationale': 'Structured oversight aligns algorithmic development with organisational values and public expectations, improving accountability.',
        'Scoring Logic': '0=None; 1=Ad hoc; 2=Guidelines; 3=Oversight assigned; 4=Committee; 5=Integrated',
        'Legend': 'None – no ethical oversight of algorithms; Ad hoc – informal awareness or one-off discussions; Guidelines – AI ethics guidelines or principles exist for staff/project teams; Oversight assigned – responsibility for AI ethics assigned to existing governance functions (e.g., compliance, risk, legal); Committee – dedicated AI ethics committee or working group established, reviewing algorithmic projects; Integrated – oversight fully embedded in governance with clear authority, transparency, and regular reporting to leadership',
        'Primary DRG': 'DRG#5: Trustworthy Algorithms',
        'Other Applicable DRGs': 'DRG#6: Transparency, DRG#3: Privacy'
    },
    {
        'Criterion/Metric Name': 'Public Digital Ethics Principles Published',
        'DRG Short Code': '6',
        'Question': 'Has the organisation published ethical AI or digital responsibility principles, and does it report on their implementation?',
        'Rationale': 'Publishing principles and reporting on progress provides transparency and enables external accountability.',
        'Scoring Logic': '0=None; 1=Published; 2=Reported',
        'Legend': 'None – no published ethical AI or digital responsibility principles; Published – principles are published but no regular reporting; Reported – principles are published and the organisation regularly reports on their implementation',
        'Primary DRG': 'DRG#6: Transparency',
        'Other Applicable DRGs': 'DRG#5: Trustworthy Algorithms'
    },
    {
        'Criterion/Metric Name': 'Clear Privacy Policy & Data Use Disclosure',
        'DRG Short Code': '6',
        'Question': 'How clear, findable, and well‑structured are the organisation´s privacy policies and data‑use notices?',
        'Rationale': 'Plain, well‑structured policies reduce information asymmetry and help users understand how their data is used.',
        'Scoring Logic': '0=None; 1=Minimal; 2=Complete; 3=Clear & user-friendly',
        'Legend': 'None – no accessible privacy policy; Minimal – policy exists but vague, incomplete, or hard to find; Complete – policy covers required legal elements (e.g., what data, purposes, sharing) and is findable, but written in complex or legalistic style; Accessible & user-friendly – policy is complete, easy to find, well-structured (e.g., FAQs, layered notices), and written in plain language with examples',
        'Primary DRG': 'DRG#6: Transparency',
        'Other Applicable DRGs': 'DRG#3: Privacy'
    },
    {
        'Criterion/Metric Name': 'Open Communication Channels',
        'DRG Short Code': '6',
        'Question': 'How accessible and responsive are the organisation´s channels for user questions about digital products and services?',
        'Rationale': 'Easy‑to‑find, supportive channels improve user trust and reduce friction when issues arise.',
        'Scoring Logic': '0=None; 1=Basic; 2=Available; 3=Accessible & supportive',
        'Legend': 'None – no channel for user questions on digital products/services; Basic – channel exists but limited (e.g., generic email, hard to find); Available – clear channel provided and functional (e.g., helpdesk, chat, hotline), but limited support; Accessible & supportive – multiple accessible channels (e.g., phone, chat, email) easy to find and responsive, designed to support all users',
        'Primary DRG': 'DRG#6: Transparency',
        'Other Applicable DRGs': ''
    },
    {
        'Criterion/Metric Name': 'Stakeholder Engagement',
        'DRG Short Code': '7',
        'Question': 'How regularly and systematically are stakeholders (e.g., users, employees, communities, regulators) engaged in the design and evaluation of digital initiatives?',
        'Rationale': 'Meaningful engagement surfaces risks early, aligns services with real needs, and improves legitimacy.',
        'Scoring Logic': '0=None; 1=Ad hoc; 2=Consulted; 3=Structured; 4=Integrated',
        'Legend': 'None – no stakeholder involvement; Ad hoc – occasional, informal input (e.g., survey during rollout); Consulted – stakeholders asked for feedback in some projects (e.g., focus groups, employee input); Structured – regular, documented engagement with stakeholders (e.g., user panels, regulator workshops) influencing outcomes; Integrated – stakeholder engagement embedded in governance/strategy with ongoing dialogue and accountability (e.g., advisory panels, community reps)',
        'Primary DRG': 'DRG#7: Human Agency & Identity',
        'Other Applicable DRGs': 'DRG#6: Transparency'
    },
    {
        'Criterion/Metric Name': 'Sustainable Development Goals',
        'DRG Short Code': '7',
        'Question': 'To what extent are digital initiatives aligned with the UN Sustainable Development Goals and reported on?',
        'Rationale': 'Linking digital work to SDGs connects business outcomes to societal value and enables clearer impact reporting.',
        'Scoring Logic': '0=None; 1=Referenced; 2=Aligned; 3=Integrated; 4=Reported',
        'Legend': 'None – no reference to SDGs; Referenced – SDGs mentioned in strategy or policies, but not linked to activities; Aligned – specific digital initiatives linked to selected SDGs; Integrated – SDGs embedded into organisational strategy and decision-making; Reported – regular public reporting on progress against SDG targets with evidence',
        'Primary DRG': 'DRG#7: Human Agency & Identity',
        'Other Applicable DRGs': ''
    },
    {
        'Criterion/Metric Name': 'Board-Level Digital-Risk Governance',
        'DRG Short Code': '7',
        'Question': 'Are digital and cybersecurity risks explicitly addressed in board‑level governance (e.g., documented roles, regular reporting)?',
        'Rationale': 'Board attention ensures adequate investment and accountability for digital and cyber risks.',
        'Scoring Logic': '0=None; 1=Ad hoc; 2=Documented; 3=Integrated',
        'Legend': 'None – no evidence that digital/cyber risks are considered at board level; Ad hoc – risks occasionally discussed but not formalised in governance; Documented – digital/cyber risks explicitly included in board governance documents (e.g., risk registers, charters); Integrated – board regularly addresses digital/cyber risks with structured reporting and accountability',
        'Primary DRG': 'DRG#7: Human Agency & Identity',
        'Other Applicable DRGs': ''
    },
]

# --- Helper Functions ---
def load_indicators():
    """Loads indicator data from the CSV file."""
    try:
        df = pd.read_csv(
            CSV_FILE_PATH,
            sep=';',
            engine='python',
            encoding='utf-8-sig'
        )
        # Replace NaN with None for JSON serialization
        indicators = df.where(pd.notna(df), None).to_dict(orient='records')
        if not indicators:
            print(f"Warning: No indicators loaded from {CSV_FILE_PATH}")
        return indicators
    except FileNotFoundError:
        print(f"Error: CSV file not found at {CSV_FILE_PATH}")
        return []
    except Exception as e:
        print(f"Error loading indicators: {e}")
        return []

def load_companies():
    """Loads company data from companies.json."""
    if os.path.exists(COMPANIES_FILE):
        with open(COMPANIES_FILE, 'r') as f:
            return json.load(f)
    return []

def save_companies(companies):
    """Saves company data to companies.json."""
    with open(COMPANIES_FILE, 'w') as f:
        json.dump(companies, f, indent=4)

def _max_score_for_indicator(ind):
    # infer max from Scoring Logic; default 5
    logic = (ind.get('Scoring Logic') or '')
    try:
      parts = [p.strip() for p in logic.split(';') if p.strip()]
      nums = []
      for p in parts:
          num = ''.join(ch for ch in p.split('=')[0] if ch.isdigit())
          if num != '':
              nums.append(int(num))
      return max(nums) if nums else 5
    except Exception:
      return 5

DRG_KEYS = [str(i) for i in range(1,8)]

def compute_scores(company):
    # per-DRG aggregation and 0–10 normalization
    per_drg_totals = {k: 0 for k in DRG_KEYS}
    per_drg_max = {k: 0 for k in DRG_KEYS}
    for ind in INDICATORS_STATIC: # Use INDICATORS_STATIC here
        name = ind['Criterion/Metric Name']
        score = company.get('scores', {}).get(name, 0)
        max_s = _max_score_for_indicator(ind)
        drg = str(ind.get('DRG Short Code', '')).strip()
        if drg in DRG_KEYS:
            per_drg_totals[drg] += score
            per_drg_max[drg] += max_s
    per_drg = {}
    for k in DRG_KEYS:
        per_drg[k] = 0 if per_drg_max[k] == 0 else round((per_drg_totals[k] / per_drg_max[k]) * 10, 2)

    # overall as normalized 0–10 across all indicators
    max_all = 0
    total_all = 0
    for ind in INDICATORS_STATIC: # Use INDICATORS_STATIC here
        name = ind['Criterion/Metric Name']
        score = company.get('scores', {}).get(name, 0)
        max_all += _max_score_for_indicator(ind)
        total_all += score
    overall = 0 if max_all == 0 else round((total_all / max_all) * 10, 2)
    company['perDRG'] = per_drg
    company['overallScore'] = overall
    return company

# Load indicators and companies on startup
# Bind indicators data to static list for consistent usage
indicators_data = INDICATORS_STATIC
companies_data = load_companies()

# Recompute for all on startup (in case persisted)
companies_data = [compute_scores(c) for c in companies_data]

# --- API Endpoints ---
@app.route('/')
def serve_index():
    return send_from_directory('../frontend/public', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../frontend/public', path)

@app.route('/api/indicators', methods=['GET'])
def get_indicators():
    return jsonify(INDICATORS_STATIC)

@app.route('/api/companies', methods=['GET'])
def get_companies():
    return jsonify([compute_scores(dict(c)) for c in companies_data])

@app.route('/api/companies', methods=['POST'])
def add_company():
    new_company = request.json
    compute_scores(new_company)
    companies_data.append(new_company)
    save_companies(companies_data)
    return jsonify(new_company), 201

@app.route('/api/companies/<int:company_id>', methods=['GET'])
def get_company(company_id):
    company = next((c for c in companies_data if c['id'] == company_id), None)
    if company:
        return jsonify(compute_scores(dict(company)))
    return jsonify({"error": "Company not found"}), 404

@app.route('/api/companies/<int:company_id>', methods=['DELETE'])
def delete_company(company_id):
    global companies_data
    companies_data = [c for c in companies_data if c.get('id') != company_id]
    save_companies(companies_data)
    return jsonify({"deleted": company_id}), 200

@app.route('/api/llm-explain', methods=['POST'])
def llm_explain():
    data = request.json
    criterion_name = data.get('criterion_name')
    if criterion_name:
        # Find the rationale from the loaded indicators
        rationale = "No rationale found."
        scoring_logic = "No scoring logic found."
        for indicator in INDICATORS_STATIC: # Use INDICATORS_STATIC here
            if indicator['Criterion/Metric Name'] == criterion_name:
                rationale = indicator.get('Rationale') or rationale
                scoring_logic = indicator.get('Scoring Logic') or scoring_logic
                break

        # Default concise explanation without external LLM
        default_explanation = (
            f"{criterion_name}: This criterion evaluates an organisation's practice in this area. "
            f"Why it matters: {rationale} "
            f"How it's scored: {scoring_logic}"
        )

        # If Vertex AI model is available, try enhancing the explanation
        if _model is not None:
            prompt = (
                f"Explain the following digital responsibility criterion in up to 4 sentences.\n"
                f"Name: {criterion_name}\n"
                f"Rationale: {rationale}\n"
                f"Scoring Logic: {scoring_logic}\n"
                f"Use plain, user-friendly language."
            )
            try:
                response = _model.generate_content(prompt)
                explanation_text = getattr(response, 'text', None) or default_explanation
                return jsonify({"explanation": explanation_text})
            except Exception:
                pass

        return jsonify({"explanation": default_explanation})
    return jsonify({"error": "Criterion name not provided"}), 400

@app.route('/api/badge/<int:company_id>', methods=['GET'])
def get_badge(company_id):
    company = next((c for c in companies_data if c.get('id') == company_id), None)
    if not company:
        return "Company not found", 404

    company = compute_scores(dict(company))
    score = company.get('overallScore', 0)
    # Pixel-edge style to match site
    width = 360
    height = 120
    padding = 18
    content_width = width - (padding * 2)
    bar_x = padding
    bar_y = 64
    bar_width = content_width
    bar_height = 28
    fill_width = max(0, min(bar_width, (score / 10) * bar_width))

    accent = "#ffdd00"

    svg_content = f'''
    <svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Digital Responsibility Score {score:.1f} out of 10">
      <defs>
        <!-- Diagonal stripe pattern for track -->
        <pattern id="trackStripes" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">
          <rect width="12" height="12" fill="#f2f2f2" />
          <rect width="12" height="6" fill="#e8e8e8" />
        </pattern>
        <!-- Horizontal stripe pattern for fill -->
        <pattern id="fillStripes" patternUnits="userSpaceOnUse" width="16" height="16">
          <rect width="16" height="16" fill="{accent}" />
          <rect y="8" width="16" height="8" fill="#ffd200" />
        </pattern>
      </defs>

      <!-- Shadow (blocky) -->
      <rect x="6" y="6" width="{width-6}" height="{height-6}" fill="#000" />
      <!-- Card -->
      <rect x="0" y="0" width="{width-6}" height="{height-6}" fill="#ffffff" stroke="#000" stroke-width="2" />

      <!-- Header -->
      <text x="{padding}" y="{padding+6}" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#000">Digital Responsibility Score</text>
      <text x="{width-24}" y="{padding+6}" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="#000" text-anchor="end">{score:.1f}/10</text>

      <!-- Progress track with pixel edge style -->
      <rect x="{bar_x}" y="{bar_y}" width="{bar_width}" height="{bar_height}" fill="url(#trackStripes)" stroke="#000" stroke-width="2" />
      <!-- Progress fill with stripes and inner border feel -->
      <rect x="{bar_x}" y="{bar_y}" width="{fill_width}" height="{bar_height}" fill="url(#fillStripes)" />
      <rect x="{bar_x}" y="{bar_y}" width="{fill_width}" height="{bar_height}" fill="none" stroke="#000" stroke-width="2" />
    </svg>
    '''
    return Response(svg_content, mimetype="image/svg+xml")

if __name__ == '__main__':
    app.run(debug=True)
