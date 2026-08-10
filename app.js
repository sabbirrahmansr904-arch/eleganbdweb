const KEY="elegan_finance_v1";
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const today=()=>new Date().toISOString().slice(0,10);
const seed={
 accounts:[
  {id:"bkash",name:"bKash Personal",type:"ব্যক্তিগত",number:"01619835133",holder:"Elegan BD Personal",opening:120000},
  {id:"sonali",name:"Sonali Bank",type:"ব্যাংক",number:"4213509000104",holder:"Md, Shamiul Islam",opening:80000},
  {id:"nagad",name:"Nagad Personal",type:"ব্যক্তিগত",number:"01619835133",holder:"Elegan BD personal",opening:45000}
 ],
 transactions:[
  {id:uid(),date:today(),account:"bkash",type:"income",amount:5000,description:"Customer Payment - Order #1234"},
  {id:uid(),date:today(),account:"sonali",type:"expense",amount:2450,description:"Supplier Payment - Invoice #5678"},
  {id:uid(),date:today(),account:"nagad",type:"income",amount:8750,description:"Cash Collection"},
  {id:uid(),date:today(),account:"bkash",type:"expense",amount:1200,description:"Office Supplies"},
  {id:uid(),date:today(),account:"sonali",type:"income",amount:15000,description:"Bank Transfer"}
 ]
};
let data=JSON.parse(localStorage.getItem(KEY)||"null")||seed;
let filtered=null;

const $=id=>document.getElementById(id);
const money=n=>`৳ ${Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const save=()=>localStorage.setItem(KEY,JSON.stringify(data));
const accountById=id=>data.accounts.find(a=>a.id===id);
const sign=t=>(["income","deposit"].includes(t)?1:-1);
const typeName=t=>({income:"ইনকাম",expense:"খরচ",deposit:"ডিপোজিট",withdrawal:"উইথড্র",transfer:"ট্রান্সফার"}[t]||t);
function balance(id){
 let a=accountById(id), b=Number(a?.opening||0);
 data.transactions.filter(t=>t.account===id).forEach(t=>b+=sign(t.type)*Number(t.amount||0));
 return b;
}
function renderAccounts(){
 $("accountCards").innerHTML=data.accounts.map((a,i)=>`
 <div class="account-card">
  <div class="account-icon">${i===0?"➤":i===1?"▰":"▰"}</div>
  <div class="account-info"><b>${esc(a.name)}</b><small>${esc(a.type)}</small><div class="balance">${money(balance(a.id))}</div></div>
  <button class="arrow" onclick="openAccountEdit('${a.id}')">→</button>
 </div>`).join("");
 $("accountFilter").innerHTML='<option value="">সব হিসাব</option>'+data.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join("");
 $("txAccount").innerHTML=data.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join("");
}
function renderSummary(){
 const tx=filtered||data.transactions;
 const income=tx.filter(t=>["income","deposit"].includes(t.type)).reduce((s,t)=>s+Number(t.amount),0);
 const expense=tx.filter(t=>["expense","withdrawal"].includes(t.type)).reduce((s,t)=>s+Number(t.amount),0);
 $("totalIncome").textContent=money(income); $("totalExpense").textContent=money(expense);
 $("netBalance").textContent=money(data.accounts.reduce((s,a)=>s+balance(a.id),0));
 $("totalTransactions").textContent=tx.length+" টি";
 $("donutCount").textContent=tx.length;
 const colors=["#5541ee","#08a66d","#ff6b2c","#eab308","#06b6d4"];
 const total=Math.max(1,data.accounts.reduce((s,a)=>s+Math.max(balance(a.id),0),0));
 let start=0, parts=[];
 data.accounts.forEach((a,i)=>{let pct=Math.max(0,balance(a.id))/total*100;parts.push(`${colors[i%colors.length]} ${start}% ${start+pct}%`);start+=pct});
 $("donut").style.background=`conic-gradient(${parts.join(",")})`;
 $("accountLegend").innerHTML=data.accounts.map((a,i)=>`<div class="legend-row"><span><i class="dot" style="background:${colors[i%colors.length]}"></i>${esc(a.name)}</span><b>${money(balance(a.id))}</b></div>`).join("");
}
function renderTable(){
 let tx=[...(filtered||data.transactions)].sort((a,b)=>b.date.localeCompare(a.date));
 $("resultCount").textContent=`মোট ${tx.length} টি রেকর্ড`;
 $("transactionTable").innerHTML=tx.length?tx.map(t=>{
  let b=balanceAt(t.account,t.id), cls=t.type==="income"||t.type==="deposit"?"income":t.type==="expense"||t.type==="withdrawal"?"expense":"transfer";
  return `<tr><td>${t.date}</td><td>▣ ${esc(accountById(t.account)?.name||"Deleted")}</td><td class="type ${cls}">${t.type==="income"?"↑":t.type==="expense"?"↓":"↗"} ${typeName(t.type)}</td><td>${esc(t.description||"-")}</td><td class="${cls}">${sign(t.type)>0?"+":"-"}${money(t.amount)}</td><td>${money(b)}</td><td>${t.attachment?"▣":"-"}</td><td><button class="action" onclick="editTx('${t.id}')">✎</button><button class="action del" onclick="deleteTx('${t.id}')">♲</button></td></tr>`;
 }).join(""):`<tr><td colspan="8" style="text-align:center;padding:25px">কোনো লেনদেন পাওয়া যায়নি</td></tr>`;
 $("pageInfo").textContent=`${Math.min(tx.length,10)} / ${tx.length}`;
}
function balanceAt(account,id){
 let b=accountById(account)?.opening||0;
 [...data.transactions].filter(t=>t.account===account).sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>{b+=sign(t.type)*Number(t.amount)});
 return b;
}
function renderActivity(){
 let tx=[...data.transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
 $("activity").innerHTML=tx.map(t=>`<div class="activity"><span>${t.type==="expense"?"🔴":"🟢"} ${typeName(t.type)} করা হয়েছে</span><strong class="${t.type==="expense"?"red":"green"}">${sign(t.type)>0?"+":"-"}${money(t.amount)}</strong><small>${esc(accountById(t.account)?.name||"")} · ${t.date}</small></div>`).join("");
}
function render(){renderAccounts();renderSummary();renderTable();renderActivity()}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
$("txDate").value=today();

$("transactionForm").addEventListener("submit",e=>{
 e.preventDefault();
 const t={id:uid(),date:$("txDate").value,account:$("txAccount").value,type:$("txType").value,amount:Number($("txAmount").value),description:$("txDescription").value.trim()};
 if(!t.account||!t.type||!t.amount)return;
 data.transactions.push(t);save();e.target.reset();$("txDate").value=today();render();toast("লেনদেন সফলভাবে সংরক্ষণ হয়েছে");
});
$("filterBtn").onclick=()=>{
 const account=$("accountFilter").value,type=$("typeFilter").value,q=$("search").value.toLowerCase(),from=$("fromDate").value;
 filtered=data.transactions.filter(t=>(!account||t.account===account)&&(!type||t.type===type)&&(!from||t.date>=from)&&(!q||`${t.description} ${accountById(t.account)?.name}`.toLowerCase().includes(q)));
 renderSummary();renderTable();
};
$("search").addEventListener("input",()=>{if(!$("search").value)$("filterBtn").click()});
$("newAccountBtn").onclick=()=>openAccountEdit();
$("closeModal").onclick=$("cancelModal").onclick=()=> $("modal").classList.remove("show");
function openAccountEdit(id){
 $("modalTitle").textContent=id?"অ্যাকাউন্ট সম্পাদনা":"নতুন অ্যাকাউন্ট";
 $("accountForm").dataset.id=id||"";
 let a=id&&accountById(id);
 $("accName").value=a?.name||"";$("accType").value=a?.type||"ব্যাংক";$("accNumber").value=a?.number||"";$("accHolder").value=a?.holder||"";$("accOpening").value=a?.opening??0;
 $("modal").classList.add("show");
}
$("accountForm").onsubmit=e=>{
 e.preventDefault();let id=e.target.dataset.id;
 let obj={name:$("accName").value.trim(),type:$("accType").value,number:$("accNumber").value.trim(),holder:$("accHolder").value.trim(),opening:Number($("accOpening").value||0)};
 if(id){Object.assign(accountById(id),obj)}else{data.accounts.push({id:uid(),...obj})}
 save();e.target.reset();$("modal").classList.remove("show");render();toast("অ্যাকাউন্ট সংরক্ষণ হয়েছে");
};
window.openAccountEdit=openAccountEdit;
window.deleteTx=id=>{if(confirm("আপনি কি এই লেনদেনটি মুছে ফেলতে চান?")){data.transactions=data.transactions.filter(t=>t.id!==id);save();render();}};
window.editTx=id=>{
 let t=data.transactions.find(x=>x.id===id); if(!t)return;
 $("txAccount").value=t.account;$("txType").value=t.type;$("txAmount").value=t.amount;$("txDate").value=t.date;$("txDescription").value=t.description||"";
 data.transactions=data.transactions.filter(x=>x.id!==id);save();render();window.scrollTo({top:0,behavior:"smooth"});toast("লেনদেনটি এডিট মোডে নেওয়া হয়েছে");
};
$("exportBtn").onclick=()=>{
 let rows=[["Date","Account","Type","Description","Amount","Balance"],...data.transactions.map(t=>[t.date,accountById(t.account)?.name,typeName(t.type),t.description,t.amount,balanceAt(t.account,t.id)])];
 let csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
 let blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="finance-report.csv";a.click();URL.revokeObjectURL(a.href);
};
function toast(msg){let x=document.createElement("div");x.textContent=msg;x.style="position:fixed;right:20px;bottom:20px;background:#162033;color:#fff;padding:12px 18px;border-radius:10px;z-index:99;box-shadow:0 10px 30px #0003";document.body.appendChild(x);setTimeout(()=>x.remove(),2200)}
render();