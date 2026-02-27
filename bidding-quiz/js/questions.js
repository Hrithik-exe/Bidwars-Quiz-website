/**
 * Questions Data Module
 * 
 * This module contains the questions data structure for the multiplayer bidding quiz.
 * Questions are stored locally in JavaScript, not in Firebase.
 * Each topic maps to exactly one question with 4 choices and a correct answer index.
 * 
 * Exports:
 * - QUESTIONS: Object mapping topics to question data
 * - getQuestionByTopic: Function to retrieve a question for a specific topic
 */

/**
 * Questions data structure
 * Each topic has:
 * - question: The question text (string)
 * - choices: Array of 4 answer choices (strings)
 * - correctAnswer: Index of the correct answer (0-3)
 */
export const QUESTIONS = {
  "Science & Technology": {
    question: "What year was the first iPhone released?",
    choices: ["2005", "2007", "2009", "2011"],
    correctAnswer: 1
  },
  
  "World History": {
    question: "In what year did World War II end?",
    choices: ["1943", "1944", "1945", "1946"],
    correctAnswer: 2
  },
  
  "Geography": {
    question: "What is the capital city of Australia?",
    choices: ["Sydney", "Melbourne", "Canberra", "Brisbane"],
    correctAnswer: 2
  },
  
  "Literature & Arts": {
    question: "Who wrote the novel '1984'?",
    choices: ["Aldous Huxley", "George Orwell", "Ray Bradbury", "H.G. Wells"],
    correctAnswer: 1
  },
  
  "Sports & Games": {
    question: "How many players are on a basketball team on the court at one time?",
    choices: ["4", "5", "6", "7"],
    correctAnswer: 1
  },
  
  "Music & Entertainment": {
    question: "Which band released the album 'Abbey Road' in 1969?",
    choices: ["The Rolling Stones", "The Beatles", "Led Zeppelin", "Pink Floyd"],
    correctAnswer: 1
  },
  
  "Food & Culture": {
    question: "What is the main ingredient in traditional Japanese miso soup?",
    choices: ["Soy sauce", "Rice", "Fermented soybean paste", "Seaweed"],
    correctAnswer: 2
  },
  
  "Nature & Animals": {
    question: "What is the largest mammal in the world?",
    choices: ["African Elephant", "Blue Whale", "Giraffe", "Polar Bear"],
    correctAnswer: 1
  },
  
  "Mathematics & Logic": {
    question: "What is the value of pi (π) to two decimal places?",
    choices: ["3.12", "3.14", "3.16", "3.18"],
    correctAnswer: 1
  },
  
  "Current Events": {
    question: "In which year did the COVID-19 pandemic begin?",
    choices: ["2018", "2019", "2020", "2021"],
    correctAnswer: 1
  }
};

/**
 * Get a question by topic name
 * @param {string} topic - The topic name
 * @returns {Object|null} Question object with question, choices, and correctAnswer, or null if not found
 */
export function getQuestionByTopic(topic) {
  if (!topic || !QUESTIONS[topic]) {
    console.error(`Question not found for topic: ${topic}`);
    return null;
  }
  
  return {
    topic: topic,
    question: QUESTIONS[topic].question,
    choices: QUESTIONS[topic].choices,
    correctAnswer: QUESTIONS[topic].correctAnswer
  };
}

/**
 * Get all available topics
 * @returns {Array<string>} Array of all topic names
 */
export function getAllTopics() {
  return Object.keys(QUESTIONS);
}

/**
 * Validate that all questions have the correct structure
 * @returns {boolean} True if all questions are valid, false otherwise
 */
export function validateQuestions() {
  const topics = Object.keys(QUESTIONS);
  
  // Check that we have exactly 10 topics
  if (topics.length !== 10) {
    console.error(`Expected 10 topics, found ${topics.length}`);
    return false;
  }
  
  // Validate each question
  for (const topic of topics) {
    const q = QUESTIONS[topic];
    
    // Check that question exists
    if (!q.question || typeof q.question !== 'string') {
      console.error(`Invalid question for topic: ${topic}`);
      return false;
    }
    
    // Check that choices is an array with 4 elements
    if (!Array.isArray(q.choices) || q.choices.length !== 4) {
      console.error(`Invalid choices for topic: ${topic}. Expected 4 choices.`);
      return false;
    }
    
    // Check that all choices are strings
    if (!q.choices.every(choice => typeof choice === 'string')) {
      console.error(`Invalid choice types for topic: ${topic}. All choices must be strings.`);
      return false;
    }
    
    // Check that correctAnswer is a valid index (0-3)
    if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
      console.error(`Invalid correctAnswer for topic: ${topic}. Must be 0-3.`);
      return false;
    }
  }
  
  return true;
}
