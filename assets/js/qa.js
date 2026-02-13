const qaEnableButton = document.getElementById("qa-enable");
const qaStatus = document.getElementById("qa-status");
const qaQuestion = document.getElementById("qa-question");
const qaAsk = document.getElementById("qa-ask");
const qaAnswer = document.getElementById("qa-answer");

import { contextText } from "./qa-context.js";

let qaPipeline = null;
let isLoading = false;
const modelName = "Xenova/distilgpt2";

const setStatus = (message) => {
  if (qaStatus) qaStatus.textContent = message;
};

const setAnswer = (message) => {
  if (!qaAnswer) return;
  qaAnswer.textContent = "";
  qaAnswer.innerHTML = "";
  if (typeof message === "string") {
    qaAnswer.textContent = message;
  } else if (Array.isArray(message) && message.length > 0) {
    const list = document.createElement("ul");
    list.className = "qa-answers-list";
    message.forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      list.appendChild(li);
    });
    qaAnswer.appendChild(list);
  }
};

const setEnabled = (enabled) => {
  if (qaQuestion) qaQuestion.disabled = !enabled;
  if (qaAsk) qaAsk.disabled = !enabled;
};

const loadModel = async () => {
  if (qaPipeline || isLoading) return;
  isLoading = true;
  setStatus("Loading local FAQ model... This may take a moment.");
  setEnabled(false);

  try {
    const { pipeline } = await import(
      "https://cdn.jsdelivr.net/npm/@xenova/transformers"
    );
    qaPipeline = await pipeline("text-generation", modelName);
    setStatus(`FAQ model ready (${modelName}). Ask a question.`);
    setEnabled(true);
    // Dispatch event so overlay unlock script knows model is loaded
    window.dispatchEvent(new CustomEvent('qa-loaded'));
  } catch (error) {
    console.error(error);
    setStatus("Failed to load model. Try again later.");
    // Still dispatch so overlay unlocks even on error
    window.dispatchEvent(new CustomEvent('qa-loaded'));
  } finally {
    isLoading = false;
  }
};

const scoreSentences = (question, text) => {
  const tokens = question
    .toLowerCase()
    .split(/[^a-z0-9+]+/g)
    .filter((token) => token.length > 2);

  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences
    .map((sentence) => {
      const lower = sentence.toLowerCase();
      const score = tokens.reduce(
        (acc, token) => (lower.includes(token) ? acc + 1 : acc),
        0
      );
      return { sentence, score };
    })
    .sort((a, b) => b.score - a.score);
};

const buildContext = (question) => {
  const scored = scoreSentences(question, contextText);
  const top = scored
    .filter((entry) => entry.score > 0)
    .slice(0, 10)
    .map((entry) => entry.sentence);

  if (!top.length) {
    return contextText;
  }

  return top.join(" ");
};

/** Return top scored sentences as separate passages for multi-answer display */
const getTopPassages = (question, maxPassages = 3) => {
  const scored = scoreSentences(question, contextText);
  return scored
    .filter((entry) => entry.score > 0)
    .slice(0, maxPassages)
    .map((entry) => entry.sentence.trim());
};

/** Parse model output into 1–3 distinct answers (numbered list or single block) */
const parseMultipleAnswers = (raw) => {
  const text = raw.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return [];

  const byNumber = text.split(/\s*\d+[.)]\s+/).map((s) => s.trim()).filter((s) => s.length > 8);
  if (byNumber.length > 1) return byNumber;

  const byBullet = text.split(/\s*[•\-]\s+/).map((s) => s.trim()).filter((s) => s.length > 8);
  if (byBullet.length > 1) return byBullet;

  return [text];
};

const askQuestion = async () => {
  if (!qaPipeline || !qaQuestion) return;
  const question = qaQuestion.value.trim();
  if (!question) {
    setAnswer("Enter a question to get started.");
    return;
  }

  setAnswer("Thinking...");
  try {
    const focusedContext = buildContext(question);
    const prompt = `You are a helpful assistant answering questions about William Sander.
Use only the context below. If the answer is not in the context, say you do not know.
When the context supports multiple distinct points, give 1–3 short answers as a numbered list (1. ... 2. ...). Otherwise give one answer.

Context:
${focusedContext}

Question: ${question}
Answer:`;

    const result = await qaPipeline(prompt, {
      max_new_tokens: 120,
      do_sample: false,
      temperature: 0.2,
    });
    const raw = Array.isArray(result) ? result[0]?.generated_text : "";
    const answerBlock = raw.split("Answer:").pop()?.trim() || "";
    const answers = parseMultipleAnswers(answerBlock);

    if (answers.length === 0) {
      const passages = getTopPassages(question, 2);
      if (passages.length > 0) {
        setAnswer(passages.map((p) => (p.length > 200 ? p.slice(0, 200) + "…" : p)));
      } else {
        setAnswer("I don't know based on the provided context.");
      }
    } else if (answers.length === 1) {
      setAnswer(answers[0]);
    } else {
      setAnswer(answers);
    }
  } catch (error) {
    console.error(error);
    setAnswer("Something went wrong. Please try again.");
  }
};

// Wait for DOM, then attach handlers
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
