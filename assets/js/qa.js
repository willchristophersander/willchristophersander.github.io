const qaEnableButton = document.getElementById("qa-enable");
const qaStatus = document.getElementById("qa-status");
const qaQuestion = document.getElementById("qa-question");
const qaAsk = document.getElementById("qa-ask");
const qaAnswer = document.getElementById("qa-answer");

import { contextText } from "./qa-context.js";

let isEnabled = false;

const setStatus = (message) => {
  if (qaStatus) qaStatus.textContent = message;
};

// Map content topics to source pages
const getSourceLinks = (text) => {
  const lower = text.toLowerCase();
  const links = [];
  
  if (lower.includes('project') || lower.includes('canvas') || lower.includes('emotion') || 
      lower.includes('e-ink') || lower.includes('calendar') || lower.includes('raster') ||
      lower.includes('graphics') || lower.includes('speech') || lower.includes('c++')) {
    links.push({ url: 'projects.html', label: 'Projects' });
  }
  
  if (lower.includes('census') || lower.includes('automation') || lower.includes('engineer') ||
      lower.includes('experience') || lower.includes('work') || lower.includes('employment') ||
      lower.includes('ticket') || lower.includes('device')) {
    links.push({ url: 'experience.html', label: 'Experience' });
  }
  
  if (lower.includes('education') || lower.includes('degree') || lower.includes('university') ||
      lower.includes('vermont') || lower.includes('coursework') || lower.includes('graduate')) {
    links.push({ url: 'coursework.html', label: 'Coursework' });
  }
  
  if (lower.includes('resume') || lower.includes('cv')) {
    links.push({ url: 'resume.html', label: 'Resume' });
  }
  
  if (lower.includes('email') || lower.includes('contact') || lower.includes('phone') ||
      lower.includes('linkedin') || lower.includes('github')) {
    links.push({ url: 'contact.html', label: 'Contact' });
  }
  
  // Remove duplicates
  const seen = new Set();
  return links.filter(link => {
    if (seen.has(link.url)) return false;
    seen.add(link.url);
    return true;
  });
};

const setAnswer = (message, sources = null) => {
  if (!qaAnswer) return;
  qaAnswer.textContent = "";
  qaAnswer.innerHTML = "";
  
  // Auto-detect sources if not provided
  if (!sources) {
    const text = Array.isArray(message) ? message.join(' ') : message;
    sources = getSourceLinks(text);
  }
  
  if (typeof message === "string") {
    const p = document.createElement("p");
    
    // Linkify URLs in the text
    const parts = linkifyText(message);
    parts.forEach(part => {
      if (part.type === 'text') {
        p.appendChild(document.createTextNode(part.content));
      } else {
        const a = document.createElement("a");
        a.href = part.href;
        a.textContent = part.content;
        a.className = "text-link";
        p.appendChild(a);
      }
    });
    
    qaAnswer.appendChild(p);
    
    // Add source links
    if (sources.length > 0) {
      const sourceDiv = document.createElement("div");
      sourceDiv.className = "qa-sources";
      sourceDiv.style.marginTop = "0.75rem";
      sourceDiv.style.paddingTop = "0.75rem";
      sourceDiv.style.borderTop = "1px solid var(--border)";
      sourceDiv.style.fontSize = "0.875rem";
      sourceDiv.style.color = "var(--muted)";
      
      const sourceLabel = document.createElement("span");
      sourceLabel.textContent = "Sources: ";
      sourceDiv.appendChild(sourceLabel);
      
      sources.forEach((link, idx) => {
        const a = document.createElement("a");
        a.href = link.url;
        a.textContent = link.label;
        a.className = "text-link";
        a.style.marginRight = "0.5rem";
        sourceDiv.appendChild(a);
        if (idx < sources.length - 1) {
          const sep = document.createTextNode(", ");
          sourceDiv.appendChild(sep);
        }
      });
      
      qaAnswer.appendChild(sourceDiv);
    }
  } else if (Array.isArray(message) && message.length > 0) {
    const list = document.createElement("ul");
    list.className = "qa-answers-list";
    message.forEach((text) => {
      const li = document.createElement("li");
      
      // Linkify URLs in list items too
      const parts = linkifyText(text);
      parts.forEach(part => {
        if (part.type === 'text') {
          li.appendChild(document.createTextNode(part.content));
        } else {
          const a = document.createElement("a");
          a.href = part.href;
          a.textContent = part.content;
          a.className = "text-link";
          li.appendChild(a);
        }
      });
      
      list.appendChild(li);
    });
    qaAnswer.appendChild(list);
    
    // Add source links for list answers
    if (sources.length > 0) {
      const sourceDiv = document.createElement("div");
      sourceDiv.className = "qa-sources";
      sourceDiv.style.marginTop = "0.75rem";
      sourceDiv.style.paddingTop = "0.75rem";
      sourceDiv.style.borderTop = "1px solid var(--border)";
      sourceDiv.style.fontSize = "0.875rem";
      sourceDiv.style.color = "var(--muted)";
      
      const sourceLabel = document.createElement("span");
      sourceLabel.textContent = "Sources: ";
      sourceDiv.appendChild(sourceLabel);
      
      sources.forEach((link, idx) => {
        const a = document.createElement("a");
        a.href = link.url;
        a.textContent = link.label;
        a.className = "text-link";
        a.style.marginRight = "0.5rem";
        sourceDiv.appendChild(a);
        if (idx < sources.length - 1) {
          const sep = document.createTextNode(", ");
          sourceDiv.appendChild(sep);
        }
      });
      
      qaAnswer.appendChild(sourceDiv);
    }
  }
};

const setEnabled = (enabled) => {
  isEnabled = enabled;
  if (qaQuestion) qaQuestion.disabled = !enabled;
  if (qaAsk) qaAsk.disabled = !enabled;
};

const loadModel = async () => {
  setStatus("Ready. Ask a question.");
  setEnabled(true);
  window.dispatchEvent(new CustomEvent('qa-loaded'));
};

// Synonym mapping for better matching
const synonyms = {
  'will': ['william', 'williams'],
  'william': ['will', 'williams'],
  'email': ['contact', 'e-mail'],
  'work': ['employment', 'job', 'experience', 'worked'],
  'experience': ['work', 'employment', 'job'],
  'project': ['projects', 'work'],
  'degree': ['education', 'graduate', 'graduation'],
  'graduate': ['degree', 'graduation'],
  'languages': ['language', 'programming'],
  'python': ['py'],
  'c++': ['cpp', 'c plus plus'],
  'accuracy': ['performance', 'result'],
  'census': ['census bureau', 'us census'],
  'resume': ['cv', 'curriculum vitae', 'resume', 'resumé'],
};

const expandSynonyms = (term) => {
  const lower = term.toLowerCase();
  const expanded = [lower];
  if (synonyms[lower]) {
    expanded.push(...synonyms[lower]);
  }
  return expanded;
};

// Extract meaningful tokens and phrases from question
const extractQueryTerms = (question) => {
  const lower = question.toLowerCase();
  
  // Multi-word phrases (common patterns) - with synonyms
  const phrases = [];
  const phrasePatterns = [
    { pattern: /machine learning|ml/gi, synonyms: ['ml', 'deep learning', 'neural network'] },
    { pattern: /speech emotion|emotion recognition/gi, synonyms: ['emotion', 'ser'] },
    { pattern: /census bureau|census/gi, synonyms: ['us census', 'federal'] },
    { pattern: /computer science|cs/gi, synonyms: ['cs', 'computer science'] },
    { pattern: /software engineering|software engineer/gi, synonyms: ['software', 'engineering'] },
    { pattern: /work authorization|visa/gi, synonyms: ['authorization', 'sponsorship'] },
    { pattern: /email|contact/gi, synonyms: ['e-mail', 'email address'] },
    { pattern: /degree|graduate|graduation/gi, synonyms: ['education', 'bachelor'] },
    { pattern: /experience|work|employment/gi, synonyms: ['job', 'worked', 'employer'] },
    { pattern: /project|projects/gi, synonyms: ['work', 'build'] },
    { pattern: /accuracy|performance/gi, synonyms: ['result', 'score'] },
    { pattern: /programming languages?|languages?/gi, synonyms: ['language', 'tech'] },
    { pattern: /resume|cv|curriculum vitae/gi, synonyms: ['resume', 'cv', 'resumé'] },
  ];
  
  phrasePatterns.forEach(({ pattern, synonyms: syns }) => {
    const matches = lower.match(pattern);
    if (matches) {
      phrases.push(...matches.map(m => m.toLowerCase()));
      if (syns) phrases.push(...syns);
    }
  });
  
  // Single tokens (words and numbers) with synonym expansion
  const rawTokens = lower
    .replace(/[^\w\s+]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 || /^\d+$/.test(token))
    .filter(token => !['the', 'is', 'are', 'was', 'were', 'what', 'where', 'when', 'who', 'how', 'does', 'do', 'did', 'would', 'can', 'could', 'should', 'may', 'might', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'from', 'about', 'have', 'has', 'had'].includes(token));
  
  const tokens = [];
  rawTokens.forEach(token => {
    tokens.push(...expandSynonyms(token));
  });
  
  return { tokens: [...new Set(tokens)], phrases: [...new Set(phrases)] };
};

// Score passages (windows of text) instead of just sentences
const scorePassages = (question, text, windowSize = 2) => {
  const { tokens, phrases } = extractQueryTerms(question);
  const lowerText = text.toLowerCase();
  
  // Split into sentences
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
  
  // Create sliding windows of sentences
  const passages = [];
  for (let i = 0; i < sentences.length; i++) {
    const window = sentences.slice(i, i + windowSize).join(" ");
    passages.push({
      text: window,
      startIdx: i,
      score: 0
    });
  }
  
  // Score each passage
  passages.forEach(passage => {
    const lower = passage.text.toLowerCase();
    
    // Score phrase matches (higher weight)
    phrases.forEach(phrase => {
      if (lower.includes(phrase)) {
        passage.score += 3;
      }
    });
    
    // Score token matches
    tokens.forEach(token => {
      if (lower.includes(token)) {
        passage.score += 1;
      }
    });
    
    // Bonus for multiple matches in same passage
    const matchCount = phrases.filter(p => lower.includes(p)).length + 
                      tokens.filter(t => lower.includes(t)).length;
    if (matchCount > 3) {
      passage.score += 2;
    }
    
    // Bonus for exact question word matches at start of passage
    const questionWords = question.toLowerCase().split(/\s+/).slice(0, 3);
    questionWords.forEach(word => {
      if (lower.startsWith(word) || lower.includes(` ${word} `)) {
        passage.score += 1;
      }
    });
  });
  
  return passages
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score);
};

// Extract specific facts (emails, numbers, dates) from context
const extractFacts = (question) => {
  const lowerQ = question.toLowerCase();
  const facts = [];
  
  // Email extraction - return just the email if question asks for it
  if ((lowerQ.includes('email') || lowerQ.includes('contact')) && 
      (lowerQ.includes('what') || lowerQ.includes('will') || lowerQ.includes('william'))) {
    const emailMatch = contextText.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) return [emailMatch[0]];
  }
  
  // Accuracy/percentage extraction
  if (lowerQ.includes('accuracy') || lowerQ.includes('percent') || lowerQ.includes('%')) {
    const percentMatches = contextText.match(/\d+\.?\d*%/g);
    if (percentMatches) {
      // If question asks for specific class (4-class, 6-class), try to find context
      if (lowerQ.includes('4') || lowerQ.includes('four')) {
        const context = contextText.match(/81\.29%[^.]*(?:4-class|4 class)[^.]*/i) ||
                       contextText.match(/(?:4-class|4 class)[^.]*81\.29%[^.]*/i);
        if (context) return [context[0].trim()];
        return ['81.29%'];
      }
      if (lowerQ.includes('6') || lowerQ.includes('six')) {
        const context = contextText.match(/76\.76%[^.]*(?:6-class|6 class)[^.]*/i) ||
                       contextText.match(/(?:6-class|6 class)[^.]*76\.76%[^.]*/i);
        if (context) return [context[0].trim()];
        return ['76.76%'];
      }
      return percentMatches.slice(0, 2);
    }
  }
  
  // Degree/graduation date
  if ((lowerQ.includes('degree') || lowerQ.includes('graduate') || lowerQ.includes('graduation')) && 
      lowerQ.includes('when')) {
    const degreeMatch = contextText.match(/B\.?S\.?\s+in\s+Computer\s+Science[^.]*May\s+\d{4}/i) ||
                       contextText.match(/Computer\s+Science[^.]*May\s+\d{4}/i) ||
                       contextText.match(/May\s+2026/);
    if (degreeMatch) {
      const full = degreeMatch[0].match(/B\.?S\.?\s+in\s+Computer\s+Science[^.]*May\s+\d{4}/i) ||
                   degreeMatch[0].match(/Computer\s+Science[^.]*May\s+\d{4}/i);
      if (full) return [full[0].trim()];
      return ['B.S. in Computer Science, expected May 2026'];
    }
  }
  
  // Work/employment location
  if ((lowerQ.includes('work') || lowerQ.includes('employ') || lowerQ.includes('where')) && 
      lowerQ.includes('2020')) {
    const workMatch = contextText.match(/U\.?S\.?\s+Census\s+Bureau[^.]*(?:IT|Automation|Engineer)[^.]*/i) ||
                     contextText.match(/(?:IT|Automation|Engineer)[^.]*Census\s+Bureau[^.]*/i);
    if (workMatch) return [workMatch[0].trim()];
  }
  
  // Resume/CV questions - return link to resume
  if (lowerQ.includes('resume') || lowerQ.includes('cv') || lowerQ.includes('curriculum vitae')) {
    if (lowerQ.includes('where') || lowerQ.includes('link') || lowerQ.includes('see') || lowerQ.includes('view')) {
      return ['Resume available at resume.html. Full resume content is also available in this context.'];
    }
  }
  
  return [];
};

const getTopPassages = (question, maxPassages = 3) => {
  // Try fact extraction first (for specific fact questions)
  const facts = extractFacts(question);
  if (facts.length > 0) {
    return facts;
  }
  
  // Otherwise use passage scoring
  const scored = scorePassages(question, contextText, 2);
  
  if (scored.length === 0) {
    return [];
  }
  
  return scored
    .slice(0, maxPassages)
    .map(entry => entry.text.trim());
};

// Convert URLs in text to clickable links
const linkifyText = (text) => {
  // Match URLs (http/https, file paths like resume.html, email addresses)
  const urlPattern = /(https?:\/\/[^\s]+|[\w-]+\.html|[\w.-]+@[\w.-]+\.\w+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = urlPattern.exec(text)) !== null) {
    // Add text before URL
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    
    // Add link
    const url = match[0];
    let href = url;
    if (!href.startsWith('http')) {
      if (href.includes('@')) {
        href = 'mailto:' + href;
      } else if (href.endsWith('.html')) {
        href = href; // Already relative path
      }
    }
    
    parts.push({ type: 'link', content: url, href: href });
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }
  
  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
};

const askQuestion = async () => {
  if (!isEnabled || !qaQuestion) return;
  const question = qaQuestion.value.trim();
  if (!question) {
    setAnswer("Enter a question to get started.");
    return;
  }

  setAnswer("Searching...");
  await new Promise(resolve => setTimeout(resolve, 200));
  
  try {
    const passages = getTopPassages(question, 3);
    
    if (passages.length === 0) {
      setAnswer("I couldn't find relevant information to answer that question. Try rephrasing or asking about education, experience, projects, or skills.");
    } else {
      // Combine all passages for source detection
      const combinedText = Array.isArray(passages) ? passages.join(' ') : passages;
      const sources = getSourceLinks(combinedText);
      
      if (passages.length === 1) {
        const text = passages[0];
        const displayText = text.length > 500 ? text.slice(0, 500) + "…" : text;
        setAnswer(displayText, sources);
      } else {
        setAnswer(passages.map((p) => (p.length > 300 ? p.slice(0, 300) + "…" : p)), sources);
      }
    }
  } catch (error) {
    console.error(error);
    setAnswer("Something went wrong. Please try again.");
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  if (qaEnableButton) {
    qaEnableButton.addEventListener("click", () => {
      loadModel();
    });
  }

  if (qaAsk) {
    qaAsk.addEventListener("click", askQuestion);
  }

  if (qaQuestion) {
    qaQuestion.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        askQuestion();
      }
    });
  }
}
