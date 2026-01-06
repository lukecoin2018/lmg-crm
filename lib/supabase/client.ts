import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!')
  console.log('URL:', supabaseUrl)
  console.log('Key exists:', !!supabaseAnonKey)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export type Deal = {
  id: string
  user_id?: string | null
  brand_name: string
  value: number
  status: 'lead' | 'negotiating' | 'closed' | 'paid'
  deliverables: string | null
  deadline: string | null
  notes: string | null
  contract_file_url: string | null
  created_at: string
  updated_at: string
}

export type Contract = {
  id: string
  user_id?: string | null
  deal_id: string
  template_name: string | null
  content: string | null
  created_at: string
}

export type Payment = {
  id: string
  user_id?: string | null
  deal_id: string
  amount: number
  due_date: string | null
  paid_date?: string | null
  status: 'pending' | 'paid' | 'overdue'
  notes: string | null
  created_at: string
}

export type NegotiationNote = {
  id: string
  user_id?: string | null
  deal_id: string
  note_type: 'conversation' | 'action_item' | 'rate_change' | 'contact' | 'decision'
  content: string
  created_at: string
}