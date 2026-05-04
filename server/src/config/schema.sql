-- ============================================
-- ZEEM AI — Supabase Database Schema
-- Run this in Supabase SQL Editor to set up tables
-- ============================================

-- Clients (law firms using Zeem AI)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_name TEXT NOT NULL,
    practice_area TEXT NOT NULL,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    twilio_number TEXT,
    calendar_id TEXT,
    calendar_connected BOOLEAN DEFAULT FALSE,
    ai_config JSONB DEFAULT '{"model":"gpt-4o-mini","temperature":0.7,"maxTokens":300}'::jsonb,
    qualification_criteria JSONB DEFAULT '{"goodLead":[],"badLead":[]}'::jsonb,
    status TEXT DEFAULT 'active',
    plan TEXT DEFAULT 'pilot',
    billing_status TEXT DEFAULT 'none',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    pilot_start_date TIMESTAMPTZ,
    pilot_end_date TIMESTAMPTZ,
    stats JSONB DEFAULT '{"totalConversations":0,"totalBookings":0,"totalLeadsQualified":0}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations (SMS threads with leads)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    lead_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (individual messages within conversations)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings (consultations booked by AI)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    lead_phone TEXT NOT NULL,
    lead_name TEXT DEFAULT 'Unknown',
    booking_date DATE NOT NULL,
    booking_time TEXT NOT NULL,
    practice_area TEXT,
    notes TEXT,
    status TEXT DEFAULT 'confirmed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prospects (outreach pipeline)
CREATE TABLE IF NOT EXISTS prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_name TEXT NOT NULL,
    contact_name TEXT,
    contact_email TEXT,
    phone TEXT,
    website TEXT,
    city TEXT,
    rating NUMERIC,
    status TEXT DEFAULT 'new',
    emails_sent INTEGER DEFAULT 0,
    generated_email JSONB,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pilot signups (leads from landing page)
CREATE TABLE IF NOT EXISTS pilot_signups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_name TEXT NOT NULL,
    practice_area TEXT,
    contact_name TEXT,
    contact_email TEXT UNIQUE,
    contact_phone TEXT,
    monthly_leads TEXT,
    source TEXT DEFAULT 'landing-page',
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversations_client ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_pilot_signups_email ON pilot_signups(contact_email);

-- ============================================
-- Row Level Security (optional, for multi-tenant isolation)
-- Enable when you add Supabase Auth for client logins
-- ============================================
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Example policy: clients can only see their own data
-- CREATE POLICY "clients_own_data" ON conversations
--     FOR SELECT USING (client_id = auth.uid());
