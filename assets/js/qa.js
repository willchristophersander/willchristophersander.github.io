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
  if (qaAnswer) qaAnswer.textContent = message;
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
  } catch (error) {
    console.error(error);
    setStatus("Failed to load model. Try again later.");
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

Context:
${focusedContext}

Question: ${question}
Answer:`;

    const result = await qaPipeline(prompt, {
      max_new_tokens: 80,
      do_sample: false,
      temperature: 0.2,
    });
    const raw = Array.isArray(result) ? result[0]?.generated_text : "";
    const answer = raw.split("Answer:").pop()?.trim() || "";
    setAnswer(
      answer.length
        ? answer
        : "I don't know based on the provided context."
    );
  } catch (error) {
    console.error(error);
    setAnswer("Something went wrong. Please try again.");
  }
};

if (qaEnableButton) {
  qaEnableButton.addEventListener("click", () => {
    qaEnableButton.disabled = true;
    qaEnableButton.textContent = "Loading...";
    loadModel().finally(() => {
      qaEnableButton.textContent = "Enabled";
    });
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
