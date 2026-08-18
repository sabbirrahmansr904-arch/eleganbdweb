/**
 * Intelligent Bangladesh Address & Location Parser
 * Extracts District and Thana/Zone from customer addresses written in Bangla, English, or mixed format.
 */

import { DISTRICT_THANAS } from '../data/locations';

// Comprehensive mapping of Bangla & English District names
export const DISTRICT_MAP: { english: string; bangla: string; aliases: string[] }[] = [
  { english: 'Dhaka', bangla: 'ঢাকা', aliases: ['dhaka', 'dhk', 'ঢাকা', 'ঢাকা সিটি', 'dhaka city'] },
  { english: 'Gazipur', bangla: 'গাজীপুর', aliases: ['gazipur', 'গাজীপুর'] },
  { english: 'Narayanganj', bangla: 'নারায়ণগঞ্জ', aliases: ['narayanganj', 'নারায়ণগঞ্জ', 'নারায়নগঞ্জ'] },
  { english: 'Tangail', bangla: 'টাঙ্গাইল', aliases: ['tangail', 'টাঙ্গাইল'] },
  { english: 'Kishoreganj', bangla: 'কিশোরগঞ্জ', aliases: ['kishoreganj', 'কিশোরগঞ্জ'] },
  { english: 'Narsingdi', bangla: 'নরসিংদী', aliases: ['narsingdi', 'narshingdi', 'নরসিংদী'] },
  { english: 'Manikganj', bangla: 'মানিকগঞ্জ', aliases: ['manikganj', 'মানিকগঞ্জ'] },
  { english: 'Munshiganj', bangla: 'মুন্সীগঞ্জ', aliases: ['munshiganj', 'munsiganj', 'মুন্সীগঞ্জ', 'মুন্সিগঞ্জ'] },
  { english: 'Faridpur', bangla: 'ফরিদপুর', aliases: ['faridpur', 'ফরিদপুর'] },
  { english: 'Gopalganj', bangla: 'গোপালগঞ্জ', aliases: ['gopalganj', 'gopalgonj', 'গোপালগঞ্জ'] },
  { english: 'Madaripur', bangla: 'মাদারীপুর', aliases: ['madaripur', 'মাদারীপুর'] },
  { english: 'Rajbari', bangla: 'রাজবাড়ী', aliases: ['rajbari', 'রাজবাড়ী', 'রাজবাড়ি'] },
  { english: 'Shariatpur', bangla: 'শরীয়তপুর', aliases: ['shariatpur', 'শরীয়তপুর', 'শরিয়তপুর'] },
  { english: 'Chittagong', bangla: 'চট্টগ্রাম', aliases: ['chittagong', 'chattogram', 'ctg', 'চট্টগ্রাম', 'চট্রগ্রাম'] },
  { english: "Cox's Bazar", bangla: 'কক্সবাজার', aliases: ["cox's bazar", 'coxsbazar', 'cox bazar', 'কক্সবাজার', 'কক্স বাজার'] },
  { english: 'Cumilla', bangla: 'কুমিল্লা', aliases: ['cumilla', 'comilla', 'কুমিল্লা'] },
  { english: 'Feni', bangla: 'ফেনী', aliases: ['feni', 'ফেনী', 'ফেনি'] },
  { english: 'B. Baria', bangla: 'ব্রাহ্মণবাড়িয়া', aliases: ['brahmanbaria', 'b. baria', 'b baria', 'ব্রাহ্মণবাড়িয়া', 'ব্রাহ্মণবাড়িয়া', 'বি. বাড়িয়া', 'বি বাড়িয়া'] },
  { english: 'Noakhali', bangla: 'নোয়াখালী', aliases: ['noakhali', 'নোয়াখালী', 'নোয়াখালী'] },
  { english: 'Chandpur', bangla: 'চাঁদপুর', aliases: ['chandpur', 'চাঁদপুর'] },
  { english: 'Lakshmipur', bangla: 'লক্ষ্মীপুর', aliases: ['lakshmipur', 'লক্ষ্মীপুর', 'লক্ষীপুর'] },
  { english: 'Sylhet', bangla: 'সিলেট', aliases: ['sylhet', 'সিলেট'] },
  { english: 'Moulvibazar', bangla: 'মৌলভীবাজার', aliases: ['moulvibazar', 'moulvibazar', 'মৌলভীবাজার'] },
  { english: 'Habiganj', bangla: 'হবিগঞ্জ', aliases: ['habiganj', 'হবিগঞ্জ'] },
  { english: 'Sunamganj', bangla: 'সুনামগঞ্জ', aliases: ['sunamganj', 'সুনামগঞ্জ'] },
  { english: 'Khulna', bangla: 'খুলনা', aliases: ['khulna', 'খুলনা'] },
  { english: 'Jashore', bangla: 'যশোর', aliases: ['jashore', 'jessore', 'যশোর'] },
  { english: 'Satkhira', bangla: 'সাতক্ষীরা', aliases: ['satkhira', 'সাতক্ষীরা'] },
  { english: 'Jhenidah', bangla: 'ঝিনাইদহ', aliases: ['jhenidah', 'jhenaidah', 'ঝিনাইদহ'] },
  { english: 'Kushtia', bangla: 'কুষ্টিয়া', aliases: ['kushtia', 'কুষ্টিয়া', 'কুষ্টিয়া'] },
  { english: 'Magura', bangla: 'মাগুরা', aliases: ['magura', 'মাগুরা'] },
  { english: 'Meherpur', bangla: 'মেহেরপুর', aliases: ['meherpur', 'মেহেরপুর'] },
  { english: 'Narail', bangla: 'নড়াইল', aliases: ['narail', 'নড়াইল', 'নড়াইল'] },
  { english: 'Chuadanga', bangla: 'চুয়াডাঙ্গা', aliases: ['chuadanga', 'চুয়াডাঙ্গা', 'চুয়াডাঙ্গা'] },
  { english: 'Bagerhat', bangla: 'বাগেরহাট', aliases: ['bagerhat', 'বাগেরহাট'] },
  { english: 'Barisal', bangla: 'বরিশাল', aliases: ['barisal', 'barishal', 'বরিশাল'] },
  { english: 'Bhola', bangla: 'ভোলা', aliases: ['bhola', 'ভোলা'] },
  { english: 'Patuakhali', bangla: 'পটুয়াখালী', aliases: ['patuakhali', 'পটুয়াখালী', 'পটুয়াখালী'] },
  { english: 'Pirojpur', bangla: 'পিরোজপুর', aliases: ['pirojpur', 'পিরোজপুর'] },
  { english: 'Barguna', bangla: 'বরগুনা', aliases: ['barguna', 'বরগুনা'] },
  { english: 'Jhalokathi', bangla: 'ঝালকাঠি', aliases: ['jhalokathi', 'jhalakati', 'ঝালকাঠি', 'ঝালকাঠী'] },
  { english: 'Rajshahi', bangla: 'রাজশাহী', aliases: ['rajshahi', 'রাজশাহী'] },
  { english: 'Bogra', bangla: 'বগুড়া', aliases: ['bogra', 'bogura', 'বগুড়া', 'বগুড়া'] },
  { english: 'Pabna', bangla: 'পাবনা', aliases: ['pabna', 'পাবনা'] },
  { english: 'Sirajganj', bangla: 'সিরাজগঞ্জ', aliases: ['sirajganj', 'সিরাজগঞ্জ'] },
  { english: 'Naogaon', bangla: 'নওগাঁ', aliases: ['naogaon', 'নওগাঁ', 'নওগা'] },
  { english: 'Natore', bangla: 'নাটোর', aliases: ['natore', 'নাটোর'] },
  { english: 'Chapainawabganj', bangla: 'চাঁপাইনবাবগঞ্জ', aliases: ['chapainawabganj', 'chapainawabgonj', 'চাঁপাইনবাবগঞ্জ', 'নবাবগঞ্জ'] },
  { english: 'Joypurhat', bangla: 'জয়পুরহাট', aliases: ['joypurhat', 'জয়পুরহাট', 'জয়পুরহাট'] },
  { english: 'Rangpur', bangla: 'রংপুর', aliases: ['rangpur', 'রংপুর'] },
  { english: 'Dinajpur', bangla: 'দিনাজপুর', aliases: ['dinajpur', 'দিনাজপুর'] },
  { english: 'Gaibandha', bangla: 'গাইবান্ধা', aliases: ['gaibandha', 'গাইবান্ধা'] },
  { english: 'Kurigram', bangla: 'কুড়িগ্রাম', aliases: ['kurigram', 'কুড়িগ্রাম', 'কুড়িগ্রাম'] },
  { english: 'Lalmonirhat', bangla: 'লালমনিরহাট', aliases: ['lalmonirhat', 'লালমনিরহাট'] },
  { english: 'Nilphamari', bangla: 'নীলফামারী', aliases: ['nilphamari', 'নীলফামারী'] },
  { english: 'Panchagarh', bangla: 'পঞ্চগড়', aliases: ['panchagarh', 'পঞ্চগড়', 'পঞ্চগড়'] },
  { english: 'Thakurgaon', bangla: 'ঠাকুরগাঁও', aliases: ['thakurgaon', 'ঠাকুরগাঁও', 'ঠাকুরগাও'] },
  { english: 'Mymensingh', bangla: 'ময়মনসিংহ', aliases: ['mymensingh', 'ময়মনসিংহ', 'ময়মনসিংহ'] },
  { english: 'Jamalpur', bangla: 'জামালপুর', aliases: ['jamalpur', 'জামালপুর'] },
  { english: 'Netrakona', bangla: 'নেত্রকোনা', aliases: ['netrakona', 'নেত্রকোনা', 'নেত্রকোণা'] },
  { english: 'Sherpur', bangla: 'শেরপুর', aliases: ['sherpur', 'শেরপুর'] },
  { english: 'Bandarban', bangla: 'বান্দরবান', aliases: ['bandarban', 'বান্দরবান'] },
  { english: 'Khagrachari', bangla: 'খাগড়াছড়ি', aliases: ['khagrachari', 'খাগড়াছড়ি', 'খাগড়াছড়ি'] },
  { english: 'Rangamati', bangla: 'রাঙ্গামাটি', aliases: ['rangamati', 'রাঙ্গামাটি', 'রাঙামাটি'] }
];

// Common Thana/Zone Bangla to English mappings
export const THANA_BANGLA_MAP: Record<string, string> = {
  // Noakhali
  'বেগমগঞ্জ': 'Begumganj',
  'মাইজদী': 'Maizdee',
  'মাইজদি': 'Maizdee',
  'নোয়াখালী সদর': 'Noakhali Sadar',
  'নোয়াখালী সদর': 'Noakhali Sadar',
  'সেনবাগ': 'Senbag',
  'চাটখিল': 'Chatkhil',
  'কোম্পানীগঞ্জ': 'Companigonj',
  'কোম্পানিগঞ্জ': 'Companigonj',
  'হাতিয়া': 'Hatia',
  'হাতিয়া': 'Hatia',
  'কবিরহাট': 'Kobirhat',
  'সোনাইমুড়ী': 'Sonaimuri',
  'সোনাইমুড়ি': 'Sonaimuri',
  'সুবর্ণচর': 'Subornochar',
  'চৌমুহনী': 'Begumganj',
  'চৌমুহনি': 'Begumganj',
  
  // Dhaka
  'মিরপুর': 'Mirpur 10',
  'মিরপুর ১': 'Mirpur 1',
  'মিরপুর ২': 'Mirpur 2',
  'মিরপুর ১০': 'Mirpur 10',
  'মিরপুর ১১': 'Mirpur 11',
  'মিরপুর ১২': 'Mirpur 12',
  'উত্তরা': 'Uttara Sector 1',
  'ধানমন্ডি': 'Dhanmondi',
  'মোহাম্মদপুর': 'Mohammadpur',
  'বাড্ডা': 'Badda',
  'গুলশান': 'Gulshan 1',
  'গুলশান ১': 'Gulshan 1',
  'গুলশান ২': 'Gulshan 2',
  'বনানী': 'Banani',
  'মতিঝিল': 'Motijheel',
  'যাত্রাবাড়ী': 'Saydabad',
  'যাত্রাবাড়ি': 'Saydabad',
  'সাভার': 'Savar Bazar',
  'কেরানীগঞ্জ': 'Keraniganj Sadar',
  'ধামরাই': 'Dhamrai',
  'আশুলিয়া': 'Ashulia Bazar',
  'আশুলিয়া': 'Ashulia Bazar',
  'পল্টন': 'Paltan',
  'খিলগাঁও': 'Khilgaon',
  'রামপুরা': 'Rampura',
  'মালিবাগ': 'Malibagh Lane',
  'মগবাজার': 'Mogbazar',
  'তেজগাঁও': 'Tejgaon',
  'কাকরাইল': 'Shantinagar',
  'শান্তিনগর': 'Shantinagar',
  'লালবাগ': 'Lalbag',
  'পুরান ঢাকা': 'Kotwali (Dhaka)',
  'বসুন্ধরা': 'Bashundhara R/A',
  
  // Chittagong
  'পাহাড়তলী': 'Pahartoli-Halishahar',
  'পাহাড়তলী': 'Pahartoli-Halishahar',
  'হালিশহর': 'Halishahar',
  'পাঁচলাইশ': 'Panchlaish ctg',
  'কোতোয়ালী': 'Kotowali Chittagong',
  'কোতোয়ালী': 'Kotowali Chittagong',
  'আগ্রাবাদ': 'Halishahar',
  'পটিয়া': 'Patia',
  'পটিয়া': 'Patia',
  'সীতাকুণ্ড': 'Sitakunda',
  'সীতাকুন্ড': 'Sitakunda',
  'হাটহাজারী': 'Hathazari',
  'রাউজান': 'Raozan',
  'রাঙ্গুনিয়া': 'Rangunia',
  'ফটিকছড়ি': 'Fatikchhari',
  'সন্দ্বীপ': 'Sandwip',
  'চন্দনাইশ': 'Chandanaish',
  'লোহাগাড়া': 'CTG - Lohagara',
  'আনোয়ারা': 'Anowara',
  'বোয়ালখালী': 'Boalkhali',
  'কর্ণফুলী': 'Karnophuli',
  
  // Gazipur
  'টঙ্গী': 'Tongi',
  'টঙ্গি': 'Tongi',
  'জয়দেবপুর': 'Joydebpur',
  'জয়দেবপুর': 'Joydebpur',
  'কালিয়াকৈর': 'Kaliakair',
  'কালিয়াকৈর': 'Kaliakair',
  'শ্রীপুর': 'Sreepur',
  'কাপাসিয়া': 'Kapasia',
  'কাপাসিয়া': 'Kapasia',
  'কালীগঞ্জ': 'Kaliganj',
  'কোনাবাড়ী': 'Konabari',
  'কোনাবাড়ি': 'Konabari',
  'মৌচাক': 'Mowchak',
  'বোর্ড বাজার': 'Board Bazar',
  'চৌরাস্তা': 'Gazipur Chowrasta',
  
  // Narayanganj
  'ফতুল্লা': 'Fatullah Bazar',
  'সিদ্ধিরগঞ্জ': 'Siddirganj',
  'রূপগঞ্জ': 'Rupganj',
  'আড়াইহাজার': 'Araihazar',
  'সোনারগাঁও': 'Sonargaon',
  'কাঁচপুর': 'Kachpur',
  'চাষাড়া': 'Chashara',
  'চাষাড়া': 'Chashara',
  
  // Cumilla
  'দাউদকান্দি': 'Daudkandi',
  'চান্দিনা': 'Chandina',
  'লাকসাম': 'Laksam',
  'চৌদ্দগ্রাম': 'Chauddagram',
  'দেবীদ্বার': 'Devidwar',
  'বুড়িচং': 'B. Para - Burichang',
  'ব্রাহ্মণপাড়া': 'B.Para',
  'বরুড়া': 'Barura',
  'মুরাদনগর': 'Muradnagar',
  'হোমনা': 'Homna',
  'নাঙ্গলকোট': 'Nangolkot',
  
  // Sylhet
  'বিয়ানীবাজার': 'Beanibazar',
  'গোলাপগঞ্জ': 'Golapganj',
  'বিশ্বনাথ': 'Bishwanath',
  'বালাগঞ্জ': 'Balaganj',
  'জৈন্তাপুর': 'Jaintapur',
  'ফেঞ্চুগঞ্জ': 'Fenchuganj',
  'কোম্পানীগঞ্জ (সিলেট)': 'Companyganj',
  'দক্ষিণ সুরমা': 'Dakshin Surma',
  
  // Bogra
  'শেরপুর (বগুড়া)': 'Sherpur',
  'শেরপুর': 'Sherpur',
  'দুপচাঁচিয়া': 'Dupchachia',
  'গাবতলী': 'Bogra - Gabtoli',
  'শিবগঞ্জ': 'Shibganj',
  'সোনাতলা': 'Sonatola',
  'ধুনট': 'Dhunat',
  'আদমদীঘি': 'Adamdighi',
  'কাহালু': 'Kahalu',
  'নন্দীগ্রাম': 'Nandigram',
  'সারিয়াকান্দি': 'Sariakandi',
  'শাজাহানপুর': 'Shahjahanpur',
  
  // Khulna
  'ডুমুরিয়া': 'Dumuria',
  'রূপসা': 'Rupsha',
  'ফুলতলা': 'Fultola',
  'তেরখাদা': 'Terokhada',
  'বটিয়াঘাটা': 'Batiaghata',
  'দৌলতপুর': 'Daulatpur-Khulna',
  'খালিশপুর': 'Khalishpur',
  'সোনাডাঙ্গা': 'Sonadanga',
  
  // Rajshahi
  'বাঘা': 'Bagha',
  'চারঘাট': 'Charghat',
  'পুঠিয়া': 'Puthia',
  'গোদাগাড়ী': 'Godagari',
  'তানোর': 'Tanor',
  'মোহনপুর': 'Mohonpur',
  'বাগমারা': 'Bagmara',
  'দুর্গাপুর': 'Durgapur',
  'পবা': 'Paba',
  
  // Barisal
  'গৌরনদী': 'Gauronodi',
  'বাবুগঞ্জ': 'Babuganj',
  'উজিরপুর': 'Wazirpur Powrosova',
  'বাকেরগঞ্জ': 'Bakergonj',
  'বানারীপাড়া': 'Banaripara',
  'মুলাদী': 'Muladi',
  'হিজলা': 'Hizla',
  'মেহেন্দিগঞ্জ': 'Mahendiganj',
  'আগৈলঝাড়া': 'Agailzhara',
  
  // Rangpur
  'বদরগঞ্জ': 'Badarganj',
  'মিঠাপুকুর': 'Mithapukur',
  'পীরগঞ্জ': 'Pirganj Thana',
  'পীরগাছা': 'Pirgachha',
  'গঙ্গাচড়া': 'Gangachara',
  'কাউনিয়া': 'Kaunia',
  'তারাগঞ্জ': 'Taraganj'
};

export interface ParsedLocation {
  city: string;        // e.g. "Noakhali"
  zone: string;        // e.g. "Begumganj"
  districtBangla?: string;
  isAutoDetected: boolean;
}

/**
 * Parses full customer address text to find the accurate District and Thana/Zone.
 */
export function parseCustomerAddress(
  address = '',
  cityField = '',
  thanaField = ''
): ParsedLocation {
  // Strip out shipping terms like "Outside Dhaka", "Inside Dhaka", "ঢাকার বাইরে", etc. from text for district matching
  let cleanCombined = `${address} ${thanaField} ${cityField}`
    .replace(/outside\s*dhaka/gi, ' ')
    .replace(/ঢাকার\s*বাইরে/gi, ' ')
    .replace(/আউটসাইড\s*ঢাকা/gi, ' ')
    .toLowerCase();

  let matchedCity = '';
  let matchedDistrictObj: typeof DISTRICT_MAP[0] | null = null;

  // 1. Direct check on cityField if valid non-Dhaka district (or if explicitly Dhaka city)
  const cleanCity = cityField.trim().toLowerCase();
  if (cleanCity && cleanCity !== 'outside dhaka' && cleanCity !== 'inside dhaka') {
    for (const dist of DISTRICT_MAP) {
      if (dist.aliases.some(alias => cleanCity === alias.toLowerCase())) {
        matchedCity = dist.english;
        matchedDistrictObj = dist;
        break;
      }
    }
  }

  // 2. Search entire cleaned text for Specific District mentions (skip generic 'Dhaka' unless nothing else found)
  if (!matchedCity) {
    // Check non-Dhaka districts first to avoid false Dhaka matches from "outside dhaka"
    const nonDhakaDistricts = DISTRICT_MAP.filter(d => d.english !== 'Dhaka');
    for (const dist of nonDhakaDistricts) {
      for (const alias of dist.aliases) {
        if (cleanCombined.includes(alias.toLowerCase())) {
          matchedCity = dist.english;
          matchedDistrictObj = dist;
          break;
        }
      }
      if (matchedCity) break;
    }
  }

  // 3. If still not matched, check Dhaka
  if (!matchedCity) {
    const dhakaObj = DISTRICT_MAP.find(d => d.english === 'Dhaka');
    if (dhakaObj) {
      const isExplicitDhaka = 
        cleanCity === 'inside dhaka' || 
        cleanCity === 'dhaka' || 
        cleanCombined.includes('ঢাকা সিটি') || 
        cleanCombined.includes('dhaka city') ||
        (cleanCombined.includes('ঢাকা') && !cleanCombined.includes('বাইরে')) ||
        (cleanCombined.includes('dhaka') && !cleanCombined.includes('outside'));
      
      if (isExplicitDhaka) {
        matchedCity = 'Dhaka';
        matchedDistrictObj = dhakaObj;
      }
    }
  }

  // 4. Determine Zone/Thana
  let matchedZone = '';
  const thanasForDistrict = matchedCity ? (DISTRICT_THANAS[matchedCity] || []) : [];

  // Check Thana Field first
  if (thanaField && thanaField.trim()) {
    const cleanThana = thanaField.trim().toLowerCase();
    // Check in English thanas
    const foundThana = thanasForDistrict.find(t => t.toLowerCase() === cleanThana || t.toLowerCase().includes(cleanThana));
    if (foundThana) {
      matchedZone = foundThana;
    } else if (THANA_BANGLA_MAP[thanaField.trim()]) {
      matchedZone = THANA_BANGLA_MAP[thanaField.trim()];
    } else {
      matchedZone = thanaField.trim();
    }
  }

  // Search address text for Bangla or English Thana names
  if (!matchedZone) {
    // Check Bangla Thana Dictionary
    for (const [banglaName, englishZone] of Object.entries(THANA_BANGLA_MAP)) {
      if (cleanCombined.includes(banglaName.toLowerCase())) {
        matchedZone = englishZone;
        // If city wasn't determined yet, find its district!
        if (!matchedCity) {
          for (const [distKey, thanaList] of Object.entries(DISTRICT_THANAS)) {
            if (thanaList.includes(englishZone)) {
              matchedCity = distKey;
              break;
            }
          }
        }
        break;
      }
    }
  }

  // Search English Thana List in Address
  if (!matchedZone && thanasForDistrict.length > 0) {
    const sorted = [...thanasForDistrict].sort((a, b) => b.length - a.length);
    const foundInText = sorted.find(t => cleanCombined.includes(t.toLowerCase()));
    if (foundInText) {
      matchedZone = foundInText;
    }
  }

  return {
    city: matchedCity || '',
    zone: matchedZone || '',
    districtBangla: matchedDistrictObj?.bangla,
    isAutoDetected: Boolean(matchedCity)
  };
}
