const fs = require('fs');
let content = fs.readFileSync('src/components/admin/AdminLayout.tsx', 'utf8');

content = content.replace(/\{isRestrictedSabbirKey\(currentRequiredPerm \|\| ''\) \? 'Access Restricted • শুধুমাত্র সাব্বির রহমানের জন্য সংরক্ষিত' : 'Access Restricted • এক্সেস সীমিত'\}/g, "'Access Restricted • এক্সেস সীমিত'");

content = content.replace(/\{isRestrictedSabbirKey\(currentRequiredPerm \|\| ''\)[\s\S]*?\?\s*'এই সেকশনের \(All Accounts, Admin Access\) পূর্ণ এক্সেস শুধুমাত্র সাব্বির রহমান \(Sabbir Rahman\)-এর অ্যাকাউন্টে সীমাবদ্ধ। অন্য কোনো এডমিন অ্যাকাউন্ট থেকে এই পেজ দেখার অনুমতি নেই\.'\s*:\s*`আপনার এডমিন অ্যাকাউন্টে এই মডিউলটি \(\$\{currentRequiredPerm\?\.toUpperCase\(\)\}\) ব্যবহারের পারমিশন দেওয়া হয়নি। আপনি শুধুমাত্র আপনার জন্য নির্ধারিত অনুমোদিত মডিউলে কাজ করতে পারবেন।`\}/g, "`আপনার এডমিন অ্যাকাউন্টে এই মডিউলটি (${currentRequiredPerm?.toUpperCase()}) ব্যবহারের পারমিশন দেওয়া হয়নি। আপনি শুধুমাত্র আপনার জন্য নির্ধারিত অনুমোদিত মডিউলে কাজ করতে পারবেন।`");

fs.writeFileSync('src/components/admin/AdminLayout.tsx', content);
