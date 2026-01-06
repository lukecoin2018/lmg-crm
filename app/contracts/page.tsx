'use client'

import { useState, useEffect } from 'react'
import { supabase, type Contract, type Deal } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('basic')
  const [viewingContract, setViewingContract] = useState<Contract | null>(null)
  const [paymentStructure, setPaymentStructure] = useState<string>('50-50')
  const [customPayment1, setCustomPayment1] = useState<string>('50')
  const [customPayment2, setCustomPayment2] = useState<string>('50')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load contracts
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false })

      if (contractsError) throw contractsError

      // Load deals (for generating new contracts)
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false })

      if (dealsError) throw dealsError

      setContracts(contractsData || [])
      setDeals(dealsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const templates = {
    basic: {
      name: 'Professional Influencer Agreement',
      content: `INFLUENCER PARTNERSHIP AGREEMENT
  
  Agreement Date: {today}
  Contract Reference: INF-{contract_id}
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  PARTIES TO THIS AGREEMENT
  
  BRAND:
  {brand_name}
  Representative: _________________________________
  Email: _________________________________
  Address: _________________________________
  
  INFLUENCER / CONTENT CREATOR:
  Full Name: _________________________________
  Business Name: _________________________________
  Email: _________________________________
  Social Media Handle(s): _________________________________
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  1. SCOPE OF WORK
  
  The Influencer agrees to create and deliver the following content:
  
  {deliverables}
  
  All content must align with the Brand's guidelines and receive approval before publication.
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  2. COMPENSATION
  
  Total Project Value: ${'{value}'} USD
  
  Payment Structure:
  - Initial Payment ({payment1_percent}%): ${'{payment1_amount}'} USD - Due upon contract execution
  - Final Payment ({payment2_percent}%): ${'{payment2_amount}'} USD - Due upon completion and approval

  Payment Terms: Net 30 days from invoice date
  Payment Method: Bank transfer, PayPal, or as mutually agreed
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  3. PROJECT TIMELINE
  
  Completion Deadline: {deadline}
  
  All deliverables must be submitted by the date specified above. Any delays must be communicated immediately and may affect final compensation.
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  4. CONTENT RIGHTS & OWNERSHIP
  
  Upon receipt of full payment, the Brand shall own all rights to the content, including:
  - Full commercial usage rights across all marketing channels
  - Rights to edit, modify, or repurpose content
  - Perpetual worldwide license
  
  The Influencer retains the right to:
  - Display content in their professional portfolio
  - Reference the partnership in media materials
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  5. EXCLUSIVITY PERIOD
  
  During the term of this agreement and for 60 days thereafter, the Influencer agrees not to promote competing brands in the same product category or create content that disparages the Brand.
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  6. FTC COMPLIANCE & DISCLOSURES
  
  The Influencer must:
  - Clearly disclose the paid partnership using #ad, #sponsored, or #partner
  - Comply with FTC Endorsement Guidelines and all applicable laws
  - Make only truthful and substantiated claims about products/services
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  7. CONTENT APPROVAL PROCESS
  
  All content must be submitted to the Brand for review at least 48 hours before scheduled publication. The Brand will provide feedback within 24 hours. Reasonable modifications may be requested.
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  8. TERMINATION
  
  Either party may terminate this agreement with 14 days written notice. Upon termination:
  - Influencer receives pro-rata compensation for completed work
  - All confidential materials must be returned
  - Content rights are determined based on completion status
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  9. INDEPENDENT CONTRACTOR STATUS
  
  The Influencer is an independent contractor and not an employee of the Brand. The Influencer is responsible for all taxes, insurance, and business obligations.
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  10. CONFIDENTIALITY
  
  Both parties agree to maintain confidentiality regarding compensation amounts, proprietary business information, and unreleased products or campaigns.
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  11. LIABILITY & INDEMNIFICATION
  
  Neither party shall be liable for indirect, incidental, or consequential damages. Each party indemnifies the other against claims arising from breach of this agreement or intellectual property infringement.
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  12. GENERAL PROVISIONS
  
  - This agreement constitutes the entire understanding between parties
  - Modifications must be in writing and signed by both parties
  - Governed by applicable state and federal laws
  - If any provision is invalid, the remainder continues in effect
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  ADDITIONAL TERMS & NOTES
  
  {notes}
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  SIGNATURES
  
  By signing below, both parties acknowledge they have read, understood, and agree to be legally bound by all terms in this Agreement.
  
  
  BRAND REPRESENTATIVE
  
  Company: {brand_name}
  Signature: _________________________________
  Print Name: _________________________________
  Title: _________________________________
  Date: {today}
  
  
  INFLUENCER / CONTENT CREATOR
  
  Signature: _________________________________
  Print Name: _________________________________
  Business Name: _________________________________
  Tax ID/SSN: _________________________________
  Date: {today}
  
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  Contract ID: INF-{contract_id}
  Generated: {today}
  
  This is a legally binding agreement. Both parties should retain a signed copy for their records. For legal advice, please consult an attorney.`,
    },
    detailed: {
      name: 'Comprehensive Brand Partnership Contract',
      content: `COMPREHENSIVE INFLUENCER BRAND PARTNERSHIP AGREEMENT
  
  Contract Date: {today}
  Contract ID: INF-{contract_id}
  Project Value: ${'{value}'} USD
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  CONTRACTING PARTIES
  
  BRAND ENTITY
  
  Company Name: {brand_name}
  Legal Representative: _________________________________
  Title: _________________________________
  Email: _________________________________
  Phone: _________________________________
  Address: _________________________________
           _________________________________
  
  
  CONTENT CREATOR / INFLUENCER
  
  Full Legal Name: _________________________________
  Business Name (if applicable): _________________________________
  Email: _________________________________
  Phone: _________________________________
  Social Media Platform(s): _________________________________
  Primary Handle/Username: _________________________________
  Follower Count: _________________________________
  Address: _________________________________
           _________________________________
  Tax ID / SSN: _________________________________
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  ARTICLE I: CAMPAIGN OVERVIEW
  
  1.1 Purpose
  This agreement establishes a professional partnership for the creation and distribution of branded content across the Influencer's social media platforms to promote the Brand's products/services.
  
  1.2 Campaign Duration
  Start Date: {today}
  Completion Deadline: {deadline}
  Post-Campaign Period: 90 days (for exclusivity and reporting)
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  ARTICLE II: DELIVERABLES & CONTENT SPECIFICATIONS
  
  2.1 Content Requirements
  
  {deliverables}
  
  2.2 Quality Standards
  All content must meet the following criteria:
  - High-resolution imagery (minimum 1080x1080 pixels for static posts)
  - Professional editing and production quality
  - Authentic to the Influencer's voice and brand aesthetic
  - Alignment with Brand guidelines (to be provided separately)
  - No controversial or inappropriate content
  
  2.3 Approval Process
  - Draft content submitted 72 hours before scheduled posting
  - Brand provides feedback within 24 business hours
  - Revisions completed within 48 hours
  - Final approval required before publication
  - Two rounds of revisions included; additional revisions at Brand's discretion
  
  2.4 Performance Metrics
  The Influencer agrees to provide analytics reports including:
  - Total impressions and reach
  - Engagement rate (likes, comments, shares, saves)
  - Click-through rates (if applicable)
  - Audience demographics
  - Story views and completion rates (if applicable)
  
  Reports due within 7 days of posting completion.
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  ARTICLE III: COMPENSATION & PAYMENT TERMS
  
  3.1 Total Project Value
  TOTAL COMPENSATION: ${'{value}'} USD
  
  3.2 Payment Schedule

  Payment 1 (Initial): ${'{payment1_amount}'} USD ({payment1_percent}%)
  - Due upon execution of this signed agreement
  - Covers pre-production and first portion of deliverables

  Payment 2 (Final): ${'{payment2_amount}'} USD ({payment2_percent}%)
  - Due upon completion, approval, and publication of all deliverables
  - Contingent on satisfactory performance and compliance
  
  3.3 Payment Method
  - Bank transfer (ACH or wire transfer)
  - PayPal or other mutually agreed digital payment
  - Payment details to be provided via secure invoice
  
  3.4 Payment Timeline
  All invoices are due within 30 days of receipt (Net 30).
  Late payments subject to 1.5% monthly interest charge.
  
  3.5 Additional Expenses
  Any expenses beyond the scope of this agreement (travel, props, additional production costs) must be:
  - Pre-approved in writing by the Brand
  - Accompanied by receipts for reimbursement
  - Submitted within 30 days of expense incurrence
  - Reimbursed within 30 days of approval
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  ARTICLE IV: INTELLECTUAL PROPERTY & USAGE RIGHTS
  
  4.1 Content Ownership
  Upon receipt of full payment, the Brand shall own all rights, title, and interest in the content created under this Agreement, including but not limited to:
  - Copyright in all formats and media
  - Rights to reproduce, distribute, display, and modify
  - Rights to create derivative works
  - Sublicensing rights
  - Perpetual, worldwide, royalty-free usage
  
  4.2 Influencer Usage Rights
  The Influencer retains the following rights:
  - Display content in professional portfolio and media kit
  - Use content for self-promotion (with Brand credit)
  - Share content on personal social media (alongside Brand's posting)
  
  4.3 Moral Rights
  The Influencer waives any moral rights to the extent permitted by law, allowing the Brand to modify content as needed for marketing purposes.
  
  4.4 Brand Materials
  All brand assets, logos, product images, and materials provided remain the exclusive property of the Brand and must be used only as authorized.
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  ARTICLE V: EXCLUSIVITY & NON-COMPETE
  
  5.1 Category Exclusivity
  During the term of this agreement and for 60 days thereafter, the Influencer agrees not to:
  - Promote or endorse competing brands in the same product category
  - Accept partnerships that directly conflict with Brand's business
  - Create content that disparages or negatively portrays the Brand
  
  5.2 Competing Brands Definition
  Competing brands are defined as those offering similar products/services in the same market category as determined by the Brand.
  
  5.3 Permitted Activities
  This exclusivity does not restrict the Influencer from:
  - Non-competitive brand partnerships in different categories
  - General lifestyle and entertainment content
  - Personal product usage unrelated to Brand's category
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  ARTICLE VI: REGULATORY COMPLIANCE
  
  6.1 FTC Guidelines
  The Influencer must comply with Federal Trade Commission (FTC) Endorsement Guidelines:
  - Clear and conspicuous disclosure of material connection (#ad, #sponsored, #partner)
  - Disclosure at the beginning of captions, not buried in hashtags
  - Verbal disclosure in video content where applicable
  - Honest representation of products and experiences
  
  6.2 Platform-Specific Compliance
  All content must adhere to:
  - Instagram Partnership and Branded Content Guidelines
  - TikTok Branded Content Policy and Disclosure Requirements
  - YouTube FTC Disclosure Requirements and Paid Product Placements
  - Other applicable platform terms of service
  
  6.3 Truthful Representation
  The Influencer must:
  - Make only truthful, substantiated claims
  - Not make misleading or deceptive statements
  - Disclose material connections and sponsorship
  - Accurately represent personal experiences
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  ARTICLE VII: CONFIDENTIALITY & NON-DISCLOSURE
  
  7.1 Confidential Information
  Both parties agree to maintain strict confidentiality regarding:
  - Specific compensation amounts and financial terms
  - Proprietary business strategies and marketing plans
  - Unreleased products, campaigns, or launches
  - Performance metrics and campaign analytics
  - Trade secrets and confidential business information
  - Terms of this agreement
  
  7.2 Permitted Disclosures
  Confidential information may be disclosed:
  - To legal, financial, or tax advisors under confidentiality obligations
  - As required by law or court order (with prior notice to the other party)
  - With express written consent from the other party
  
  7.3 Duration
  Confidentiality obligations survive termination of this agreement indefinitely.
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  ARTICLE VIII: REPRESENTATIONS & WARRANTIES
  
  8.1 Brand Representations
  The Brand represents and warrants that:
  - It has full authority to enter into and perform this Agreement
  - Brand materials and assets do not infringe third-party intellectual property
  - All information provided to Influencer is accurate
  - Payment will be made as agreed
  
  8.2 Influencer Representations
  The Influencer represents and warrants that:
  - Content will be original and will not infringe copyrights, trademarks, or other rights
  - Stated audience metrics and demographics are accurate and not artificially inflated
  - Full compliance with all applicable laws and regulations
  - Authority to grant all rights and licenses herein
  - No conflicting agreements that would prevent performance
  
  8.3 No False Engagement
  The Influencer confirms no use of:
  - Purchased followers or fake accounts
  - Bot-generated engagement or comments
  - Engagement pods or artificial inflation tactics
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  ARTICLE IX: TERMINATION
  
  9.1 Termination for Convenience
  Either party may terminate this agreement with 14 days written notice for any reason.
  
  9.2 Termination for Cause
  Either party may terminate immediately upon written notice for:
  - Material breach of this Agreement (with 7 days to cure)
  - Fraudulent activity or material misrepresentation
  - Violation of laws or regulations
  - Actions causing reputational damage or public scandal
  - Failure to meet deadlines or performance standards (after written warning)
  
  9.3 Effect of Termination
  Upon termination:
  - Influencer compensated only for completed and approved deliverables (pro-rata)
  - All brand materials returned or destroyed
  - Immediate cessation of promotional activities
  - Content rights determined based on payment and completion status
  - Confidentiality obligations remain in full force
  
  9.4 Refund/Return of Payment
  If Influencer breaches this agreement:
  - Brand may demand return of prepaid amounts for undelivered work
  - Influencer must return payments within 30 days of written demand
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  ARTICLE X: LIABILITY, INDEMNIFICATION & INSURANCE
  
  10.1 Limitation of Liability
  NEITHER PARTY SHALL BE LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES. TOTAL LIABILITY SHALL NOT EXCEED THE TOTAL COMPENSATION AMOUNT PAID UNDER THIS AGREEMENT.
  
  10.2 Mutual Indemnification
  Each party agrees to indemnify, defend, and hold harmless the other party from claims, damages, and expenses (including reasonable attorney fees) arising from:
  - Breach of representations, warranties, or obligations
  - Intellectual property infringement
  - Violation of laws or third-party rights
  - Negligence or willful misconduct
  
  10.3 Insurance (Optional)
  The Influencer may maintain:
  - General liability insurance (if applicable)
  - Professional liability / errors and omissions insurance
  - Evidence of coverage provided upon request
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  ARTICLE XI: GENERAL PROVISIONS
  
  11.1 Independent Contractor
  The Influencer is an independent contractor, not an employee, agent, or partner of the Brand. The Influencer is solely responsible for:
  - Income taxes, self-employment taxes, and withholdings
  - Business licenses and permits
  - Business insurance and liability coverage
  - Compliance with independent contractor laws
  
  11.2 Entire Agreement
  This Agreement constitutes the entire understanding between the parties and supersedes all prior agreements, proposals, or communications, whether written or oral.
  
  11.3 Amendments & Modifications
  Any changes to this Agreement must be in writing and signed by authorized representatives of both parties.
  
  11.4 Governing Law & Jurisdiction
  This Agreement shall be governed by and construed in accordance with the laws of [State/Country], without regard to conflict of law principles. Exclusive jurisdiction in [County/City] courts.
  
  11.5 Dispute Resolution
  Disputes shall be resolved through:
  1. Good faith negotiation (30 days)
  2. Mediation (if negotiation fails)
  3. Binding arbitration (final resort)
  Legal fees and costs awarded to prevailing party.
  
  11.6 Severability
  If any provision is found invalid or unenforceable, the remaining provisions continue in full force and effect.
  
  11.7 Waiver
  Failure to enforce any provision does not constitute a waiver of that provision or any other provision.
  
  11.8 Force Majeure
  Neither party liable for delays or failures due to circumstances beyond reasonable control (natural disasters, pandemics, government actions, etc.).
  
  11.9 Assignment
  Neither party may assign this Agreement without prior written consent, except Brand may assign to affiliates or in connection with merger/acquisition.
  
  11.10 Notices
  All notices must be in writing and sent to the addresses provided in this Agreement. Effective upon receipt.
  
  11.11 Counterparts & Electronic Signatures
  This Agreement may be executed in counterparts. Electronic signatures are valid and binding.
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  ADDITIONAL TERMS, SPECIAL PROVISIONS & NOTES
  
  {notes}
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  EXECUTION & SIGNATURES
  
  By signing below, both parties acknowledge that they have:
  - Read and understood all terms and conditions
  - Had the opportunity to seek legal counsel
  - Agree to be legally bound by this Agreement
  - Received a fully executed copy for their records
  
  
  BRAND REPRESENTATIVE
  
  Company Name: {brand_name}
  
  Authorized Signature: _________________________________
  
  Print Name: _________________________________
  
  Title/Position: _________________________________
  
  Date: {today}
  
  Email: _________________________________
  
  
  
  INFLUENCER / CONTENT CREATOR
  
  Signature: _________________________________
  
  Print Name: _________________________________
  
  Business Name (if applicable): _________________________________
  
  Date: {today}
  
  Email: _________________________________
  
  Social Media Handle: _________________________________
  
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  DOCUMENT INFORMATION
  
  Contract ID: INF-{contract_id}
  Generated: {today}
  Total Pages: 1
  Version: 1.0
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  IMPORTANT LEGAL NOTICE
  
  This is a legally binding contract. Both parties should:
  - Retain a signed copy for their records
  - Consult with legal counsel if needed
  - Ensure full understanding before signing
  - Keep records of all communications and deliverables
  
  For legal questions or concerns, please seek advice from a qualified attorney.`,
    },
  }

  const generateContract = async () => {
    if (!selectedDeal) {
      alert('Please select a deal')
      return
    }

    setIsGenerating(true)

    try {
      const deal = deals.find(d => d.id === selectedDeal)
      if (!deal) throw new Error('Deal not found')

      const template = templates[selectedTemplate as keyof typeof templates]
      
     // Replace variables in template
let content = template.content
const payment1Percent = parseInt(customPayment1)
const payment2Percent = parseInt(customPayment2)
const payment1Amount = (deal.value * payment1Percent / 100).toFixed(2)
const payment2Amount = (deal.value * payment2Percent / 100).toFixed(2)

content = content.replace(/{brand_name}/g, deal.brand_name)
content = content.replace(/{value}/g, deal.value.toString())
content = content.replace(/{half_value}/g, (deal.value / 2).toString())
content = content.replace(/{payment1_percent}/g, payment1Percent.toString())
content = content.replace(/{payment2_percent}/g, payment2Percent.toString())
content = content.replace(/{payment1_amount}/g, payment1Amount)
content = content.replace(/{payment2_amount}/g, payment2Amount)
content = content.replace(/{deliverables}/g, deal.deliverables || 'To be determined')
content = content.replace(/{deadline}/g, deal.deadline || 'To be determined')
content = content.replace(/{notes}/g, deal.notes || 'None')
content = content.replace(/{today}/g, new Date().toISOString().split('T')[0])
content = content.replace(/{contract_id}/g, Date.now().toString().slice(-8))

      // Save to database
      const { data, error } = await supabase
        .from('contracts')
        .insert([
          {
            deal_id: deal.id,
            template_name: template.name,
            content: content,
          }
        ])
        .select()

      if (error) throw error

      alert('Contract generated successfully!')
      await loadData()
      setSelectedDeal('')
    } catch (error) {
      console.error('Error generating contract:', error)
      alert('Failed to generate contract')
    } finally {
      setIsGenerating(false)
    }
  }

  const deleteContract = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return

    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadData()
      setViewingContract(null)
    } catch (error) {
      console.error('Error deleting contract:', error)
      alert('Failed to delete contract')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Navigation */}
      <nav className="border-b border-zinc-800 bg-[#3A3A3A]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-[#FFD700]">LMG</h1>
                <span className="text-sm text-zinc-400">Creator Hub</span>
              </Link>
              <div className="flex gap-4">
                <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
                  Dashboard
                </Link>
                <Link href="/contracts" className="text-white font-semibold">
                  Contracts
                </Link>
                <Link href="/payments" className="text-zinc-400 hover:text-white transition-colors">
                  Payments
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-full bg-zinc-800 px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-[#FFD700] animate-pulse"></div>
                <span className="text-sm text-white">50 tokens</span>
              </div>
              <button className="rounded-lg bg-[#FFD700] px-4 py-2 text-sm font-semibold text-[#3A3A3A] hover:bg-[#FFE55C] transition-colors">
                Upgrade
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Contract Generator
          </h2>
          <p className="mt-2 text-zinc-400">
            Generate professional contracts for your brand deals
          </p>
        </div>

      {/* Generate New Contract Section */}
<div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 mb-8">
  <h3 className="text-xl font-semibold text-white mb-4">Generate New Contract</h3>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-2">
        Select Deal
      </label>
      <select
        value={selectedDeal}
        onChange={(e) => setSelectedDeal(e.target.value)}
        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
      >
        <option value="">Choose a deal...</option>
        {deals.map(deal => (
          <option key={deal.id} value={deal.id}>
            {deal.brand_name} - ${deal.value}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-2">
        Contract Template
      </label>
      <select
        value={selectedTemplate}
        onChange={(e) => setSelectedTemplate(e.target.value)}
        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
      >
        <option value="basic">Professional Agreement</option>
        <option value="detailed">Comprehensive Contract</option>
      </select>
    </div>
  </div>

  {/* Payment Structure Section - NEW! */}
  <div className="border-t border-zinc-700 pt-4 mb-4">
    <h4 className="text-lg font-semibold text-white mb-3">Payment Structure</h4>
    
    <div className="mb-4">
      <label className="block text-sm font-medium text-zinc-300 mb-2">
        Payment Terms
      </label>
      <select
        value={paymentStructure}
        onChange={(e) => {
          setPaymentStructure(e.target.value)
          // Reset custom values when changing
          if (e.target.value === '100-0') {
            setCustomPayment1('100')
            setCustomPayment2('0')
          } else if (e.target.value === '50-50') {
            setCustomPayment1('50')
            setCustomPayment2('50')
          } else if (e.target.value === '30-70') {
            setCustomPayment1('30')
            setCustomPayment2('70')
          }
        }}
        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
      >
        <option value="100-0">100% Upfront</option>
        <option value="50-50">50% / 50% (Recommended)</option>
        <option value="30-70">30% / 70%</option>
        <option value="custom">Custom Split</option>
      </select>
    </div>

    {/* Custom Payment Split - Only show if Custom is selected */}
    {paymentStructure === 'custom' && (
      <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-700">
        <p className="text-sm text-zinc-400 mb-3">Define your custom payment split (must total 100%)</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Initial Payment (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={customPayment1}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0
                setCustomPayment1(val.toString())
                setCustomPayment2((100 - val).toString())
              }}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Final Payment (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={customPayment2}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0
                setCustomPayment2(val.toString())
                setCustomPayment1((100 - val).toString())
              }}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            />
          </div>
        </div>
        <p className="text-sm text-zinc-400 mt-2">
          Total: {parseInt(customPayment1) + parseInt(customPayment2)}%
          {(parseInt(customPayment1) + parseInt(customPayment2)) !== 100 && (
            <span className="text-red-400 ml-2">⚠ Must equal 100%</span>
          )}
        </p>
      </div>
    )}

    {/* Payment Preview */}
    {selectedDeal && deals.find(d => d.id === selectedDeal) && (
      <div className="mt-4 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-lg p-4">
        <p className="text-sm font-semibold text-[#FFD700] mb-2">Payment Preview:</p>
        <div className="text-sm text-zinc-300 space-y-1">
          <div className="flex justify-between">
            <span>Initial Payment ({customPayment1}%):</span>
            <span className="font-semibold">
              ${((deals.find(d => d.id === selectedDeal)?.value || 0) * parseInt(customPayment1) / 100).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Final Payment ({customPayment2}%):</span>
            <span className="font-semibold">
              ${((deals.find(d => d.id === selectedDeal)?.value || 0) * parseInt(customPayment2) / 100).toFixed(2)}
            </span>
          </div>
          <div className="border-t border-zinc-700 pt-1 mt-1 flex justify-between font-bold">
            <span>Total:</span>
            <span>${deals.find(d => d.id === selectedDeal)?.value || 0}</span>
          </div>
        </div>
      </div>
    )}
  </div>

  <button
    onClick={generateContract}
    disabled={isGenerating || !selectedDeal || (parseInt(customPayment1) + parseInt(customPayment2)) !== 100}
    className="w-full md:w-auto px-6 py-3 bg-[#FFD700] text-[#3A3A3A] rounded-lg font-semibold hover:bg-[#FFE55C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {isGenerating ? 'Generating...' : 'Generate Contract'}
  </button>
</div>

        {/* Contracts List */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Your Contracts</h3>
          
          {contracts.length === 0 ? (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-12 text-center">
              <p className="text-zinc-400">No contracts yet. Generate your first contract above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contracts.map(contract => (
                <div
                  key={contract.id}
                  className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors cursor-pointer"
                  onClick={() => setViewingContract(contract)}
                >
                  <h4 className="font-semibold text-white mb-2">{contract.template_name}</h4>
                  <p className="text-sm text-zinc-400 mb-2">
                    Created: {new Date(contract.created_at).toLocaleDateString()}
                  </p>
                  <button className="text-sm text-[#FFD700] hover:text-[#FFE55C]">
                    View Contract →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* View Contract Modal */}
      {viewingContract && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingContract(null)}
        >
          <div 
            className="bg-zinc-800 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-zinc-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#FFD700]">{viewingContract.template_name}</h3>
              <button 
                onClick={() => setViewingContract(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="bg-zinc-900 p-6 rounded-lg mb-6 border border-zinc-700">
              <pre className="text-zinc-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {viewingContract.content}
              </pre>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(viewingContract.content || '')
                  alert('Contract copied to clipboard!')
                }}
                className="flex-1 bg-[#3AAFF4] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#3AAFF4]/80 transition-colors"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => deleteContract(viewingContract.id)}
                className="px-4 py-2 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}