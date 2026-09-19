import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eeifewkhrtveenyrrirj.supabase.co';
const supabaseKey = 'sb_publishable_XD9wPgNEzlHdAaJ2RN_BFw_izYEgB2p';
const sb = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("--- FETCHING ALL BANK ACCOUNTS ---");
  const { data: accounts, error: accErr } = await sb.from('app_documents').select('*').eq('collection_name', 'bank_accounts');
  if (accErr) {
    console.error("Error fetching accounts:", accErr);
  } else {
    console.log(`Found ${accounts?.length || 0} accounts:`);
    accounts?.forEach(a => {
      console.log(`- ID: ${a.record_id}, Bank: ${a.data?.bankName}, AccountName: ${a.data?.accountName}, Balance: ${a.data?.balance}`);
    });
  }

  console.log("\n--- FETCHING ALL BANK TRANSACTIONS ---");
  const { data: txs, error: txErr } = await sb.from('app_documents').select('*').eq('collection_name', 'bank_transactions');
  if (txErr) {
    console.error("Error fetching transactions:", txErr);
  } else {
    console.log(`Found ${txs?.length || 0} transactions:`);
    txs?.forEach(t => {
      console.log(`- ID: ${t.record_id}, AccountId: ${t.data?.accountId}, Type: ${t.data?.type}, Amount: ${t.data?.amount}, Status: ${t.data?.status}, Date: ${t.data?.date}`);
    });
  }
}

run();
