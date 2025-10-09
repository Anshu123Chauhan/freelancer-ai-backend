import { gigService } from "../../../models/Gigs.js";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "the",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "by",
  "with",
  "is",
  "are",
  "was",
  "were",
  "this",
  "that",
  "those",
  "these"
]);

const SYNONYM_GROUPS = [
  ["phone", "mobile", "smartphone", "cellphone", "handset"],
  ["laptop", "notebook", "computer", "macbook", "ultrabook"],
  ["tv", "television", "smarttv", "smart-tv"],
  ["shoe", "shoes", "sneaker", "sneakers", "footwear"],
  ["dress", "gown", "apparel", "clothing", "outfit"],
  ["bag", "backpack", "handbag", "satchel", "tote"],
  ["watch", "timepiece", "smartwatch", "wristwatch"],
  ["earphone", "earphones", "earbud", "earbuds", "headphone", "headphones"],
  ["camera", "dslr", "mirrorless"],
  ["fridge", "refrigerator", "cooler"],
  ["ac", "airconditioner", "air-conditioner"],
  ["washer", "washingmachine", "laundry"]
];

const SYNONYM_LOOKUP = buildSynonymLookup(SYNONYM_GROUPS);
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const PRIMARY_SCORE_MIN = 0.45;
const PRIMARY_SIMILARITY_MIN = 0.35;
const SECONDARY_SCORE_MIN = 0.15;
const SECONDARY_LIMIT = 10;

export const aiGigSearch = async (req, res) => {
  try {
    const {
      query,
      limit = DEFAULT_LIMIT,
      category,
      categories,
      subCategory,
      subCategories,
      sellerId,
      sellers,
      price,
      isHourly
    } = req.body || {};

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: "Search query is required"
      });
    }

    const effectiveLimit = clampLimit(limit);
    const queryTokens = buildTokenSetFromParts(query);
    const queryPhrases = extractQueryPhrases(query);
    const primaryPhrase = getPrimaryPhrase(queryPhrases);
    const querySummary = buildQuerySummary(query, queryTokens, queryPhrases, primaryPhrase);

    const candidateRegex = buildCandidateRegex(queryTokens, query);
    const candidateFilter = buildCandidateFilter({
      category,
      categories,
      subCategory,
      subCategories,
      sellerId,
      sellers,
      price,
      isHourly
    });

    const candidateGigs = await gigService.find({
      ...candidateFilter,
      status: "Active",
      $or: buildSearchableFields(candidateRegex)
    })
      .populate("category", "name")
      .populate("subCategory", "name")
      .lean()
      .limit(200);

    if (!candidateGigs.length) {
      return res.json({
        success: true,
        intentSummary: querySummary,
        data: [],
        extras: [],
        metadata: {
          query,
          queryTokens: Array.from(queryTokens),
          requestedLimit: effectiveLimit,
          limit: effectiveLimit,
          secondaryLimit: Math.min(SECONDARY_LIMIT, effectiveLimit),
          detectedPhrases: queryPhrases.map((phrase) => phrase.raw),
          primaryPhrase: primaryPhrase ? primaryPhrase.raw : null,
          intentSummary: querySummary,
          totalCandidates: 0,
          totalRanked: 0,
          totalPrimary: 0,
          totalExtras: 0,
          returnedPrimary: 0,
          returnedExtras: 0
        }
      });
    }

    const rankedGigs = candidateGigs
      .map((gig) => scoreGig(gig, queryTokens, queryPhrases, primaryPhrase))
      .filter((item) => item.score >= SECONDARY_SCORE_MIN)
      .sort((a, b) => b.score - a.score);

    const { primary, extras } = partitionMatches(rankedGigs, {
      limit: effectiveLimit,
      secondaryLimit: SECONDARY_LIMIT
    });

    res.json({
      success: true,
      intentSummary: querySummary,
      data: primary.items,
      extras: extras.items,
      metadata: {
        query,
        queryTokens: Array.from(queryTokens),
        requestedLimit: effectiveLimit,
        limit: primary.limit,
        secondaryLimit: extras.limit,
        detectedPhrases: queryPhrases.map((phrase) => phrase.raw),
        primaryPhrase: primaryPhrase ? primaryPhrase.raw : null,
        intentSummary: querySummary,
        totalCandidates: candidateGigs.length,
        totalRanked: rankedGigs.length,
        totalPrimary: primary.totalCount,
        totalExtras: extras.totalCount,
        returnedPrimary: primary.items.length,
        returnedExtras: extras.items.length
      }
    });
  } catch (error) {
    console.error("AI search error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process the AI search",
      details: error.message
    });
  }
};

function scoreGig(gig, queryTokens, queryPhrases, primaryPhrase) {
  const fieldTokens = buildGigTokenMap(gig);
  const combinedTokens = new Set();
  fieldTokens.forEach((tokens) => {
    tokens.forEach((token) => combinedTokens.add(token));
  });

  const similarity = semanticSimilarity(queryTokens, combinedTokens);
  const baseBoost = computeGigRelevanceBoost(queryTokens, gig, fieldTokens);
  const phraseAnalysis = evaluatePhraseMatches(queryPhrases, primaryPhrase, gig);
  const totalBoost = baseBoost + phraseAnalysis.boost;
  const score = similarity + totalBoost;

  const matchSummary = buildMatchSummary(queryTokens, fieldTokens);

  return {
    gig,
    similarity,
    boost: totalBoost,
    score,
    matchSummary,
    phraseMatches: phraseAnalysis.matches,
    primaryPhraseMatch: phraseAnalysis.primaryMatch,
    phraseStrength: phraseAnalysis.strongest,
    matchedPhraseCount: phraseAnalysis.matchCount,
    hasQueryPhrases: phraseAnalysis.hasPhrases
  };
}

function partitionMatches(rankedGigs, { limit, secondaryLimit }) {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, limit) : DEFAULT_LIMIT;
  const safeSecondaryLimit = Number.isFinite(secondaryLimit)
    ? Math.max(0, secondaryLimit)
    : Math.min(SECONDARY_LIMIT, safeLimit || SECONDARY_LIMIT);

  const primary = [];
  const extras = [];
  const hasPhraseMatches = rankedGigs.some((entry) => entry.matchedPhraseCount > 0);
  const hasPrimaryPhraseMatches = rankedGigs.some((entry) => entry.primaryPhraseMatch);

  rankedGigs.forEach((entry) => {
    const formatted = formatGigResult(entry);
    if (isPrimaryMatch(entry, hasPhraseMatches, hasPrimaryPhraseMatches)) {
      primary.push(formatted);
    } else {
      extras.push(formatted);
    }
  });

  return {
    primary: {
      items: primary.slice(0, safeLimit),
      totalCount: primary.length,
      limit: safeLimit
    },
    extras: {
      items: extras.slice(0, safeSecondaryLimit),
      totalCount: extras.length,
      limit: safeSecondaryLimit
    }
  };
}

function formatGigResult({
  gig,
  score,
  similarity,
  matchSummary,
  phraseMatches,
  primaryPhraseMatch,
  phraseStrength
}) {
  return {
    _id: gig._id,
    name: gig.title,
    title: gig.title,
    description: gig.description,
    images: gig.images,
    tags: gig.tags,
    category: gig.category || null,
    subCategory: gig.subCategory || null,
    sellerId: gig.sellerId || null,
    status: gig.status,
    isHourly: Boolean(gig.isHourly),
    hourlyRate: Number.isFinite(Number(gig.hourlyRate)) ? Number(gig.hourlyRate) : null,
    packages: gig.packages,
    priceRange: buildGigPriceRange(gig),
    similarity: Number(similarity.toFixed(3)),
    score: Number(score.toFixed(3)),
    matchSummary,
    phraseMatches,
    primaryPhraseMatch,
    phraseStrength: Number(phraseStrength.toFixed(3))
  };
}

function isPrimaryMatch(
  {
    similarity,
    score,
    matchSummary,
    boost,
    primaryPhraseMatch,
    phraseStrength,
    matchedPhraseCount,
    hasQueryPhrases
  },
  hasPhraseMatches,
  hasPrimaryPhraseMatches
) {
  if (primaryPhraseMatch) {
    return true;
  }

  if (!hasPrimaryPhraseMatches && phraseStrength >= 0.82 && similarity >= 0.3) {
    return true;
  }

  if (hasPhraseMatches && matchedPhraseCount === 0) {
    if (hasQueryPhrases) {
      return false;
    }
  }

  if (hasPrimaryPhraseMatches) {
    return false;
  }

  const hasStrongField = matchSummary.some((field) =>
    ["title", "tags", "category", "subCategory", "packages"].includes(field)
  );
  if (similarity >= 0.65) {
    return true;
  }
  if (similarity >= PRIMARY_SIMILARITY_MIN && score >= PRIMARY_SCORE_MIN) {
    return true;
  }
  if (score >= PRIMARY_SCORE_MIN + 0.1) {
    return true;
  }
  if (hasStrongField && similarity >= PRIMARY_SIMILARITY_MIN * 0.9 && boost >= 0.1) {
    return true;
  }
  return false;
}

function buildCandidateFilter({
  category,
  categories,
  subCategory,
  subCategories,
  sellerId,
  sellers,
  price,
  isHourly
}) {
  const filter = {};
  const categoryFilter = collectIds(category, categories);
  const subCategoryFilter = collectIds(subCategory, subCategories);
  const sellerFilter = collectIds(sellerId, sellers);

  if (categoryFilter) {
    filter.category = categoryFilter;
  }
  if (subCategoryFilter) {
    filter.subCategory = subCategoryFilter;
  }
  if (sellerFilter) {
    filter.sellerId = sellerFilter;
  }
  if (typeof isHourly === "boolean") {
    filter.isHourly = isHourly;
  }
  if (price && typeof price === "object") {
    const { min, max } = price;
    filter["packages.price"] = {};
    const minValue = Number(min);
    const maxValue = Number(max);
    if (Number.isFinite(minValue)) {
      filter["packages.price"].$gte = minValue;
    }
    if (Number.isFinite(maxValue)) {
      filter["packages.price"].$lte = maxValue;
    }
    if (!Object.keys(filter["packages.price"]).length) {
      delete filter["packages.price"];
    }
  }

  return filter;
}

function collectIds(value, collection) {
  if (Array.isArray(collection)) {
    const cleaned = collection
      .map((entry) => (typeof entry === "string" ? entry.trim() : entry))
      .filter(Boolean);
    if (cleaned.length) {
      return { $in: cleaned };
    }
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (value) {
    return value;
  }
  return null;
}

function buildSearchableFields(regex) {
  return [
    { title: regex },
    { description: regex },
    { tags: { $elemMatch: { $regex: regex } } },
    { "packages.name": regex },
    { "packages.details": regex }
  ];
}

function buildGigTokenMap(gig) {
  const mapper = new Map();

  mapper.set("title", buildTokenSetFromParts(gig.title));
  mapper.set("description", buildTokenSetFromParts(gig.description));
  mapper.set("tags", buildTokenSetFromParts(gig.tags || []));

  if (gig.category && gig.category.name) {
    mapper.set("category", buildTokenSetFromParts(gig.category.name));
  }
  if (gig.subCategory && gig.subCategory.name) {
    mapper.set("subCategory", buildTokenSetFromParts(gig.subCategory.name));
  }

  const packageTokens = new Set();
  (gig.packages || []).forEach((gigPackage) => {
    buildTokenSetFromParts(gigPackage?.name, gigPackage?.details).forEach((token) =>
      packageTokens.add(token)
    );
  });

  if (packageTokens.size) {
    mapper.set("packages", packageTokens);
  }

  return mapper;
}

function buildMatchSummary(queryTokens, fieldTokens) {
  const summary = [];
  fieldTokens.forEach((tokens, field) => {
    if (hasSemanticOverlap(queryTokens, tokens)) {
      summary.push(field);
    }
  });
  return summary;
}

function computeGigRelevanceBoost(queryTokens, gig, fieldTokens) {
  let boost = 0;

  const tagTokens = fieldTokens.get("tags");
  if (tagTokens && hasSemanticOverlap(queryTokens, tagTokens)) {
    boost += 0.12;
  }

  const categoryTokens = fieldTokens.get("category");
  if (categoryTokens && hasSemanticOverlap(queryTokens, categoryTokens)) {
    boost += 0.08;
  }

  const subCategoryTokens = fieldTokens.get("subCategory");
  if (subCategoryTokens && hasSemanticOverlap(queryTokens, subCategoryTokens)) {
    boost += 0.06;
  }

  const packageTokens = fieldTokens.get("packages");
  if (packageTokens) {
    const matches = countMatches(queryTokens, packageTokens);
    if (matches) {
      boost += Math.min(0.2, matches * 0.05);
    }
  }

  if (gig.tags && gig.tags.length && includesExactTag(queryTokens, gig.tags)) {
    boost += 0.05;
  }

  if (gig.isHourly && Number.isFinite(Number(gig.hourlyRate))) {
    const rateTokens = buildTokenSetFromParts(gig.hourlyRate.toString());
    if (hasSemanticOverlap(queryTokens, rateTokens)) {
      boost += 0.03;
    }
  }

  return boost;
}

function includesExactTag(queryTokens, tags = []) {
  const lowerTags = tags.map((tag) => tag.toLowerCase());
  for (const token of queryTokens) {
    if (lowerTags.includes(token)) {
      return true;
    }
  }
  return false;
}

function buildGigPriceRange(gig) {
  const prices = [];

  (gig.packages || []).forEach((gigPackage) => {
    if (Number.isFinite(Number(gigPackage?.price))) {
      prices.push(Number(gigPackage.price));
    }
  });

  if (gig.isHourly && Number.isFinite(Number(gig.hourlyRate))) {
    prices.push(Number(gig.hourlyRate));
  }

  if (prices.length) {
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  }

  return null;
}

function extractQueryPhrases(query) {
  if (!query || typeof query !== "string") {
    return [];
  }
  const rawParts = query
    .split(/(?:\s+or\s+|\s+and\s+|,|\/|\||&)/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!rawParts.length) {
    rawParts.push(query.trim());
  }

  const unique = new Map();
  rawParts.forEach((part, index) => {
    const tokens = tokenize(part);
    const normalized = tokens.join(" ").trim();
    if (!normalized) {
      return;
    }
    if (!unique.has(normalized)) {
      unique.set(normalized, {
        raw: part,
        normalized,
        tokens,
        tokenCount: tokens.length,
        index
      });
    }
  });

  return Array.from(unique.values());
}

function getPrimaryPhrase(queryPhrases = []) {
  if (!queryPhrases.length) {
    return null;
  }
  const sorted = [...queryPhrases].sort((a, b) => {
    if (b.tokenCount !== a.tokenCount) {
      return b.tokenCount - a.tokenCount;
    }
    return a.index - b.index;
  });
  return sorted[0] || null;
}

function buildQuerySummary(query, queryTokens, queryPhrases, primaryPhrase) {
  const cleaned = (query || "").trim();
  if (!cleaned) {
    return "No query provided.";
  }

  if (queryPhrases.length) {
    if (queryPhrases.length === 1) {
      return `Looking for gigs related to "${queryPhrases[0].raw}".`;
    }
    const mainPhrase = primaryPhrase ? primaryPhrase.raw : queryPhrases[0].raw;
    const secondary = queryPhrases
      .filter((phrase) => (primaryPhrase ? phrase.normalized !== primaryPhrase.normalized : phrase !== queryPhrases[0]))
      .map((phrase) => `"${phrase.raw}"`);
    if (secondary.length) {
      const last = secondary.pop();
      const lead = secondary.length ? `${secondary.join(", ")} or ${last}` : last;
      return `Looking primarily for "${mainPhrase}" gigs, but also open to ${lead}.`;
    }
    return `Looking for gigs related to "${mainPhrase}".`;
  }

  const tokens = Array.from(queryTokens || []);
  if (tokens.length) {
    const highlighted = tokens.slice(0, 5).join(", ");
    return `Looking for gigs matching keywords: ${highlighted}.`;
  }

  return `Looking for gigs related to "${cleaned}".`;
}

function evaluatePhraseMatches(queryPhrases, primaryPhrase, gig) {
  const hasQueryPhrases = Array.isArray(queryPhrases) && queryPhrases.length > 0;
  if (!hasQueryPhrases) {
    return {
      matches: [],
      strongest: 0,
      boost: 0,
      primaryMatch: false,
      matchCount: 0,
      hasPhrases: false
    };
  }

  const corpus = buildGigMatchCorpus(gig);
  const fallbackPrimary = primaryPhrase || getPrimaryPhrase(queryPhrases);
  const fallbackNormalized = fallbackPrimary ? fallbackPrimary.normalized : null;
  const fallbackTokenCount = fallbackPrimary ? fallbackPrimary.tokenCount : 0;
  let strongest = 0;
  let primaryMatch = false;
  let boost = 0;
  const matches = [];

  queryPhrases.forEach((phrase) => {
    const isTopPriority = fallbackNormalized
      ? phrase.normalized === fallbackNormalized
      : fallbackTokenCount
      ? phrase.tokenCount >= fallbackTokenCount
      : phrase.index === 0;
    const assessment = assessPhraseMatch(phrase, corpus, isTopPriority);
    if (!assessment) {
      return;
    }
    strongest = Math.max(strongest, assessment.strength);
    if (assessment.isPrimary) {
      primaryMatch = true;
    }
    const phraseBoost = assessment.strength * (assessment.isPrimary ? 0.45 : 0.25);
    boost += phraseBoost + (phrase.tokenCount >= 3 ? 0.05 : 0);
    matches.push({
      phrase: phrase.raw,
      strength: Number(assessment.strength.toFixed(3)),
      location: assessment.location,
      isPrimary: assessment.isPrimary
    });
  });

  if (!matches.length) {
    return {
      matches: [],
      strongest: 0,
      boost: 0,
      primaryMatch: false,
      matchCount: 0,
      hasPhrases: true
    };
  }

  return {
    matches,
    strongest,
    boost: Math.min(0.6, boost),
    primaryMatch,
    matchCount: matches.length,
    hasPhrases: true
  };
}

function buildGigMatchCorpus(gig) {
  const title = normalizeMatchText(gig.title);
  const description = normalizeMatchText(gig.description);
  const tags = (gig.tags || []).map((tag) => normalizeMatchText(tag));
  const packageNames = (gig.packages || []).map((pkg) => normalizeMatchText(pkg?.name));
  const packageDetails = (gig.packages || []).map((pkg) => normalizeMatchText(pkg?.details));
  const combined = [title, description, ...tags, ...packageNames, ...packageDetails]
    .filter(Boolean)
    .join(" ");

  return {
    title,
    description,
    tags,
    packageNames,
    packageDetails,
    combined
  };
}

function assessPhraseMatch(phrase, corpus, isTopPriority) {
  if (!phrase || !phrase.normalized || !phrase.tokens.length) {
    return null;
  }

  const phraseRegex = new RegExp(`\\b${escapeRegex(phrase.normalized)}\\b`, "i");
  let baseStrength = 0;
  let location = "partial";

  if (phraseRegex.test(corpus.title)) {
    baseStrength = 0.97;
    location = "title";
  } else if (corpus.tags.some((tag) => tag && phraseRegex.test(tag))) {
    baseStrength = 0.92;
    location = "tag";
  } else if (corpus.packageNames.some((entry) => entry && phraseRegex.test(entry))) {
    baseStrength = 0.9;
    location = "package";
  } else if (phraseRegex.test(corpus.description)) {
    baseStrength = 0.82;
    location = "description";
  } else if (corpus.packageDetails.some((entry) => entry && phraseRegex.test(entry))) {
    baseStrength = 0.78;
    location = "package";
  }

  if (!baseStrength) {
    const tokens = phrase.tokens;
    const matchesInTitle = tokens.filter((token) => corpus.title.includes(token)).length;
    const matchesOverall = tokens.filter((token) => corpus.combined.includes(token)).length;
    const coverage = tokens.length ? matchesOverall / tokens.length : 0;
    if (matchesInTitle === tokens.length) {
      baseStrength = 0.7;
      location = "title-partial";
    } else if (coverage >= 0.7) {
      baseStrength = 0.65;
      location = "broad";
    } else if (coverage >= 0.4) {
      baseStrength = 0.45 + coverage * 0.25;
      location = "broad";
    } else if (matchesOverall) {
      baseStrength = 0.3 + coverage * 0.2;
      location = "partial";
    }
  }

  if (!baseStrength) {
    return null;
  }

  const specificityBonus = Math.min(0.15, Math.max(0, (phrase.tokenCount - 1) * 0.04));
  const priorityBonus = isTopPriority ? 0.05 : 0;
  const finalStrength = Math.min(1, baseStrength + specificityBonus + priorityBonus);
  const primaryThreshold = phrase.tokenCount >= 3 ? 0.72 : 0.83;
  const isPrimary = isTopPriority && finalStrength >= primaryThreshold;

  return {
    strength: finalStrength,
    location,
    isPrimary
  };
}

function normalizeMatchText(value) {
  if (!value) {
    return "";
  }
  return value.toString().toLowerCase();
}

function buildCandidateRegex(tokens, fallback) {
  const baseTokens = Array.from(tokens).filter(Boolean);
  if (!baseTokens.length && fallback) {
    return new RegExp(escapeRegex(fallback.trim()), "i");
  }
  const pattern = baseTokens.map((token) => escapeRegex(token)).join("|");
  return new RegExp(pattern || escapeRegex(fallback || ""), "i");
}

function buildTokenSetFromParts(...parts) {
  const tokens = new Set();
  parts
    .flat()
    .filter(Boolean)
    .forEach((part) => {
      tokenize(part).forEach((token) => {
        expandToken(token).forEach((expanded) => {
          if (expanded) {
            tokens.add(expanded);
          }
        });
      });
    });
  return tokens;
}

function tokenize(value) {
  if (!value || typeof value !== "string") {
    return [];
  }
  return value
    .toString()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && !STOP_WORDS.has(token));
}

function expandToken(token) {
  const expansions = new Set([token]);
  const stemmed = stemToken(token);
  if (stemmed && stemmed !== token) {
    expansions.add(stemmed);
  }
  const synonyms = SYNONYM_LOOKUP.get(token);
  if (synonyms) {
    synonyms.forEach((synonym) => expansions.add(synonym));
  }
  return expansions;
}

function stemToken(token) {
  if (token.length <= 3) {
    return token;
  }
  const suffixes = ["ing", "ers", "er", "ies", "ied", "s"];
  for (const suffix of suffixes) {
    if (token.endsWith(suffix)) {
      const stem = token.slice(0, -suffix.length);
      if (stem.length >= 3) {
        return stem;
      }
    }
  }
  return token;
}

function buildSynonymLookup(groups) {
  const lookup = new Map();
  groups.forEach((group) => {
    group.forEach((word) => {
      const siblings = group.filter((candidate) => candidate !== word);
      if (lookup.has(word)) {
        const existing = lookup.get(word);
        siblings.forEach((item) => existing.add(item));
      } else {
        lookup.set(word, new Set(siblings));
      }
    });
  });
  return lookup;
}

function hasSemanticOverlap(queryTokens, documentTokens) {
  for (const queryToken of queryTokens) {
    for (const documentToken of documentTokens) {
      if (tokenSimilarity(queryToken, documentToken) >= 0.75) {
        return true;
      }
    }
  }
  return false;
}

function countMatches(queryTokens, documentTokens) {
  let matches = 0;
  queryTokens.forEach((queryToken) => {
    documentTokens.forEach((documentToken) => {
      if (tokenSimilarity(queryToken, documentToken) >= 0.8) {
        matches += 1;
      }
    });
  });
  return matches;
}

function semanticSimilarity(queryTokens, documentTokens) {
  if (!queryTokens.size || !documentTokens.size) {
    return 0;
  }
  let total = 0;
  queryTokens.forEach((queryToken) => {
    let best = 0;
    documentTokens.forEach((documentToken) => {
      const score = tokenSimilarity(queryToken, documentToken);
      if (score > best) {
        best = score;
      }
    });
    total += best;
  });
  return total / queryTokens.size;
}

function tokenSimilarity(a, b) {
  if (a === b) {
    return 1;
  }
  if (!a || !b) {
    return 0;
  }
  if (a.length > 3 && b.includes(a)) {
    return 0.85;
  }
  if (b.length > 3 && a.includes(b)) {
    return 0.75;
  }
  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (!maxLen) {
    return 0;
  }
  const similarity = 1 - distance / maxLen;
  return similarity > 0.4 ? similarity : 0;
}

function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j < cols; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function clampLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
