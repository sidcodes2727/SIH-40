import { createClient } from '@supabase/supabase-js';
const supabaseURL = 'https://faeqtixmrdxqlhxitvcu.supabase.co/';
const key =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZXF0aXhtcmR4cWxoeGl0dmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMDcwODEsImV4cCI6MjA3Mzg4MzA4MX0.XJpefECcjEMoXptvvoFgO3TR0aOI7S2dXa1OuiVGngw';
export const supabase = createClient(supabaseURL, key);

export async function fetchMeasurements() {
    const { data, error } = await supabase.from('measurements').select('*');
    if (error) throw error;
    return data;
}
