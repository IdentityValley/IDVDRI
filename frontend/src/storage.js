// Supabase storage utilities for companies data
import { computeScores } from './scoring';
import { INDICATORS_FALLBACK } from './indicators';
import { supabase } from './supabase';

export async function loadCompanies() {
  try {
    console.log('Connecting to Supabase...');
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('overallscore', { ascending: false });
    
    console.log('Supabase response:', { data, error });
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log('Successfully loaded companies from Supabase:', data);
    // Convert from Supabase format to our format
    return (data || []).map(company => {
      const convertedCompany = {
        id: company.id,
        name: company.name,
        scores: company.scores,
        perDRG: company.perdrg,
        overallScore: company.overallscore
      };
      return computeScores(convertedCompany, INDICATORS_FALLBACK);
    });
  } catch (error) {
    console.error('Error loading companies from Supabase:', error);
    throw error;
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
    
    // Convert to lowercase column names for Supabase
    const supabaseCompany = {
      id: computedCompany.id,
      name: computedCompany.name,
      scores: computedCompany.scores,
      perdrg: computedCompany.perDRG,
      overallscore: computedCompany.overallScore
    };
    
    console.log('Adding company to Supabase:', supabaseCompany);
    const { data, error } = await supabase
      .from('companies')
      .insert(supabaseCompany)
      .select();
    
    console.log('Supabase insert response:', { data, error });
    
    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
    
    console.log('Successfully added company to Supabase');
    return computedCompany;
  } catch (error) {
    console.error('Error adding company to Supabase:', error);
    throw error;
  }
}

export async function deleteCompany(companyId) {
  try {
    console.log('Deleting company from Supabase:', companyId);
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId);
    
    console.log('Supabase delete response:', { error });
    
    if (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }
    
    console.log('Successfully deleted company from Supabase');
  } catch (error) {
    console.error('Error deleting company from Supabase:', error);
    throw error;
  }
}

export async function getCompany(companyId) {
  try {
    console.log('Fetching company from Supabase:', companyId);
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();
    
    console.log('Supabase get company response:', { data, error });
    
    if (error) {
      console.error('Supabase get company error:', error);
      throw error;
    }
    
    console.log('Successfully fetched company from Supabase');
    // Convert from Supabase format to our format
    const convertedCompany = {
      id: data.id,
      name: data.name,
      scores: data.scores,
      perDRG: data.perdrg,
      overallScore: data.overallscore
    };
    return computeScores(convertedCompany, INDICATORS_FALLBACK);
  } catch (error) {
    console.error('Error fetching company from Supabase:', error);
    throw error;
  }
}

