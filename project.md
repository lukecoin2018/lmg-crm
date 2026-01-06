# Influencer Business OS

## Overview
CRM and business management platform for influencers to manage brand deals, contracts, and payments.

## Core Features (MVP)
1. Deal Pipeline - Kanban board (Lead → Negotiating → Closed → Paid)
2. Contract Generation - Templates with fill-in-the-blanks, PDF export
3. Payment Tracking - Link to deals, due dates, status
4. Token System - Freemium model, 50 tokens/month free

## Tech Stack
- Next.js 14 (App Router) + TypeScript
- Supabase (PostgreSQL, Auth, Storage)
- Shadcn/ui + Tailwind CSS
- Vercel hosting

## Database Schema
(paste your schema here as you design it)

## Current Status
(update as you build)
```

Then in Cursor, I can reference this file.

**Option 3: Use Cursor's Composer with context**

When you start a new task in Cursor:
1. Open Composer (Cmd/Ctrl + I)
2. Tag relevant files with @
3. Give me the context: "We're building [X]. Help me implement [Y]."

## **Practical Example**

When you're ready to start building, you might do:

**In Cursor chat:**
```
@PROJECT.md 

I'm starting the project. Help me:
1. Set up Next.js with Supabase
2. Create the initial database schema for deals
3. Set up authentication

Here's what I want the deals table to have:
- brand name
- deal value
- status (lead, negotiating, closed, paid)
- deliverables
- deadline
- notes