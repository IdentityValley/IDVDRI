// Local storage utilities for companies data
import { computeScores } from './scoring';
import { INDICATORS_FALLBACK } from './indicators';

const STORAGE_KEY = 'dri_companies';

export function loadCompanies() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const companies = stored ? JSON.parse(stored) : [];
    // Recompute scores for all companies
    return companies.map(company => computeScores(company, INDICATORS_FALLBACK));
  } catch (error) {
    console.error('Error loading companies from localStorage:', error);
    return [];
  }
}

export function saveCompanies(companies) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
  } catch (error) {
    console.error('Error saving companies to localStorage:', error);
  }
}

export function addCompany(company) {
  const companies = loadCompanies();
  const computedCompany = computeScores(company, INDICATORS_FALLBACK);
  companies.push(computedCompany);
  saveCompanies(companies);
  return computedCompany;
}

export function deleteCompany(companyId) {
  const companies = loadCompanies();
  const filtered = companies.filter(c => c.id !== companyId);
  saveCompanies(filtered);
  return filtered;
}

export function getCompany(companyId) {
  const companies = loadCompanies();
  return companies.find(c => c.id === companyId);
}
