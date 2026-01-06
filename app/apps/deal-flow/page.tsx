'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { supabase, type Deal, type NegotiationNote } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/app-shell'

export default function Dashboard() {
  const router = useRouter()
  const [deals, setDeals] = useState<Deal[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [dealNotes, setDealNotes] = useState<NegotiationNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [newNoteType, setNewNoteType] = useState<NegotiationNote['note_type']>('conversation')
  const [showNotesModal, setShowNotesModal] = useState<string | false>(false)
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingContract, setUploadingContract] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  // Form state
  const [brandName, setBrandName] = useState('')
  const [value, setValue] = useState('')
  const [deliverables, setDeliverables] = useState('')
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')

  // Check authentication and load deals
  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)
      await loadDeals()
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/login')
    }
  }

  const loadDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setDeals(data || [])
    } catch (error) {
      console.error('Error loading deals:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleAddDeal = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId) {
      alert('You must be logged in to add deals')
      return
    }

    try {
      const { error } = await supabase
        .from('deals')
        .insert([
          {
            user_id: userId,
            brand_name: brandName,
            value: parseFloat(value),
            status: 'lead',
            deliverables,
            deadline: deadline || null,
            notes,
          }
        ])

      if (error) throw error

      alert('Deal added successfully!')
      await loadDeals()
      setIsAddModalOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error adding deal:', error)
      alert('Failed to add deal. Please try again.')
    }
  }

  const handleEditDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDeal) return

    try {
      const { error } = await supabase
        .from('deals')
        .update({
          brand_name: brandName,
          value: parseFloat(value),
          deliverables,
          deadline: deadline || null,
          notes,
        })
        .eq('id', selectedDeal.id)

      if (error) throw error

      alert('Deal updated successfully!')
      await loadDeals()
      setSelectedDeal(null)
      resetForm()
    } catch (error) {
      console.error('Error updating deal:', error)
      alert('Failed to update deal. Please try again.')
    }
  }

  const openDealDetails = (deal: Deal) => {
    setSelectedDeal(deal)
    setBrandName(deal.brand_name)
    setValue(deal.value.toString())
    setDeliverables(deal.deliverables || '')
    setDeadline(deal.deadline || '')
    setNotes(deal.notes || '')
  }

  const resetForm = () => {
    setBrandName('')
    setValue('')
    setDeliverables('')
    setDeadline('')
    setNotes('')
  }

  const moveDeal = async (dealId: string, newStatus: Deal['status']) => {
    try {
      const { error } = await supabase
        .from('deals')
        .update({ status: newStatus })
        .eq('id', dealId)

      if (error) throw error

      await loadDeals()
    } catch (error) {
      console.error('Error moving deal:', error)
      alert('Failed to move deal. Please try again.')
    }
  }

  const deleteDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return

    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId)

      if (error) throw error

      await loadDeals()
      setSelectedDeal(null)
    } catch (error) {
      console.error('Error deleting deal:', error)
      alert('Failed to delete deal. Please try again.')
    }
  }

  const loadDealNotes = async (dealId: string) => {
    try {
      const { data, error } = await supabase
        .from('negotiation_notes')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDealNotes(data || [])
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }

  const addNote = async () => {
    if (!showNotesModal || !newNote.trim() || !userId) return

    try {
      const { error } = await supabase
        .from('negotiation_notes')
        .insert([
          {
            user_id: userId,
            deal_id: showNotesModal,
            note_type: newNoteType,
            content: newNote,
          }
        ])

      if (error) throw error

      setNewNote('')
      setNewNoteType('conversation')
      await loadDealNotes(showNotesModal)
    } catch (error) {
      console.error('Error adding note:', error)
      alert('Failed to add note')
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return

    try {
      const { error } = await supabase
        .from('negotiation_notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error

      if (showNotesModal) {
        await loadDealNotes(showNotesModal)
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Failed to delete note')
    }
  }

  const openNotesModal = async (dealId: string) => {
    setShowNotesModal(dealId)
    await loadDealNotes(dealId)
  }

  const handleContractUpload = async (dealId: string, file: File) => {
    setUploadingContract(dealId)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${dealId}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('deals')
        .update({ contract_file_url: urlData.publicUrl })
        .eq('id', dealId)

      if (updateError) throw updateError

      alert('Contract uploaded successfully!')
      await loadDeals()
    } catch (error) {
      console.error('Error uploading contract:', error)
      alert('Failed to upload contract. Please try again.')
    } finally {
      setUploadingContract(null)
    }
  }

  const deleteContract = async (dealId: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return

    try {
      const fileName = fileUrl.split('/').pop()
      if (!fileName) throw new Error('Invalid file URL')

      const { error: deleteError } = await supabase.storage
        .from('contracts')
        .remove([fileName])

      if (deleteError) throw deleteError

      const { error: updateError } = await supabase
        .from('deals')
        .update({ contract_file_url: null })
        .eq('id', dealId)

      if (updateError) throw updateError

      alert('Contract deleted successfully!')
      await loadDeals()
    } catch (error) {
      console.error('Error deleting contract:', error)
      alert('Failed to delete contract. Please try again.')
    }
  }

  const getDealsByStatus = (status: Deal['status']) => {
    return deals.filter(deal => deal.status === status)
  }

  const totalPipeline = deals.reduce((sum, deal) => sum + Number(deal.value), 0)
  const closedValue = getDealsByStatus('closed').reduce((sum, deal) => sum + Number(deal.value), 0)
  const paidValue = getDealsByStatus('paid').reduce((sum, deal) => sum + Number(deal.value), 0)

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
                <Link href="/dashboard" className="text-white font-semibold">
                  Dashboard
                </Link>
                <Link href="/contracts" className="text-zinc-400 hover:text-white transition-colors">
                  Contracts
                </Link>
                <Link href="/payments" className="text-zinc-400 hover:text-white transition-colors">
                  Payments
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleLogout}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Sign Out
              </button>
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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <p className="text-zinc-400 text-sm">Total Pipeline</p>
            <p className="text-2xl font-bold text-white mt-1">
              ${totalPipeline.toLocaleString()}
            </p>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <p className="text-zinc-400 text-sm">Total Deals</p>
            <p className="text-2xl font-bold text-white mt-1">
              {deals.length}
            </p>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <p className="text-zinc-400 text-sm">Closed Value</p>
            <p className="text-2xl font-bold text-white mt-1">
              ${closedValue.toLocaleString()}
            </p>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <p className="text-zinc-400 text-sm">Paid</p>
            <p className="text-2xl font-bold text-white mt-1">
              ${paidValue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Deal Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Lead */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Lead ({getDealsByStatus('lead').length})
            </h3>
            <div className="space-y-3">
              {getDealsByStatus('lead').map(deal => (
                <DealCard 
                  key={deal.id} 
                  deal={deal}
                  onMove={moveDeal}
                  onDelete={deleteDeal}
                  onClick={openDealDetails}
                  onUploadContract={handleContractUpload}
                  onDeleteContract={deleteContract}
                  uploadingContract={uploadingContract}
                />
              ))}
            </div>
          </div>

          {/* Negotiating */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
              Negotiating ({getDealsByStatus('negotiating').length})
            </h3>
            <div className="space-y-3">
              {getDealsByStatus('negotiating').map(deal => (
                <DealCard 
                  key={deal.id} 
                  deal={deal}
                  onMove={moveDeal}
                  onDelete={deleteDeal}
                  onClick={openDealDetails}
                  onOpenNotes={openNotesModal}
                  onUploadContract={handleContractUpload}
                  onDeleteContract={deleteContract}
                  uploadingContract={uploadingContract}
                />
              ))}
            </div>
          </div>

          {/* Closed */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              Closed ({getDealsByStatus('closed').length})
            </h3>
            <div className="space-y-3">
              {getDealsByStatus('closed').map(deal => (
                <DealCard 
                  key={deal.id} 
                  deal={deal}
                  onMove={moveDeal}
                  onDelete={deleteDeal}
                  onClick={openDealDetails}
                  onUploadContract={handleContractUpload}
                  onDeleteContract={deleteContract}
                  uploadingContract={uploadingContract}
                />
              ))}
            </div>
          </div>

          {/* Paid */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              Paid ({getDealsByStatus('paid').length})
            </h3>
            <div className="space-y-3">
              {getDealsByStatus('paid').map(deal => (
                <DealCard 
                  key={deal.id} 
                  deal={deal}
                  onMove={moveDeal}
                  onDelete={deleteDeal}
                  onClick={openDealDetails}
                  onUploadContract={handleContractUpload}
                  onDeleteContract={deleteContract}
                  uploadingContract={uploadingContract}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-6 right-6 rounded-full bg-[#FFD700] w-14 h-14 flex items-center justify-center text-2xl font-bold text-[#3A3A3A] shadow-lg hover:bg-[#FFE55C] transition-all transform hover:scale-110 z-40"
        title="Add New Deal"
      >
        +
      </button>

      {/* Add Deal Modal */}
      {isAddModalOpen && (
        <DealModal
          title="Add New Deal"
          brandName={brandName}
          value={value}
          deliverables={deliverables}
          deadline={deadline}
          notes={notes}
          onBrandNameChange={setBrandName}
          onValueChange={setValue}
          onDeliverablesChange={setDeliverables}
          onDeadlineChange={setDeadline}
          onNotesChange={setNotes}
          onSubmit={handleAddDeal}
          onClose={() => {
            setIsAddModalOpen(false)
            resetForm()
          }}
        />
      )}

      {/* Negotiation Notes Modal */}
      {showNotesModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowNotesModal(false)}
        >
          <div 
            className="bg-zinc-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-zinc-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#FFD700]">Negotiation Notes</h3>
              <button 
                onClick={() => setShowNotesModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-700 mb-6">
              <h4 className="text-sm font-semibold text-white mb-3">Add New Note</h4>
              
              <div className="mb-3">
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                  Note Type
                </label>
                <select
                  value={newNoteType}
                  onChange={(e) => setNewNoteType(e.target.value as NegotiationNote['note_type'])}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                >
                  <option value="conversation">💬 Conversation</option>
                  <option value="action_item">✓ Action Item</option>
                  <option value="rate_change">💰 Rate Change</option>
                  <option value="contact">👤 Contact Info</option>
                  <option value="decision">⚡ Decision</option>
                </select>
              </div>

              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Type your note here..."
                rows={3}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700] mb-3"
              />

              <button
                onClick={addNote}
                disabled={!newNote.trim()}
                className="w-full bg-[#FFD700] text-[#3A3A3A] px-4 py-2 rounded-lg font-semibold hover:bg-[#FFE55C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Note
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white mb-3">Timeline</h4>
              
              {dealNotes.length === 0 ? (
                <p className="text-center py-8 text-zinc-400 text-sm">
                  No notes yet. Add your first note above!
                </p>
              ) : (
                dealNotes.map(note => (
                  <div key={note.id} className="bg-zinc-900 p-4 rounded-lg border border-zinc-700">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          note.note_type === 'conversation' ? 'bg-blue-500/20 text-blue-400' :
                          note.note_type === 'action_item' ? 'bg-green-500/20 text-green-400' :
                          note.note_type === 'rate_change' ? 'bg-yellow-500/20 text-yellow-400' :
                          note.note_type === 'contact' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {note.note_type === 'conversation' && '💬 Conversation'}
                          {note.note_type === 'action_item' && '✓ Action Item'}
                          {note.note_type === 'rate_change' && '💰 Rate Change'}
                          {note.note_type === 'contact' && '👤 Contact'}
                          {note.note_type === 'decision' && '⚡ Decision'}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {new Date(note.created_at).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="text-zinc-500 hover:text-red-400 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deal Details Modal with Edit/Delete */}
      {selectedDeal && (
        <DealDetailsModal
          deal={selectedDeal}
          brandName={brandName}
          value={value}
          deliverables={deliverables}
          deadline={deadline}
          notes={notes}
          onBrandNameChange={setBrandName}
          onValueChange={setValue}
          onDeliverablesChange={setDeliverables}
          onDeadlineChange={setDeadline}
          onNotesChange={setNotes}
          onSubmit={handleEditDeal}
          onClose={() => {
            setSelectedDeal(null)
            resetForm()
          }}
          onDelete={() => deleteDeal(selectedDeal.id)}
        />
      )}
    </div>
  )
}

// Deal Card Component
function DealCard({ 
  deal, 
  onMove, 
  onDelete,
  onClick,
  onOpenNotes,
  onUploadContract,
  onDeleteContract,
  uploadingContract
}: { 
  deal: Deal
  onMove: (id: string, status: Deal['status']) => void
  onDelete: (id: string) => void
  onClick: (deal: Deal) => void
  onOpenNotes?: (dealId: string) => void
  onUploadContract: (dealId: string, file: File) => void
  onDeleteContract: (dealId: string, fileUrl: string) => void
  uploadingContract: string | null
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const getNextStatus = (): Deal['status'] | null => {
    switch (deal.status) {
      case 'lead': return 'negotiating'
      case 'negotiating': return 'closed'
      case 'closed': return 'paid'
      case 'paid': return null
    }
  }

  const getNextStatusLabel = (): string => {
    switch (deal.status) {
      case 'lead': return 'Start Negotiating'
      case 'negotiating': return 'Mark as Closed'
      case 'closed': return 'Mark as Paid'
      case 'paid': return 'Completed'
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUploadContract(deal.id, file)
    }
  }

  const nextStatus = getNextStatus()

  return (
    <div 
      className="rounded-lg bg-zinc-900 p-3 border border-zinc-700 hover:border-zinc-600 transition-colors cursor-pointer"
      onClick={() => onClick(deal)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-white text-sm">{deal.brand_name}</h4>
          <p className="text-[#FFD700] font-medium text-lg mt-1">
            ${Number(deal.value).toLocaleString()}
          </p>
        </div>
      </div>
      
      {deal.deliverables && (
        <p className="text-xs text-zinc-400 mt-2">{deal.deliverables}</p>
      )}
      {deal.deadline && (
        <p className="text-xs text-zinc-500 mt-1">Due: {deal.deadline}</p>
      )}

      {(deal.status === 'closed' || deal.status === 'paid') && (
        <div className="mt-3 pt-3 border-t border-zinc-700">
          {deal.contract_file_url ? (
            <div className="space-y-2">
              <a
                href={deal.contract_file_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block text-xs py-2 px-3 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors border border-green-500/30 text-center"
              >
                📄 View Contract
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteContract(deal.id, deal.contract_file_url!)
                }}
                className="w-full text-xs py-2 px-3 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors border border-red-500/30"
              >
                Delete Contract
              </button>
            </div>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
                disabled={uploadingContract === deal.id}
                className="w-full text-xs py-2 rounded bg-[#3AAFF4]/20 hover:bg-[#3AAFF4]/30 text-[#3AAFF4] transition-colors border border-[#3AAFF4]/30 disabled:opacity-50"
              >
                {uploadingContract === deal.id ? 'Uploading...' : '📤 Upload Contract'}
              </button>
            </>
          )}
        </div>
      )}

      {deal.status === 'negotiating' && onOpenNotes && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenNotes(deal.id)
          }}
          className="mt-3 w-full text-xs py-2 rounded bg-[#FF4D94]/20 hover:bg-[#FF4D94]/30 text-[#FF4D94] transition-colors border border-[#FF4D94]/30"
        >
          💬 View Notes
        </button>
      )}

      {nextStatus && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMove(deal.id, nextStatus)
          }}
          className="mt-3 w-full text-xs py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700"
        >
          {getNextStatusLabel()} →
        </button>
      )}
    </div>
  )
}

// Modal Components (same as before)
function DealModal({
  title,
  brandName,
  value,
  deliverables,
  deadline,
  notes,
  onBrandNameChange,
  onValueChange,
  onDeliverablesChange,
  onDeadlineChange,
  onNotesChange,
  onSubmit,
  onClose,
}: {
  title: string
  brandName: string
  value: string
  deliverables: string
  deadline: string
  notes: string
  onBrandNameChange: (v: string) => void
  onValueChange: (v: string) => void
  onDeliverablesChange: (v: string) => void
  onDeadlineChange: (v: string) => void
  onNotesChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}) {
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-800 rounded-lg p-6 max-w-md w-full border border-zinc-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[#FFD700]">{title}</h3>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Brand Name *
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => onBrandNameChange(e.target.value)}
              placeholder="e.g., Nike, Adidas"
              required
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Deal Value ($) *
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder="5000"
              required
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Deliverables
            </label>
            <input
              type="text"
              value={deliverables}
              onChange={(e) => onDeliverablesChange(e.target.value)}
              placeholder="3 Instagram posts, 2 stories"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => onDeadlineChange(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Any additional details..."
              rows={3}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#FFD700] text-[#3A3A3A] px-4 py-2 rounded-lg font-semibold hover:bg-[#FFE55C] transition-colors"
          >
            {title}
          </button>
        </form>
      </div>
    </div>
  )
}

function DealDetailsModal({
  deal,
  brandName,
  value,
  deliverables,
  deadline,
  notes,
  onBrandNameChange,
  onValueChange,
  onDeliverablesChange,
  onDeadlineChange,
  onNotesChange,
  onSubmit,
  onClose,
  onDelete,
}: {
  deal: Deal
  brandName: string
  value: string
  deliverables: string
  deadline: string
  notes: string
  onBrandNameChange: (v: string) => void
  onValueChange: (v: string) => void
  onDeliverablesChange: (v: string) => void
  onDeadlineChange: (v: string) => void
  onNotesChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  onDelete: () => void
}) {
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-800 rounded-lg p-6 max-w-md w-full border border-zinc-700 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-[#FFD700]">Edit Deal</h3>
            <p className="text-xs text-zinc-400 mt-1">Created: {deal.created_at.split('T')[0]}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Brand Name *
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => onBrandNameChange(e.target.value)}
              placeholder="e.g., Nike, Adidas"
              required
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Deal Value ($) *
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder="5000"
              required
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Deliverables
            </label>
            <input
              type="text"
              value={deliverables}
              onChange={(e) => onDeliverablesChange(e.target.value)}
              placeholder="3 Instagram posts, 2 stories"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => onDeadlineChange(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Any additional details..."
              rows={3}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-[#FFD700] text-[#3A3A3A] px-4 py-2 rounded-lg font-semibold hover:bg-[#FFE55C] transition-colors"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-2 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
