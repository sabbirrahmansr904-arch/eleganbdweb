const fs = require('fs');
const p = 'src/pages/admin/AdminTransactionList.tsx';
let code = fs.readFileSync(p, 'utf8');

// 1. Add state for print modal
if (!code.includes('showPrintModal')) {
  code = code.replace(
    /const \[showViewTxModal, setShowViewTxModal\] = useState\(false\);/,
    `const [showPrintModal, setShowPrintModal] = useState(false);\n  const [printTargetList, setPrintTargetList] = useState<any[]>([]);\n  const [showViewTxModal, setShowViewTxModal] = useState(false);`
  );
}

// 2. Modify handleExportReport
const oldHandleExport = /const doc = new jsPDF[\s\S]*?toast\.success\('PDF রিপোর্ট ডাউনলোড সফল হয়েছে!'\);\n\s*\}/;

const newHandleExport = `
    if (format === 'print' || format === 'pdf') {
      setPrintTargetList(listToExport);
      setShowPrintModal(true);
    }
`;

code = code.replace(oldHandleExport, newHandleExport);

// 3. Remove jsPDF imports
code = code.replace(/import jsPDF from 'jspdf';\nimport autoTable from 'jspdf-autotable';\n/, '');

// 4. Inject Print Modal before closing </div>
const printModalHTML = `
      {/* Print / PDF Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[200] flex flex-col p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="flex-1 w-full max-w-5xl mx-auto bg-slate-100 rounded-[32px] overflow-hidden flex flex-col shadow-2xl border border-slate-700">
            
            {/* Header / Actions */}
            <div className="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 text-indigo-400">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">আর্থিক লেনদেন স্টেটমেন্ট ও PDF প্রিভিউ</h3>
                  <p className="text-xs text-slate-400 font-medium">বাংলা ও ইংরেজি সব লেখা সম্পূর্ণ স্পষ্ট ও সুন্দরভাবে প্রিন্ট অথবা PDF হিসেবে সেভ করুন</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
                  title="ব্রাউজার থেকে সরাসরি PDF হিসেবে সেভ করুন"
                >
                  <Printer className="w-4 h-4" />
                  <span>PDF প্রিন্ট / সেভ করুন</span>
                </button>

                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Statement Sheet */}
            <div className="p-4 sm:p-8 overflow-y-auto bg-slate-200/60 flex justify-center">
              <div className="printable-sheet bg-white p-6 sm:p-10 rounded-2xl shadow-md border border-slate-200 max-w-3xl w-full text-slate-800 space-y-6">
                
                {/* Statement Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-indigo-600 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-sm flex items-center justify-center">৳</span>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">ELEGAN BD</h2>
                    </div>
                    <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">লেনদেন তালিকা (Transaction List Report)</p>
                    <p className="text-[11px] text-slate-500 font-medium">অফিশিয়াল হিসাব ও লেনদেন সংক্রান্ত বিস্তারিত প্রতিবেদন</p>
                  </div>

                  <div className="text-left sm:text-right space-y-1 text-xs">
                    <p className="font-bold text-slate-900">
                      <span className="text-slate-400">তারিখ: </span>
                      {new Date().toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      <span className="text-slate-400">সময়: </span>
                      {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-slate-500 text-[11px] mt-1">
                      মোট রেকর্ড: <strong className="text-indigo-600">{printTargetList.length} টি</strong>
                    </p>
                  </div>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-3 gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <div className="space-y-1 border-r border-slate-200 pr-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">মোট আয় (Income)</p>
                    <p className="text-sm font-black text-emerald-600">
                      {formatPrice(printTargetList.filter(t => t.type === 'deposit' && t.status !== 'unpaid').reduce((s, t) => s + t.amount, 0))}
                    </p>
                  </div>
                  <div className="space-y-1 border-r border-slate-200 px-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">মোট খরচ (Expense)</p>
                    <p className="text-sm font-black text-rose-600">
                      {formatPrice(printTargetList.filter(t => t.type === 'withdraw' && t.status !== 'unpaid').reduce((s, t) => s + t.amount, 0))}
                    </p>
                  </div>
                  <div className="space-y-1 pl-4">
                    <p className="text-[10px] font-bold text-amber-800 uppercase">বকেয়া / Unpaid</p>
                    <p className="text-sm font-black text-amber-600">
                      {formatPrice(printTargetList.filter(t => t.status === 'unpaid').reduce((s, t) => s + t.amount, 0))}
                    </p>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-indigo-600 text-white font-bold text-[11px]">
                        <th className="py-2.5 px-3 text-center w-8">#</th>
                        <th className="py-2.5 px-3">তারিখ</th>
                        <th className="py-2.5 px-3">হিসাব</th>
                        <th className="py-2.5 px-3">রেফারেন্স / নোট</th>
                        <th className="py-2.5 px-3 text-center">স্ট্যাটাস</th>
                        <th className="py-2.5 px-3 text-right">পরিমাণ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {printTargetList.map((tx, idx) => {
                        const acc = bankAccounts.find(a => a.id === tx.accountId);
                        const isIncome = tx.type === 'deposit';
                        const isTransfer = tx.type === 'transfer';
                        const isPaid = tx.status !== 'unpaid';

                        return (
                          <tr key={tx.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                            <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-700 text-[11px]">
                              {new Date(tx.date).toLocaleDateString('en-GB')}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900 text-[11px]">
                              {acc?.bankName || 'Unknown'}
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-[11px] max-w-[200px] truncate">
                              {tx.reference || tx.notes || '-'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={\`inline-block px-2 py-0.5 rounded text-[10px] font-bold \${
                                isPaid ? 'text-emerald-700' : 'text-amber-700'
                              }\`}>
                                {isPaid ? 'PAID' : 'UNPAID'}
                              </span>
                            </td>
                            <td className={\`py-2 px-3 text-right font-black text-xs \${
                              isIncome ? 'text-emerald-700' : isTransfer ? 'text-indigo-700' : 'text-rose-700'
                            }\`}>
                              {isIncome ? '+' : isTransfer ? '' : '-'}{formatPrice(tx.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Signature Area */}
                <div className="pt-16 pb-4 flex items-center justify-between text-xs text-slate-500">
                  <div className="text-center border-t border-slate-300 pt-2 w-40">
                    <p className="font-bold">Authorized By</p>
                    <p className="text-[10px]">Admin / Manager</p>
                  </div>
                  <div className="text-center text-[10px]">
                    <p>Report automatically generated by ELEGAN BD</p>
                    <p>System printed on {new Date().toLocaleDateString('en-GB')}</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <style dangerouslySetInnerHTML={{__html: \`
            @media print {
              body * { visibility: hidden; }
              .printable-sheet, .printable-sheet * { visibility: visible; }
              .printable-sheet {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
                box-shadow: none;
                border: none;
              }
              @page { margin: 1cm; }
            }
          \`}} />
        </div>
      )}
`;

const lastDivIndex = code.lastIndexOf('</div>');
code = code.substring(0, lastDivIndex) + printModalHTML + code.substring(lastDivIndex);

fs.writeFileSync(p, code);
