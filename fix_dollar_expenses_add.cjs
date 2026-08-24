const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminDollarExpenses.tsx', 'utf8');

const targetButtons = `          <button 
            onClick={() => {
              setEditingTransaction(null);
              setShowModal(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            নতুন ডলার লেনদেন
          </button>`;

const replaceWith = `          {isSabbirRahman && (
            <button 
              onClick={() => {
                setEditingTransaction(null);
                setShowModal(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              নতুন ডলার লেনদেন
            </button>
          )}`;

content = content.replace(targetButtons, replaceWith);
fs.writeFileSync('src/pages/admin/AdminDollarExpenses.tsx', content);
