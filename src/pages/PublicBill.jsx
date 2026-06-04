import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

// Short keys to minimize URL length
const KEY_MAP = {
  n: 'tenantName', r: 'roomNumber', d: 'date', m: 'month',
  a: 'amount', md: 'mode', nt: 'note', c: 'currency',
  pg: 'pgName', l: 'location', ct: 'contact', u: 'upiId',
  rc: 'receiptNo', bt: 'billType', adv: 'advance',
  pr: 'proRateNote', nm: 'nextMonthAmount', nd: 'nextMonthDue'
}
const REV_MAP = Object.fromEntries(Object.entries(KEY_MAP).map(([k, v]) => [v, k]))

const compress = (data) => {
  const short = {}
  for (const [key, val] of Object.entries(data)) {
    if (val === '' || val === null || val === undefined || val === 0) continue
    short[REV_MAP[key] || key] = val
  }
  return short
}

const expand = (short) => {
  const full = {}
  for (const [key, val] of Object.entries(short)) {
    full[KEY_MAP[key] || key] = val
  }
  return full
}

// Unicode-safe base64
const utoa = (str) => btoa(unescape(encodeURIComponent(str)))
const atou = (str) => decodeURIComponent(escape(atob(str)))

const decode = (str) => {
  try { return expand(JSON.parse(atou(str))) }
  catch { return null }
}

export function getBillLink(data) {
  const encoded = utoa(JSON.stringify(compress(data)))
  const base = window.location.origin + window.location.pathname
  return `${base}#/bill?d=${encoded}`
}

export function copyBillLink(data) {
  const link = getBillLink(data)
  navigator.clipboard.writeText(link).then(() => alert('Bill link copied!')).catch(() => {
    prompt('Copy this link:', link)
  })
  return link
}

export default function PublicBill() {
  const [params] = useSearchParams()
  const bill = useMemo(() => decode(params.get('d')), [params])

  if (!bill) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <div className="text-center">
        <p className="text-4xl mb-3">!</p>
        <p className="text-gray-400">Invalid or expired bill link.</p>
      </div>
    </div>
  )

  const date = new Date(bill.date)
  const formattedDate = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const handlePrint = () => window.print()

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="w-full max-w-[380px]">

        {/* ACTION BUTTONS - hidden on print */}
        <div className="flex gap-2 mb-4 print:hidden">
          <button onClick={handlePrint}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2.5 rounded-xl transition-all">
            Download / Print
          </button>
        </div>

        {/* RECEIPT */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden print:shadow-none print:rounded-none" id="bill-receipt">
          <style>{`
            @media print {
              body { margin: 0; padding: 0; }
              .print\\:hidden { display: none !important; }
              #bill-receipt { width: 80mm; margin: 0 auto; }
            }
          `}</style>

          {/* Header */}
          <div className="bg-gray-900 text-white px-6 py-5 text-center">
            <h1 className="text-lg font-black tracking-wide">{bill.pgName}</h1>
            {bill.location && <p className="text-gray-400 text-xs mt-1">{bill.location}</p>}
            {bill.contact && <p className="text-gray-400 text-xs">Contact: {bill.contact}</p>}
          </div>

          {/* Receipt Title */}
          <div className="bg-indigo-600 text-white text-center py-2">
            <p className="text-xs font-bold tracking-[3px] uppercase">{bill.billType === 'admission' ? 'Admission Receipt' : 'Payment Receipt'}</p>
          </div>

          {/* Receipt No */}
          {bill.receiptNo && (
            <p className="text-center text-[10px] text-gray-400 font-mono py-1 bg-gray-50">{bill.receiptNo}</p>
          )}

          {/* Details */}
          <div className="px-5 py-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tenant</span>
                <span className="font-semibold text-gray-900">{bill.tenantName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Room</span>
                <span className="font-semibold text-gray-900">{bill.roomNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-semibold text-gray-900">{formattedDate}</span>
              </div>
              {bill.month && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">For Period</span>
                  <span className="font-semibold text-gray-900">{bill.month}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Mode</span>
                <span className="font-semibold text-gray-900">{(bill.mode || 'cash').toUpperCase()}</span>
              </div>
              {bill.note && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Note</span>
                  <span className="font-semibold text-gray-900 text-right max-w-[55%]">{bill.note}</span>
                </div>
              )}
            </div>

            {/* Pro-rate info */}
            {bill.proRateNote && (
              <p className="text-xs text-amber-600 italic text-center mt-3 bg-amber-50 rounded-lg py-1.5 px-2">{bill.proRateNote}</p>
            )}

            {/* Advance */}
            {bill.advance > 0 && (
              <div className="flex justify-between text-sm mt-3 pt-3 border-t border-dashed border-gray-200">
                <span className="text-gray-500">Advance Deposit</span>
                <span className="font-semibold text-gray-900">{bill.currency}{Number(bill.advance).toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="mx-5 mb-4 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-1">Amount Paid</p>
            <p className="text-3xl font-black text-green-700">{bill.currency}{Number(bill.amount).toLocaleString('en-IN')}</p>
          </div>

          {/* PAID stamp */}
          <div className="text-center mb-3">
            <span className="inline-block text-green-600 font-black text-sm border-2 border-green-500 px-4 py-1 rounded-md tracking-widest" style={{ transform: 'rotate(-2deg)', display: 'inline-block' }}>
              PAID
            </span>
          </div>

          {/* Next Month Info */}
          {bill.nextMonthAmount > 0 && (
            <div className="mx-5 mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <p className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider mb-1">Next Month Fee</p>
              <p className="text-xl font-black text-amber-700">{bill.currency}{Number(bill.nextMonthAmount).toLocaleString('en-IN')}</p>
              {bill.nextMonthDue && <p className="text-[10px] text-amber-600 mt-1">Due by {bill.nextMonthDue}</p>}
            </div>
          )}

          {/* UPI */}
          {bill.upiId && (
            <div className="mx-5 mb-4 bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Pay via UPI</p>
              <p className="text-sm font-mono font-semibold text-gray-700">{bill.upiId}</p>
            </div>
          )}

          {/* Footer */}
          <div className="bg-gray-50 px-5 py-4 text-center border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Thank you, {bill.tenantName}!</p>
            <p className="text-[10px] text-gray-400 mt-1">This is a computer-generated receipt.</p>
            <p className="text-[10px] text-gray-400">{bill.pgName} | {new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        {/* Powered by */}
        <p className="text-center text-[10px] text-gray-400 mt-3 print:hidden">Powered by PGMS</p>
      </div>
    </div>
  )
}
