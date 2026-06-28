const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/12UweMKa2sIUDcSV0qrYHGTAVZcDvnrnp54FdQs0DmGs/edit';

const USE_GEMINI = true;
const GEMINI_API_KEY_PROPERTY = 'GEMINI_API_KEY';
const GEMINI_MODEL = 'gemini-3.5-flash';
const MAX_GEMINI_TERMS_PER_RUN = 25;

const MIN_WASTE_COST_EUR = 0.75;

const BRAND_CAMPAIGN = 'Campaign #3 Search Riga - Brand';
const CORE_CAMPAIGN = 'Campaign #4 Search Riga - Core Languages';
const NORDIC_CAMPAIGN = 'Campaign #5 Search Riga - Nordic Test';

const BRAND_AD_GROUP = 'Группа объявлений\u00A01';

const TARGETS = [
  {
    campaign: BRAND_CAMPAIGN,
    role: 'Brand',
    language: 'all',
    adGroup: BRAND_AD_GROUP,
    key: 'brand_search_riga',
    adGroupRole: 'Brand',
    dailyBudget: 0.50,
    bidStrategy: 'Target impression share',
    campaignMaxCpc: 0.05,
    adGroupMaxCpc: 0.01
  },
  {
    campaign: CORE_CAMPAIGN,
    role: 'Core',
    language: 'ru',
    adGroup: 'RU / Ресторан Рига',
    key: 'ru_restoran_riga',
    adGroupRole: 'Russian core',
    dailyBudget: 6.00,
    bidStrategy: 'Maximize clicks',
    campaignMaxCpc: 0.25,
    adGroupMaxCpc: 0.01
  },
  {
    campaign: CORE_CAMPAIGN,
    role: 'Core',
    language: 'lv',
    adGroup: 'LV / Restorans Riga',
    key: 'lv_restorans_riga',
    adGroupRole: 'Latvian core',
    dailyBudget: 6.00,
    bidStrategy: 'Maximize clicks',
    campaignMaxCpc: 0.25,
    adGroupMaxCpc: 0.01
  },
  {
    campaign: CORE_CAMPAIGN,
    role: 'Core',
    language: 'fr',
    adGroup: 'FR / Restaurant Riga',
    key: 'fr_restaurant_riga',
    adGroupRole: 'French core',
    dailyBudget: 6.00,
    bidStrategy: 'Maximize clicks',
    campaignMaxCpc: 0.25,
    adGroupMaxCpc: 0.01
  },
  {
    campaign: CORE_CAMPAIGN,
    role: 'Core',
    language: 'de',
    adGroup: 'DE / Restaurant Riga',
    key: 'de_restaurant_riga',
    adGroupRole: 'German core',
    dailyBudget: 6.00,
    bidStrategy: 'Maximize clicks',
    campaignMaxCpc: 0.25,
    adGroupMaxCpc: 0.01
  },
  {
    campaign: CORE_CAMPAIGN,
    role: 'Core',
    language: 'en',
    adGroup: 'EN / Restaurant Riga',
    key: 'en_restaurant_riga',
    adGroupRole: 'English core',
    dailyBudget: 6.00,
    bidStrategy: 'Maximize clicks',
    campaignMaxCpc: 0.25,
    adGroupMaxCpc: 0.01
  },
  {
    campaign: CORE_CAMPAIGN,
    role: 'Core',
    language: 'ee',
    adGroup: 'EE / Restoran Riga',
    key: 'ee_restoran_riga',
    adGroupRole: 'Estonian core',
    dailyBudget: 6.00,
    bidStrategy: 'Maximize clicks',
    campaignMaxCpc: 0.25,
    adGroupMaxCpc: 0.01
  },
  {
    campaign: CORE_CAMPAIGN,
    role: 'Core',
    language: 'lt',
    adGroup: 'LT / Restoranas Riga',
    key: 'lt_restoranas_riga',
    adGroupRole: 'Lithuanian core',
    dailyBudget: 6.00,
    bidStrategy: 'Maximize clicks',
    campaignMaxCpc: 0.25,
    adGroupMaxCpc: 0.01
  },
  {
    campaign: NORDIC_CAMPAIGN,
    role: 'Nordic',
    language: 'sv',
    adGroup: 'SV / Restaurang Riga',
    key: 'sv_restaurang_riga',
    adGroupRole: 'Swedish Nordic test',
    dailyBudget: 1.50,
    bidStrategy: 'Maximize clicks',
    campaignMaxCpc: 0.00,
    adGroupMaxCpc: 0.25
  },
  {
    campaign: NORDIC_CAMPAIGN,
    role: 'Nordic',
    language: 'no',
    adGroup: 'NO / Restaurant Riga',
    key: 'no_restaurant_riga',
    adGroupRole: 'Norwegian Nordic test',
    dailyBudget: 1.50,
    bidStrategy: 'Maximize clicks',
    campaignMaxCpc: 0.00,
    adGroupMaxCpc: 0.25
  },
  {
    campaign: NORDIC_CAMPAIGN,
    role: 'Nordic',
    language: 'da',
    adGroup: 'DA / Restaurant Riga',
    key: 'da_restaurant_riga',
    adGroupRole: 'Danish Nordic test',
    dailyBudget: 1.50,
    bidStrategy: 'Maximize clicks',
    campaignMaxCpc: 0.00,
    adGroupMaxCpc: 0.25
  },
  {
    campaign: NORDIC_CAMPAIGN,
    role: 'Nordic',
    language: 'fi',
    adGroup: 'FI / Ravintola Riika',
    key: 'fi_ravintola_riika',
    adGroupRole: 'Finnish Nordic test',
    dailyBudget: 1.50,
    bidStrategy: 'Maximize clicks',
    campaignMaxCpc: 0.00,
    adGroupMaxCpc: 0.25
  }
];

const CURRENT_CAMPAIGNS = [
  BRAND_CAMPAIGN,
  CORE_CAMPAIGN,
  NORDIC_CAMPAIGN
];

const CAMPAIGN_CONFIG_HEADERS = [
  'Campaign', 'Campaign Role', 'Daily Budget EUR', 'Bid Strategy',
  'Campaign Max CPC Limit EUR', 'Language', 'Ad Group', 'Ad Group Key',
  'Ad Group Max CPC EUR', 'Status', 'Notes'
];

const DAILY_SUMMARY_HEADERS = [
  'Date', 'Campaign', 'Impressions', 'Clicks', 'Cost', 'Conversions',
  'CTR', 'Avg CPC', 'Cost / Conv'
];

const SEARCH_TERMS_HEADERS = [
  'Date', 'Campaign', 'Ad Group', 'Search Term',
  'Matched Keyword', 'Keyword Match Type', 'Search Term Match Type',
  'Search Term Status', 'Impressions', 'Clicks', 'Cost', 'Conversions',
  'CTR', 'Avg CPC', 'Notes', 'Gemini Action', 'Gemini Confidence',
  'Gemini Reason'
];

const NEGATIVE_HEADERS = [
  'Date', 'Search Term', 'Reason', 'Campaign', 'Ad Group', 'Scope',
  'Apply As', 'Clicks', 'Cost', 'Conversions', 'Decision',
  'Applied Date', 'Result'
];

const KEYWORD_HEADERS = [
  'Date', 'Search Term', 'Reason', 'Source Campaign', 'Source Ad Group',
  'Campaign', 'Ad Group', 'Match Type', 'Apply As', 'Clicks', 'Cost',
  'Conversions', 'Decision', 'Applied Date', 'Result'
];

const CHANGE_LOG_HEADERS = [
  'Date', 'Proposed Change', 'Reason', 'Status', 'Approved By', 'Applied Date'
];

const BRAND_TOKENS = [
  'vivien',
  'vivian',
  'vivienn',
  'вивьен',
  'вивиен',
  'вивьенн'
];

const AMBIGUOUS_BRAND_TOKENS = [
  "vivienne's",
  'viviennes',
  'vivienne'
];

const RESTAURANT_INTENT_TOKENS = [
  'restaurant', 'restaurants', 'restorans', 'restorani', 'restorāns', 'restorāni',
  'restoran', 'restoranas', 'restaurang', 'ravintola',
  'brasserie', 'bistro', 'cafe', 'café',
  'ресторан', 'рестораны', 'брассери', 'бистро', 'кафе'
];

const FASHION_INTENT_TOKENS = [
  'westwood', 'shop', 'store', 'clothing', 'dress', 'dresses',
  'fashion', 'boutique', 'veikals', 'apģērbs', 'apgerbs',
  'одежда', 'платье', 'платья', 'магазин', 'бутик'
];

const OBVIOUS_NEGATIVE_PATTERNS = [
  { pattern: 'job', reason: 'Jobs / employment traffic', mode: 'token' },
  { pattern: 'jobs', reason: 'Jobs / employment traffic', mode: 'token' },
  { pattern: 'vacancy', reason: 'Jobs / employment traffic', mode: 'token' },
  { pattern: 'vakance', reason: 'Jobs / employment traffic', mode: 'token' },
  { pattern: 'vakances', reason: 'Jobs / employment traffic', mode: 'token' },
  { pattern: 'darbs', reason: 'Jobs / employment traffic', mode: 'token' },
  { pattern: 'alga', reason: 'Jobs / employment traffic', mode: 'token' },
  { pattern: 'salary', reason: 'Jobs / employment traffic', mode: 'token' },
  { pattern: 'cv', reason: 'Jobs / employment traffic', mode: 'token' },
  { pattern: 'вакансия', reason: 'Jobs / employment traffic' },
  { pattern: 'вакансии', reason: 'Jobs / employment traffic' },
  { pattern: 'работа', reason: 'Jobs / employment traffic' },

  { pattern: 'recipe', reason: 'Recipes / DIY traffic', mode: 'token' },
  { pattern: 'recipes', reason: 'Recipes / DIY traffic', mode: 'token' },
  { pattern: 'recepte', reason: 'Recipes / DIY traffic', mode: 'token' },
  { pattern: 'receptes', reason: 'Recipes / DIY traffic', mode: 'token' },
  { pattern: 'рецепт', reason: 'Recipes / DIY traffic' },
  { pattern: 'рецепты', reason: 'Recipes / DIY traffic' },
  { pattern: 'how to open', reason: 'Restaurant business / learning traffic' },
  { pattern: 'как открыть', reason: 'Restaurant business / learning traffic' },
  { pattern: 'restaurant equipment', reason: 'Restaurant equipment / supplier traffic' },
  { pattern: 'equipment', reason: 'Restaurant equipment / supplier traffic', mode: 'token' },
  { pattern: 'supplier', reason: 'Supplier traffic', mode: 'token' },
  { pattern: 'franchise', reason: 'Restaurant business / franchise traffic', mode: 'token' },

  { pattern: 'breakfast', reason: 'Breakfast traffic - not current campaign goal', mode: 'token' },
  { pattern: 'brunch', reason: 'Brunch traffic - not current campaign goal', mode: 'token' },
  { pattern: 'business lunch', reason: 'Lunch traffic - not current campaign goal' },
  { pattern: 'lunch', reason: 'Lunch traffic - not current campaign goal', mode: 'token' },
  { pattern: 'завтрак', reason: 'Breakfast traffic - not current campaign goal' },
  { pattern: 'бранч', reason: 'Brunch traffic - not current campaign goal' },
  { pattern: 'обед', reason: 'Lunch traffic - not current campaign goal' },

  { pattern: 'buffet', reason: 'Buffet traffic - irrelevant format', mode: 'token' },
  { pattern: 'шведский стол', reason: 'Buffet traffic - irrelevant format' },
  { pattern: 'fast food', reason: 'Fast food traffic - irrelevant format' },
  { pattern: 'delivery only', reason: 'Delivery-only traffic' },
  { pattern: 'food delivery', reason: 'Delivery marketplace traffic' },
  { pattern: 'delivery', reason: 'Delivery marketplace traffic', mode: 'token' },
  { pattern: 'takeaway', reason: 'Takeaway traffic - not current campaign goal', mode: 'token' },
  { pattern: 'на вынос', reason: 'Takeaway traffic - not current campaign goal' },
  { pattern: 'доставка', reason: 'Delivery marketplace traffic' },
  { pattern: 'līdzņemšanai', reason: 'Takeaway traffic - not current campaign goal' },
  { pattern: 'bolt food', reason: 'Delivery marketplace traffic' },
  { pattern: 'wolt', reason: 'Delivery marketplace traffic', mode: 'token' },

  { pattern: 'restaurants near me', reason: 'Too generic near-me query' },
  { pattern: 'restaurant near me', reason: 'Too generic near-me query' },
  { pattern: 'cafe near me', reason: 'Too generic near-me query' },
  { pattern: 'breakfast near me', reason: 'Breakfast near-me traffic' },
  { pattern: 'brunch near me', reason: 'Brunch near-me traffic' },
  { pattern: 'lunch near me', reason: 'Lunch near-me traffic' },
  { pattern: 'top 10', reason: 'Listicle / low booking intent' },
  { pattern: 'reviews', reason: 'Review research traffic', mode: 'token' },
  { pattern: 'atsauksmes', reason: 'Review research traffic', mode: 'token' },
  { pattern: 'отзывы', reason: 'Review research traffic' },
  { pattern: 'menu pdf', reason: 'PDF menu traffic' },
  { pattern: 'меню pdf', reason: 'PDF menu traffic' },
  { pattern: 'menu template', reason: 'Template / DIY traffic' },

  { pattern: 'jurmala', reason: 'Wrong location / district' },
  { pattern: 'jūrmala', reason: 'Wrong location / district' },
  { pattern: 'purvciems', reason: 'Wrong location / district' },
  { pattern: 'пурвциемс', reason: 'Wrong location / district' },
  { pattern: 'mežaparks', reason: 'Wrong location / district' },
  { pattern: 'mezaparks', reason: 'Wrong location / district' },
  { pattern: 'vecāķi', reason: 'Wrong location / district' },
  { pattern: 'vecaki', reason: 'Wrong location / district' },
  { pattern: 'andrejsala', reason: 'Wrong location / district' },

  { pattern: 'georgian', reason: 'Wrong cuisine' },
  { pattern: 'gruzīnu', reason: 'Wrong cuisine' },
  { pattern: 'грузин', reason: 'Wrong cuisine' },
  { pattern: 'italian', reason: 'Wrong cuisine' },
  { pattern: 'itāļu', reason: 'Wrong cuisine' },
  { pattern: 'итальян', reason: 'Wrong cuisine' },
  { pattern: 'ukrainian', reason: 'Wrong cuisine' },
  { pattern: 'украин', reason: 'Wrong cuisine' },
  { pattern: 'jewish', reason: 'Wrong cuisine' },
  { pattern: 'armenian', reason: 'Wrong cuisine' },
  { pattern: 'армян', reason: 'Wrong cuisine' },
  { pattern: 'sushi', reason: 'Wrong cuisine' },
  { pattern: 'suši', reason: 'Wrong cuisine' },
  { pattern: 'суши', reason: 'Wrong cuisine' },
  { pattern: 'dumplings', reason: 'Wrong cuisine' },
  { pattern: 'kebabs', reason: 'Wrong cuisine' },
  { pattern: 'shashlik', reason: 'Wrong cuisine' },
  { pattern: 'шашлык', reason: 'Wrong cuisine' },
  { pattern: 'рыбный', reason: 'Too broad / wrong cuisine intent' },

  { pattern: 'hotel', reason: 'Hotel traffic', mode: 'token' },

  { pattern: 'barents', reason: 'Competitor / other brand' },
  { pattern: 'riviera', reason: 'Competitor / other brand' },
  { pattern: 'kolonade', reason: 'Competitor / other brand' },
  { pattern: 'limone', reason: 'Competitor / other brand' },
  { pattern: 'ferma', reason: 'Competitor / other brand' },
  { pattern: 'entresol', reason: 'Competitor / other brand' },
  { pattern: 'italissimo', reason: 'Competitor / other brand' },
  { pattern: 'gutenbergs', reason: 'Competitor / other brand' },
  { pattern: 'garage', reason: 'Competitor / other brand' },
  { pattern: 'noble', reason: 'Competitor / other brand' },
  { pattern: 'rione', reason: 'Competitor / other brand' },
  { pattern: 'koya', reason: 'Competitor / other brand' },
  { pattern: 'rossini', reason: 'Competitor / other brand' },
  { pattern: 'ala pagrabs', reason: 'Competitor / other brand' },
  { pattern: 'stargorod', reason: 'Competitor / other brand' },
  { pattern: 'neptun', reason: 'Competitor / other brand' },
  { pattern: 'moltto', reason: 'Competitor / other brand' },
  { pattern: 'ezītis', reason: 'Competitor / other brand' },
  { pattern: 'ezitis', reason: 'Competitor / other brand' },
  { pattern: 'blue cow', reason: 'Competitor / other brand' },
  { pattern: 'potami', reason: 'Competitor / other brand' },
  { pattern: 'truffle pig', reason: 'Competitor / other brand' },
  { pattern: 'zanazan', reason: 'Competitor / other brand' },
  { pattern: 'lighthouse', reason: 'Competitor / other brand' },
  { pattern: "chef's corner", reason: 'Competitor / other brand' },
  { pattern: 'дядя ваня', reason: 'Competitor / other brand' },

  { pattern: 'westwood', reason: 'Fashion / clothing traffic', mode: 'token' },
  { pattern: 'shop', reason: 'Fashion / shopping traffic', mode: 'token' },
  { pattern: 'store', reason: 'Fashion / shopping traffic', mode: 'token' },
  { pattern: 'clothing', reason: 'Fashion / clothing traffic', mode: 'token' },
  { pattern: 'dress', reason: 'Fashion / clothing traffic', mode: 'token' },
  { pattern: 'dresses', reason: 'Fashion / clothing traffic', mode: 'token' },
  { pattern: 'fashion', reason: 'Fashion / clothing traffic', mode: 'token' },
  { pattern: 'boutique', reason: 'Fashion / boutique traffic', mode: 'token' },
  { pattern: 'veikals', reason: 'Fashion / shopping traffic', mode: 'token' },
  { pattern: 'apģērbs', reason: 'Fashion / clothing traffic', mode: 'token' },
  { pattern: 'apgerbs', reason: 'Fashion / clothing traffic', mode: 'token' },
  { pattern: 'одежда', reason: 'Fashion / clothing traffic', mode: 'token' },
  { pattern: 'платье', reason: 'Fashion / clothing traffic', mode: 'token' },
  { pattern: 'платья', reason: 'Fashion / clothing traffic', mode: 'token' },
  { pattern: 'магазин', reason: 'Fashion / shopping traffic', mode: 'token' },
  { pattern: 'бутик', reason: 'Fashion / boutique traffic', mode: 'token' }
];

function main() {
  const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);

  const sheets = {
    config: ensureCampaignConfigSheet(ss),
    dailySummary: ensureSheetColumns(ss, 'Daily Summary', DAILY_SUMMARY_HEADERS),
    searchTerms: ensureSheetColumns(ss, 'Search Terms', SEARCH_TERMS_HEADERS),
    negatives: ensureSheetColumns(ss, 'Negative Candidates', NEGATIVE_HEADERS),
    keywords: ensureSheetColumns(ss, 'Keyword Ideas', KEYWORD_HEADERS),
    changeLog: ensureSheetColumns(ss, 'Change Log', CHANGE_LOG_HEADERS)
  };

  exportCampaignSummary(sheets.dailySummary);
  exportSearchTerms(sheets);
}

function exportCampaignSummary(sheet) {
  const date = getYesterdayDateString();
  const existingKeys = buildExistingKeys(sheet, ['Date', 'Campaign']);

  const query = `
    SELECT
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE segments.date DURING YESTERDAY
      AND campaign.status != 'REMOVED'
  `;

  const report = AdsApp.report(query);
  const rows = report.rows();

  while (rows.hasNext()) {
    const row = rows.next();

    const campaign = String(row['campaign.name'] || '').trim();
    if (!isCurrentCampaign(campaign)) continue;

    const impressions = safeNumber(row['metrics.impressions']);
    const clicks = safeNumber(row['metrics.clicks']);
    const cost = microsToCurrency(row['metrics.cost_micros']);
    const conversions = safeNumber(row['metrics.conversions']);
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const avgCpc = clicks > 0 ? cost / clicks : 0;
    const costPerConv = conversions > 0 ? cost / conversions : '';

    appendUniqueObjectRow(sheet, {
      'Date': date,
      'Campaign': campaign,
      'Impressions': impressions,
      'Clicks': clicks,
      'Cost': round2(cost),
      'Conversions': conversions,
      'CTR': round4(ctr),
      'Avg CPC': round2(avgCpc),
      'Cost / Conv': costPerConv === '' ? '' : round2(costPerConv)
    }, ['Date', 'Campaign'], existingKeys);
  }
}

function exportSearchTerms(sheets) {
  const date = getYesterdayDateString();

  const searchKeys = buildExistingKeys(
    sheets.searchTerms,
    ['Date', 'Campaign', 'Ad Group', 'Search Term', 'Matched Keyword']
  );

  const negativeKeys = buildExistingKeys(
    sheets.negatives,
    ['Date', 'Search Term', 'Campaign', 'Ad Group', 'Scope', 'Apply As']
  );

  const keywordKeys = buildExistingKeys(
    sheets.keywords,
    ['Date', 'Search Term', 'Campaign', 'Source Campaign', 'Source Ad Group', 'Ad Group', 'Apply As']
  );

  let geminiCalls = 0;

  const query = `
    SELECT
      campaign.name,
      ad_group.name,
      search_term_view.search_term,
      search_term_view.status,
      segments.keyword.info.text,
      segments.keyword.info.match_type,
      segments.search_term_match_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM search_term_view
    WHERE segments.date DURING YESTERDAY
      AND campaign.status != 'REMOVED'
      AND ad_group.status != 'REMOVED'
      AND metrics.clicks > 0
  `;

  const report = AdsApp.report(query);
  const rows = report.rows();

  while (rows.hasNext()) {
    const row = rows.next();

    const campaign = String(row['campaign.name'] || '').trim();
    const adGroup = String(row['ad_group.name'] || '').trim();
    if (!isCurrentCampaign(campaign)) continue;

    const term = String(row['search_term_view.search_term'] || '').trim().toLowerCase();
    const matchedKeyword = String(row['segments.keyword.info.text'] || '').trim();
    const keywordMatchType = String(row['segments.keyword.info.match_type'] || '').trim();
    const searchTermMatchType = String(row['segments.search_term_match_type'] || '').trim();
    const searchTermStatus = String(row['search_term_view.status'] || '').trim();

    const impressions = safeNumber(row['metrics.impressions']);
    const clicks = safeNumber(row['metrics.clicks']);
    const cost = microsToCurrency(row['metrics.cost_micros']);
    const conversions = safeNumber(row['metrics.conversions']);
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const avgCpc = clicks > 0 ? cost / clicks : 0;

    const ctx = {
      date: date,
      campaign: campaign,
      adGroup: adGroup,
      term: term,
      matchedKeyword: matchedKeyword,
      keywordMatchType: keywordMatchType,
      searchTermMatchType: searchTermMatchType,
      searchTermStatus: searchTermStatus,
      impressions: impressions,
      clicks: clicks,
      cost: cost,
      conversions: conversions
    };

    const notes = [];
    let ruleMadeProposal = false;
    let geminiAction = '';
    let geminiConfidence = '';
    let geminiReason = '';

    if (isBrandTerm(term)) {
      const madeBrandProposal = proposeBrandRouting(ctx, sheets, keywordKeys, negativeKeys, notes);
      ruleMadeProposal = ruleMadeProposal || madeBrandProposal;
    }

    if (!isBrandTerm(term)) {
      const negative = getNegativeCandidate(term, cost, conversions);
      if (negative) {
        appendNegativeCandidate(sheets.negatives, negativeKeys, {
          date: date,
          searchTerm: term,
          reason: negative.reason,
          campaign: campaign,
          adGroup: '',
          scope: 'Campaign',
          applyAs: negative.applyAs,
          clicks: clicks,
          cost: cost,
          conversions: conversions
        });

        notes.push('Negative candidate');
        ruleMadeProposal = true;
      } else {
        const keywordIdea = getKeywordIdea(ctx);
        if (keywordIdea) {
          appendKeywordIdea(sheets.keywords, keywordKeys, {
            date: date,
            searchTerm: term,
            reason: keywordIdea.reason,
            sourceCampaign: campaign,
            sourceAdGroup: adGroup,
            targetCampaign: keywordIdea.target.campaign,
            targetAdGroup: keywordIdea.target.adGroup,
            matchType: keywordIdea.matchType,
            applyAs: keywordIdea.applyAs,
            clicks: clicks,
            cost: cost,
            conversions: conversions
          });

          notes.push('Keyword idea');
          ruleMadeProposal = true;
        }
      }
    }

    if (
      !ruleMadeProposal &&
      shouldAskGemini(ctx) &&
      geminiCalls < MAX_GEMINI_TERMS_PER_RUN
    ) {
      const suggestion = classifyWithGemini(ctx);
      geminiCalls++;

      if (suggestion) {
        geminiAction = suggestion.action || '';
        geminiConfidence = suggestion.confidence === undefined ? '' : suggestion.confidence;
        geminiReason = suggestion.reason || '';

        const geminiMadeProposal = applyGeminiSuggestion(
          suggestion,
          ctx,
          sheets,
          keywordKeys,
          negativeKeys
        );

        if (geminiMadeProposal) {
          notes.push('Gemini candidate');
        } else if (geminiAction) {
          notes.push('Gemini: ' + geminiAction);
        }
      }
    }

    appendUniqueObjectRow(sheets.searchTerms, {
      'Date': date,
      'Campaign': campaign,
      'Ad Group': adGroup,
      'Search Term': term,
      'Matched Keyword': matchedKeyword,
      'Keyword Match Type': keywordMatchType,
      'Search Term Match Type': searchTermMatchType,
      'Search Term Status': searchTermStatus,
      'Impressions': impressions,
      'Clicks': clicks,
      'Cost': round2(cost),
      'Conversions': conversions,
      'CTR': round4(ctr),
      'Avg CPC': round2(avgCpc),
      'Notes': notes.join('; '),
      'Gemini Action': geminiAction,
      'Gemini Confidence': geminiConfidence,
      'Gemini Reason': limitText(geminiReason, 500)
    }, ['Date', 'Campaign', 'Ad Group', 'Search Term', 'Matched Keyword'], searchKeys);
  }
}

function proposeBrandRouting(ctx, sheets, keywordKeys, negativeKeys, notes) {
  let madeProposal = false;
  const brandToken = getBrandToken(ctx.term);

  if (!isSearchTermAlreadyHandled(ctx.searchTermStatus)) {
    appendKeywordIdea(sheets.keywords, keywordKeys, {
      date: ctx.date,
      searchTerm: ctx.term,
      reason: 'Brand routing: Vivien/Vivienne query should be targeted in Campaign #3 Brand',
      sourceCampaign: ctx.campaign,
      sourceAdGroup: ctx.adGroup,
      targetCampaign: BRAND_CAMPAIGN,
      targetAdGroup: BRAND_AD_GROUP,
      matchType: 'Exact',
      applyAs: '[' + stripMatchSyntax(ctx.term) + ']',
      clicks: ctx.clicks,
      cost: ctx.cost,
      conversions: ctx.conversions
    });

    notes.push('Brand keyword candidate');
    madeProposal = true;
  }

  if (!isBrandTarget(ctx.campaign, ctx.adGroup) && brandToken) {
    appendNegativeCandidate(sheets.negatives, negativeKeys, {
      date: ctx.date,
      searchTerm: ctx.term,
      reason: 'Brand routing: block Vivien/Vivienne query in source non-brand ad group',
      campaign: ctx.campaign,
      adGroup: ctx.adGroup,
      scope: 'Ad Group',
      applyAs: brandToken,
      clicks: ctx.clicks,
      cost: ctx.cost,
      conversions: ctx.conversions
    });

    notes.push('Brand ad-group negative candidate');
    madeProposal = true;
  }

  return madeProposal;
}

function getNegativeCandidate(term, cost, conversions) {
  const normalizedTerm = normalizeText(term);

  for (let i = 0; i < OBVIOUS_NEGATIVE_PATTERNS.length; i++) {
    const item = OBVIOUS_NEGATIVE_PATTERNS[i];
    const normalizedPattern = normalizeText(item.pattern);

    if (negativePatternMatches(normalizedTerm, normalizedPattern, item.mode)) {
      return {
        reason: item.reason + ': ' + item.pattern,
        applyAs: formatNegativeApplyAs(item.pattern)
      };
    }
  }

  if (cost >= MIN_WASTE_COST_EUR && conversions === 0) {
    return {
      reason: 'Spent money without BOOK_APPOINTMENT conversion',
      applyAs: '[' + stripMatchSyntax(term) + ']'
    };
  }

  return null;
}

function negativePatternMatches(normalizedTerm, normalizedPattern, mode) {
  if (mode === 'token') {
    return containsWholeToken(normalizedTerm, normalizedPattern);
  }

  return normalizedTerm.indexOf(normalizedPattern) !== -1;
}

function getKeywordIdea(ctx) {
  if (ctx.conversions > 0) {
    return {
      reason: 'Search term generated BOOK_APPOINTMENT conversion',
      target: suggestTargetForTerm(ctx),
      matchType: 'Phrase',
      applyAs: formatKeywordText(ctx.term, 'Phrase')
    };
  }

  if (ctx.clicks >= 2 && isRelevantRestaurantIntent(ctx.term)) {
    return {
      reason: 'Relevant restaurant / booking intent with several clicks',
      target: suggestTargetForTerm(ctx),
      matchType: 'Phrase',
      applyAs: formatKeywordText(ctx.term, 'Phrase')
    };
  }

  return null;
}

function isRelevantRestaurantIntent(term) {
  const normalizedTerm = normalizeText(term);
  const tokens = [
    'french', 'francu', 'francais', 'franzos', 'fransk', 'ranskalainen',
    'француз', 'brasserie', 'bistro',
    'restaurant riga', 'restaurant in riga', 'restaurants in riga',
    'restorans riga', 'restorani riga', 'restoran riga', 'restoranas riga',
    'restaurang riga', 'ravintola riika', 'ресторан рига',
    'wine', 'vino', 'vina', 'vins', 'вино',
    'terrace', 'terase', 'terrasse', 'teras', 'терас',
    'oyster', 'auster', 'huitr', 'устриц',
    'dinner', 'middag', 'abendessen', 'vakarinas', 'vakarienes', 'illallinen',
    'ужин', 'romantic', 'romantisk', 'romantiskas',
    'booking', 'reserve', 'reservation', 'rezerv', 'book a table',
    'boka bord', 'bestill bord', 'book bord', 'varaa poyta',
    'galdi', 'staliuk'
  ];

  for (let i = 0; i < tokens.length; i++) {
    if (normalizedTerm.indexOf(tokens[i]) !== -1) {
      return true;
    }
  }

  return false;
}

function classifyWithGemini(ctx) {
  if (!hasGeminiApiKey()) return null;

  const prompt = [
    'You review Google Ads search terms for Brasserie Vivien, a French brasserie / restaurant / wine / terrace / booking business in Riga, Latvia.',
    'The account now has three current search campaigns: Campaign #3 Brand, Campaign #4 Core Languages, and Campaign #5 Nordic Test.',
    'Return ONLY valid JSON with this shape:',
    '{"action":"NONE|WATCH|ADD_KEYWORD|ADD_AD_GROUP_NEGATIVE|ADD_CAMPAIGN_NEGATIVE","confidence":0.0,"targetCampaign":"","targetAdGroup":"","matchType":"Exact|Phrase|Broad","applyAs":"","negativeCampaign":"","negativeAdGroup":"","reason":""}',
    '',
    'Allowed campaign/ad group targets:',
    getAllowedTargetsText(),
    '',
    'Rules:',
    '- Vivien, vivian, vivienn and Cyrillic variants are Brasserie Vivien brand intent unless fashion/shopping intent is present.',
    '- Vivienne is ambiguous in Riga because there is also a clothing store named Vivienne.',
    "- Treat vivienne/viviennes/vivienne's as Brasserie Vivien brand intent only when restaurant/cafe/bistro/brasserie intent is present.",
    '- Treat vivienne riga without restaurant/cafe/bistro/brasserie intent as WATCH, not ADD_KEYWORD.',
    '- Brand keyword additions must target Campaign #3 Search Riga - Brand / Группа объявлений 1.',
    '- Non-brand keyword additions should normally stay in the source language ad group.',
    '- Fashion/shopping terms such as westwood, shop, store, clothing, dress, fashion, boutique, veikals, apģērbs, одежда, платье, магазин are negative intent.',
    '- Never propose a campaign-level negative for vivien/vivienne brand tokens themselves.',
    '- Competitors, jobs, recipes, wrong cuisines, wrong districts, delivery-only, and irrelevant formats can be negatives.',
    '- Generic low-signal restaurant terms should usually be WATCH unless spend is clearly wasteful.',
    '- Be conservative. The spreadsheet requires human approval before changes are applied.',
    '',
    'Search term context JSON:',
    JSON.stringify({
      searchTerm: ctx.term,
      campaign: ctx.campaign,
      sourceAdGroup: ctx.adGroup,
      matchedKeyword: ctx.matchedKeyword,
      keywordMatchType: ctx.keywordMatchType,
      searchTermMatchType: ctx.searchTermMatchType,
      searchTermStatus: ctx.searchTermStatus,
      impressions: ctx.impressions,
      clicks: ctx.clicks,
      costEur: round2(ctx.cost),
      conversions: ctx.conversions
    })
  ].join('\n');

  try {
    const response = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/interactions',
      {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-goog-api-key': getGeminiApiKey() },
        payload: JSON.stringify({
          model: GEMINI_MODEL,
          system_instruction: 'You are a careful Google Ads search-term analyst. Return only strict JSON.',
          input: prompt,
          generation_config: {
            temperature: 0.1,
            thinking_level: 'low'
          }
        }),
        muteHttpExceptions: true
      }
    );

    const code = response.getResponseCode();
    const body = response.getContentText();
    Logger.log('Gemini HTTP ' + code + ' for term: ' + ctx.term);

    if (code >= 400) {
      Logger.log(limitText(body, 1000));
      return {
        action: 'ERROR',
        confidence: '',
        reason: 'Gemini HTTP ' + code
      };
    }

    const parsedBody = JSON.parse(body);
    const outputText = getGeminiOutputText(parsedBody);
    const jsonText = extractJsonObject(outputText);
    const suggestion = JSON.parse(jsonText);

    return normalizeGeminiSuggestion(suggestion);
  } catch (e) {
    Logger.log('Gemini error for term "' + ctx.term + '": ' + e.message);
    return {
      action: 'ERROR',
      confidence: '',
      reason: e.message
    };
  }
}

function applyGeminiSuggestion(suggestion, ctx, sheets, keywordKeys, negativeKeys) {
  const action = String(suggestion.action || '').trim().toUpperCase();
  const confidence = safeNumber(suggestion.confidence);
  const reason = 'Gemini: ' + limitText(String(suggestion.reason || '').trim(), 300);

  if (action === 'ADD_KEYWORD') {
    if (confidence < 0.55) return false;

    const target =
      resolveTargetByNames(suggestion.targetCampaign, suggestion.targetAdGroup) ||
      suggestTargetForTerm(ctx);

    const matchType = normalizeMatchType(suggestion.matchType || 'Phrase');
    const applyAs = sanitizeApplyAs(
      suggestion.applyAs || formatKeywordText(ctx.term, matchType)
    );

    appendKeywordIdea(sheets.keywords, keywordKeys, {
      date: ctx.date,
      searchTerm: ctx.term,
      reason: reason,
      sourceCampaign: ctx.campaign,
      sourceAdGroup: ctx.adGroup,
      targetCampaign: target.campaign,
      targetAdGroup: target.adGroup,
      matchType: matchType,
      applyAs: applyAs,
      clicks: ctx.clicks,
      cost: ctx.cost,
      conversions: ctx.conversions
    });

    return true;
  }

  if (action === 'ADD_AD_GROUP_NEGATIVE') {
    if (confidence < 0.65) return false;

    const target =
      resolveTargetByNames(suggestion.negativeCampaign, suggestion.negativeAdGroup) ||
      resolveTargetByNames(ctx.campaign, ctx.adGroup);

    if (!target) return false;

    const applyAs = sanitizeApplyAs(
      suggestion.applyAs || '[' + stripMatchSyntax(ctx.term) + ']'
    );

    appendNegativeCandidate(sheets.negatives, negativeKeys, {
      date: ctx.date,
      searchTerm: ctx.term,
      reason: reason,
      campaign: target.campaign,
      adGroup: target.adGroup,
      scope: 'Ad Group',
      applyAs: applyAs,
      clicks: ctx.clicks,
      cost: ctx.cost,
      conversions: ctx.conversions
    });

    return true;
  }

  if (action === 'ADD_CAMPAIGN_NEGATIVE') {
    if (confidence < 0.80) return false;
    if (isBrandTerm(ctx.term)) return false;

    const targetCampaign = canonicalCampaignName(suggestion.negativeCampaign) || ctx.campaign;
    if (!isCurrentCampaign(targetCampaign)) return false;

    const applyAs = sanitizeApplyAs(
      suggestion.applyAs || '[' + stripMatchSyntax(ctx.term) + ']'
    );

    appendNegativeCandidate(sheets.negatives, negativeKeys, {
      date: ctx.date,
      searchTerm: ctx.term,
      reason: reason,
      campaign: targetCampaign,
      adGroup: '',
      scope: 'Campaign',
      applyAs: applyAs,
      clicks: ctx.clicks,
      cost: ctx.cost,
      conversions: ctx.conversions
    });

    return true;
  }

  return false;
}

function appendKeywordIdea(sheet, keys, data) {
  return appendUniqueObjectRow(sheet, {
    'Date': data.date,
    'Search Term': data.searchTerm,
    'Reason': data.reason,
    'Source Campaign': data.sourceCampaign,
    'Source Ad Group': data.sourceAdGroup,
    'Campaign': data.targetCampaign,
    'Ad Group': data.targetAdGroup,
    'Match Type': data.matchType,
    'Apply As': data.applyAs,
    'Clicks': data.clicks,
    'Cost': round2(data.cost),
    'Conversions': data.conversions,
    'Decision': 'Pending',
    'Applied Date': '',
    'Result': ''
  }, ['Date', 'Search Term', 'Campaign', 'Source Campaign', 'Source Ad Group', 'Ad Group', 'Apply As'], keys);
}

function appendNegativeCandidate(sheet, keys, data) {
  return appendUniqueObjectRow(sheet, {
    'Date': data.date,
    'Search Term': data.searchTerm,
    'Reason': data.reason,
    'Campaign': data.campaign,
    'Ad Group': data.adGroup,
    'Scope': data.scope,
    'Apply As': data.applyAs,
    'Clicks': data.clicks,
    'Cost': round2(data.cost),
    'Conversions': data.conversions,
    'Decision': 'Pending',
    'Applied Date': '',
    'Result': ''
  }, ['Date', 'Search Term', 'Campaign', 'Ad Group', 'Scope', 'Apply As'], keys);
}

function shouldAskGemini(ctx) {
  if (!USE_GEMINI) return false;
  if (!hasGeminiApiKey()) return false;
  if (!ctx.term) return false;
  if (ctx.clicks < 1) return false;
  return true;
}

function getGeminiApiKey() {
  return String(PropertiesService.getScriptProperties().getProperty(GEMINI_API_KEY_PROPERTY) || '').trim();
}

function hasGeminiApiKey() {
  const key = getGeminiApiKey();
  return key && key.indexOf('PASTE') === -1 && key.length > 20;
}

function getGeminiOutputText(body) {
  if (!body) return '';
  if (body.output_text) return String(body.output_text);
  if (body.outputText) return String(body.outputText);

  if (body.steps && body.steps.length) {
    const parts = [];
    for (let i = 0; i < body.steps.length; i++) {
      const step = body.steps[i];
      const modelOutput = step.model_output || step.modelOutput || step.output;
      if (!modelOutput) continue;

      const content = modelOutput.content || modelOutput.contents || [];
      for (let j = 0; j < content.length; j++) {
        if (content[j].text) {
          if (typeof content[j].text === 'string') {
            parts.push(content[j].text);
          } else if (content[j].text.text) {
            parts.push(content[j].text.text);
          }
        }
      }
    }
    return parts.join('\n');
  }

  return JSON.stringify(body);
}

function extractJsonObject(text) {
  const cleaned = String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');

  if (first === -1 || last === -1 || last <= first) {
    throw new Error('Gemini did not return a JSON object: ' + limitText(cleaned, 300));
  }

  return cleaned.substring(first, last + 1);
}

function normalizeGeminiSuggestion(value) {
  const action = String(value.action || 'NONE').trim().toUpperCase();

  return {
    action: [
      'NONE',
      'WATCH',
      'ADD_KEYWORD',
      'ADD_AD_GROUP_NEGATIVE',
      'ADD_CAMPAIGN_NEGATIVE',
      'ERROR'
    ].indexOf(action) !== -1 ? action : 'WATCH',
    confidence: clamp(safeNumber(value.confidence), 0, 1),
    targetCampaign: String(value.targetCampaign || '').trim(),
    targetAdGroup: String(value.targetAdGroup || '').trim(),
    matchType: normalizeMatchType(value.matchType || 'Phrase'),
    applyAs: sanitizeApplyAs(value.applyAs || ''),
    negativeCampaign: String(value.negativeCampaign || '').trim(),
    negativeAdGroup: String(value.negativeAdGroup || '').trim(),
    reason: String(value.reason || '').trim()
  };
}

function isBrandTerm(term) {
  return getBrandToken(term) !== '';
}

function getBrandToken(term) {
  const normalizedTerm = normalizeText(term);

  if (containsAnyToken(normalizedTerm, FASHION_INTENT_TOKENS)) {
    return '';
  }

  for (let i = 0; i < BRAND_TOKENS.length; i++) {
    const token = normalizeText(BRAND_TOKENS[i]);
    if (containsWholeToken(normalizedTerm, token)) {
      return BRAND_TOKENS[i];
    }
  }

  for (let i = 0; i < AMBIGUOUS_BRAND_TOKENS.length; i++) {
    const token = normalizeText(AMBIGUOUS_BRAND_TOKENS[i]);
    if (
      containsWholeToken(normalizedTerm, token) &&
      containsAnyToken(normalizedTerm, RESTAURANT_INTENT_TOKENS)
    ) {
      return AMBIGUOUS_BRAND_TOKENS[i];
    }
  }

  return '';
}

function containsAnyToken(text, tokens) {
  for (let i = 0; i < tokens.length; i++) {
    if (containsWholeToken(text, normalizeText(tokens[i]))) {
      return true;
    }
  }

  return false;
}

function containsWholeToken(text, token) {
  const pattern = new RegExp(
    '(^|[^a-z0-9а-яё])' + escapeRegExp(token) + '($|[^a-z0-9а-яё])',
    'i'
  );

  return pattern.test(text);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isSearchTermAlreadyHandled(status) {
  const normalized = String(status || '').trim().toUpperCase();
  return normalized === 'ADDED' || normalized === 'ADDED_EXCLUDED' || normalized === 'EXCLUDED';
}

function suggestTargetForTerm(ctx) {
  if (isBrandTerm(ctx.term)) {
    return getBrandTarget();
  }

  const sourceTarget = resolveTargetByNames(ctx.campaign, ctx.adGroup);
  if (sourceTarget) {
    return sourceTarget;
  }

  return inferTargetByLanguage(ctx.term);
}

function inferTargetByLanguage(term) {
  const raw = String(term || '').toLowerCase();
  const normalized = normalizeText(raw);

  if (/[а-яё]/i.test(raw)) return getTargetByLanguage('ru');
  if (/[õäöü]/i.test(raw) || containsAnySubstring(normalized, ['riias', 'restoranid', 'prantsuse', 'broneeri', 'ohtusook'])) return getTargetByLanguage('ee');
  if (containsAnySubstring(normalized, ['rygoje', 'restoranas', 'restoranai', 'prancuzu', 'vakariene', 'staliuka'])) return getTargetByLanguage('lt');
  if (containsAnySubstring(normalized, ['ravintola', 'riika', 'ranskalainen', 'varaa', 'poyta', 'illallinen'])) return getTargetByLanguage('fi');
  if (containsAnySubstring(normalized, ['restaurang', 'boka bord', 'svensk', 'middag i riga'])) return getTargetByLanguage('sv');
  if (containsAnySubstring(normalized, ['bestill bord', 'norsk'])) return getTargetByLanguage('no');
  if (containsAnySubstring(normalized, ['book bord', 'dansk'])) return getTargetByLanguage('da');
  if (/[āčēģīķļņšūž]/i.test(raw) || containsAnySubstring(normalized, ['restorans', 'restorani', 'vakarinas', 'galdina', 'francu'])) return getTargetByLanguage('lv');
  if (containsAnySubstring(normalized, ['francais', 'diner', 'ou diner', 'reserver', 'huitres'])) return getTargetByLanguage('fr');
  if (containsAnySubstring(normalized, ['abendessen', 'tisch', 'reservierung', 'franzosisch', 'terrassenrestaurant'])) return getTargetByLanguage('de');

  return getTargetByLanguage('en');
}

function containsAnySubstring(text, values) {
  for (let i = 0; i < values.length; i++) {
    if (text.indexOf(values[i]) !== -1) return true;
  }

  return false;
}

function resolveTargetByNames(campaignName, adGroupName) {
  const normalizedAdGroup = normalizeName(adGroupName);
  const normalizedCampaign = normalizeName(campaignName);

  for (let i = 0; i < TARGETS.length; i++) {
    const target = TARGETS[i];
    const adGroupMatches = normalizedAdGroup && normalizeName(target.adGroup) === normalizedAdGroup;
    const campaignMatches = !normalizedCampaign || normalizeName(target.campaign) === normalizedCampaign;

    if (adGroupMatches && campaignMatches) {
      return target;
    }
  }

  for (let j = 0; j < TARGETS.length; j++) {
    const fallbackTarget = TARGETS[j];
    if (normalizedAdGroup && normalizeName(fallbackTarget.adGroup) === normalizedAdGroup) {
      return fallbackTarget;
    }
  }

  return null;
}

function canonicalCampaignName(value) {
  const normalized = normalizeName(value);
  for (let i = 0; i < CURRENT_CAMPAIGNS.length; i++) {
    if (normalizeName(CURRENT_CAMPAIGNS[i]) === normalized) {
      return CURRENT_CAMPAIGNS[i];
    }
  }
  return '';
}

function isCurrentCampaign(value) {
  return canonicalCampaignName(value) !== '';
}

function isBrandTarget(campaignName, adGroupName) {
  const target = resolveTargetByNames(campaignName, adGroupName);
  return target && target.campaign === BRAND_CAMPAIGN && normalizeName(target.adGroup) === normalizeName(BRAND_AD_GROUP);
}

function getBrandTarget() {
  return TARGETS[0];
}

function getTargetByLanguage(language) {
  for (let i = 0; i < TARGETS.length; i++) {
    if (TARGETS[i].language === language) return TARGETS[i];
  }
  return getTargetByLanguage('en');
}

function getAllowedTargetsText() {
  const lines = [];
  for (let i = 0; i < TARGETS.length; i++) {
    lines.push('- ' + TARGETS[i].campaign + ' / ' + TARGETS[i].adGroup + ' / language=' + TARGETS[i].language);
  }
  return lines.join('\n');
}

function normalizeMatchType(value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'exact') return 'Exact';
  if (normalized === 'broad') return 'Broad';
  return 'Phrase';
}

function formatKeywordText(term, matchType) {
  const clean = stripMatchSyntax(term);
  const normalizedMatchType = normalizeMatchType(matchType);

  if (normalizedMatchType === 'Exact') {
    return '[' + clean + ']';
  }

  if (normalizedMatchType === 'Broad') {
    return clean;
  }

  return '"' + clean + '"';
}

function formatNegativeApplyAs(pattern) {
  const clean = stripMatchSyntax(pattern);
  if (/\s/.test(clean)) {
    return '"' + clean + '"';
  }
  return clean;
}

function sanitizeApplyAs(value) {
  return String(value || '')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .trim();
}

function stripMatchSyntax(text) {
  return String(text || '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/^"/, '')
    .replace(/"$/, '')
    .trim();
}

function normalizeText(value) {
  return normalizeSpaces(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeName(value) {
  return normalizeText(value);
}

function normalizeSpaces(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureCampaignConfigSheet(ss) {
  const sheet = ensureSheetColumns(ss, 'Campaign Config', CAMPAIGN_CONFIG_HEADERS);
  const keys = buildExistingKeys(sheet, ['Campaign', 'Ad Group']);

  for (let i = 0; i < TARGETS.length; i++) {
    const target = TARGETS[i];
    appendUniqueObjectRow(sheet, {
      'Campaign': target.campaign,
      'Campaign Role': target.role,
      'Daily Budget EUR': target.dailyBudget,
      'Bid Strategy': target.bidStrategy,
      'Campaign Max CPC Limit EUR': target.campaignMaxCpc,
      'Language': target.language,
      'Ad Group': target.adGroup,
      'Ad Group Key': target.key,
      'Ad Group Max CPC EUR': target.adGroupMaxCpc,
      'Status': 'Enabled',
      'Notes': 'From Google Ads Editor import 2026-06-26'
    }, ['Campaign', 'Ad Group'], keys);
  }

  return sheet;
}

function ensureSheetColumns(ss, name, headers) {
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return sheet;
  }

  const existingHeaders = getHeaderNames(sheet);
  const missingHeaders = [];

  for (let i = 0; i < headers.length; i++) {
    if (existingHeaders.indexOf(headers[i]) === -1) {
      missingHeaders.push(headers[i]);
    }
  }

  if (missingHeaders.length > 0) {
    sheet
      .getRange(1, existingHeaders.length + 1, 1, missingHeaders.length)
      .setValues([missingHeaders]);
  }

  return sheet;
}

function getHeaderNames(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return [];

  return sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(function(value) {
      return String(value || '').trim();
    });
}

function buildExistingKeys(sheet, keyFields) {
  const keys = {};
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return keys;

  const headers = getHeaders(values[0]);

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const keyParts = [];

    for (let i = 0; i < keyFields.length; i++) {
      const field = keyFields[i];
      const idx = headers[field];

      keyParts.push(idx === undefined ? '' : keyValue(row[idx]));
    }

    const key = keyParts.join('|');
    if (key.replace(/\|/g, '').trim()) {
      keys[key] = true;
    }
  }

  return keys;
}

function appendUniqueObjectRow(sheet, objectRow, keyFields, existingKeys) {
  const key = makeObjectKey(objectRow, keyFields);

  if (existingKeys && existingKeys[key]) {
    return false;
  }

  const headers = getHeaderNames(sheet);
  const row = [];

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    row.push(objectRow[header] === undefined ? '' : objectRow[header]);
  }

  sheet.appendRow(row);

  if (existingKeys) {
    existingKeys[key] = true;
  }

  return true;
}

function makeObjectKey(objectRow, keyFields) {
  const parts = [];

  for (let i = 0; i < keyFields.length; i++) {
    parts.push(keyValue(objectRow[keyFields[i]]));
  }

  return parts.join('|');
}

function getHeaders(headerRow) {
  const headers = {};

  for (let i = 0; i < headerRow.length; i++) {
    const name = String(headerRow[i] || '').trim();
    if (name) {
      headers[name] = i;
    }
  }

  return headers;
}

function keyValue(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(
      value,
      AdsApp.currentAccount().getTimeZone(),
      'yyyy-MM-dd'
    );
  }

  return normalizeSpaces(value).toLowerCase();
}

function microsToCurrency(value) {
  if (!value) return 0;
  return safeNumber(value) / 1000000;
}

function safeNumber(value) {
  const num = Number(value);
  if (isNaN(num)) return 0;
  return num;
}

function round2(value) {
  return Math.round(safeNumber(value) * 100) / 100;
}

function round4(value) {
  return Math.round(safeNumber(value) * 10000) / 10000;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function limitText(value, maxLength) {
  const text = String(value || '');
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function getYesterdayDateString() {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  return Utilities.formatDate(
    yesterday,
    AdsApp.currentAccount().getTimeZone(),
    'yyyy-MM-dd'
  );
}
