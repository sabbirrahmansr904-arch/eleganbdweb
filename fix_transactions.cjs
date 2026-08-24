const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminTransactionList.tsx', 'utf8');

const targetButtons = `<button
              onClick={() => handleBulkStatusChange('paid')}
              className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>সব Paid করুন</span>
            </button>
            <button
              onClick={() => handleBulkStatusChange('unpaid')}
              className="px-3 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Unpaid</span>
            </button>`;

const replaceWith = `{isSabbirRahman && (
              <>
                <button
                  onClick={() => handleBulkStatusChange('paid')}
                  className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>সব Paid করুন</span>
                </button>
                <button
                  onClick={() => handleBulkStatusChange('unpaid')}
                  className="px-3 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Unpaid</span>
                </button>
              </>
            )}`;

content = content.replace(targetButtons, replaceWith);
fs.writeFileSync('src/pages/admin/AdminTransactionList.tsx', content);
