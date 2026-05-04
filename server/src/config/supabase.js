// ============================================
// ZEEM AI — Supabase Database Client
// Provides PostgreSQL storage for production
// Falls back to local JSON when not configured
// ============================================

let supabase = null;

function isConfigured() {
    return process.env.SUPABASE_URL
        && process.env.SUPABASE_URL !== 'https://your-project.supabase.co'
        && process.env.SUPABASE_ANON_KEY
        && process.env.SUPABASE_ANON_KEY !== 'your_supabase_anon_key';
}

function getClient() {
    if (!supabase && isConfigured()) {
        const { createClient } = require('@supabase/supabase-js');
        supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );
        console.log('🔌 Supabase client initialized');
    }
    return supabase;
}

module.exports = { getClient, isConfigured };
