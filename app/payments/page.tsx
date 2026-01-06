'use client'

import { useState, useEffect } from 'react'
import { supabase, type Payment, type Deal } from '@/lib/supabase/client'
import Link from 'next/link'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  // Form state
  const [dealId, setDealId] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<'pending' | 'paid' | 'overdue'>('pending')
  const [notes, setNotes] = useState('')
  const [paidDate, setPaidDate] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('due_date', { ascending: true })

      if (paymentsError) throw paymentsError

      // Load deals
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false })

      if (dealsError) throw dealsError

      setPayments(paymentsData || [])
      setDeals(dealsData || [])

      // Auto-update overdue payments
      updateOverduePayments(paymentsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateOverduePayments = async (paymentsList: Payment[]) => {
    const today = new Date().toISOString().split('T')[0]
    const overduePayments = paymentsList.filter(
      p => p.status === 'pending' && p.due_date && p.due_date < today
    )

    for (const payment of overduePayments) {
      await supabase
        .from('payments')
        .update({ status: 'overdue' })
        .eq('id', payment.id)
    }

    if (overduePayments.length > 0) {
      await loadData()
    }
  }

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { error } = await supabase
        .from('payments')
        .insert([
          {
            deal_id: dealId,
            amount: parseFloat(amount),
            due_date: dueDate || null,
            paid_date: status === 'paid' ? (paidDate || new Date().toISOString().split('T')[0]) : null,
            status: status,
            notes: notes,
          }
        ])

      if (error) throw error

      alert('Payment added successfully!')
      await loadData()
      resetForm()
      setIsAddModalOpen(false)
    } catch (error) {
      console.error('Error adding payment:', error)
      alert('Failed to add payment')
    }
  }

  const handleEditPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPayment) return

    try {
      const { error } = await supabase
        .from('payments')
        .update({
          deal_id: dealId,
          amount: parseFloat(amount),
          due_date: dueDate || null,
          paid_date: status === 'paid' ? (paidDate || new Date().toISOString().split('T')[0]) : null,
          status: status,
          notes: notes,
        })
        .eq('id', selectedPayment.id)

      if (error) throw error

      alert('Payment updated successfully!')
      await loadData()
      resetForm()
      setSelectedPayment(null)
    } catch (error) {
      console.error('Error updating payment:', error)
      alert('Failed to update payment')
    }
  }

  const markAsPaid = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', paymentId)

      if (error) throw error

      await loadData()
    } catch (error) {
      console.error('Error marking payment as paid:', error)
      alert('Failed to update payment')
    }
  }

  const deletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId)

      if (error) throw error

      await loadData()
      setSelectedPayment(null)
    } catch (error) {
      console.error('Error deleting payment:', error)
      alert('Failed to delete payment')
    }
  }

  const openEditModal = (payment: Payment) => {
    setSelectedPayment(payment)
    setDealId(payment.deal_id)
    setAmount(payment.amount.toString())
    setDueDate(payment.due_date || '')
    setStatus(payment.status)
    setNotes(payment.notes || '')
    setPaidDate(payment.paid_date || '')
  }

  const resetForm = () => {
    setDealId('')
    setAmount('')
    setDueDate('')
    setStatus('pending')
    setNotes('')
    setPaidDate('')
  }

  const getDealName = (dealId: string) => {
    const deal = deals.find(d => d.id === dealId)
    return deal ? `${deal.brand_name} - $${deal.value}` : 'Unknown Deal'
  }

  const getPaymentsByStatus = (paymentStatus: Payment['status']) => {
    return payments.filter(p => p.status === paymentStatus)
  }

  // Calculate stats
  const totalPending = getPaymentsByStatus('pending').reduce((sum, p) => sum + Number(p.amount), 0)
  const totalOverdue = getPaymentsByStatus('overdue').reduce((sum, p) => sum + Number(p.amount), 0)
  const totalPaid = getPaymentsByStatus('paid').reduce((sum, p) => sum + Number(p.amount), 0)
  const totalExpected = payments.reduce((sum, p) => sum + Number(p.amount), 0)

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
                <Link href="/contracts" className="text-zinc-400 hover:text-white transition-colors">
                  Contracts
                </Link>
                <Link href="/payments" className="text-white font-semibold">
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
            Payment Tracker
          </h2>
          <p className="mt-2 text-zinc-400">
            Manage and track all your brand deal payments
          </p>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <p className="text-zinc-400 text-sm">Total Expected</p>
            <p className="text-2xl font-bold text-white mt-1">
              ${totalExpected.toLocaleString()}
            </p>
          </div>
          <div className="bg-zinc-800/50 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-zinc-400 text-sm">Pending</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">
              ${totalPending.toLocaleString()}
            </p>
          </div>
          <div className="bg-zinc-800/50 border border-[#FF4D94]/30 rounded-lg p-4">
            <p className="text-zinc-400 text-sm">Overdue</p>
            <p className="text-2xl font-bold text-[#FF4D94] mt-1">
              ${totalOverdue.toLocaleString()}
            </p>
          </div>
          <div className="bg-zinc-800/50 border border-[#3AAFF4]/30 rounded-lg p-4">
            <p className="text-zinc-400 text-sm">Paid</p>
            <p className="text-2xl font-bold text-[#3AAFF4] mt-1">
              ${totalPaid.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-900 border-b border-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Deal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">
                      No payments yet. Add your first payment to get started!
                    </td>
                  </tr>
                ) : (
                  payments.map(payment => (
                    <tr key={payment.id} className="hover:bg-zinc-900/50 cursor-pointer" onClick={() => openEditModal(payment)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {getDealName(payment.deal_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#FFD700]">
                        ${Number(payment.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                        {payment.due_date || 'No due date'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          payment.status === 'paid' ? 'bg-[#3AAFF4]/20 text-[#3AAFF4]' :
                          payment.status === 'overdue' ? 'bg-[#FF4D94]/20 text-[#FF4D94]' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {payment.status !== 'paid' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsPaid(payment.id)
                            }}
                            className="text-[#3AAFF4] hover:text-[#3AAFF4]/80 font-medium"
                          >
                            Mark Paid
                          </button>
                        )}
                        {payment.status === 'paid' && payment.paid_date && (
                          <span className="text-zinc-500 text-xs">Paid: {payment.paid_date}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Floating Add Button */}
      <button 
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-6 right-6 rounded-full bg-[#FFD700] w-14 h-14 flex items-center justify-center text-2xl font-bold text-[#3A3A3A] shadow-lg hover:bg-[#FFE55C] transition-all transform hover:scale-110 z-40"
        title="Add Payment"
      >
        +
      </button>

      {/* Add Payment Modal */}
      {isAddModalOpen && (
        <PaymentModal
          title="Add Payment"
          deals={deals}
          dealId={dealId}
          amount={amount}
          dueDate={dueDate}
          status={status}
          notes={notes}
          paidDate={paidDate}
          onDealIdChange={setDealId}
          onAmountChange={setAmount}
          onDueDateChange={setDueDate}
          onStatusChange={setStatus}
          onNotesChange={setNotes}
          onPaidDateChange={setPaidDate}
          onSubmit={handleAddPayment}
          onClose={() => {
            setIsAddModalOpen(false)
            resetForm()
          }}
        />
      )}

      {/* Edit Payment Modal */}
      {selectedPayment && (
        <PaymentModal
          title="Edit Payment"
          deals={deals}
          dealId={dealId}
          amount={amount}
          dueDate={dueDate}
          status={status}
          notes={notes}
          paidDate={paidDate}
          onDealIdChange={setDealId}
          onAmountChange={setAmount}
          onDueDateChange={setDueDate}
          onStatusChange={setStatus}
          onNotesChange={setNotes}
          onPaidDateChange={setPaidDate}
          onSubmit={handleEditPayment}
          onClose={() => {
            setSelectedPayment(null)
            resetForm()
          }}
          onDelete={() => deletePayment(selectedPayment.id)}
          isEdit
        />
      )}
    </div>
  )
}

// Payment Modal Component
function PaymentModal({
  title,
  deals,
  dealId,
  amount,
  dueDate,
  status,
  notes,
  paidDate,
  onDealIdChange,
  onAmountChange,
  onDueDateChange,
  onStatusChange,
  onNotesChange,
  onPaidDateChange,
  onSubmit,
  onClose,
  onDelete,
  isEdit = false,
}: {
  title: string
  deals: Deal[]
  dealId: string
  amount: string
  dueDate: string
  status: 'pending' | 'paid' | 'overdue'
  notes: string
  paidDate: string
  onDealIdChange: (v: string) => void
  onAmountChange: (v: string) => void
  onDueDateChange: (v: string) => void
  onStatusChange: (v: 'pending' | 'paid' | 'overdue') => void
  onNotesChange: (v: string) => void
  onPaidDateChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  onDelete?: () => void
  isEdit?: boolean
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
              Deal *
            </label>
            <select
              value={dealId}
              onChange={(e) => onDealIdChange(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            >
              <option value="">Select a deal...</option>
              {deals.map(deal => (
                <option key={deal.id} value={deal.id}>
                  {deal.brand_name} - ${deal.value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Amount ($) *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="2500"
              required
              step="0.01"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Status *
            </label>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value as 'pending' | 'paid' | 'overdue')}
              required
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {status === 'paid' && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Paid Date
              </label>
              <input
                type="date"
                value={paidDate}
                onChange={(e) => onPaidDateChange(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Payment details, invoice number, etc."
              rows={3}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-[#FFD700] text-[#3A3A3A] px-4 py-2 rounded-lg font-semibold hover:bg-[#FFE55C] transition-colors"
            >
              {isEdit ? 'Save Changes' : 'Add Payment'}
            </button>
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-2 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}