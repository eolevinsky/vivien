const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/12UweMKa2sIUDcSV0qrYHGTAVZcDvnrnp54FdQs0DmGs/edit';

const BRAND_CAMPAIGN = 'Campaign #3 Search Riga - Brand';
const CORE_CAMPAIGN = 'Campaign #4 Search Riga - Core Languages';
const NORDIC_CAMPAIGN = 'Campaign #5 Search Riga - Nordic Test';

const BRAND_AD_GROUP = 'Группа объявлений\u00A01';

const DEFAULT_TARGET = {
  campaign: CORE_CAMPAIGN,
  adGroup: 'EN / Restaurant Riga'
};

const TARGETS = [
  { campaign: BRAND_CAMPAIGN, role: 'Brand', language: 'all', adGroup: BRAND_AD_GROUP, key: 'brand_search_riga', dailyBudget: 0.50, bidStrategy: 'Target impression share', campaignMaxCpc: 0.05, adGroupMaxCpc: 0.01 },
  { campaign: CORE_CAMPAIGN, role: 'Core', language: 'ru', adGroup: 'RU / Ресторан Рига', key: 'ru_restoran_riga', dailyBudget: 6.00, bidStrategy: 'Maximize clicks', campaignMaxCpc: 0.25, adGroupMaxCpc: 0.01 },
  { campaign: CORE_CAMPAIGN, role: 'Core', language: 'lv', adGroup: 'LV / Restorans Riga', key: 'lv_restorans_riga', dailyBudget: 6.00, bidStrategy: 'Maximize clicks', campaignMaxCpc: 0.25, adGroupMaxCpc: 0.01 },
  { campaign: CORE_CAMPAIGN, role: 'Core', language: 'fr', adGroup: 'FR / Restaurant Riga', key: 'fr_restaurant_riga', dailyBudget: 6.00, bidStrategy: 'Maximize clicks', campaignMaxCpc: 0.25, adGroupMaxCpc: 0.01 },
  { campaign: CORE_CAMPAIGN, role: 'Core', language: 'de', adGroup: 'DE / Restaurant Riga', key: 'de_restaurant_riga', dailyBudget: 6.00, bidStrategy: 'Maximize clicks', campaignMaxCpc: 0.25, adGroupMaxCpc: 0.01 },
  { campaign: CORE_CAMPAIGN, role: 'Core', language: 'en', adGroup: 'EN / Restaurant Riga', key: 'en_restaurant_riga', dailyBudget: 6.00, bidStrategy: 'Maximize clicks', campaignMaxCpc: 0.25, adGroupMaxCpc: 0.01 },
  { campaign: CORE_CAMPAIGN, role: 'Core', language: 'ee', adGroup: 'EE / Restoran Riga', key: 'ee_restoran_riga', dailyBudget: 6.00, bidStrategy: 'Maximize clicks', campaignMaxCpc: 0.25, adGroupMaxCpc: 0.01 },
  { campaign: CORE_CAMPAIGN, role: 'Core', language: 'lt', adGroup: 'LT / Restoranas Riga', key: 'lt_restoranas_riga', dailyBudget: 6.00, bidStrategy: 'Maximize clicks', campaignMaxCpc: 0.25, adGroupMaxCpc: 0.01 },
  { campaign: NORDIC_CAMPAIGN, role: 'Nordic', language: 'sv', adGroup: 'SV / Restaurang Riga', key: 'sv_restaurang_riga', dailyBudget: 1.50, bidStrategy: 'Maximize clicks', campaignMaxCpc: 0.00, adGroupMaxCpc: 0.25 },
  { campaign: NORDIC_CAMPAIGN, role: 'Nordic', language: 'no', adGroup: 'NO / Restaurant Riga', key: 'no_restaurant_riga', dailyBudget: 1.50, bidStrategy: 'Maximize clicks', campaignMaxCpc: 0.00, adGroupMaxCpc: 0.25 },
  { campaign: NORDIC_CAMPAIGN, role: 'Nordic', language: 'da', adGroup: 'DA / Restaurant Riga', key: 'da_restaurant_riga', dailyBudget: 1.50, bidStrategy: 'Maximize clicks', campaignMaxCpc: 0.00, adGroupMaxCpc: 0.25 },
  { campaign: NORDIC_CAMPAIGN, role: 'Nordic', language: 'fi', adGroup: 'FI / Ravintola Riika', key: 'fi_ravintola_riika', dailyBudget: 1.50, bidStrategy: 'Maximize clicks', campaignMaxCpc: 0.00, adGroupMaxCpc: 0.25 }
];

const LEGACY_AD_GROUP_TARGETS = [
  { legacyAdGroup: 'Brand / Vivien', campaign: BRAND_CAMPAIGN, adGroup: BRAND_AD_GROUP },
  { legacyAdGroup: 'French / brasserie', campaign: CORE_CAMPAIGN, adGroup: 'EN / Restaurant Riga' },
  { legacyAdGroup: 'Terrase / wine / atmosphere', campaign: CORE_CAMPAIGN, adGroup: 'EN / Restaurant Riga' },
  { legacyAdGroup: 'Dinner tonight / evening', campaign: CORE_CAMPAIGN, adGroup: 'EN / Restaurant Riga' },
  { legacyAdGroup: 'Restaurant centre / booking', campaign: CORE_CAMPAIGN, adGroup: 'EN / Restaurant Riga' }
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

function main() {
  const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);

  ensureCampaignConfigSheet(ss);
  ensureSheetColumns(ss, 'Negative Candidates', NEGATIVE_HEADERS);
  ensureSheetColumns(ss, 'Keyword Ideas', KEYWORD_HEADERS);

  applyApprovedNegativeKeywords(ss);
  applyApprovedKeywordIdeas(ss);
}

function applyApprovedNegativeKeywords(ss) {
  const sheet = ss.getSheetByName('Negative Candidates');
  if (!sheet) {
    Logger.log('Sheet not found: Negative Candidates');
    return;
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  const headers = getHeaders(data[0]);

  const required = [
    'Search Term',
    'Campaign',
    'Decision',
    'Apply As',
    'Applied Date',
    'Result'
  ];

  const missing = required.filter(function(name) {
    return headers[name] === undefined;
  });

  if (missing.length > 0) {
    throw new Error('Missing columns in Negative Candidates: ' + missing.join(', '));
  }

  for (let r = 1; r < data.length; r++) {
    const row = data[r];

    const decision = getCell(row, headers, 'Decision').toLowerCase();
    const appliedDate = row[headers['Applied Date']];

    if (decision === 'reject' && !appliedDate) {
      setCell(sheet, r, headers, 'Result', 'Rejected - no action');
      continue;
    }

    if (decision !== 'approve') continue;
    if (appliedDate) continue;

    const searchTerm = getCell(row, headers, 'Search Term');
    const campaignName = getCell(row, headers, 'Campaign');
    const adGroupName = getCell(row, headers, 'Ad Group');
    const scope = normalizeScope(getCell(row, headers, 'Scope'));
    let negativeText = getCell(row, headers, 'Apply As');

    if (!searchTerm && !negativeText) continue;

    if (!negativeText) {
      negativeText = '[' + stripMatchSyntax(searchTerm) + ']';
    }

    negativeText = sanitizeKeywordText(negativeText);

    try {
      if (scope === 'Ad Group') {
        if (!adGroupName) {
          throw new Error('Ad Group is required when Scope is "Ad Group"');
        }

        const target = resolveTargetFromSheet(campaignName, adGroupName);
        const adGroup = findAdGroupByNames(target.campaign, target.adGroup);
        if (!adGroup) {
          throw new Error(
            'Ad group not found in Google Ads: campaign="' + target.campaign + '", ad group="' + target.adGroup + '"'
          );
        }

        if (adGroupNegativeExists(adGroup, negativeText)) {
          setCell(sheet, r, headers, 'Applied Date', nowString());
          setCell(sheet, r, headers, 'Result', 'Already exists: ad group negative keyword ' + negativeText);
          continue;
        }

        adGroup.createNegativeKeyword(negativeText);

        setCell(sheet, r, headers, 'Applied Date', nowString());
        setCell(sheet, r, headers, 'Result', 'Added ad group negative keyword to ' + target.campaign + ' / ' + target.adGroup + ': ' + negativeText);
      } else {
        const campaignNameToUse = resolveCampaignForCampaignNegative(campaignName);
        const campaign = findCampaignByName(campaignNameToUse);
        if (!campaign) {
          throw new Error('Campaign not found in Google Ads: ' + campaignNameToUse);
        }

        if (campaignNegativeExists(campaign, negativeText)) {
          setCell(sheet, r, headers, 'Applied Date', nowString());
          setCell(sheet, r, headers, 'Result', 'Already exists: campaign negative keyword ' + negativeText);
          continue;
        }

        campaign.createNegativeKeyword(negativeText);

        setCell(sheet, r, headers, 'Applied Date', nowString());
        setCell(sheet, r, headers, 'Result', 'Added campaign negative keyword to ' + campaignNameToUse + ': ' + negativeText);
      }
    } catch (e) {
      setCell(sheet, r, headers, 'Result', 'ERROR: ' + e.message);
    }
  }
}

function applyApprovedKeywordIdeas(ss) {
  const sheet = ss.getSheetByName('Keyword Ideas');
  if (!sheet) {
    Logger.log('Sheet not found: Keyword Ideas');
    return;
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  const headers = getHeaders(data[0]);

  const required = [
    'Search Term',
    'Campaign',
    'Decision',
    'Ad Group',
    'Match Type',
    'Applied Date',
    'Result'
  ];

  const missing = required.filter(function(name) {
    return headers[name] === undefined;
  });

  if (missing.length > 0) {
    throw new Error('Missing columns in Keyword Ideas: ' + missing.join(', '));
  }

  for (let r = 1; r < data.length; r++) {
    const row = data[r];

    const decision = getCell(row, headers, 'Decision').toLowerCase();
    const appliedDate = row[headers['Applied Date']];

    if (decision === 'reject' && !appliedDate) {
      setCell(sheet, r, headers, 'Result', 'Rejected - no action');
      continue;
    }

    if (decision !== 'approve') continue;
    if (appliedDate) continue;

    const searchTerm = getCell(row, headers, 'Search Term');
    const campaignName = getCell(row, headers, 'Campaign');
    const adGroupNameFromSheet = getCell(row, headers, 'Ad Group');
    const matchType = getCell(row, headers, 'Match Type') || 'Phrase';
    const applyAs = getCell(row, headers, 'Apply As');

    const target = resolveTargetFromSheet(campaignName, adGroupNameFromSheet);

    const keywordText = sanitizeKeywordText(
      applyAs || formatKeywordText(searchTerm, matchType)
    );

    if (!keywordText) {
      setCell(sheet, r, headers, 'Result', 'ERROR: Keyword text is empty');
      continue;
    }

    try {
      const adGroup = findAdGroupByNames(target.campaign, target.adGroup);
      if (!adGroup) {
        throw new Error(
          'Ad group not found in Google Ads: campaign="' + target.campaign + '", ad group="' + target.adGroup + '"'
        );
      }

      if (keywordExists(adGroup, keywordText)) {
        setCell(sheet, r, headers, 'Applied Date', nowString());
        setCell(sheet, r, headers, 'Result', 'Already exists: keyword ' + keywordText);
        continue;
      }

      const operation = adGroup
        .newKeywordBuilder()
        .withText(keywordText)
        .build();

      if (operation && operation.isSuccessful && !operation.isSuccessful()) {
        throw new Error(operation.getErrors().join('; '));
      }

      setCell(sheet, r, headers, 'Applied Date', nowString());
      setCell(sheet, r, headers, 'Result', 'Added keyword to ' + target.campaign + ' / ' + target.adGroup + ': ' + keywordText);
    } catch (e) {
      setCell(sheet, r, headers, 'Result', 'ERROR: ' + e.message);
    }
  }
}

function resolveTargetFromSheet(campaignName, adGroupName) {
  const currentTarget = resolveCurrentTargetByNames(campaignName, adGroupName);
  if (currentTarget) return currentTarget;

  const legacyTarget = resolveLegacyTargetByAdGroup(adGroupName);
  if (legacyTarget) return legacyTarget;

  if (!adGroupName) {
    const campaign = canonicalCampaignName(campaignName);
    if (campaign) {
      return defaultTargetForCampaign(campaign);
    }

    return DEFAULT_TARGET;
  }

  throw new Error(
    'Target is not in current campaign config: campaign="' + campaignName + '", ad group="' + adGroupName + '". Use Campaign Config values or reject old Campaign #1/#2 rows.'
  );
}

function resolveCampaignForCampaignNegative(campaignName) {
  const campaign = canonicalCampaignName(campaignName);
  if (campaign) return campaign;

  throw new Error(
    'Campaign-level negatives must target one current campaign: ' +
    CURRENT_CAMPAIGNS.join(' | ') +
    '. Reject or recreate old Campaign #1/#2 rows.'
  );
}

function defaultTargetForCampaign(campaignName) {
  if (campaignName === BRAND_CAMPAIGN) {
    return {
      campaign: BRAND_CAMPAIGN,
      adGroup: BRAND_AD_GROUP
    };
  }

  if (campaignName === NORDIC_CAMPAIGN) {
    return {
      campaign: NORDIC_CAMPAIGN,
      adGroup: 'SV / Restaurang Riga'
    };
  }

  return {
    campaign: CORE_CAMPAIGN,
    adGroup: 'EN / Restaurant Riga'
  };
}

function resolveCurrentTargetByNames(campaignName, adGroupName) {
  const normalizedAdGroup = normalizeName(adGroupName);
  const normalizedCampaign = normalizeName(campaignName);

  for (let i = 0; i < TARGETS.length; i++) {
    const target = TARGETS[i];
    const adGroupMatches = normalizedAdGroup && normalizeName(target.adGroup) === normalizedAdGroup;
    const campaignMatches = !normalizedCampaign || normalizeName(target.campaign) === normalizedCampaign;

    if (adGroupMatches && campaignMatches) {
      return {
        campaign: target.campaign,
        adGroup: target.adGroup
      };
    }
  }

  for (let j = 0; j < TARGETS.length; j++) {
    const fallbackTarget = TARGETS[j];
    if (normalizedAdGroup && normalizeName(fallbackTarget.adGroup) === normalizedAdGroup) {
      return {
        campaign: fallbackTarget.campaign,
        adGroup: fallbackTarget.adGroup
      };
    }
  }

  return null;
}

function resolveLegacyTargetByAdGroup(adGroupName) {
  const normalizedAdGroup = normalizeName(adGroupName);
  if (!normalizedAdGroup) return null;

  for (let i = 0; i < LEGACY_AD_GROUP_TARGETS.length; i++) {
    const item = LEGACY_AD_GROUP_TARGETS[i];
    if (normalizeName(item.legacyAdGroup) === normalizedAdGroup) {
      return {
        campaign: item.campaign,
        adGroup: item.adGroup
      };
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

function normalizeScope(value) {
  const scope = String(value || '').trim().toLowerCase();

  if (
    scope === 'ad group' ||
    scope === 'adgroup' ||
    scope === 'group' ||
    scope === 'группа объявлений'
  ) {
    return 'Ad Group';
  }

  return 'Campaign';
}

function formatKeywordText(term, matchType) {
  const clean = stripMatchSyntax(term);
  const mt = String(matchType || '').trim().toLowerCase();

  if (mt === 'exact') {
    return '[' + clean + ']';
  }

  if (mt === 'broad') {
    return clean;
  }

  return '"' + clean + '"';
}

function stripMatchSyntax(text) {
  return String(text || '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/^"/, '')
    .replace(/"$/, '')
    .trim();
}

function sanitizeKeywordText(value) {
  return normalizeSpaces(value)
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .trim();
}

function keywordExists(adGroup, keywordText) {
  const normalizedNeedle = normalizeKeywordForCompare(keywordText);
  const it = adGroup.keywords()
    .withCondition("ad_group_criterion.status != REMOVED")
    .get();

  while (it.hasNext()) {
    const keyword = it.next();
    if (normalizeKeywordForCompare(keyword.getText()) === normalizedNeedle) {
      return true;
    }
  }

  return false;
}

function adGroupNegativeExists(adGroup, negativeText) {
  const normalizedNeedle = normalizeKeywordForCompare(negativeText);
  const it = adGroup.negativeKeywords().get();

  while (it.hasNext()) {
    const keyword = it.next();
    if (normalizeKeywordForCompare(keyword.getText()) === normalizedNeedle) {
      return true;
    }
  }

  return false;
}

function campaignNegativeExists(campaign, negativeText) {
  const normalizedNeedle = normalizeKeywordForCompare(negativeText);
  const it = campaign.negativeKeywords().get();

  while (it.hasNext()) {
    const keyword = it.next();
    if (normalizeKeywordForCompare(keyword.getText()) === normalizedNeedle) {
      return true;
    }
  }

  return false;
}

function normalizeKeywordForCompare(value) {
  return normalizeSpaces(value)
    .toLowerCase();
}

function findCampaignByName(name) {
  const normalizedName = normalizeName(name);
  const it = AdsApp.campaigns()
    .withCondition("campaign.status != REMOVED")
    .get();

  while (it.hasNext()) {
    const campaign = it.next();
    if (normalizeName(campaign.getName()) === normalizedName) {
      return campaign;
    }
  }

  return null;
}

function findAdGroupByNames(campaignName, adGroupName) {
  const normalizedCampaign = normalizeName(campaignName);
  const normalizedAdGroup = normalizeName(adGroupName);

  const it = AdsApp.adGroups()
    .withCondition("ad_group.status != REMOVED")
    .get();

  while (it.hasNext()) {
    const adGroup = it.next();

    if (
      normalizeName(adGroup.getName()) === normalizedAdGroup &&
      normalizeName(adGroup.getCampaign().getName()) === normalizedCampaign
    ) {
      return adGroup;
    }
  }

  return null;
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

function getCell(row, headers, name) {
  if (headers[name] === undefined) return '';
  return String(row[headers[name]] || '').trim();
}

function setCell(sheet, zeroBasedRowIndex, headers, name, value) {
  if (headers[name] === undefined) {
    throw new Error('Missing output column: ' + name);
  }

  sheet
    .getRange(zeroBasedRowIndex + 1, headers[name] + 1)
    .setValue(value);
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

function normalizeName(value) {
  return normalizeSpaces(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeSpaces(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nowString() {
  return Utilities.formatDate(
    new Date(),
    AdsApp.currentAccount().getTimeZone(),
    'yyyy-MM-dd HH:mm'
  );
}
