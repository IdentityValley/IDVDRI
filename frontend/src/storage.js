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
    return [];
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
    throw error;
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
    throw error;
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
    return null;
  }
}
