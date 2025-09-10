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
CORS(app, origins=['*']) # Enable CORS for all routes and origins
# --- OpenAI (optional) ---
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')


# --- Supabase client (optional) ---
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')

if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client, Client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception:
        supabase = None
else:
    supabase = None

# --- Vertex AI model (optional) ---
if _vertex_available:
    try:
        _model = GenerativeModel("gemini-1.5-flash")
    except Exception:
        _model = None
else:
    _model = None

# Load companies data
def load_companies():
    try:
        with open('companies.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def save_companies(companies_data):
    with open('companies.json', 'w', encoding='utf-8') as f:
        json.dump(companies_data, f, indent=2, ensure_ascii=False)

companies_data = load_companies()

# Load indicators data
def load_indicators():
    try:
        # Try to load from CSV first
        df = pd.read_csv('../Indicator_Shortlist_with_Q_Rationale.csv')
        indicators = []
        for _, row in df.iterrows():
            indicator = {
                'Criterion/Metric Name': str(row.get('Criterion/Metric Name', '')),
                'Rationale': str(row.get('Rationale', '')),
                'Scoring Logic': str(row.get('Scoring Logic', '')),
                'DRG': str(row.get('DRG', '')),
                'Legend': str(row.get('Legend', ''))
            }
            indicators.append(indicator)
        return indicators
    except Exception as e:
        print(f"Error loading indicators from CSV: {e}")
        # Fallback to hardcoded data
        return [
            {
                'Criterion/Metric Name': 'Digital Literacy Policy & Governance',
                'Rationale': 'This evaluates whether the organization has established clear policies and governance structures for digital literacy.',
                'Scoring Logic': '0=No policy; 1=Basic policy; 2=Comprehensive policy with governance',
                'DRG': '1',
                'Legend': 'No policy – Basic policy – Comprehensive policy with governance'
            },
            {
                'Criterion/Metric Name': 'Incident response plan',
                'Rationale': 'This assesses whether the organization has a documented and tested incident response plan for cybersecurity incidents.',
                'Scoring Logic': '0=No plan; 1=Basic plan; 2=Comprehensive plan with testing',
                'DRG': '2',
                'Legend': 'No plan – Basic plan – Comprehensive plan with testing'
            }
        ]

INDICATORS_STATIC = load_indicators()

@app.route('/')
def serve_index():
    return send_from_directory('../frontend/build', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../frontend/build', path)

@app.route('/api/indicators', methods=['GET'])
def get_indicators():
    return jsonify(INDICATORS_STATIC)

@app.route('/api/companies', methods=['GET'])
def get_companies():
    return jsonify(companies_data)

@app.route('/api/companies', methods=['POST'])
def add_company():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    # Generate new ID
    new_id = max([c.get('id', 0) for c in companies_data], default=0) + 1
    
    # Create company object
    company = {
        'id': new_id,
        'name': data.get('name', ''),
        'description': data.get('description', ''),
        'website': data.get('website', ''),
        'evaluations': data.get('evaluations', []),
        'overallScore': data.get('overallScore', 0),
        'drgScores': data.get('drgScores', {}),
        'lastUpdated': data.get('lastUpdated', '')
    }
    
    companies_data.append(company)
    save_companies(companies_data)
    return jsonify(company), 201

@app.route('/api/companies/<int:company_id>', methods=['PUT'])
def update_company(company_id):
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    company = next((c for c in companies_data if c['id'] == company_id), None)
    if not company:
        return jsonify({"error": "Company not found"}), 404
    
    # Update company data
    company.update({
        'name': data.get('name', company['name']),
        'description': data.get('description', company['description']),
        'website': data.get('website', company['website']),
        'evaluations': data.get('evaluations', company['evaluations']),
        'overallScore': data.get('overallScore', company['overallScore']),
        'drgScores': data.get('drgScores', company['drgScores']),
        'lastUpdated': data.get('lastUpdated', company['lastUpdated'])
    })
    
    save_companies(companies_data)
    return jsonify(company), 200

@app.route('/api/companies/<int:company_id>', methods=['DELETE'])
def delete_company(company_id):
    global companies_data
    companies_data = [c for c in companies_data if c['id'] != company_id]
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


@app.route('/api/llm/chat', methods=['POST'])
def llm_chat():
    """Proxy endpoint for OpenAI chat. Keeps API key server-side.
    Expects JSON: { messages: [{role, content}], context: {route, indicator_name, session_id}, max_tokens?, temperature? }
    """
    try:
        data = request.json or {}
        messages = data.get('messages') or []
        context = data.get('context') or {}
        max_tokens = min(int(data.get('max_tokens', 256)), 512)
        temperature = float(data.get('temperature', 0.3))

        # Safety: constrain and prefix with system prompt
        system_prompt = (
            "You are a concise feedback assistant embedded in an evaluation form. "
            "Your role is to elicit actionable feedback and clarify questions about the evaluation itself. "
            "Do not provide external information, links, or resources. Ask brief, friendly follow-ups."
        )

        oai_messages = [{"role": "system", "content": system_prompt}]
        # Add limited context
        ctx_text = f"Context — route: {context.get('route')}, indicator: {context.get('indicator_name') or 'n/a'}"
        oai_messages.append({"role": "system", "content": ctx_text})
        # Append user/assistant messages (truncate to last few)
        tail = messages[-8:]
        for m in tail:
            role = 'user' if m.get('role') == 'user' else 'assistant'
            oai_messages.append({"role": role, "content": m.get('content', '')[:2000]})

        if not OPENAI_API_KEY:
            # Fallback: canned reply when key is missing
            return jsonify({"reply": "Thanks for sharing. Could you add one concrete example or suggestion?"})

        import requests
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
        payload = {
            "model": "gpt-4o-mini",
            "messages": oai_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        resp = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        content = data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
        if not content:
            content = "Thanks for sharing. Could you add one concrete example or suggestion?"
        return jsonify({"reply": content})
    except Exception:
        return jsonify({"reply": "Thanks for sharing. Could you add one concrete example or suggestion?"})

@app.route('/api/badge/<int:company_id>', methods=['GET'])
def get_badge(company_id):
    company = next((c for c in companies_data if c['id'] == company_id), None)
    if not company:
        return "Company not found", 404

    score = company.overallScore
    color = "#ffdd00"  # Yellow from the palette

    svg_content = f'''
    <svg width="120" height="30" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="black"/>
      <rect x="0" y="0" width="{(score/5)*100}" height="100%" fill="{color}"/>
      <text x="50%" y="50%" font-family="Arial" font-size="14" fill="white" text-anchor="middle" alignment-baseline="middle">
        Score: {score:.1f}
      </text>
    </svg>
    '''
    return Response(svg_content, mimetype="image/svg+xml")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
