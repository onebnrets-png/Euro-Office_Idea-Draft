// services/supabaseClient.ts
// Supabase client singleton – used by all services

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xpsjyftpszvkwhpphskf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwc2p5ZnRwc3p2a3docHBoc2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDA0NjIsImV4cCI6MjA4NjQxNjQ2Mn0.DaNVOnhsNQKR3UN8T3yQ6CNlBQUFooxHVHGWrDFcJ_0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
