export interface Entity {
  entity_group?: string;
  entity?: string;
  word?: string;
  start?: number;
  end?: number;
}

export const applyRegexRedaction = (text: string): string => {
  let scrubbed = text;

  // =================================================================
  // LAYER 1: REGTECH KEYWORD CAPTURE GROUPS (Optimized for Synthetic PII)
  // =================================================================
  const keywordPatterns = [
    { regex: /(sort code|sort-code)(\s*[:\-]?\s*)([a-zA-Z0-9\s-]{6,8})\b/gi, tag: "<SORT_CODE>" },
    { regex: /(swift\s*\/\s*bic|swift|bic)(\s*[:\-]?\s*)([a-zA-Z0-9]{8,11})\b/gi, tag: "<SWIFT_BIC>" },
    { regex: /(crn|company registration number)(\s*[:\-]?\s*)([a-zA-Z0-9]{8})\b/gi, tag: "<CRN>" },
    { regex: /(vat|vat number)(\s*[:\-]?\s*)(gb\s*[0-9\s]{9,12})\b/gi, tag: "<VAT>" },
    { regex: /(frn|firm reference number|\(\s*frn\s*\))(\s*[:\-]?\s*)([a-zA-Z0-9]{6})\b/gi, tag: "<FRN>" },
    { regex: /(nino|national insurance number|\(\s*nino\s*\))(\s*[:\-]?\s*)([a-zA-Z]{2}\s*[0-9\s]{6,8}[a-zA-Z])/gi, tag: "<NINO>" },
    { regex: /(date of birth|dob)(\s*[:\-]?\s*)([0-9]{2}[-\/.\s][0-9]{2}[-\/.\s][0-9]{4})\b/gi, tag: "<DOB>" },
    { regex: /(direct dial|emergency dial|phone|mobile|tel)(\s*[:\-]?\s*)([\+\d\s\-\(\)x]+)\b/gi, tag: "<PHONE>" }
  ];

  for (const { regex, tag } of keywordPatterns) {
    scrubbed = scrubbed.replace(regex, `$1$2${tag}`);
  }

  // =================================================================
  // LAYER 2: STANDARD HIGH-ENTROPY FORMATS
  // =================================================================
  const PII_PATTERNS = {
    IBAN: /\b[a-zA-Z]{2}[0-9]{2}[a-zA-Z0-9]{11,30}\b/gi,
    EMAIL: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/gi,
    CREDIT_CARD: /\b(?:\d[ -]*?){13,16}\b/g,
  };

  scrubbed = scrubbed.replace(PII_PATTERNS.IBAN, "<IBAN>");
  scrubbed = scrubbed.replace(PII_PATTERNS.EMAIL, "<EMAIL>");
  scrubbed = scrubbed.replace(PII_PATTERNS.CREDIT_CARD, "<CREDIT_CARD>");
  scrubbed = scrubbed.replace(/\b(?:\+44|\+1|0)[0-9\s\-\(\)]{8,15}\b/g, "<PHONE>");

  // =================================================================
  // LAYER 3: SCHEDULE & TABULAR ANCHORS (Strictly for Schedule 1 & 2)
  // =================================================================
  const anchorPatterns = [
    {
      regex: /((?:Address|Registered Address)\s*:\s*)(.*?)(?=\s*(?:Email|Direct Dial|Phone|Notices|\||\n|$))/gi,
      tag: "<ADDRESS>"
    },
    {
      regex: /((?:Notices to.*|Notices\/Invoices to.*|Attention|Guarantor Name|.*Signatory|Chief Information Security Officer.*|CISO)\s*:\s*(?:Dr\.?\s+|Mr\.?\s+|Ms\.?\s+|Mrs\.?\s+)?)([A-Z][a-zA-Z\s'-]+?)(?=\s*(?:,|\||Address|Email|-|\n|$))/gi,
      tag: "<PER>"
    },
    {
      regex: /((?:^|\n|\||>)\s*(?:Provider|Client|Company|Contractor|Customer)\s*:\s*)([A-Z][a-zA-Z0-9.,&'-]+(?:\s+[a-zA-Z0-9.,&'-]+){0,5})(?=\s*(?:\||,|;|\n|$|CRN|VAT|FCA))/gi,
      tag: "<ORG>"
    }
  ];

  for (const { regex, tag } of anchorPatterns) {
    scrubbed = scrubbed.replace(regex, `$1${tag}`);
  }

  return scrubbed;
};

export const applyAIRedaction = (text: string, entities: Entity[]): string => {
  if (!entities || entities.length === 0) return text;

  // =================================================================
  // LAYER 4: PROBABILISTIC NER AGGREGATION
  // Includes Safe List to prevent AI from over-redacting legal terms
  // =================================================================
  const normalizedEntities: { entity_group: string; word: string; start?: number; end?: number }[] = [];
  let currentEntity: { entity_group: string; word: string; start?: number; end?: number } | null = null;

  // Prevent token fragmentation bugs on standard contract terms
  const SAFE_WORDS = ["provider", "client", "customer", "company", "contractor", "agreement", "party", "parties"];

  for (const token of entities) {
    const label = token.entity_group || token.entity || "";
    const word = token.word || "";

    if (label.startsWith("B-")) {
      if (currentEntity && !SAFE_WORDS.includes(currentEntity.word.toLowerCase())) {
         normalizedEntities.push(currentEntity);
      }
      currentEntity = {
        entity_group: label.replace("B-", ""),
        word: word.replace(/^##/, ""),
        start: token.start,
        end: token.end,
      };
    } else if (label.startsWith("I-") && currentEntity && currentEntity.entity_group === label.replace("I-", "")) {
      if (word.startsWith("##")) {
        currentEntity.word += word.replace("##", "");
      } else {
        currentEntity.word += " " + word;
      }
      currentEntity.end = token.end !== undefined ? token.end : currentEntity.end;
    } else if (label === "O") {
      if (currentEntity && !SAFE_WORDS.includes(currentEntity.word.toLowerCase())) {
         normalizedEntities.push(currentEntity);
      }
      currentEntity = null;
    } else if (!label.startsWith("B-") && !label.startsWith("I-") && label !== "") {
       if (!SAFE_WORDS.includes(word.replace(/^##/, "").toLowerCase())) {
          normalizedEntities.push({
            entity_group: label,
            word: word,
            start: token.start,
            end: token.end,
          });
       }
    }
  }
  
  if (currentEntity && !SAFE_WORDS.includes(currentEntity.word.toLowerCase())) {
      normalizedEntities.push(currentEntity);
  }

  let finalText = text;
  const withIndices = normalizedEntities.filter(e => typeof e.start === 'number' && typeof e.end === 'number');
  const withoutIndices = normalizedEntities.filter(e => typeof e.start !== 'number' || typeof e.end !== 'number');

  withIndices.sort((a, b) => b.start! - a.start!);
  for (const entity of withIndices) {
    if (entity.entity_group === "PER" || entity.entity_group === "ORG") {
      const prefix = finalText.substring(0, entity.start as number);
      const suffix = finalText.substring(entity.end as number);
      finalText = `${prefix}<${entity.entity_group}>${suffix}`;
    }
  }

  for (const entity of withoutIndices) {
    if (entity.entity_group === "PER" || entity.entity_group === "ORG") {
      if (entity.word && entity.word.length > 1) {
        const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapeRegExp(entity.word), 'gi'); 
        finalText = finalText.replace(regex, `<${entity.entity_group}>`);
      }
    }
  }

  finalText = finalText.replace(/(<PER>\s*)+/g, "<PER> ");
  finalText = finalText.replace(/(<ORG>\s*)+/g, "<ORG> ");

  return finalText;
};