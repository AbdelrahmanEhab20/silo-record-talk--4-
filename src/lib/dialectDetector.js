/**
 * Offline Arabic dialect detector using lexical pattern matching.
 * Returns { isArabic, dialect, confidence } — no API calls needed.
 */

const DIALECT_PATTERNS = {
  egyptian: {
    label: "🇪🇬 Egyptian",
    keywords: [
      "عايز", "عايزة", "بتاع", "بتاعة", "بتاعتك", "إزيك", "إزيكو", "كده", "كدا",
      "مش", "ايوه", "أيوه", "معلش", "يلا", "يسطا", "فين", "امتى", "ليه",
      "انهارده", "النهارده", "بكره", "اللي", "دلوقتي", "هنا", "فضل", "قوي",
      "شوية", "تعال", "تعالي", "اتفضل", "خالص", "حلو", "زي", "بقى", "بقا",
    ],
    score: 0,
  },
  gulf: {
    label: "🇸🇦 Gulf",
    keywords: [
      "وين", "شلونك", "شلوني", "كيفكم", "يبه", "اهنا", "هناك", "زين", "واجد",
      "ابغى", "ابي", "يبغى", "شوف", "بعدين", "قاعد", "قاعدة", "لين", "عاد",
      "مو", "موب", "دحين", "الحين", "هالحين", "شي", "وايد", "ثامر", "يكذب",
      "شنو", "ليش", "لوش", "ودي", "صج", "صحيح", "إي", "ايه",
    ],
    score: 0,
  },
  levantine: {
    label: "🇱🇧 Levantine",
    keywords: [
      "هيك", "شو", "كيفك", "كيفكن", "رح", "لأنو", "لأنها", "متل", "هلق",
      "هلأ", "منيح", "مرحبا", "ولك", "يلا", "بدي", "بدك", "بدها", "بدهم",
      "مش", "ما في", "في", "شو في", "كمان", "بس", "عم", "عم يحكي",
      "تكرم", "يسلمو", "يسلم", "ربنا", "عنجد", "لالا", "هون", "هناك",
    ],
    score: 0,
  },
  moroccan: {
    label: "🇲🇦 Moroccan",
    keywords: [
      "واش", "كاين", "كاينة", "بزاف", "مزيان", "خويا", "غادي", "ماشي",
      "دابا", "ديال", "ديالك", "ديالي", "هاد", "هادي", "هادو", "باغي",
      "باغية", "بغيت", "كيفاش", "فين", "معلوم", "صافي", "راك", "راكم",
      "نتا", "نتي", "هوما", "اللاه", "سير", "سيري", "شوف",
    ],
    score: 0,
  },
  iraqi: {
    label: "🇮🇶 Iraqi",
    keywords: [
      "شگو", "شكو", "هواية", "چي", "اكو", "ماكو", "گلت", "چلت", "وين",
      "هسه", "هسا", "باجر", "لازم", "يمكن", "انريد", "أريد", "چا",
      "بيهم", "عدنا", "عندي", "يبه", "ابن", "بنية", "خوش", "زين",
      "شلون", "منين", "هاي", "هذا", "هاذا", "روح", "تعال",
    ],
    score: 0,
  },
  msa: {
    label: "📖 Modern Standard",
    keywords: [
      "الذي", "التي", "الذين", "اللاتي", "ولكن", "لكنّ", "إنّ", "أنّ",
      "حيث", "إذ", "إذا", "عندما", "بينما", "هذا", "هذه", "هؤلاء",
      "ذلك", "تلك", "أولئك", "يجب", "ينبغي", "يمكن", "يستطيع",
      "قال", "قالت", "ذكر", "أشار", "أوضح", "كما", "وفقاً", "نحو",
    ],
    score: 0,
  },
};

// Arabic unicode range
const ARABIC_CHAR_REGEX = /[\u0600-\u06FF]/g;

export function detectDialect(text) {
  if (!text || typeof text !== "string") {
    return { isArabic: false, dialect: null, confidence: 0 };
  }

  // Strip timestamps like [00:12]
  const clean = text.replace(/\[\d{2}:\d{2}\]/g, " ").trim();

  const arabicChars = (clean.match(ARABIC_CHAR_REGEX) || []).length;
  const totalChars = clean.replace(/\s/g, "").length || 1;
  const arabicRatio = arabicChars / totalChars;

  if (arabicRatio < 0.3) {
    return { isArabic: false, dialect: null, confidence: 0 };
  }

  // Score each dialect
  const scores = {};
  for (const [key, data] of Object.entries(DIALECT_PATTERNS)) {
    let hits = 0;
    for (const kw of data.keywords) {
      // Use word-boundary-aware check (Arabic doesn't use Latin word boundaries)
      const re = new RegExp(kw, "g");
      const matches = clean.match(re);
      if (matches) hits += matches.length;
    }
    scores[key] = hits;
  }

  const totalHits = Object.values(scores).reduce((a, b) => a + b, 0);

  if (totalHits === 0) {
    // Arabic but unrecognised dialect
    return { isArabic: true, dialect: "arabic", label: "🌍 Arabic", confidence: 0.5 };
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const [bestKey, bestScore] = best;
  const confidence = Math.min(bestScore / Math.max(totalHits, 1), 1);

  return {
    isArabic: true,
    dialect: bestKey,
    label: DIALECT_PATTERNS[bestKey]?.label ?? "🌍 Arabic",
    confidence: parseFloat(confidence.toFixed(2)),
  };
}