// Supabase storage utilities for companies data
import { computeScores } from './scoring';
import { INDICATORS_FALLBACK } from './indicators';
import { supabase } from './supabase';

export async function loadCompanies() {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('overallScore', { ascending: false });
    
    if (error) throw error;
    
    // Recompute scores for all companies
    return (data || []).map(company => computeScores(company, INDICATORS_FALLBACK));
  } catch (error) {
    console.error('Error loading companies from Supabase:', error);
    console.log('Falling back to localStorage...');
    
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem('dri_companies');
      const companies = stored ? JSON.parse(stored) : [];
      return companies.map(company => computeScores(company, INDICATORS_FALLBACK));
    } catch (localError) {
      console.error('Error loading from localStorage:', localError);
      return [];
    }
  }
}

export async function saveCompanies(companies) {
  try {
    // Upsert all companies to Supabase
    const { error } = await supabase
      .from('companies')
      .upsert(companies, { onConflict: 'id' });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error saving companies to Supabase:', error);
  }
}

export async function addCompany(company) {
  try {
    const computedCompany = computeScores(company, INDICATORS_FALLBACK);
    
    const { error } = await supabase
      .from('companies')
      .insert(computedCompany);
    
    if (error) throw error;
    
    return computedCompany;
  } catch (error) {
    console.error('Error adding company to Supabase:', error);
    console.log('Falling back to localStorage...');
    
    // Fallback to localStorage
    try {
      const companies = JSON.parse(localStorage.getItem('dri_companies') || '[]');
      companies.push(computedCompany);
      localStorage.setItem('dri_companies', JSON.stringify(companies));
      return computedCompany;
    } catch (localError) {
      console.error('Error saving to localStorage:', localError);
      throw localError;
    }
  }
}

export async function deleteCompany(companyId) {
  try {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting company from Supabase:', error);
    console.log('Falling back to localStorage...');
    
    // Fallback to localStorage
    try {
      const companies = JSON.parse(localStorage.getItem('dri_companies') || '[]');
      const filtered = companies.filter(c => c.id !== companyId);
      localStorage.setItem('dri_companies', JSON.stringify(filtered));
    } catch (localError) {
      console.error('Error deleting from localStorage:', localError);
      throw localError;
    }
  }
}

export async function getCompany(companyId) {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();
    
    if (error) throw error;
    
    return computeScores(data, INDICATORS_FALLBACK);
  } catch (error) {
    console.error('Error fetching company from Supabase:', error);
    console.log('Falling back to localStorage...');
    
    // Fallback to localStorage
    try {
      const companies = JSON.parse(localStorage.getItem('dri_companies') || '[]');
      const company = companies.find(c => c.id === companyId);
      return company ? computeScores(company, INDICATORS_FALLBACK) : null;
    } catch (localError) {
      console.error('Error loading from localStorage:', localError);
      return null;
    }
  }
}
