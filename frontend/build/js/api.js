// Client-side API for static data
class StaticAPI {
  constructor() {
    this.indicators = null;
    this.companies = [];
    this.loadData();
  }

  async loadData() {
    try {
      // Load indicators
      const indicatorsResponse = await fetch('./data/indicators.json');
      this.indicators = await indicatorsResponse.json();

      // Load companies from localStorage or default empty array
      const savedCompanies = localStorage.getItem('idv-companies');
      this.companies = savedCompanies ? JSON.parse(savedCompanies) : [];
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  // Get indicators
  async getIndicators() {
    if (!this.indicators) await this.loadData();
    return this.indicators;
  }

  // Get companies with computed scores
  async getCompanies() {
    if (!this.companies) await this.loadData();
    return this.companies.map(company => this.computeScores(company));
  }

  // Add company
  async addCompany(company) {
    company.id = Date.now();
    const companyWithScores = this.computeScores(company);
    this.companies.push(companyWithScores);
    this.saveCompanies();
    return companyWithScores;
  }

  // Get single company
  async getCompany(id) {
    const company = this.companies.find(c => c.id === id);
    return company ? this.computeScores(company) : null;
  }

  // Delete company
  async deleteCompany(id) {
    this.companies = this.companies.filter(c => c.id !== id);
    this.saveCompanies();
    return { deleted: id };
  }

  // Save companies to localStorage
  saveCompanies() {
    localStorage.setItem('idv-companies', JSON.stringify(this.companies));
  }

  // Compute scores (client-side)
  computeScores(company) {
    const perDRG = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0};
    const perDRGMax = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0};
    
    this.indicators.forEach(indicator => {
      const name = indicator['Criterion/Metric Name'];
      const score = company.scores?.[name] || 0;
      const maxScore = this.getMaxScore(indicator);
      const drg = parseInt(indicator['DRG Short Code']);
      
      if (drg >= 1 && drg <= 7) {
        perDRG[drg] += score;
        perDRGMax[drg] += maxScore;
      }
    });
    
    // Calculate normalized scores (0-10)
    Object.keys(perDRG).forEach(drg => {
      perDRG[drg] = perDRGMax[drg] > 0 ? Math.round((perDRG[drg] / perDRGMax[drg]) * 10 * 100) / 100 : 0;
    });
    
    // Calculate overall score
    const totalScore = Object.values(perDRG).reduce((sum, score) => sum + score, 0);
    const overallScore = Math.round((totalScore / 7) * 100) / 100;
    
    return {
      ...company,
      perDRG,
      overallScore
    };
  }

  // Get max score for indicator
  getMaxScore(indicator) {
    const logic = indicator['Scoring Logic'] || '';
    try {
      const parts = logic.split(';').map(p => p.trim()).filter(p => p);
      const nums = [];
      for (const part of parts) {
        const num = part.split('=')[0].replace(/\D/g, '');
        if (num !== '') {
          nums.push(parseInt(num));
        }
      }
      return nums.length > 0 ? Math.max(...nums) : 5;
    } catch (error) {
      return 5;
    }
  }

  // Generate explanation
  async getExplanation(criterionName) {
    if (!this.indicators) await this.loadData();
    
    const indicator = this.indicators.find(ind => ind['Criterion/Metric Name'] === criterionName);
    if (indicator) {
      const explanation = `${criterionName}: This criterion evaluates an organisation's practice in this area. Why it matters: ${indicator.Rationale} How it's scored: ${indicator['Scoring Logic']}`;
      return { explanation };
    }
    return { error: 'Criterion name not provided' };
  }

  // Generate badge SVG
  generateBadge(companyId) {
    const company = this.companies.find(c => c.id === companyId);
    if (!company) return null;

    const companyWithScores = this.computeScores(company);
    const score = companyWithScores.overallScore || 0;
    
    const width = 360;
    const height = 120;
    const padding = 18;
    const barWidth = width - (padding * 2);
    const barHeight = 28;
    const fillWidth = Math.max(0, Math.min(barWidth, (score / 10) * barWidth));
    
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" stroke="#000" stroke-width="2"/>
      <text x="${padding}" y="${padding + 6}" font-family="Arial" font-size="14" font-weight="bold">Digital Responsibility Score</text>
      <text x="${width - 24}" y="${padding + 6}" font-family="Arial" font-size="22" font-weight="bold" text-anchor="end">${score.toFixed(1)}/10</text>
      <rect x="${padding}" y="64" width="${barWidth}" height="${barHeight}" fill="#f2f2f2" stroke="#000" stroke-width="2"/>
      <rect x="${padding}" y="64" width="${fillWidth}" height="${barHeight}" fill="#ffdd00"/>
    </svg>`;
  }
}

// Create global API instance
window.staticAPI = new StaticAPI();

// Mock API endpoints for compatibility
window.fetch = new Proxy(window.fetch, {
  apply(target, thisArg, args) {
    const [url, options = {}] = args;
    
    // Handle API calls
    if (url.includes('/api/')) {
      return handleAPIRequest(url, options);
    }
    
    // Default to original fetch
    return target.apply(thisArg, args);
  }
});

async function handleAPIRequest(url, options) {
  const method = options.method || 'GET';
  const path = url.replace(/.*\/api/, '/api');
  
  try {
    let result;
    
    switch (path) {
      case '/api/indicators':
        result = await window.staticAPI.getIndicators();
        break;
        
      case '/api/companies':
        if (method === 'GET') {
          result = await window.staticAPI.getCompanies();
        } else if (method === 'POST') {
          const body = JSON.parse(options.body || '{}');
          result = await window.staticAPI.addCompany(body);
        }
        break;
        
      default:
        if (path.startsWith('/api/companies/') && method === 'GET') {
          const id = parseInt(path.split('/')[3]);
          result = await window.staticAPI.getCompany(id);
          if (!result) {
            return new Response(JSON.stringify({error: 'Company not found'}), {status: 404});
          }
        } else if (path.startsWith('/api/companies/') && method === 'DELETE') {
          const id = parseInt(path.split('/')[3]);
          result = await window.staticAPI.deleteCompany(id);
        } else if (path === '/api/llm-explain' && method === 'POST') {
          const body = JSON.parse(options.body || '{}');
          result = await window.staticAPI.getExplanation(body.criterion_name);
        } else if (path.startsWith('/api/badge/') && method === 'GET') {
          const id = parseInt(path.split('/')[3]);
          const svg = window.staticAPI.generateBadge(id);
          if (!svg) {
            return new Response('Company not found', {status: 404});
          }
          return new Response(svg, {
            headers: {'Content-Type': 'image/svg+xml'}
          });
        } else {
          return new Response(JSON.stringify({error: 'Not found'}), {status: 404});
        }
        break;
    }
    
    return new Response(JSON.stringify(result), {
      headers: {'Content-Type': 'application/json'}
    });
    
  } catch (error) {
    return new Response(JSON.stringify({error: error.message}), {status: 500});
  }
}
