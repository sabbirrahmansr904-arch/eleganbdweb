const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminDollarExpenses.tsx', 'utf8');

const targetButtons = `<button
                            onClick={() => {
                              setEditId(t.id);
                              setForm({
                                amount: String(t.amount),
                                type: t.type,
                                rate: String(t.rate || ''),
                                bdtAmount: String(t.bdtAmount || ''),
                                date: new Date(t.date).toISOString().split('T')[0],
                                reason: t.reason || '',
                                platform: t.platform || ''
                              });
                              setFormType(t.type);
                              setShowAddModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-150 rounded-lg transition-colors cursor-pointer"
                            title="এডিট"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingId(t.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 bg-gray-50 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-colors cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>`;

const replaceWith = `{isSabbirRahman && (
                            <>
                              <button
                                onClick={() => {
                                  setEditId(t.id);
                                  setForm({
                                    amount: String(t.amount),
                                    type: t.type,
                                    rate: String(t.rate || ''),
                                    bdtAmount: String(t.bdtAmount || ''),
                                    date: new Date(t.date).toISOString().split('T')[0],
                                    reason: t.reason || '',
                                    platform: t.platform || ''
                                  });
                                  setFormType(t.type);
                                  setShowAddModal(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-150 rounded-lg transition-colors cursor-pointer"
                                title="এডিট"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingId(t.id)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 bg-gray-50 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-colors cursor-pointer"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}`;

content = content.replace(targetButtons, replaceWith);
fs.writeFileSync('src/pages/admin/AdminDollarExpenses.tsx', content);
