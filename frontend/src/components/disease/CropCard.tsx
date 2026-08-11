'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FaMicrophone, FaStop, FaGlobe, FaChevronDown, FaCheck, FaTimes } from 'react-icons/fa';
import { LANGUAGES, getVoiceBcp47 } from '@/i18n/languages';

// Languages shown in the picker — national + all Rajasthan dialects
const DISPLAY_LANGS = LANGUAGES.filter(l =>
  [
    'en', 'hi', 'mr', 'gu', 'pa', 'ta', 'te', 'bn', 'kn', 'ml', 'or', 'as', 'ur',
    // Rajasthan dialects
    'raj', 'mwr', 'mew', 'dhu', 'hao', 'shk', 'bag', 'wag', 'mti', 'gdw', 'ahi', 'mlv',
    // Other
    'mai', 'doi',
  ].includes(l.code)
);

// ─── Comprehensive crop name dictionary ───────────────────────────────────────
// Covers Hindi, Marwari, Mewari, Dhundhari, Hadoti, Shekhawati, Bagri, Wagdi,
// Mewati, Godwari, Ahirwati, Malvi + all national languages (typed/spoken).
const CROP_TRANSLATIONS: Record<string, string> = {
  // =========================================================
  // YOLO Supported Crops (Exact Dataset Folder Names)
  // =========================================================

  // ---------- Black Gram ----------
  'black gram': 'Black_gram',
  'blackgram': 'Black_gram',
  'black_gram': 'Black_gram',
  'urad': 'Black_gram',
  'urd': 'Black_gram',
  'udad': 'Black_gram',
  'urad dal': 'Black_gram',
  'उड़द': 'Black_gram',
  'उरद': 'Black_gram',
// ---------- Black Gram / Urad ----------


// Hindi

'उरद दाल': 'Black_gram',
'उड़द की फसल': 'Black_gram',
'उड़द की खेती': 'Black_gram',

// Roman Hindi

'udad dal': 'Black_gram',
'udad ki fasal': 'Black_gram',
'udhad': 'Black_gram',

'urad ki fasal': 'Black_gram',
'urad ki kheti': 'Black_gram',
'udid': 'Black_gram',
'udid dal': 'Black_gram',

// Punjabi
'ਉੜਦ': 'Black_gram',
'ਉੜਦ ਦਾਲ': 'Black_gram',
'ਮਾਹ': 'Black_gram',
'ਮਾਹ ਦੀ ਦਾਲ': 'Black_gram',

// Gujarati
'અડદ': 'Black_gram',
'અડદ દાળ': 'Black_gram',
'અડદનું વાવેતર': 'Black_gram',
'અડદનો પાક': 'Black_gram',

// Marathi
'उडीद': 'Black_gram',
'उडीद डाळ': 'Black_gram',
'उडीद पीक': 'Black_gram',
'उडीदाची शेती': 'Black_gram',

// Bengali
'বিউলি': 'Black_gram',
'মাষকলাই': 'Black_gram',
'মাষ ডাল': 'Black_gram',
'বিউলির ডাল': 'Black_gram',

// Assamese
'মাটি মাহ': 'Black_gram',
'মাটিমাহ': 'Black_gram',
'মাহ দাইল': 'Black_gram',

// Odia
'ବିରି': 'Black_gram',
'ବିରି ଡାଲି': 'Black_gram',
'ବିରି ଫସଲ': 'Black_gram',

// Telugu
'మినుములు': 'Black_gram',
'మినపప్పు': 'Black_gram',
'మినుము పంట': 'Black_gram',
'మినప పప్పు': 'Black_gram',

// Tamil
'உளுந்து': 'Black_gram',
'உளுந்து பருப்பு': 'Black_gram',
'உளுந்து பயிர்': 'Black_gram',

// Kannada
'ಉದ್ದು': 'Black_gram',
'ಉದ್ದಿನ ಬೇಳೆ': 'Black_gram',
'ಉದ್ದು ಬೆಳೆ': 'Black_gram',

// Malayalam
'ഉഴുന്ന്': 'Black_gram',
'ഉഴുന്ന് പരിപ്പ്': 'Black_gram',
'ഉഴുന്ന് കൃഷി': 'Black_gram',

// Urdu
'ماش': 'Black_gram',
'ماش کی دال': 'Black_gram',
'کالی ماش': 'Black_gram',

// Nepali
'मास': 'Black_gram',
'मासको दाल': 'Black_gram',
'उडद': 'Black_gram',

// Rajasthan / regional

'उड़द री फसल': 'Black_gram',
'उड़द री खेती': 'Black_gram',
'उरद री फसल': 'Black_gram',
'उरद री खेती': 'Black_gram',
'urad ri fasal': 'Black_gram',
'urad ri kheti': 'Black_gram',
'urad ro dana': 'Black_gram',
'udhad ri fasal': 'Black_gram',

// Common spelling / voice variants

'blackgram dal': 'Black_gram',
'blackgramdal': 'Black_gram',
'blackgram pulse': 'Black_gram',
'uradgram': 'Black_gram',
'urad gram': 'Black_gram',
'urd dal': 'Black_gram',
'udaddal': 'Black_gram',
  // ---------- Green Gram ----------
  'green gram': 'green_gram',
  'greengram': 'green_gram',
  'green_gram': 'green_gram',
  'mung': 'green_gram',
  'mung bean': 'green_gram',
  'moong': 'green_gram',
  'moong dal': 'green_gram',
  'मूंग': 'green_gram',
  'मूंग दाल': 'green_gram',

  // ---------- Corn / Maize ----------
  'corn': 'corn_maize',
  'maize': 'corn_maize',
  'corn maize': 'corn_maize',
  'corn_maize': 'corn_maize',
  'makka': 'corn_maize',
  'makai': 'corn_maize',
  'मक्का': 'corn_maize',
  'मकई': 'corn_maize',
  'मक्की': 'corn_maize',

  // ---------- Tomato ----------
  'tomato': 'Tomato',
  'tamatar': 'Tomato',
  'टमाटर': 'Tomato',

  // ---------- Pearl Millet / Bajra ----------
  'pearl millet': 'Pearl_Millet _Bajra',
  'pearlmillet': 'Pearl_Millet _Bajra',
  'pearl_millet': 'Pearl_Millet _Bajra',
  'pearl_millet_bajra': 'Pearl_Millet _Bajra',
  'pearl_millet _bajra': 'Pearl_Millet _Bajra',
  'millet': 'Pearl_Millet _Bajra',
  'bajra': 'Pearl_Millet _Bajra',
  'bajri': 'Pearl_Millet _Bajra',
  'bajara': 'Pearl_Millet _Bajra',
  'बाजरा': 'Pearl_Millet _Bajra',
  'बाजरो': 'Pearl_Millet _Bajra',
  'बाजरी': 'Pearl_Millet _Bajra',

  // ---------- Wheat ----------
  'wheat': 'wheat',
  'gehu': 'wheat',
  'gehun': 'wheat',
  'gehum': 'wheat',
  'gahu': 'wheat',
  'गेहूं': 'wheat',
  'गेहूँ': 'wheat',
  'गेंहू': 'wheat',
  'गूँ': 'wheat',
  'गूं': 'wheat',
// ---------- Apple ----------
'apple': 'Apple',
'apples': 'Apple',
'apple fruit': 'Apple',
'apple crop': 'Apple',
'apple tree': 'Apple',
'apple plant': 'Apple',
'apple farming': 'Apple',
'apple orchard': 'Apple',

// Hindi
'सेब': 'Apple',
'सेव': 'Apple',
'सेब फल': 'Apple',
'सेब की फसल': 'Apple',
'सेब का फल': 'Apple',
'सेब का पेड़': 'Apple',
'सेब का पौधा': 'Apple',
'सेब की खेती': 'Apple',
'सेब का बाग': 'Apple',
'सेब का बगीचा': 'Apple',
'सेब की बागवानी': 'Apple',

// Roman Hindi
'seb': 'Apple',
'seeb': 'Apple',
'sebu': 'Apple',
'seb fruit': 'Apple',
'seb ki fasal': 'Apple',
'seb ki kheti': 'Apple',
'seb ka ped': 'Apple',
'seb ka paudha': 'Apple',
'seb ka bagh': 'Apple',

// Common spelling / voice variants
'aple': 'Apple',
'appel': 'Apple',
'appl': 'Apple',
'applee': 'Apple',
'aaple': 'Apple',
'applefruit': 'Apple',

// Punjabi
'ਸੇਬ': 'Apple',
'ਸੇਬ ਦਾ ਫਲ': 'Apple',
'ਸੇਬ ਦੀ ਫਸਲ': 'Apple',
'ਸੇਬ ਦੀ ਖੇਤੀ': 'Apple',

// Gujarati
'સફરજન': 'Apple',
'સફરજનનું ફળ': 'Apple',
'સફરજનનો પાક': 'Apple',
'સફરજનની ખેતી': 'Apple',

// Marathi
'सफरचंद': 'Apple',
'सफरचंदाचे फळ': 'Apple',
'सफरचंदाचे पीक': 'Apple',
'सफरचंदाची शेती': 'Apple',

// Bengali
'আপেল': 'Apple',
'আপেল ফল': 'Apple',
'আপেলের ফসল': 'Apple',

// Assamese
// ---------- Grape / Angoor ----------
'grape': 'Grape',
'grapes': 'Grape',
'grape crop': 'Grape',
'grape plant': 'Grape',
'grape vine': 'Grape',
'grapevine': 'Grape',
'grape farming': 'Grape',
'grape cultivation': 'Grape',

// ---------- Hindi ----------
'अंगूर': 'Grape',
'अंगूर फल': 'Grape',
'अंगूर की फसल': 'Grape',
'अंगूर का फसल': 'Grape',
'अंगूर की खेती': 'Grape',
'अंगूर का खेती': 'Grape',
'अंगूर की बागवानी': 'Grape',
'अंगूर का पौधा': 'Grape',
'अंगूर की बेल': 'Grape',
'अंगूर का बेल': 'Grape',
'अंगूर का बाग': 'Grape',
'अंगूर का बगीचा': 'Grape',
'अंगूर की बाग': 'Grape',
'अंगूर की बेल वाला पौधा': 'Grape',
'अंगूर की फसल वाला पौधा': 'Grape',
'अंगूर उगाना': 'Grape',
'अंगूर उगाने की खेती': 'Grape',
'अंगूर की खेती करना': 'Grape',
'अंगूर की फसल लगाना': 'Grape',
'अंगूर का पौधा लगाना': 'Grape',
'अंगूर की बेल लगाना': 'Grape',
'अंगूर की खेती वाला पौधा': 'Grape',
'अंगूर का पेड़': 'Grape',
'अंगूर के पौधे': 'Grape',
'अंगूर की बेलें': 'Grape',
'अंगूर वाली फसल': 'Grape',
'अंगूर वाला पौधा': 'Grape',
'अंगूर वाली बेल': 'Grape',
'अंगूर का खेत': 'Grape',
'अंगूर की खेती वाला खेत': 'Grape',

// ---------- Hindi common spoken variants ----------
'अंगुर': 'Grape',
'अंगूरा': 'Grape',
'अंगूरी': 'Grape',
'अंगूरी फल': 'Grape',
'अंगूर का फल': 'Grape',
'अंगूर के फल': 'Grape',
'अंगूर की खेतीबाड़ी': 'Grape',
'अंगूर की खेती बाड़ी': 'Grape',
'अंगूर की खेतीबाड़ी करना': 'Grape',
'अंगूर की फसल उगाना': 'Grape',
'अंगूर उगाने की फसल': 'Grape',
'अंगूर लगाने की खेती': 'Grape',
'अंगूर लगाने का खेत': 'Grape',

// ---------- Rajasthan / Rajasthani ----------
'अंगूर री खेती': 'Grape',
'अंगूर री फसल': 'Grape',
'अंगूर री बेल': 'Grape',
'अंगूर रो पौधो': 'Grape',
'अंगूर रो पौध': 'Grape',
'अंगूर रो पेड़': 'Grape',
'अंगूर रो खेत': 'Grape',
'अंगूर रो बाग': 'Grape',
'अंगूर रो बगीचो': 'Grape',
'अंगूर री बागवानी': 'Grape',
'अंगूर री बाड़ी': 'Grape',
'अंगूर री खेतीबाड़ी': 'Grape',
'अंगूर री फसल रो पौधो': 'Grape',
'अंगूर री बेल रो पौधो': 'Grape',
'अंगूर री बेलां': 'Grape',
'अंगूर री बेलें': 'Grape',
'अंगूर रो पौधो लगावणो': 'Grape',
'अंगूर री खेती करणी': 'Grape',
'अंगूर री फसल करणी': 'Grape',


// ---------- Rajasthani spoken / Roman ----------
'angoor': 'Grape',
'angur': 'Grape',
'angoor ri kheti': 'Grape',
'angur ri kheti': 'Grape',
'angoor ri fasal': 'Grape',
'angur ri fasal': 'Grape',
'angoor ri bel': 'Grape',
'angur ri bel': 'Grape',
'angoor ro paudho': 'Grape',
'angur ro paudho': 'Grape',
'angoor ro khet': 'Grape',
'angur ro khet': 'Grape',
'angoor ro bagh': 'Grape',
'angur ro bagh': 'Grape',
'angoor ri bagwani': 'Grape',
'angur ri bagwani': 'Grape',
'angoor ri baadi': 'Grape',
'angur ri baadi': 'Grape',
'angoor ro paudha': 'Grape',
'angur ro paudha': 'Grape',
'angoor ki kheti': 'Grape',
'angur ki kheti': 'Grape',
'angoor ki fasal': 'Grape',
'angur ki fasal': 'Grape',
'angoor ki bel': 'Grape',
'angur ki bel': 'Grape',
'angoor ka paudha': 'Grape',
'angur ka paudha': 'Grape',

// ---------- Marwari-style --------
'अंगूर री फसल उगाणी': 'Grape',
'अंगूर रो पौधो लगाणो': 'Grape',
'अंगूर री बेल लगाणो': 'Grape',
'अंगूर रो बाग लगाणो': 'Grape',

'अंगूर री बाड़ी री फसल': 'Grape',

'अंगूर री फसल रो खेत': 'Grape',
'अंगूर री खेती रो पौधो': 'Grape',


// ---------- Dhundhari / local spoken ----------

// ---------- Peach ----------
'peach': 'Peach',
'peaches': 'Peach',
'peach fruit': 'Peach',
'peach crop': 'Peach',
'peach plant': 'Peach',
'peach tree': 'Peach',
'peach farming': 'Peach',
'peach cultivation': 'Peach',
'peach orchard': 'Peach',

// ---------- Hindi ----------
'आड़ू': 'Peach',
'आडू': 'Peach',
'आड़ू फल': 'Peach',
'आड़ू का फल': 'Peach',
'आड़ू की फसल': 'Peach',
'आड़ू का फसल': 'Peach',
'आड़ू की खेती': 'Peach',
'आड़ू का खेती': 'Peach',
'आड़ू का पौधा': 'Peach',
'आड़ू के पौधे': 'Peach',
'आड़ू का पेड़': 'Peach',
'आड़ू के पेड़': 'Peach',
'आड़ू की बागवानी': 'Peach',
'आड़ू का बाग': 'Peach',
'आड़ू का बगीचा': 'Peach',
'आड़ू का खेत': 'Peach',
'आड़ू वाली फसल': 'Peach',
'आड़ू वाला पौधा': 'Peach',
'आड़ू की खेती करना': 'Peach',
'आड़ू की फसल उगाना': 'Peach',
'आड़ू का पौधा लगाना': 'Peach',
'आड़ू का पेड़ लगाना': 'Peach',

// ---------- Hindi spoken variants ----------
'आडु': 'Peach',

'आडू फल': 'Peach',
'आडू की फसल': 'Peach',
'आडू की खेती': 'Peach',
'आडू का पौधा': 'Peach',
'आडू का पेड़': 'Peach',
'आडू का बाग': 'Peach',
'आडू का खेत': 'Peach',

// ---------- Roman Hindi ----------
'aadu': 'Peach',
'aadu fruit': 'Peach',
'aadu ki fasal': 'Peach',
'aadu ki kheti': 'Peach',
'aadu ka paudha': 'Peach',
'aadu ka ped': 'Peach',
'aadu ka bagh': 'Peach',
'aadu ka khet': 'Peach',
'adu': 'Peach',
'adu fruit': 'Peach',
'adu ki fasal': 'Peach',
'adu ki kheti': 'Peach',
'adu ka paudha': 'Peach',
'adu ka ped': 'Peach',

// ---------- Rajasthan / Rajasthani ----------
'आड़ू री खेती': 'Peach',
'आड़ू री फसल': 'Peach',
'आड़ू रो पौधो': 'Peach',
'आड़ू रो पौध': 'Peach',
'आड़ू रो पेड़': 'Peach',
'आड़ू री बेल': 'Peach',
'आड़ू रो खेत': 'Peach',
'आड़ू रो बाग': 'Peach',
'आड़ू रो बगीचो': 'Peach',
'आड़ू री बागवानी': 'Peach',
'आड़ू री खेतीबाड़ी': 'Peach',
'आड़ू री फसल रो पौधो': 'Peach',
'आड़ू रो पौधो लगाणो': 'Peach',
'आड़ू री खेती करणी': 'Peach',
'आड़ू री फसल उगाणी': 'Peach',
'आड़ू रो पेड़ लगाणो': 'Peach',
'आड़ू री बाड़ी': 'Peach',
'आड़ू री बाड़ी री फसल': 'Peach',

// ---------- Rajasthani Roman ----------
'aadu ri kheti': 'Peach',
'aadu ri fasal': 'Peach',
'aadu ro paudho': 'Peach',
'aadu ro paudha': 'Peach',
'aadu ro ped': 'Peach',
'aadu ro khet': 'Peach',
'aadu ro bagh': 'Peach',
'aadu ro bag': 'Peach',
'aadu ri bagwani': 'Peach',
'aadu ri kheti baadi': 'Peach',
'aadu ro paudho lagano': 'Peach',
'aadu ri kheti karni': 'Peach',
'aadu ri fasal ugani': 'Peach',
'aadu ro ped lagano': 'Peach',
'aadu ri baadi': 'Peach',

// ---------- Farmer spoken phrases ----------
'आड़ू का पौधा कौन सा है': 'Peach',

'आड़ू की खेती वाला पौधा': 'Peach',
'आड़ू की खेती वाला खेत': 'Peach',
'आड़ू का पेड़ कौन सा है': 'Peach',

'आड़ू की बाड़ी': 'Peach',
'आड़ू उगाना': 'Peach',
'आड़ू लगाना': 'Peach',
'आड़ू की खेती करनी है': 'Peach',

// ---------- Potato ----------
'aloo': 'Potato',
'alu': 'Potato',
'potato': 'Potato',
'potatoes': 'Potato',
'potato crop': 'Potato',
'potato plant': 'Potato',
'potato farming': 'Potato',
'potato cultivation': 'Potato',
'potato field': 'Potato',

// ---------- Hindi ----------
'आलू': 'Potato',
'आलू की फसल': 'Potato',
'आलू का फसल': 'Potato',
'आलू की खेती': 'Potato',
'आलू का खेती': 'Potato',
'आलू का पौधा': 'Potato',
'आलू के पौधे': 'Potato',
'आलू की खेती वाला पौधा': 'Potato',
'आलू का खेत': 'Potato',
'आलू की फसल वाला खेत': 'Potato',
'आलू की बागवानी': 'Potato',
'आलू उगाना': 'Potato',
'आलू की खेती करना': 'Potato',
'आलू की फसल उगाना': 'Potato',
'आलू लगाना': 'Potato',
'आलू की फसल लगाना': 'Potato',
'आलू का पौधा लगाना': 'Potato',
'आलू की क्यारी': 'Potato',
'आलू की सब्जी': 'Potato',
'आलू वाली फसल': 'Potato',
'आलू वाला पौधा': 'Potato',

// ---------- Hindi spoken ----------
'आलु': 'Potato',
'आलूआ': 'Potato',
'आलू फल': 'Potato',
'आलू की खेतीबाड़ी': 'Potato',
'आलू की खेती बाड़ी': 'Potato',
'आलू की फसल उगानी': 'Potato',
'आलू की खेती करनी है': 'Potato',
'आलू का पौधा कौन सा है': 'Potato',
'आलू की फसल कौन सी है': 'Potato',

// ---------- Roman Hindi ----------
'aloo ki fasal': 'Potato',
'alu ki fasal': 'Potato',
'aloo ki kheti': 'Potato',
'alu ki kheti': 'Potato',
'aloo ka paudha': 'Potato',
'alu ka paudha': 'Potato',
'aloo ka khet': 'Potato',
'alu ka khet': 'Potato',
'aloo ugana': 'Potato',
'alu ugana': 'Potato',
'aloo lagana': 'Potato',
'alu lagana': 'Potato',
'aloo ki kheti karna': 'Potato',
'alu ki kheti karna': 'Potato',
'aloo ki fasal ugana': 'Potato',
'alu ki fasal ugana': 'Potato',

// ---------- Rajasthan / Rajasthani ----------
'आलू री खेती': 'Potato',
'आलू री फसल': 'Potato',
'आलू रो पौधो': 'Potato',
'आलू रो पौध': 'Potato',
'आलू रो खेत': 'Potato',
'आलू री खेतीबाड़ी': 'Potato',
'आलू री खेती बाड़ी': 'Potato',
'आलू री फसल रो खेत': 'Potato',
'आलू री फसल रो पौधो': 'Potato',
'आलू रो बाग': 'Potato',
'आलू री बाड़ी': 'Potato',
'आलू री क्यारी': 'Potato',
'आलू उगाणो': 'Potato',
'आलू लगाणो': 'Potato',
'आलू री खेती करणी': 'Potato',
'आलू री फसल उगाणी': 'Potato',
'आलू रो पौधो लगाणो': 'Potato',

'आलू री फसल वालो खेत': 'Potato',
'आलू री खेती वालो खेत': 'Potato',

// ---------- Rajasthani Roman ----------
'aloo ri kheti': 'Potato',
'alu ri kheti': 'Potato',
'aloo ri fasal': 'Potato',
'alu ri fasal': 'Potato',
'aloo ro paudho': 'Potato',
'alu ro paudho': 'Potato',
'aloo ro paudha': 'Potato',
'alu ro paudha': 'Potato',
'aloo ro khet': 'Potato',
'alu ro khet': 'Potato',
'aloo ri baadi': 'Potato',
'alu ri baadi': 'Potato',
'aloo ri kheti baadi': 'Potato',
'aloo ugano': 'Potato',
'alu ugano': 'Potato',
'aloo lagano': 'Potato',
'alu lagano': 'Potato',
'aloo ri kheti karni': 'Potato',
'alu ri kheti karni': 'Potato',
'aloo ri fasal ugani': 'Potato',
'alu ri fasal ugani': 'Potato',
'aloo ro paudho lagano': 'Potato',
'alu ro paudho lagano': 'Potato',

// ---------- Punjabi ----------
'ਆਲੂ': 'Potato',
'ਆਲੂ ਦੀ ਫਸਲ': 'Potato',
'ਆਲੂ ਦੀ ਖੇਤੀ': 'Potato',

// ---------- Gujarati ----------
'બટાકા': 'Potato',
'બટાકાનું પાક': 'Potato',
'બટાકાની ખેતી': 'Potato',

// ---------- Marathi ----------
'बटाटा': 'Potato',
'बटाट्याचे पीक': 'Potato',
'बटाट्याची शेती': 'Potato',

// ---------- Bengali ----------
'আলু': 'Potato',
'আলুর ফসল': 'Potato',
'আলু চাষ': 'Potato',

// ---------- Telugu ----------
'బంగాళాదుంప': 'Potato',
'బంగాళాదుంప పంట': 'Potato',
'బంగాళాదుంప సాగు': 'Potato',

// ---------- Tamil ----------
'உருளைக்கிழங்கு': 'Potato',
'உருளைக்கிழங்கு பயிர்': 'Potato',
'உருளைக்கிழங்கு சாகுபடி': 'Potato',

// ---------- Kannada ----------
'ಆಲೂಗಡ್ಡೆ': 'Potato',
'ಆಲೂಗಡ್ಡೆ ಬೆಳೆ': 'Potato',
'ಆಲೂಗಡ್ಡೆ ಕೃಷಿ': 'Potato',

// ---------- Malayalam ----------
'ഉരുളക്കിഴങ്ങ്': 'Potato',
'ഉരുളക്കിഴങ്ങ് വിള': 'Potato',
'ഉരുളക്കിഴങ്ങ് കൃഷി': 'Potato',

// ---------- Odia ----------
'ଆଳୁ': 'Potato',
'ଆଳୁ ଫସଲ': 'Potato',
'ଆଳୁ ଚାଷ': 'Potato',

// ---------- Assamese ----------
'আলুৰ খেতি': 'Potato',
'আলুৰ শস্য': 'Potato',

// ---------- Urdu ----------
'آلو': 'Potato',
'آلو کی فصل': 'Potato',
'آلو کی کاشت': 'Potato',
// ---------- Strawberry ----------
'strawberry': 'Strawberry',
'strawberries': 'Strawberry',
'strawberry fruit': 'Strawberry',
'strawberry crop': 'Strawberry',
'strawberry plant': 'Strawberry',
'strawberry farming': 'Strawberry',
'strawberry cultivation': 'Strawberry',
'strawberry field': 'Strawberry',
'strawberry garden': 'Strawberry',

// ---------- Hindi ----------
'स्ट्रॉबेरी': 'Strawberry',
'स्ट्रॉबेरी फल': 'Strawberry',
'स्ट्रॉबेरी की फसल': 'Strawberry',
'स्ट्रॉबेरी की खेती': 'Strawberry',
'स्ट्रॉबेरी का पौधा': 'Strawberry',
'स्ट्रॉबेरी के पौधे': 'Strawberry',
'स्ट्रॉबेरी का खेत': 'Strawberry',
'स्ट्रॉबेरी की बागवानी': 'Strawberry',
'स्ट्रॉबेरी की खेती करना': 'Strawberry',
'स्ट्रॉबेरी उगाना': 'Strawberry',
'स्ट्रॉबेरी लगाना': 'Strawberry',
'स्ट्रॉबेरी वाली फसल': 'Strawberry',
'स्ट्रॉबेरी वाला पौधा': 'Strawberry',
'स्ट्रॉबेरी की क्यारी': 'Strawberry',

// Hindi spoken / spelling variants

'स्ट्राबेरी': 'Strawberry',

'स्ट्राबेरी की खेती': 'Strawberry',
'स्ट्राबेरी की फसल': 'Strawberry',
'स्ट्राबेरी का पौधा': 'Strawberry',
'स्ट्राबेरी का खेत': 'Strawberry',
'स्ट्राबेरी उगाना': 'Strawberry',
'स्ट्राबेरी लगाना': 'Strawberry',

// ---------- Roman Hindi ----------
'strawberry ki fasal': 'Strawberry',
'strawberry ki kheti': 'Strawberry',
'strawberry ka paudha': 'Strawberry',
'strawberry ke paudhe': 'Strawberry',
'strawberry ka khet': 'Strawberry',
'strawberry ugana': 'Strawberry',
'strawberry lagana': 'Strawberry',
'strawberry ki kheti karna': 'Strawberry',
'strawberry ki fasal ugana': 'Strawberry',
'strawberry ki bagwani': 'Strawberry',

// ---------- Rajasthan / Rajasthani ----------
'स्ट्रॉबेरी री खेती': 'Strawberry',
'स्ट्रॉबेरी री फसल': 'Strawberry',
'स्ट्रॉबेरी रो पौधो': 'Strawberry',
'स्ट्रॉबेरी रो पौध': 'Strawberry',
'स्ट्रॉबेरी रो खेत': 'Strawberry',
'स्ट्रॉबेरी री बागवानी': 'Strawberry',
'स्ट्रॉबेरी री बाड़ी': 'Strawberry',
'स्ट्रॉबेरी री क्यारी': 'Strawberry',
'स्ट्रॉबेरी उगाणो': 'Strawberry',
'स्ट्रॉबेरी लगाणो': 'Strawberry',
'स्ट्रॉबेरी री खेती करणी': 'Strawberry',
'स्ट्रॉबेरी री फसल उगाणी': 'Strawberry',
'स्ट्रॉबेरी रो पौधो लगाणो': 'Strawberry',
'स्ट्रॉबेरी री फसल वालो खेत': 'Strawberry',

// ---------- Rajasthani Roman ----------
'strawberry ri kheti': 'Strawberry',
'strawberry ri fasal': 'Strawberry',
'strawberry ro paudho': 'Strawberry',
'strawberry ro paudha': 'Strawberry',
'strawberry ro khet': 'Strawberry',
'strawberry ri baadi': 'Strawberry',
'strawberry ri bagwani': 'Strawberry',
'strawberry ri kyari': 'Strawberry',
'strawberry ugano': 'Strawberry',
'strawberry lagano': 'Strawberry',
'strawberry ri kheti karni': 'Strawberry',
'strawberry ri fasal ugani': 'Strawberry',
'strawberry ro paudho lagano': 'Strawberry',

// ---------- Punjabi ----------
'ਸਟ੍ਰਾਬੇਰੀ': 'Strawberry',
'ਸਟ੍ਰਾਬੇਰੀ ਫਲ': 'Strawberry',
'ਸਟ੍ਰਾਬੇਰੀ ਦੀ ਫਸਲ': 'Strawberry',
'ਸਟ੍ਰਾਬੇਰੀ ਦੀ ਖੇਤੀ': 'Strawberry',

// ---------- Gujarati ----------
'સ્ટ્રોબેરી': 'Strawberry',
'સ્ટ્રોબેરીનું ફળ': 'Strawberry',
'સ્ટ્રોબેરીનો પાક': 'Strawberry',
'સ્ટ્રોબેરીની ખેતી': 'Strawberry',

// ---------- Marathi ----------

'स्ट्रॉबेरीचे फळ': 'Strawberry',
'स्ट्रॉबेरीचे पीक': 'Strawberry',
'स्ट्रॉबेरीची शेती': 'Strawberry',

// ---------- Bengali ----------
'স্ট্রবেরি': 'Strawberry',
'স্ট্রবেরি ফল': 'Strawberry',
'স্ট্রবেরির ফসল': 'Strawberry',
'স্ট্রবেরি চাষ': 'Strawberry',

// ---------- Telugu ----------
'స్ట్రాబెర్రీ': 'Strawberry',
'స్ట్రాబెర్రీ పండు': 'Strawberry',
'స్ట్రాబెర్రీ పంట': 'Strawberry',
'స్ట్రాబెర్రీ సాగు': 'Strawberry',

// ---------- Tamil ----------
'ஸ்ட்ராபெர்ரி': 'Strawberry',
'ஸ்ட்ராபெர்ரி பழம்': 'Strawberry',
'ஸ்ட்ராபெர்ரி பயிர்': 'Strawberry',
'ஸ்ட்ராபெர்ரி சாகுபடி': 'Strawberry',

// ---------- Kannada ----------
'ಸ್ಟ್ರಾಬೆರಿ': 'Strawberry',
'ಸ್ಟ್ರಾಬೆರಿ ಹಣ್ಣು': 'Strawberry',
'ಸ್ಟ್ರಾಬೆರಿ ಬೆಳೆ': 'Strawberry',
'ಸ್ಟ್ರಾಬೆರಿ ಕೃಷಿ': 'Strawberry',

// ---------- Malayalam ----------
'സ്ട്രോബെറി': 'Strawberry',
'സ്ട്രോബെറി പഴം': 'Strawberry',
'സ്ട്രോബെറി വിള': 'Strawberry',
'സ്ട്രോബെറി കൃഷി': 'Strawberry',

// ---------- Odia ----------
'ଷ୍ଟ୍ରବେରୀ': 'Strawberry',
'ଷ୍ଟ୍ରବେରୀ ଫଳ': 'Strawberry',
'ଷ୍ଟ୍ରବେରୀ ଫସଲ': 'Strawberry',
'ଷ୍ଟ୍ରବେରୀ ଚାଷ': 'Strawberry',

// ---------- Assamese ----------
'ষ্ট্ৰবেৰী': 'Strawberry',
'ষ্ট্ৰবেৰী ফল': 'Strawberry',
'ষ্ট্ৰবেৰীৰ খেতি': 'Strawberry',

// ---------- Urdu ----------
'اسٹرابیری': 'Strawberry',
'اسٹرابیری پھل': 'Strawberry',
'اسٹرابیری کی فصل': 'Strawberry',
'اسٹرابیری کی کاشت': 'Strawberry',
// ---------- Tomato ----------
'tomatoes': 'Tomato',
'tomato crop': 'Tomato',
'tomato plant': 'Tomato',
'tomato farming': 'Tomato',
'tomato cultivation': 'Tomato',
'tomato field': 'Tomato',
'tomato garden': 'Tomato',

// ---------- Hindi ----------
'टमाटर का फल': 'Tomato',
'टमाटर की फसल': 'Tomato',
'टमाटर की खेती': 'Tomato',
'टमाटर का पौधा': 'Tomato',
'टमाटर के पौधे': 'Tomato',
'टमाटर का खेत': 'Tomato',
'टमाटर की बागवानी': 'Tomato',
'टमाटर की खेती करना': 'Tomato',
'टमाटर उगाना': 'Tomato',
'टमाटर लगाना': 'Tomato',
'टमाटर की फसल उगाना': 'Tomato',
'टमाटर का पौधा लगाना': 'Tomato',
'टमाटर वाली फसल': 'Tomato',
'टमाटर वाला पौधा': 'Tomato',

'टमाटर की क्यारी': 'Tomato',

// Hindi spoken variants
'तमाटर': 'Tomato',
'टमाटरू': 'Tomato',
'टमाटर की खेतीबाड़ी': 'Tomato',
'टमाटर की फसल वाला खेत': 'Tomato',
'टमाटर की खेती वाला खेत': 'Tomato',
'टमाटर की खेती वाला पौधा': 'Tomato',
'टमाटर का पौधा कौन सा है': 'Tomato',
'टमाटर की फसल कौन सी है': 'Tomato',

// ---------- Roman Hindi -------
'tamatar ki fasal': 'Tomato',
'tamatar ki kheti': 'Tomato',
'tamatar ka paudha': 'Tomato',
'tamatar ke paudhe': 'Tomato',
'tamatar ka khet': 'Tomato',
'tamatar ugana': 'Tomato',
'tamatar lagana': 'Tomato',
'tamatar ki kheti karna': 'Tomato',
'tamatar ki fasal ugana': 'Tomato',
'tamatar ka paudha lagana': 'Tomato',
'tamatar ki bagwani': 'Tomato',
'tamatar ki kyari': 'Tomato',
'tamatar wali fasal': 'Tomato',
'tamatar wala paudha': 'Tomato',

// Common voice/spelling variants
'tamatarh': 'Tomato',
'tamataru': 'Tomato',
'tamater': 'Tomato',

'tamater ki kheti': 'Tomato',

'tamater ki fasal': 'Tomato',

// ---------- Rajasthan / Rajasthani ----------
'टमाटर री खेती': 'Tomato',
'टमाटर री फसल': 'Tomato',
'टमाटर रो पौधो': 'Tomato',
'टमाटर रो पौध': 'Tomato',
'टमाटर रो खेत': 'Tomato',
'टमाटर रो बाग': 'Tomato',
'टमाटर री बाड़ी': 'Tomato',
'टमाटर री क्यारी': 'Tomato',
'टमाटर री बागवानी': 'Tomato',
'टमाटर री खेतीबाड़ी': 'Tomato',
'टमाटर उगाणो': 'Tomato',
'टमाटर लगाणो': 'Tomato',
'टमाटर री खेती करणी': 'Tomato',
'टमाटर री फसल उगाणी': 'Tomato',
'टमाटर रो पौधो लगाणो': 'Tomato',

'टमाटर री फसल वालो खेत': 'Tomato',
'टमाटर री खेती वालो खेत': 'Tomato',


// ---------- Marwari / Rajasthani Roman ----------
'tamatar ri kheti': 'Tomato',
'tamatar ri fasal': 'Tomato',
'tamatar ro paudho': 'Tomato',
'tamatar ro paudha': 'Tomato',
'tamatar ro khet': 'Tomato',
'tamatar ro bagh': 'Tomato',
'tamatar ri baadi': 'Tomato',
'tamatar ri kyari': 'Tomato',
'tamatar ri bagwani': 'Tomato',
'tamatar ri kheti baadi': 'Tomato',
'tamatar ugano': 'Tomato',
'tamatar lagano': 'Tomato',
'tamatar ri kheti karni': 'Tomato',
'tamatar ri fasal ugani': 'Tomato',
'tamatar ro paudho lagano': 'Tomato',
'tamatar ri fasal valo khet': 'Tomato',
'tamatar ri kheti valo khet': 'Tomato',

// ---------- Punjabi ----------
'ਟਮਾਟਰ': 'Tomato',
'ਟਮਾਟਰ ਦਾ ਫਲ': 'Tomato',
'ਟਮਾਟਰ ਦੀ ਫਸਲ': 'Tomato',
'ਟਮਾਟਰ ਦੀ ਖੇਤੀ': 'Tomato',
'ਟਮਾਟਰ ਦਾ ਪੌਦਾ': 'Tomato',

// ---------- Gujarati ----------
'ટામેટા': 'Tomato',
'ટામેટાનું ફળ': 'Tomato',
'ટામેટાનો પાક': 'Tomato',
'ટામેટાની ખેતી': 'Tomato',
'ટામેટાનો છોડ': 'Tomato',

// ---------- Marathi ----------
'टोमॅटो': 'Tomato',
'टोमॅटोचे फळ': 'Tomato',
'टोमॅटोचे पीक': 'Tomato',
'टोमॅटोची शेती': 'Tomato',
'टोमॅटोचे रोप': 'Tomato',

// ---------- Bengali ----------
'টমেটো': 'Tomato',
'টমেটোর ফল': 'Tomato',
'টমেটোর ফসল': 'Tomato',
'টমেটো চাষ': 'Tomato',
'টমেটোর গাছ': 'Tomato',

// ---------- Telugu ----------
'టమాటా': 'Tomato',
'టమాటా పండు': 'Tomato',
'టమాటా పంట': 'Tomato',
'టమాటా సాగు': 'Tomato',
'టమాటా మొక్క': 'Tomato',

// ---------- Tamil ----------
'தக்காளி': 'Tomato',
'தக்காளி பழம்': 'Tomato',
'தக்காளி பயிர்': 'Tomato',
'தக்காளி சாகுபடி': 'Tomato',
'தக்காளி செடி': 'Tomato',

// ---------- Kannada ----------
'ಟೊಮೇಟೊ': 'Tomato',
'ಟೊಮೆಟೊ ಹಣ್ಣು': 'Tomato',
'ಟೊಮೆಟೊ ಬೆಳೆ': 'Tomato',
'ಟೊಮೆಟೊ ಕೃಷಿ': 'Tomato',
'ಟೊಮೆಟೊ ಗಿಡ': 'Tomato',

// ---------- Malayalam ----------
'തക്കാളി': 'Tomato',
'തക്കാളി പഴം': 'Tomato',
'തക്കാളി വിള': 'Tomato',
'തക്കാളി കൃഷി': 'Tomato',
'തക്കാളി ചെടി': 'Tomato',

// ---------- Odia ----------
'ଟମାଟର': 'Tomato',
'ଟମାଟର ଫଳ': 'Tomato',
'ଟମାଟର ଫସଲ': 'Tomato',
'ଟମାଟର ଚାଷ': 'Tomato',
'ଟମାଟର ଗଛ': 'Tomato',

// ---------- Assamese ----------
'বিলাহী': 'Tomato',
'বিলাহী ফল': 'Tomato',
'বিলাহীৰ খেতি': 'Tomato',
'বিলাহীৰ শস্য': 'Tomato',

// ---------- Urdu ----------
'ٹماٹر': 'Tomato',
'ٹماٹر کا پھل': 'Tomato',
'ٹماٹر کی فصل': 'Tomato',
'ٹماٹر کی کاشت': 'Tomato',
'ٹماٹر کا پودا': 'Tomato',
// ---------- Pepper Bell / Shimla Mirch ----------
'pepper bell': 'Pepper_bell',
'bell pepper': 'Pepper_bell',
'bell peppers': 'Pepper_bell',
'capsicum': 'Pepper_bell',
'capsicum pepper': 'Pepper_bell',
'green capsicum': 'Pepper_bell',
'red capsicum': 'Pepper_bell',
'yellow capsicum': 'Pepper_bell',
'pepper crop': 'Pepper_bell',
'capsicum crop': 'Pepper_bell',
'capsicum plant': 'Pepper_bell',
'capsicum farming': 'Pepper_bell',
'capsicum cultivation': 'Pepper_bell',

// ---------- Hindi ----------
'शिमला मिर्च': 'Pepper_bell',
'शिमला मिर्ची': 'Pepper_bell',
'शिमला मिर्च का फल': 'Pepper_bell',
'शिमला मिर्च की फसल': 'Pepper_bell',
'शिमला मिर्च की खेती': 'Pepper_bell',
'शिमला मिर्च का पौधा': 'Pepper_bell',
'शिमला मिर्च के पौधे': 'Pepper_bell',
'शिमला मिर्च का खेत': 'Pepper_bell',
'शिमला मिर्च की बागवानी': 'Pepper_bell',
'शिमला मिर्च उगाना': 'Pepper_bell',
'शिमला मिर्च लगाना': 'Pepper_bell',
'शिमला मिर्च की खेती करना': 'Pepper_bell',
'शिमला मिर्च की फसल उगाना': 'Pepper_bell',
'शिमला मिर्च का पौधा लगाना': 'Pepper_bell',
'शिमला मिर्च वाली फसल': 'Pepper_bell',
'शिमला मिर्च वाला पौधा': 'Pepper_bell',
'कैप्सिकम': 'Pepper_bell',
'कैप्सिकम की फसल': 'Pepper_bell',
'कैप्सिकम की खेती': 'Pepper_bell',
'कैप्सिकम का पौधा': 'Pepper_bell',
'कैप्सिकम का खेत': 'Pepper_bell',
'हरी शिमला मिर्च': 'Pepper_bell',
'लाल शिमला मिर्च': 'Pepper_bell',
'पीली शिमला मिर्च': 'Pepper_bell',

// ---------- Hindi spoken variants ----------
'शिमला मिर्ची की खेती': 'Pepper_bell',
'शिमला मिर्ची की फसल': 'Pepper_bell',
'शिमला मिर्ची का पौधा': 'Pepper_bell',
'शिमला मिर्ची का खेत': 'Pepper_bell',
'शिमला मिर्च उगानी': 'Pepper_bell',
'शिमला मिर्च लगानी': 'Pepper_bell',
'कैप्सिकम उगाना': 'Pepper_bell',
'कैप्सिकम लगाना': 'Pepper_bell',
'कैप्सिकम की खेती करना': 'Pepper_bell',

// ---------- Roman Hindi ----------
'shimla mirch': 'Pepper_bell',
'shimla mirchi': 'Pepper_bell',
'shimla mirch ki fasal': 'Pepper_bell',
'shimla mirchi ki fasal': 'Pepper_bell',
'shimla mirch ki kheti': 'Pepper_bell',
'shimla mirchi ki kheti': 'Pepper_bell',
'shimla mirch ka paudha': 'Pepper_bell',
'shimla mirchi ka paudha': 'Pepper_bell',
'shimla mirch ka khet': 'Pepper_bell',
'shimla mirchi ka khet': 'Pepper_bell',
'shimla mirch ugana': 'Pepper_bell',
'shimla mirch lagana': 'Pepper_bell',
'shimla mirch ki bagwani': 'Pepper_bell',
'capsicum ki fasal': 'Pepper_bell',
'capsicum ki kheti': 'Pepper_bell',
'capsicum ka paudha': 'Pepper_bell',
'capsicum ka khet': 'Pepper_bell',
'capsicum ugana': 'Pepper_bell',
'capsicum lagana': 'Pepper_bell',

// ---------- Rajasthan / Rajasthani ----------
'शिमला मिर्च री खेती': 'Pepper_bell',
'शिमला मिर्च री फसल': 'Pepper_bell',
'शिमला मिर्च रो पौधो': 'Pepper_bell',
'शिमला मिर्च रो पौध': 'Pepper_bell',
'शिमला मिर्च रो खेत': 'Pepper_bell',
'शिमला मिर्च री बाड़ी': 'Pepper_bell',
'शिमला मिर्च री क्यारी': 'Pepper_bell',
'शिमला मिर्च री बागवानी': 'Pepper_bell',
'शिमला मिर्च री खेतीबाड़ी': 'Pepper_bell',
'शिमला मिर्च उगाणो': 'Pepper_bell',
'शिमला मिर्च लगाणो': 'Pepper_bell',
'शिमला मिर्च री खेती करणी': 'Pepper_bell',
'शिमला मिर्च री फसल उगाणी': 'Pepper_bell',
'शिमला मिर्च रो पौधो लगाणो': 'Pepper_bell',
'शिमला मिर्च री फसल वालो खेत': 'Pepper_bell',

// ---------- Rajasthani Roman ----------
'shimla mirch ri kheti': 'Pepper_bell',
'shimla mirch ri fasal': 'Pepper_bell',
'shimla mirch ro paudho': 'Pepper_bell',
'shimla mirch ro paudha': 'Pepper_bell',
'shimla mirch ro khet': 'Pepper_bell',
'shimla mirch ri baadi': 'Pepper_bell',
'shimla mirch ri kyari': 'Pepper_bell',
'shimla mirch ri bagwani': 'Pepper_bell',
'shimla mirch ri kheti baadi': 'Pepper_bell',
'shimla mirch ugano': 'Pepper_bell',
'shimla mirch lagano': 'Pepper_bell',
'shimla mirch ri kheti karni': 'Pepper_bell',
'shimla mirch ri fasal ugani': 'Pepper_bell',
'shimla mirch ro paudho lagano': 'Pepper_bell',

// ---------- Punjabi ----------
'ਸ਼ਿਮਲਾ ਮਿਰਚ': 'Pepper_bell',
'ਸ਼ਿਮਲਾ ਮਿਰਚ ਦੀ ਫਸਲ': 'Pepper_bell',
'ਸ਼ਿਮਲਾ ਮਿਰਚ ਦੀ ਖੇਤੀ': 'Pepper_bell',
'ਸ਼ਿਮਲਾ ਮਿਰਚ ਦਾ ਪੌਦਾ': 'Pepper_bell',

// ---------- Gujarati ----------
'શિમલા મરચાં': 'Pepper_bell',
'શિમલા મરચું': 'Pepper_bell',
'કેપ્સિકમ': 'Pepper_bell',
'શિમલા મરચાનો પાક': 'Pepper_bell',
'શિમલા મરચાની ખેતી': 'Pepper_bell',

// ---------- Marathi ----------
'ढोबळी मिरची': 'Pepper_bell',
'ढोबळी मिरचीचे पीक': 'Pepper_bell',
'ढोबळी मिरचीची शेती': 'Pepper_bell',
'ढोबळी मिरचीचे रोप': 'Pepper_bell',

// ---------- Bengali ----------
'ক্যাপসিকাম': 'Pepper_bell',
'শিমলা মরিচ': 'Pepper_bell',
'ক্যাপসিকামের ফসল': 'Pepper_bell',
'ক্যাপসিকাম চাষ': 'Pepper_bell',

// ---------- Telugu ----------
'క్యాప్సికమ్': 'Pepper_bell',
'బెల్ పెప్పర్': 'Pepper_bell',
'క్యాప్సికమ్ పంట': 'Pepper_bell',
'క్యాప్సికమ్ సాగు': 'Pepper_bell',

// ---------- Tamil ----------
'குடைமிளகாய்': 'Pepper_bell',
'குடை மிளகாய்': 'Pepper_bell',
'குடைமிளகாய் பயிர்': 'Pepper_bell',
'குடைமிளகாய் சாகுபடி': 'Pepper_bell',

// ---------- Kannada ----------
'ದೊಣ್ಣೆ ಮೆಣಸಿನಕಾಯಿ': 'Pepper_bell',
'ಕ್ಯಾಪ್ಸಿಕಂ': 'Pepper_bell',
'ಕ್ಯಾಪ್ಸಿಕಂ ಬೆಳೆ': 'Pepper_bell',
'ಕ್ಯಾಪ್ಸಿಕಂ ಕೃಷಿ': 'Pepper_bell',

// ---------- Malayalam ----------
'കാപ്സിക്കം': 'Pepper_bell',
'കാപ്സിക്കം വിള': 'Pepper_bell',
'കാപ്സിക്കം കൃഷി': 'Pepper_bell',

// ---------- Odia ----------
'କ୍ୟାପସିକମ୍': 'Pepper_bell',
'ଶିମଲା ଲଙ୍କା': 'Pepper_bell',
'କ୍ୟାପସିକମ୍ ଫସଲ': 'Pepper_bell',
'କ୍ୟାପସିକମ୍ ଚାଷ': 'Pepper_bell',

// ---------- Assamese ----------
'কেপচিকাম': 'Pepper_bell',
'শিমলা জলকীয়া': 'Pepper_bell',
'কেপচিকাম খেতি': 'Pepper_bell',

// ---------- Urdu ----------
'شملہ مرچ': 'Pepper_bell',
'شملہ مرچ کی فصل': 'Pepper_bell',
'شملہ مرچ کی کاشت': 'Pepper_bell',
'شملہ مرچ کا پودا': 'Pepper_bell',
// ---------- Wheat ----------

'wheats': 'wheat',
'wheat crop': 'wheat',
'wheat plant': 'wheat',
'wheat farming': 'wheat',
'wheat cultivation': 'wheat',
'wheat field': 'wheat',
'wheat grain': 'wheat',

// ---------- Hindi ----------

'गेहू': 'wheat',
'गहूं': 'wheat',
'गहूँ': 'wheat',
'गेहूँ की फसल': 'wheat',
'गेहूं की फसल': 'wheat',
'गेहूं की खेती': 'wheat',
'गेहूँ की खेती': 'wheat',
'गेहूं का पौधा': 'wheat',
'गेहूँ का पौधा': 'wheat',
'गेहूं के पौधे': 'wheat',
'गेहूँ के पौधे': 'wheat',
'गेहूं का खेत': 'wheat',
'गेहूँ का खेत': 'wheat',
'गेहूं उगाना': 'wheat',
'गेहूँ उगाना': 'wheat',
'गेहूं लगाना': 'wheat',
'गेहूँ लगाना': 'wheat',
'गेहूं की खेती करना': 'wheat',
'गेहूँ की खेती करना': 'wheat',
'गेहूं की फसल उगाना': 'wheat',
'गेहूँ की फसल उगाना': 'wheat',
'गेहूं वाला खेत': 'wheat',
'गेहूँ वाला खेत': 'wheat',
'गेहूं की बुवाई': 'wheat',
'गेहूँ की बुवाई': 'wheat',
'गेहूं बोना': 'wheat',
'गेहूँ बोना': 'wheat',
'गेहूं का दाना': 'wheat',
'गेहूँ का दाना': 'wheat',

// ---------- Roman Hindi ----------

'gehun ki fasal': 'wheat',
'gehu ki fasal': 'wheat',
'gehun ki kheti': 'wheat',
'gehu ki kheti': 'wheat',
'gehun ka paudha': 'wheat',
'gehu ka paudha': 'wheat',
'gehun ke paudhe': 'wheat',
'gehu ke paudhe': 'wheat',
'gehun ka khet': 'wheat',
'gehu ka khet': 'wheat',
'gehun ugana': 'wheat',
'gehu ugana': 'wheat',
'gehun lagana': 'wheat',
'gehu lagana': 'wheat',
'gehun ki kheti karna': 'wheat',
'gehu ki kheti karna': 'wheat',
'gehun ki fasal ugana': 'wheat',
'gehu ki fasal ugana': 'wheat',
'gehun ki buwai': 'wheat',
'gehu ki buwai': 'wheat',
'gehun bona': 'wheat',
'gehu bona': 'wheat',
'gehun ka dana': 'wheat',
'gehu ka dana': 'wheat',

// ---------- Rajasthani / Marwari ----------
'गेहूं री फसल': 'wheat',
'गेहूँ री फसल': 'wheat',
'गेहूं री खेती': 'wheat',
'गेहूँ री खेती': 'wheat',
'गेहूं रो पौधो': 'wheat',
'गेहूँ रो पौधो': 'wheat',
'गेहूं रो पौध': 'wheat',
'गेहूँ रो पौध': 'wheat',
'गेहूं रो खेत': 'wheat',
'गेहूँ रो खेत': 'wheat',
'गेहूं री बाड़ी': 'wheat',
'गेहूँ री बाड़ी': 'wheat',
'गेहूं री बुवाई': 'wheat',
'गेहूँ री बुवाई': 'wheat',
'गेहूं बोणो': 'wheat',
'गेहूँ बोणो': 'wheat',
'गेहूं उगाणो': 'wheat',
'गेहूँ उगाणो': 'wheat',
'गेहूं लगाणो': 'wheat',
'गेहूँ लगाणो': 'wheat',
'गेहूं रो दाणो': 'wheat',
'गेहूँ रो दाणो': 'wheat',

// ---------- Rajasthani Roman ----------
'gehun ri fasal': 'wheat',
'gehu ri fasal': 'wheat',
'gehun ri kheti': 'wheat',
'gehu ri kheti': 'wheat',
'gehun ro paudho': 'wheat',
'gehu ro paudho': 'wheat',
'gehun ro paudha': 'wheat',
'gehu ro paudha': 'wheat',
'gehun ro khet': 'wheat',
'gehu ro khet': 'wheat',
'gehun ri buwai': 'wheat',
'gehu ri buwai': 'wheat',
'gehun bono': 'wheat',
'gehu bono': 'wheat',
'gehun ugano': 'wheat',
'gehu ugano': 'wheat',
'gehun lagano': 'wheat',
'gehu lagano': 'wheat',
'gehun ro dano': 'wheat',
'gehu ro dano': 'wheat',

// ---------- Punjabi ----------
'ਕਣਕ': 'wheat',
'ਕਣਕ ਦੀ ਫਸਲ': 'wheat',
'ਕਣਕ ਦੀ ਖੇਤੀ': 'wheat',
'ਕਣਕ ਦਾ ਪੌਦਾ': 'wheat',
'ਕਣਕ ਦਾ ਖੇਤ': 'wheat',

// ---------- Gujarati ----------
'ઘઉં': 'wheat',
'ઘઉંનો પાક': 'wheat',
'ઘઉંની ખેતી': 'wheat',
'ઘઉંનો છોડ': 'wheat',
'ઘઉંનું ખેતર': 'wheat',

// ---------- Marathi ----------
'गहू': 'wheat',
'गव्हाचे पीक': 'wheat',
'गव्हाची शेती': 'wheat',
'गव्हाचे रोप': 'wheat',
'गव्हाचे शेत': 'wheat',

// ---------- Bengali ----------
'গম': 'wheat',
'গমের ফসল': 'wheat',
'গম চাষ': 'wheat',
'গমের গাছ': 'wheat',
'গমের ক্ষেত': 'wheat',

// ---------- Telugu ----------
'గోధుమ': 'wheat',
'గోధుమ పంట': 'wheat',
'గోధుమ సాగు': 'wheat',
'గోధుమ మొక్క': 'wheat',
'గోధుమ పొలం': 'wheat',

// ---------- Tamil ----------
'கோதுமை': 'wheat',
'கோதுமை பயிர்': 'wheat',
'கோதுமை சாகுபடி': 'wheat',
'கோதுமை செடி': 'wheat',
'கோதுமை வயல்': 'wheat',

// ---------- Kannada ----------
'ಗೋಧಿ': 'wheat',
'ಗೋಧಿ ಬೆಳೆ': 'wheat',
'ಗೋಧಿ ಕೃಷಿ': 'wheat',
'ಗೋಧಿ ಗಿಡ': 'wheat',
'ಗೋಧಿ ಹೊಲ': 'wheat',

// ---------- Malayalam ----------
'ഗോതമ്പ്': 'wheat',
'ഗോതമ്പ് വിള': 'wheat',
'ഗോതമ്പ് കൃഷി': 'wheat',
'ഗോതമ്പ് ചെടി': 'wheat',
'ഗോതമ്പ് വയൽ': 'wheat',

// ---------- Odia ----------
'ଗହମ': 'wheat',
'ଗହମ ଫସଲ': 'wheat',
'ଗହମ ଚାଷ': 'wheat',
'ଗହମ ଗଛ': 'wheat',
'ଗହମ କ୍ଷେତ': 'wheat',

// ---------- Assamese ----------
'ঘেঁহু': 'wheat',
'ঘেঁহুৰ শস্য': 'wheat',
'ঘেঁহুৰ খেতি': 'wheat',
'ঘেঁহুৰ গছ': 'wheat',
'ঘেঁহুৰ পথাৰ': 'wheat',

// ---------- Urdu ----------
'گندم': 'wheat',
'گندم کی فصل': 'wheat',
'گندم کی کاشت': 'wheat',
'گندم کا پودا': 'wheat',
'گندم کا کھیت': 'wheat',
// ---------- Green Gram / Moong ----------

'green gram crop': 'green_gram',
'green gram plant': 'green_gram',
'green gram farming': 'green_gram',
'green gram cultivation': 'green_gram',
'green gram field': 'green_gram',

'moong bean': 'green_gram',
'moong crop': 'green_gram',
'moong plant': 'green_gram',
'moong farming': 'green_gram',
'moong cultivation': 'green_gram',

// ---------- Hindi ----------

'मूंग की दाल': 'green_gram',
'मूंग की फसल': 'green_gram',
'मूंग की खेती': 'green_gram',
'मूंग का पौधा': 'green_gram',
'मूंग के पौधे': 'green_gram',
'मूंग का खेत': 'green_gram',
'मूंग उगाना': 'green_gram',
'मूंग लगाना': 'green_gram',
'मूंग की बुवाई': 'green_gram',
'मूंग बोना': 'green_gram',
'मूंग की खेती करना': 'green_gram',
'मूंग की फसल उगाना': 'green_gram',
'मूंग का दाना': 'green_gram',
'हरी मूंग': 'green_gram',
'हरी मूंग की फसल': 'green_gram',
'हरी मूंग की खेती': 'green_gram',
'मूंग वाली फसल': 'green_gram',
'मूंग वाला खेत': 'green_gram',

// ---------- Roman Hindi ----------

'moong ki dal': 'green_gram',
'moong ki fasal': 'green_gram',
'mung ki fasal': 'green_gram',
'moong ki kheti': 'green_gram',
'mung ki kheti': 'green_gram',
'moong ka paudha': 'green_gram',
'mung ka paudha': 'green_gram',
'moong ke paudhe': 'green_gram',
'mung ke paudhe': 'green_gram',
'moong ka khet': 'green_gram',
'mung ka khet': 'green_gram',
'moong ugana': 'green_gram',
'mung ugana': 'green_gram',
'moong lagana': 'green_gram',
'mung lagana': 'green_gram',
'moong ki buwai': 'green_gram',
'mung ki buwai': 'green_gram',
'moong bona': 'green_gram',
'mung bona': 'green_gram',
'moong ki kheti karna': 'green_gram',
'mung ki kheti karna': 'green_gram',
'moong ka dana': 'green_gram',
'mung ka dana': 'green_gram',

// ---------- Rajasthani / Marwari ----------
'मूंग री फसल': 'green_gram',
'मूंग री खेती': 'green_gram',
'मूंग रो पौधो': 'green_gram',
'मूंग रो पौध': 'green_gram',
'मूंग रो खेत': 'green_gram',
'मूंग री बाड़ी': 'green_gram',
'मूंग री बुवाई': 'green_gram',
'मूंग बोणो': 'green_gram',
'मूंग उगाणो': 'green_gram',
'मूंग लगाणो': 'green_gram',
'मूंग री खेती करणी': 'green_gram',
'मूंग री फसल उगाणी': 'green_gram',
'मूंग रो दाणो': 'green_gram',
'मूंग री फसल वालो खेत': 'green_gram',

// ---------- Rajasthani Roman ----------
'moong ri fasal': 'green_gram',
'mung ri fasal': 'green_gram',
'moong ri kheti': 'green_gram',
'mung ri kheti': 'green_gram',
'moong ro paudho': 'green_gram',
'mung ro paudho': 'green_gram',
'moong ro paudha': 'green_gram',
'mung ro paudha': 'green_gram',
'moong ro khet': 'green_gram',
'mung ro khet': 'green_gram',
'moong ri buwai': 'green_gram',
'mung ri buwai': 'green_gram',
'moong bono': 'green_gram',
'mung bono': 'green_gram',
'moong ugano': 'green_gram',
'mung ugano': 'green_gram',
'moong lagano': 'green_gram',
'mung lagano': 'green_gram',
'moong ri kheti karni': 'green_gram',
'mung ri kheti karni': 'green_gram',
'moong ro dano': 'green_gram',
'mung ro dano': 'green_gram',

// ---------- Punjabi ----------
'ਮੂੰਗੀ': 'green_gram',
'ਮੂੰਗ': 'green_gram',
'ਮੂੰਗ ਦਾਲ': 'green_gram',
'ਮੂੰਗ ਦੀ ਫਸਲ': 'green_gram',
'ਮੂੰਗ ਦੀ ਖੇਤੀ': 'green_gram',
'ਮੂੰਗ ਦਾ ਪੌਦਾ': 'green_gram',
'ਮੂੰਗ ਦਾ ਖੇਤ': 'green_gram',

// ---------- Gujarati ----------
'મગ': 'green_gram',
'મગની દાળ': 'green_gram',
'મગનો પાક': 'green_gram',
'મગની ખેતી': 'green_gram',
'મગનો છોડ': 'green_gram',
'મગનું ખેતર': 'green_gram',

// ---------- Marathi ----------
'मूग': 'green_gram',
'मुगाची डाळ': 'green_gram',
'मुगाचे पीक': 'green_gram',
'मुगाची शेती': 'green_gram',
'मुगाचे रोप': 'green_gram',
'मुगाचे शेत': 'green_gram',

// ---------- Bengali ----------
'মুগ': 'green_gram',
'মুগ ডাল': 'green_gram',
'মুগের ডাল': 'green_gram',
'মুগের ফসল': 'green_gram',
'মুগ চাষ': 'green_gram',
'মুগ গাছ': 'green_gram',

// ---------- Telugu ----------
'పెసలు': 'green_gram',
'పెసర': 'green_gram',
'పెసర పప్పు': 'green_gram',
'పెసర పంట': 'green_gram',
'పెసర సాగు': 'green_gram',
'పెసర మొక్క': 'green_gram',

// ---------- Tamil ----------
'பாசிப்பயறு': 'green_gram',
'பாசிப்பருப்பு': 'green_gram',
'பச்சைப்பயறு': 'green_gram',
'பாசிப்பயறு பயிர்': 'green_gram',
'பாசிப்பயறு சாகுபடி': 'green_gram',
'பாசிப்பயறு செடி': 'green_gram',

// ---------- Kannada ----------
'ಹೆಸರು': 'green_gram',
'ಹೆಸರು ಕಾಳು': 'green_gram',
'ಹೆಸರು ಬೇಳೆ': 'green_gram',
'ಹೆಸರು ಬೆಳೆ': 'green_gram',
'ಹೆಸರು ಕೃಷಿ': 'green_gram',
'ಹೆಸರು ಗಿಡ': 'green_gram',

// ---------- Malayalam ----------
'ചെറുപയർ': 'green_gram',
'ചെറുപയർ പരിപ്പ്': 'green_gram',
'ചെറുപയർ വിള': 'green_gram',
'ചെറുപയർ കൃഷി': 'green_gram',
'ചെറുപയർ ചെടി': 'green_gram',

// ---------- Odia ----------
'ମୁଗ': 'green_gram',
'ମୁଗ ଡାଲି': 'green_gram',
'ମୁଗ ଫସଲ': 'green_gram',
'ମୁଗ ଚାଷ': 'green_gram',
'ମୁଗ ଗଛ': 'green_gram',

// ---------- Assamese ----------

'মগ': 'green_gram',
'মগ দাইল': 'green_gram',
'মগৰ খেতি': 'green_gram',
'মগৰ শস্য': 'green_gram',

// ---------- Urdu ----------
'مونگ': 'green_gram',
'مونگ دال': 'green_gram',
'مونگ کی دال': 'green_gram',
'مونگ کی فصل': 'green_gram',
'مونگ کی کاشت': 'green_gram',
'مونگ کا پودا': 'green_gram',
'مونگ کا کھیت': 'green_gram',
// ---------- Corn / Maize ----------

'maize crop': 'corn_maize',
'corn crop': 'corn_maize',
'maize plant': 'corn_maize',
'corn plant': 'corn_maize',
'maize farming': 'corn_maize',
'corn farming': 'corn_maize',
'maize cultivation': 'corn_maize',
'corn cultivation': 'corn_maize',
'maize field': 'corn_maize',
'corn field': 'corn_maize',
'maize grain': 'corn_maize',
'corn grain': 'corn_maize',

// ---------- Hindi ----------

'मक्का की फसल': 'corn_maize',
'मकई की फसल': 'corn_maize',
'मक्की की फसल': 'corn_maize',
'मक्का की खेती': 'corn_maize',
'मकई की खेती': 'corn_maize',
'मक्की की खेती': 'corn_maize',
'मक्का का पौधा': 'corn_maize',
'मकई का पौधा': 'corn_maize',
'मक्की का पौधा': 'corn_maize',
'मक्का के पौधे': 'corn_maize',
'मक्का का खेत': 'corn_maize',
'मकई का खेत': 'corn_maize',
'मक्की का खेत': 'corn_maize',
'मक्का उगाना': 'corn_maize',
'मकई उगाना': 'corn_maize',
'मक्की उगाना': 'corn_maize',
'मक्का लगाना': 'corn_maize',
'मकई लगाना': 'corn_maize',
'मक्की लगाना': 'corn_maize',
'मक्का की बुवाई': 'corn_maize',
'मकई की बुवाई': 'corn_maize',
'मक्की की बुवाई': 'corn_maize',
'मक्का बोना': 'corn_maize',
'मकई बोना': 'corn_maize',
'मक्की बोना': 'corn_maize',
'मक्का का दाना': 'corn_maize',
'मकई का दाना': 'corn_maize',
'मक्की का दाना': 'corn_maize',
'मक्का की खेती करना': 'corn_maize',
'मक्का की फसल उगाना': 'corn_maize',
'मक्का वाला खेत': 'corn_maize',

// ---------- Roman Hindi ----------

'makki': 'corn_maize',
'makka ki fasal': 'corn_maize',
'makai ki fasal': 'corn_maize',
'makki ki fasal': 'corn_maize',
'makka ki kheti': 'corn_maize',
'makai ki kheti': 'corn_maize',
'makki ki kheti': 'corn_maize',
'makka ka paudha': 'corn_maize',
'makai ka paudha': 'corn_maize',
'makki ka paudha': 'corn_maize',
'makka ke paudhe': 'corn_maize',
'makai ke paudhe': 'corn_maize',
'makki ke paudhe': 'corn_maize',
'makka ka khet': 'corn_maize',
'makai ka khet': 'corn_maize',
'makki ka khet': 'corn_maize',
'makka ugana': 'corn_maize',
'makai ugana': 'corn_maize',
'makki ugana': 'corn_maize',
'makka lagana': 'corn_maize',
'makai lagana': 'corn_maize',
'makki lagana': 'corn_maize',
'makka ki buwai': 'corn_maize',
'makai ki buwai': 'corn_maize',
'makki ki buwai': 'corn_maize',
'makka bona': 'corn_maize',
'makai bona': 'corn_maize',
'makki bona': 'corn_maize',
'makka ka dana': 'corn_maize',
'makai ka dana': 'corn_maize',
'makki ka dana': 'corn_maize',
'makka ki kheti karna': 'corn_maize',
'makka ki fasal ugana': 'corn_maize',
'makka wala khet': 'corn_maize',

// ---------- Rajasthani / Marwari ----------
'मक्का री फसल': 'corn_maize',
'मकई री फसल': 'corn_maize',
'मक्की री फसल': 'corn_maize',
'मक्का री खेती': 'corn_maize',
'मकई री खेती': 'corn_maize',
'मक्की री खेती': 'corn_maize',
'मक्का रो पौधो': 'corn_maize',
'मकई रो पौधो': 'corn_maize',
'मक्की रो पौधो': 'corn_maize',
'मक्का रो पौध': 'corn_maize',
'मक्का रो खेत': 'corn_maize',
'मकई रो खेत': 'corn_maize',
'मक्की रो खेत': 'corn_maize',
'मक्का री बाड़ी': 'corn_maize',
'मक्का री बुवाई': 'corn_maize',
'मक्का बोणो': 'corn_maize',
'मक्का उगाणो': 'corn_maize',
'मक्का लगाणो': 'corn_maize',
'मक्का री खेती करणी': 'corn_maize',
'मक्का री फसल उगाणी': 'corn_maize',
'मक्का रो दाणो': 'corn_maize',
'मक्का री फसल वालो खेत': 'corn_maize',

// ---------- Rajasthani Roman ----------
'makka ri fasal': 'corn_maize',
'makai ri fasal': 'corn_maize',
'makki ri fasal': 'corn_maize',
'makka ri kheti': 'corn_maize',
'makai ri kheti': 'corn_maize',
'makki ri kheti': 'corn_maize',
'makka ro paudho': 'corn_maize',
'makai ro paudho': 'corn_maize',
'makki ro paudho': 'corn_maize',
'makka ro paudha': 'corn_maize',
'makka ro khet': 'corn_maize',
'makai ro khet': 'corn_maize',
'makki ro khet': 'corn_maize',
'makka ri baadi': 'corn_maize',
'makka ri buwai': 'corn_maize',
'makka bono': 'corn_maize',
'makka ugano': 'corn_maize',
'makka lagano': 'corn_maize',
'makka ri kheti karni': 'corn_maize',
'makka ri fasal ugani': 'corn_maize',
'makka ro dano': 'corn_maize',
'makka ri fasal valo khet': 'corn_maize',

// ---------- Punjabi ----------
'ਮੱਕੀ': 'corn_maize',
'ਮੱਕਾ': 'corn_maize',
'ਮੱਕੀ ਦੀ ਫਸਲ': 'corn_maize',
'ਮੱਕੀ ਦੀ ਖੇਤੀ': 'corn_maize',
'ਮੱਕੀ ਦਾ ਪੌਦਾ': 'corn_maize',
'ਮੱਕੀ ਦਾ ਖੇਤ': 'corn_maize',
'ਮੱਕੀ ਦਾ ਦਾਣਾ': 'corn_maize',

// ---------- Gujarati ----------
'મકાઈ': 'corn_maize',
'મકાઈનો પાક': 'corn_maize',
'મકાઈની ખેતી': 'corn_maize',
'મકાઈનો છોડ': 'corn_maize',
'મકાઈનું ખેતર': 'corn_maize',
'મકાઈનો દાણો': 'corn_maize',

// ---------- Marathi ----------
'मका': 'corn_maize',
'मक्याचे पीक': 'corn_maize',
'मक्याची शेती': 'corn_maize',
'मक्याचे रोप': 'corn_maize',
'मक्याचे शेत': 'corn_maize',
'मक्याचे दाणे': 'corn_maize',

// ---------- Bengali ----------
'ভুট্টা': 'corn_maize',
'ভুট্টার ফসল': 'corn_maize',
'ভুট্টা চাষ': 'corn_maize',
'ভুট্টার গাছ': 'corn_maize',
'ভুট্টার ক্ষেত': 'corn_maize',
'ভুট্টার দানা': 'corn_maize',

// ---------- Telugu ----------
'మొక్కజొన్న': 'corn_maize',
'మొక్కజొన్న పంట': 'corn_maize',
'మొక్కజొన్న సాగు': 'corn_maize',
'మొక్కజొన్న మొక్క': 'corn_maize',
'మొక్కజొన్న పొలం': 'corn_maize',
'మొక్కజొన్న గింజ': 'corn_maize',

// ---------- Tamil ----------
'மக்காச்சோளம்': 'corn_maize',
'சோளம்': 'corn_maize',
'மக்காச்சோள பயிர்': 'corn_maize',
'மக்காச்சோள சாகுபடி': 'corn_maize',
'மக்காச்சோள செடி': 'corn_maize',
'மக்காச்சோள வயல்': 'corn_maize',

// ---------- Kannada ----------
'ಮೆಕ್ಕೆಜೋಳ': 'corn_maize',
'ಮೆಕ್ಕೆಜೋಳದ ಬೆಳೆ': 'corn_maize',
'ಮೆಕ್ಕೆಜೋಳ ಕೃಷಿ': 'corn_maize',
'ಮೆಕ್ಕೆಜೋಳದ ಗಿಡ': 'corn_maize',
'ಮೆಕ್ಕೆಜೋಳದ ಹೊಲ': 'corn_maize',

// ---------- Malayalam ----------
'ചോളം': 'corn_maize',
'മക്കച്ചോളം': 'corn_maize',
'ചോളത്തിന്റെ വിള': 'corn_maize',
'ചോളം കൃഷി': 'corn_maize',
'ചോളച്ചെടി': 'corn_maize',

// ---------- Odia ----------
'ମକା': 'corn_maize',
'ମକା ଫସଲ': 'corn_maize',
'ମକା ଚାଷ': 'corn_maize',
'ମକା ଗଛ': 'corn_maize',
'ମକା କ୍ଷେତ': 'corn_maize',

// ---------- Assamese ----------
'মাকৈ': 'corn_maize',
'মাকৈৰ শস্য': 'corn_maize',
'মাকৈ খেতি': 'corn_maize',
'মাকৈৰ গছ': 'corn_maize',
'মাকৈৰ পথাৰ': 'corn_maize',

// ---------- Urdu ----------
'مکئی': 'corn_maize',
'مکئی کی فصل': 'corn_maize',
'مکئی کی کاشت': 'corn_maize',
'مکئی کا پودا': 'corn_maize',
'مکئی کا کھیت': 'corn_maize',
'مکئی کا دانہ': 'corn_maize',
// ---------- Pearl Millet / Bajra ----------

'pearl millet crop': 'Pearl_Millet _Bajra',
'pearl millet plant': 'Pearl_Millet _Bajra',
'pearl millet farming': 'Pearl_Millet _Bajra',
'pearl millet cultivation': 'Pearl_Millet _Bajra',
'pearl millet field': 'Pearl_Millet _Bajra',

'bajra crop': 'Pearl_Millet _Bajra',
'bajra plant': 'Pearl_Millet _Bajra',
'bajra farming': 'Pearl_Millet _Bajra',
'bajra cultivation': 'Pearl_Millet _Bajra',
'bajra field': 'Pearl_Millet _Bajra',

// ---------- Hindi ----------

'बाजरा की फसल': 'Pearl_Millet _Bajra',
'बाजरी की फसल': 'Pearl_Millet _Bajra',
'बाजरा की खेती': 'Pearl_Millet _Bajra',
'बाजरी की खेती': 'Pearl_Millet _Bajra',
'बाजरा का पौधा': 'Pearl_Millet _Bajra',
'बाजरी का पौधा': 'Pearl_Millet _Bajra',
'बाजरा के पौधे': 'Pearl_Millet _Bajra',
'बाजरा का खेत': 'Pearl_Millet _Bajra',
'बाजरी का खेत': 'Pearl_Millet _Bajra',
'बाजरा उगाना': 'Pearl_Millet _Bajra',
'बाजरा लगाना': 'Pearl_Millet _Bajra',
'बाजरा की बुवाई': 'Pearl_Millet _Bajra',
'बाजरा बोना': 'Pearl_Millet _Bajra',
'बाजरा की खेती करना': 'Pearl_Millet _Bajra',
'बाजरा की फसल उगाना': 'Pearl_Millet _Bajra',
'बाजरा का दाना': 'Pearl_Millet _Bajra',
'बाजरा वाली फसल': 'Pearl_Millet _Bajra',
'बाजरा वाला खेत': 'Pearl_Millet _Bajra',
'मोती बाजरा': 'Pearl_Millet _Bajra',
'मोती बाजरे की फसल': 'Pearl_Millet _Bajra',
'मोती बाजरे की खेती': 'Pearl_Millet _Bajra',

// ---------- Roman Hindi ----------
'bajra ki fasal': 'Pearl_Millet _Bajra',
'bajri ki fasal': 'Pearl_Millet _Bajra',
'bajra ki kheti': 'Pearl_Millet _Bajra',
'bajri ki kheti': 'Pearl_Millet _Bajra',
'bajra ka paudha': 'Pearl_Millet _Bajra',
'bajri ka paudha': 'Pearl_Millet _Bajra',
'bajra ke paudhe': 'Pearl_Millet _Bajra',
'bajra ka khet': 'Pearl_Millet _Bajra',
'bajri ka khet': 'Pearl_Millet _Bajra',
'bajra ugana': 'Pearl_Millet _Bajra',
'bajra lagana': 'Pearl_Millet _Bajra',
'bajra ki buwai': 'Pearl_Millet _Bajra',
'bajra bona': 'Pearl_Millet _Bajra',
'bajra ki kheti karna': 'Pearl_Millet _Bajra',
'bajra ki fasal ugana': 'Pearl_Millet _Bajra',
'bajra ka dana': 'Pearl_Millet _Bajra',
'bajra wali fasal': 'Pearl_Millet _Bajra',
'bajra wala khet': 'Pearl_Millet _Bajra',
'moti bajra': 'Pearl_Millet _Bajra',
'moti bajre ki fasal': 'Pearl_Millet _Bajra',
'moti bajre ki kheti': 'Pearl_Millet _Bajra',

// ---------- Rajasthani / Marwari ----------

'बाजरा री फसल': 'Pearl_Millet _Bajra',
'बाजरो री फसल': 'Pearl_Millet _Bajra',
'बाजरी री फसल': 'Pearl_Millet _Bajra',
'बाजरा री खेती': 'Pearl_Millet _Bajra',
'बाजरो री खेती': 'Pearl_Millet _Bajra',
'बाजरी री खेती': 'Pearl_Millet _Bajra',
'बाजरा रो पौधो': 'Pearl_Millet _Bajra',
'बाजरो रो पौधो': 'Pearl_Millet _Bajra',
'बाजरा रो पौध': 'Pearl_Millet _Bajra',
'बाजरो रो पौध': 'Pearl_Millet _Bajra',
'बाजरा रो खेत': 'Pearl_Millet _Bajra',
'बाजरो रो खेत': 'Pearl_Millet _Bajra',
'बाजरी रो खेत': 'Pearl_Millet _Bajra',
'बाजरा री बुवाई': 'Pearl_Millet _Bajra',
'बाजरो री बुवाई': 'Pearl_Millet _Bajra',
'बाजरा बोणो': 'Pearl_Millet _Bajra',
'बाजरो बोणो': 'Pearl_Millet _Bajra',
'बाजरा उगाणो': 'Pearl_Millet _Bajra',
'बाजरो उगाणो': 'Pearl_Millet _Bajra',
'बाजरा लगाणो': 'Pearl_Millet _Bajra',
'बाजरो लगाणो': 'Pearl_Millet _Bajra',
'बाजरा री खेती करणी': 'Pearl_Millet _Bajra',
'बाजरो री खेती करणी': 'Pearl_Millet _Bajra',
'बाजरा रो दाणो': 'Pearl_Millet _Bajra',
'बाजरो रो दाणो': 'Pearl_Millet _Bajra',

// ---------- Rajasthani Roman ----------
'bajra ro': 'Pearl_Millet _Bajra',
'bajro': 'Pearl_Millet _Bajra',

'bajra ri fasal': 'Pearl_Millet _Bajra',
'bajro ri fasal': 'Pearl_Millet _Bajra',
'bajri ri fasal': 'Pearl_Millet _Bajra',
'bajra ri kheti': 'Pearl_Millet _Bajra',
'bajro ri kheti': 'Pearl_Millet _Bajra',
'bajri ri kheti': 'Pearl_Millet _Bajra',
'bajra ro paudho': 'Pearl_Millet _Bajra',
'bajro ro paudho': 'Pearl_Millet _Bajra',
'bajra ro paudha': 'Pearl_Millet _Bajra',
'bajro ro paudha': 'Pearl_Millet _Bajra',
'bajra ro khet': 'Pearl_Millet _Bajra',
'bajro ro khet': 'Pearl_Millet _Bajra',
'bajri ro khet': 'Pearl_Millet _Bajra',
'bajra ri buwai': 'Pearl_Millet _Bajra',
'bajro ri buwai': 'Pearl_Millet _Bajra',
'bajra bono': 'Pearl_Millet _Bajra',
'bajro bono': 'Pearl_Millet _Bajra',
'bajra ugano': 'Pearl_Millet _Bajra',
'bajro ugano': 'Pearl_Millet _Bajra',
'bajra lagano': 'Pearl_Millet _Bajra',
'bajro lagano': 'Pearl_Millet _Bajra',
'bajra ri kheti karni': 'Pearl_Millet _Bajra',
'bajro ri kheti karni': 'Pearl_Millet _Bajra',
'bajra ro dano': 'Pearl_Millet _Bajra',
'bajro ro dano': 'Pearl_Millet _Bajra',

// ---------- Punjabi ----------
'ਬਾਜਰਾ': 'Pearl_Millet _Bajra',
'ਬਾਜਰੇ ਦੀ ਫਸਲ': 'Pearl_Millet _Bajra',
'ਬਾਜਰੇ ਦੀ ਖੇਤੀ': 'Pearl_Millet _Bajra',
'ਬਾਜਰੇ ਦਾ ਪੌਦਾ': 'Pearl_Millet _Bajra',
'ਬਾਜਰੇ ਦਾ ਖੇਤ': 'Pearl_Millet _Bajra',

// ---------- Gujarati ----------
'બાજરી': 'Pearl_Millet _Bajra',
'બાજરીનો પાક': 'Pearl_Millet _Bajra',
'બાજરીની ખેતી': 'Pearl_Millet _Bajra',
'બાજરીનો છોડ': 'Pearl_Millet _Bajra',
'બાજરીનું ખેતર': 'Pearl_Millet _Bajra',

// ---------- Marathi ----------

'बाजरीचे पीक': 'Pearl_Millet _Bajra',
'बाजरीची शेती': 'Pearl_Millet _Bajra',
'बाजरीचे रोप': 'Pearl_Millet _Bajra',
'बाजरीचे शेत': 'Pearl_Millet _Bajra',

// ---------- Bengali ----------
'বাজরা': 'Pearl_Millet _Bajra',
'বাজরার ফসল': 'Pearl_Millet _Bajra',
'বাজরা চাষ': 'Pearl_Millet _Bajra',
'বাজরার গাছ': 'Pearl_Millet _Bajra',

// ---------- Telugu ----------
'సజ్జ': 'Pearl_Millet _Bajra',
'సజ్జ పంట': 'Pearl_Millet _Bajra',
'సజ్జ సాగు': 'Pearl_Millet _Bajra',
'సజ్జ మొక్క': 'Pearl_Millet _Bajra',

// ---------- Tamil ----------
'கம்பு': 'Pearl_Millet _Bajra',
'கம்பு பயிர்': 'Pearl_Millet _Bajra',
'கம்பு சாகுபடி': 'Pearl_Millet _Bajra',
'கம்பு செடி': 'Pearl_Millet _Bajra',

// ---------- Kannada ----------
'ಸಜ್ಜೆ': 'Pearl_Millet _Bajra',
'ಸಜ್ಜೆ ಬೆಳೆ': 'Pearl_Millet _Bajra',
'ಸಜ್ಜೆ ಕೃಷಿ': 'Pearl_Millet _Bajra',
'ಸಜ್ಜೆ ಗಿಡ': 'Pearl_Millet _Bajra',

// ---------- Malayalam ----------
'കമ്പ്': 'Pearl_Millet _Bajra',
'കമ്പ് വിള': 'Pearl_Millet _Bajra',
'കമ്പ് കൃഷി': 'Pearl_Millet _Bajra',
'കമ്പ് ചെടി': 'Pearl_Millet _Bajra',

// ---------- Odia ----------
'ବାଜରା': 'Pearl_Millet _Bajra',
'ବାଜରା ଫସଲ': 'Pearl_Millet _Bajra',
'ବାଜରା ଚାଷ': 'Pearl_Millet _Bajra',
'ବାଜରା ଗଛ': 'Pearl_Millet _Bajra',

// ---------- Assamese ----------
'বাজৰা': 'Pearl_Millet _Bajra',
'বাজৰাৰ শস্য': 'Pearl_Millet _Bajra',
'বাজৰা খেতি': 'Pearl_Millet _Bajra',
'বাজৰাৰ গছ': 'Pearl_Millet _Bajra',

// ---------- Urdu ----------
'باجرا': 'Pearl_Millet _Bajra',
'باجرے کی فصل': 'Pearl_Millet _Bajra',
'باجرے کی کاشت': 'Pearl_Millet _Bajra',
'باجرے کا پودا': 'Pearl_Millet _Bajra',
'باجرے کا کھیت': 'Pearl_Millet _Bajra',

// Odia
'ସେଓ': 'Apple',
'ଆପଲ': 'Apple',
'ସେଓ ଫଳ': 'Apple',
'ସେଓ ଚାଷ': 'Apple',

// Telugu
'ఆపిల్': 'Apple',
'ఆపిల్ పండు': 'Apple',
'ఆపిల్ పంట': 'Apple',
'ఆపిల్ సాగు': 'Apple',

// Tamil
'ஆப்பிள்': 'Apple',
'ஆப்பிள் பழம்': 'Apple',
'ஆப்பிள் பயிர்': 'Apple',
'ஆப்பிள் சாகுபடி': 'Apple',

// Kannada
'ಸೇಬು': 'Apple',
'ಸೇಬು ಹಣ್ಣು': 'Apple',
'ಸೇಬು ಬೆಳೆ': 'Apple',
'ಸೇಬು ಕೃಷಿ': 'Apple',

// Malayalam
'ആപ്പിൾ': 'Apple',
'ആപ്പിൾ പഴം': 'Apple',
'ആപ്പിൾ വിള': 'Apple',
'ആപ്പിൾ കൃഷി': 'Apple',

// Nepali
'स्याउ': 'Apple',
'स्याउ फल': 'Apple',
'स्याउ खेती': 'Apple',

// Urdu
'سیب': 'Apple',
'سیب کا پھل': 'Apple',
'سیب کی فصل': 'Apple',
'سیب کی کاشت': 'Apple',

// Rajasthan / regional
'सेबो': 'Apple',
'सेबा': 'Apple',
'सेब री फसल': 'Apple',
'सेब री खेती': 'Apple',
'सेब रो पेड़': 'Apple',
'सेब को पेड़': 'Apple',
'सेब रो बाग': 'Apple',
'seb ro ped': 'Apple',
'seb ri fasal': 'Apple',
'seb ri kheti': 'Apple',
'seb ro bagh': 'Apple',
// ---------- Grape ----------

'grape orchard': 'Grape',
'grape garden': 'Grape',

// Hindi


// Common spelling / voice variants
'angor': 'Grape',
'angoorh': 'Grape',
'angurh': 'Grape',
'angoor fruit': 'Grape',
'angur fruit': 'Grape',
'grap': 'Grape',
'grapefruit': 'Grape',

// Punjabi
'ਅੰਗੂਰ': 'Grape',
'ਅੰਗੂਰ ਦਾ ਫਲ': 'Grape',
'ਅੰਗੂਰ ਦੀ ਫਸਲ': 'Grape',
'ਅੰਗੂਰ ਦੀ ਖੇਤੀ': 'Grape',
'ਅੰਗੂਰ ਦੀ ਵੇਲ': 'Grape',

// Gujarati
'દ્રાક્ષ': 'Grape',
'દ્રાક્ષનું ફળ': 'Grape',
'દ્રાક્ષનો પાક': 'Grape',
'દ્રાક્ષની ખેતી': 'Grape',
'દ્રાક્ષની વેલ': 'Grape',

// Marathi
'द्राक्ष': 'Grape',
'द्राक्षे': 'Grape',
'द्राक्षाचे फळ': 'Grape',
'द्राक्षाचे पीक': 'Grape',
'द्राक्षाची शेती': 'Grape',
'द्राक्षाची वेल': 'Grape',

// Bengali
'আঙুর': 'Grape',
'আঙ্গুর': 'Grape',
'আঙুর ফল': 'Grape',
'আঙুরের ফসল': 'Grape',
'আঙুর চাষ': 'Grape',

// Assamese
'আঙুৰ': 'Grape',
'আঙুৰ ফল': 'Grape',
'আঙুৰ খেতি': 'Grape',

// Odia
'ଅଙ୍ଗୁର': 'Grape',
'ଦ୍ରାକ୍ଷା': 'Grape',
'ଅଙ୍ଗୁର ଫଳ': 'Grape',
'ଅଙ୍ଗୁର ଚାଷ': 'Grape',

// Telugu
'ద్రాక్ష': 'Grape',
'ద్రాక్ష పండు': 'Grape',
'ద్రాక్ష పంట': 'Grape',
'ద్రాక్ష సాగు': 'Grape',
'ద్రాక్ష తీగ': 'Grape',

// Tamil
'திராட்சை': 'Grape',
'திராட்சை பழம்': 'Grape',
'திராட்சை பயிர்': 'Grape',
'திராட்சை சாகுபடி': 'Grape',
'திராட்சை கொடி': 'Grape',

// Kannada
'ದ್ರಾಕ್ಷಿ': 'Grape',
'ದ್ರಾಕ್ಷಿ ಹಣ್ಣು': 'Grape',
'ದ್ರಾಕ್ಷಿ ಬೆಳೆ': 'Grape',
'ದ್ರಾಕ್ಷಿ ಕೃಷಿ': 'Grape',
'ದ್ರಾಕ್ಷಿ ಬಳ್ಳಿ': 'Grape',

// Malayalam
'മുന്തിരി': 'Grape',
'മുന്തിരിപ്പഴം': 'Grape',
'മുന്തിരി വിള': 'Grape',
'മുന്തിരി കൃഷി': 'Grape',
'മുന്തിരി വള്ളി': 'Grape',

// Urdu
'انگور': 'Grape',
'انگور کا پھل': 'Grape',
'انگور کی فصل': 'Grape',
'انگور کی کاشت': 'Grape',
'انگور کی بیل': 'Grape',

// Nepali

'अङ्गुर': 'Grape',
'अंगुर फल': 'Grape',
'अंगुर खेती': 'Grape',

// Rajasthan / regional
'अंगूरो': 'Grape',
'अंगूरां': 'Grape',

'grape ki fasal': 'Grape',
'grape ki kheti': 'Grape',
'grape ka paudha': 'Grape',
'grape ki bel': 'Grape',
  // =========================================================
  // Other Supported Crops (Non-YOLO)
  // =========================================================

  'rice': 'rice',
  'धान': 'rice',
  'चावल': 'rice',

 
  'onion': 'onion',
  'प्याज': 'onion',

  'mustard': 'mustard',
  'सरसों': 'mustard',
  'राई': 'mustard',
  'तोरिया': 'mustard',

  'cotton': 'cotton',
  'कपास': 'cotton',
  'नरमो': 'cotton',

  'soybean': 'soybean',
  'सोयाबीन': 'soybean',

  'groundnut': 'groundnut',
  'peanut': 'groundnut',
  'मूंगफली': 'groundnut',
  'मूंगफल': 'groundnut',

  'sorghum': 'sorghum',
  'ज्वार': 'sorghum',
  'जुवार': 'sorghum',
  'जुआर': 'sorghum',

  'chickpea': 'chickpea',
  'चना': 'chickpea',
  'चणा': 'chickpea',
  'चणो': 'chickpea',

  'pea': 'pea',
  'मटर': 'pea',

  'brinjal': 'brinjal',
  'eggplant': 'brinjal',
  'बैंगन': 'brinjal',

  'chilli': 'chilli',
  'pepper': 'chilli',
  'मिर्च': 'chilli',
  'मिरची': 'chilli',
  'मिरच': 'chilli',

  'sugarcane': 'sugarcane',
  'गन्ना': 'sugarcane',

  'ginger': 'ginger',
  'अदरक': 'ginger',

  'turmeric': 'turmeric',
  'हल्दी': 'turmeric',

  'garlic': 'garlic',
  'लहसुन': 'garlic',
  'लसण': 'garlic',

  'spinach': 'spinach',
  'पालक': 'spinach',

  'cauliflower': 'cauliflower',
  'गोभी': 'cauliflower',

  'cabbage': 'cabbage',
  'पत्तागोभी': 'cabbage',

  'cucumber': 'cucumber',
  'ककड़ी': 'cucumber',

  'bottle gourd': 'bottle gourd',
  'लौकी': 'bottle gourd',

  'bitter gourd': 'bitter gourd',
  'करेला': 'bitter gourd',

  'okra': 'okra',
  'भिंडी': 'okra',



  'mango': 'mango',
  'आम': 'mango',

  'banana': 'banana',
  'केला': 'banana',
  'केलो': 'banana',

  'papaya': 'papaya',
  'पपीता': 'papaya',

  'moth bean': 'moth bean',
  'मोठ': 'moth bean',

  'cluster bean': 'cluster bean',
  'ग्वार': 'cluster bean',

  'sesame': 'sesame',
  'तिल': 'sesame',

  'cumin': 'cumin',
  'जीरा': 'cumin',
  'जीरो': 'cumin',

  'coriander': 'coriander',
  'धनिया': 'coriander',
  'धाणो': 'coriander',

  'fenugreek': 'fenugreek',
  'मेथी': 'fenugreek',
  'मेथो': 'fenugreek',

  'carom': 'carom',
  'अजवाइन': 'carom',

  'psyllium': 'psyllium',
  'इसबगोल': 'psyllium',

  'lentil': 'lentil',
  'मसूर': 'lentil',

  'pigeon pea': 'pigeon pea',
  'अरहर': 'pigeon pea',
  'तुअर': 'pigeon pea',

  'sunflower': 'sunflower',
  'सूरजमुखी': 'sunflower',

  'castor': 'castor',
  'अरंडी': 'castor',

  'jute': 'jute',
  'जूट': 'jute',

  'flax': 'flax',

  'barley': 'barley',
  'जौ': 'barley',

  'oat': 'oat',
  'जई': 'oat'
};
/**
 * Convert any typed/spoken crop name (in any supported language/dialect)
 * to its English equivalent for the backend.
 */
export function toEnglishCropName(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  // Exact match first
  if (CROP_TRANSLATIONS[trimmed]) return CROP_TRANSLATIONS[trimmed];
  if (CROP_TRANSLATIONS[lower]) return CROP_TRANSLATIONS[lower];
  // Substring match
  for (const [key, val] of Object.entries(CROP_TRANSLATIONS)) {
    if (lower.includes(key.toLowerCase())) return val;
  }
  return trimmed;
}

interface Props {
  value: string;
  onChange: (displayValue: string, englishValue: string) => void;
  selectedLangCode: string;
  onLangChange: (code: string) => void;
}

export default function CropCard({ value, onChange, selectedLangCode, onLangChange }: Props) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim]     = useState('');
  const [error, setError]         = useState('');
  const [langOpen, setLangOpen]   = useState(false);
  const recognitionRef = useRef<any>(null);
  const langRef        = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
    setInterim('');
  }, []);

  const startListening = useCallback(() => {
    const win = window as any;
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) { setError('Voice not supported. Please use Chrome or Edge.'); return; }

    setError('');
    setInterim('');
    const rec = new SR();
    recognitionRef.current = rec;
    // Use getVoiceBcp47 so all dialects resolve correctly
    rec.lang = getVoiceBcp47(selectedLangCode);
    rec.continuous = false;
    rec.interimResults = true;

    rec.onstart = () => setListening(true);
    rec.onresult = (e: any) => {
      let final = '', inter = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else inter += t;
      }
      setInterim(inter);
      if (final) {
        const display = final.trim();
        const english = toEnglishCropName(display);
        onChange(display, english);
        setInterim('');
      }
    };
    rec.onerror = (e: any) => {
      setError(e.error === 'not-allowed' ? 'Microphone access denied.' : 'Could not hear. Try again.');
      setListening(false);
    };
    rec.onend = () => { setListening(false); setInterim(''); };
    rec.start();
  }, [selectedLangCode, onChange]);

  useEffect(() => () => stopListening(), [stopListening]);

  const selectedLang = DISPLAY_LANGS.find(l => l.code === selectedLangCode) || DISPLAY_LANGS[0];

  return (
    <div className="space-y-3">
      {/* Language Selector */}
      <div ref={langRef} className="relative">
        <button
          type="button"
          onClick={() => setLangOpen(o => !o)}
          aria-haspopup="listbox"
          aria-expanded={langOpen}
          className="w-full flex items-center justify-between gap-3 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 px-4 py-3 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/60">
              <FaGlobe className="text-emerald-600 dark:text-emerald-400" size={13} aria-hidden="true" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Language / भाषा</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {selectedLang.flag} {selectedLang.nativeName} — {selectedLang.name}
                {selectedLang.isDialect && (
                  <span className="ml-1.5 text-[10px] font-normal text-emerald-500 dark:text-emerald-400">
                    ({selectedLang.region})
                  </span>
                )}
              </p>
            </div>
          </div>
          <FaChevronDown size={11} className={`text-emerald-500 transition-transform ${langOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        {langOpen && (
          <div
            role="listbox"
            aria-label="Select language"
            className="absolute z-40 mt-1 w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-slideDown"
          >
            <div className="max-h-64 overflow-y-auto">
              {/* National languages group */}
              <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">National Languages</p>
              {DISPLAY_LANGS.filter(l => !l.isDialect).map(lang => (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={selectedLangCode === lang.code}
                  onClick={() => { onLangChange(lang.code); setLangOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-2 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition ${selectedLangCode === lang.code ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''}`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base">{lang.flag}</span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{lang.nativeName}</span>
                      <span className="block text-xs text-slate-400 dark:text-slate-500">{lang.name}</span>
                    </span>
                  </span>
                  {selectedLangCode === lang.code && <FaCheck className="text-emerald-500" size={11} aria-hidden="true" />}
                </button>
              ))}

              {/* Rajasthan dialects group */}
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-orange-500 uppercase tracking-widest border-t border-gray-100 dark:border-slate-700 mt-1">
                🏜️ Rajasthan Dialects
              </p>
              {DISPLAY_LANGS.filter(l => l.isDialect).map(lang => (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={selectedLangCode === lang.code}
                  onClick={() => { onLangChange(lang.code); setLangOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-2 text-left hover:bg-orange-50 dark:hover:bg-orange-950/20 transition ${selectedLangCode === lang.code ? 'bg-orange-50 dark:bg-orange-950/20' : ''}`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base">{lang.flag}</span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{lang.nativeName}</span>
                      <span className="block text-xs text-slate-400 dark:text-slate-500">{lang.name}</span>
                      {lang.region && (
                        <span className="block text-[10px] text-orange-500 dark:text-orange-400">{lang.region}</span>
                      )}
                    </span>
                  </span>
                  {selectedLangCode === lang.code && <FaCheck className="text-orange-500" size={11} aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Crop Name Input + Voice */}
      <div>
        <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">
          🌾 Crop Name <span className="text-red-500">*</span>
          <span className="ml-1 font-normal text-slate-400 dark:text-slate-500 text-xs">(Required)</span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={value}
              onChange={e => onChange(e.target.value, toEnglishCropName(e.target.value))}
              placeholder="Type or speak crop name..."
              aria-label="Crop name"
              className="w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-rose-400 dark:focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-900/30 transition-all"
            />
            {value && (
              <button
                type="button"
                onClick={() => onChange('', '')}
                aria-label="Clear crop name"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <FaTimes size={12} aria-hidden="true" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            aria-label={listening ? 'Stop listening' : `Speak crop name in ${selectedLang.nativeName}`}
            aria-pressed={listening}
            title={listening ? 'Stop listening' : 'Speak crop name'}
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
              listening
                ? 'border-red-300 bg-red-500 text-white animate-pulse shadow-lg shadow-red-200 dark:shadow-red-900/40'
                : 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:border-rose-400'
            }`}
          >
            {listening ? <FaStop size={14} aria-hidden="true" /> : <FaMicrophone size={16} aria-hidden="true" />}
          </button>
        </div>

        {interim && (
          <p className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-300 animate-pulse" aria-live="polite">
            🎤 {interim}
          </p>
        )}
        {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400" role="alert">{error}</p>}
        {listening && (
          <p className="mt-2 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-medium" aria-live="polite">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-ping" aria-hidden="true" />
            Listening in {selectedLang.nativeName}
            {selectedLang.isDialect && ` (${selectedLang.region})`}...
          </p>
        )}
        {value && !listening && (
          <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Sending to AI as: <span className="font-bold">{toEnglishCropName(value)}</span>
          </p>
        )}
      </div>
    </div>
  );
}
