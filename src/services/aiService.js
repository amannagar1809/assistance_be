const axios = require('axios');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

class AIService {
  constructor() {
    this.apis = [
      {
        name: 'openai',
        priority: 1,
        endpoint: 'https://api.openai.com/v1/chat/completions',
        requiredKey: 'OPENAI_API_KEY',
      },
      {
        name: 'google',
        priority: 2,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        requiredKey: 'GOOGLE_API_KEY',
      },
      {
        name: 'huggingface',
        priority: 3,
        endpoint: 'https://api-inference.huggingface.co/models/google/flan-t5-xxl',
        requiredKey: 'HF_API_KEY',
      },
    ];

    this.apiConfig = {
      openai: {
        model: 'gpt-3.5-turbo',
        maxTokens: 150,
        temperature: 0.7,
      },
      google: {
        model: 'gemini-pro',
        maxOutputTokens: 100,
        temperature: 0.7,
      },
      huggingface: {
        model: 'google/flan-t5-xxl',
        parameters: {
          max_length: 100,
          temperature: 0.7,
        },
      },
    };
  }

  async getAnswer(question) {
    // Check cache first
    const cached = cache.get(this.normalizeQuestion(question));
    if (cached) return { ...cached, source: 'cache' };

    // Try APIs in priority order
    for (const api of this.apis.sort((a, b) => a.priority - b.priority)) {
      try {
        // Check if API key is available
        const apiKey = process.env[api.requiredKey];
        console.log(`Checking ${api.name} API key: ${api.requiredKey} = ${apiKey ? '***' + apiKey.slice(-4) : 'NOT SET'}`);

        if (!apiKey) {
          console.log(`Skipping ${api.name}: API key not configured`);
          continue;
        }

        console.log(`Trying ${api.name} API...`);
        const result = await this.callAPI(api, question);
        if (result && result.answer) {
          // Cache the result
          cache.set(this.normalizeQuestion(question), result);
          console.log(`Success from ${api.name}: ${result.answer.substring(0, 50)}...`);
          return { ...result, source: api.name };
        } else {
          console.log(`${api.name} API returned no answer`);
        }
      } catch (error) {
        console.error(`${api.name} API failed:`, error.message);
        continue;
      }
    }

    // All AI services failed, use fallback
    console.log('All AI APIs failed, trying fallback...');
    return await this.fallbackAnswer(question);
  }

  async callAPI(api, question) {
    const startTime = Date.now();

    try {
      switch (api.name) {
      case 'openai':
        return await this.callOpenAI(question);
      case 'google':
        return await this.callGoogleAI(question);
      case 'huggingface':
        return await this.callHuggingFace(question);
      default:
        return null;
      }
    } finally {
      const responseTime = Date.now() - startTime;
      console.log(`${api.name} response time: ${responseTime}ms`);
    }
  }

  async callOpenAI(question) {
    const response = await axios.post(
      this.apis[0].endpoint, // OpenAI endpoint
      {
        model: this.apiConfig.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Provide concise, clear answers in simple language. Keep responses under 150 words.',
          },
          {
            role: 'user',
            content: question,
          },
        ],
        max_tokens: this.apiConfig.openai.maxTokens,
        temperature: this.apiConfig.openai.temperature,
        n: 1,
        stream: false, // Set to true for streaming responses
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 seconds timeout
        validateStatus: (status) => status < 500, // Accept 400-level errors
      },
    );

    return {
      answer: response.data.choices[0].message.content.trim(),
      rawResponse: response.data,
    };
  }

  async callGoogleAI(question) {
    try {
      console.log('Making Google API call...');
      const response = await axios.post(
        `${this.apis[1].endpoint}?key=${process.env.GOOGLE_API_KEY}`,
        {
          contents: [
            {
              parts: [
                {
                  text: `Answer this question clearly and concisely: ${question}`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: this.apiConfig.google.maxOutputTokens,
            temperature: this.apiConfig.google.temperature,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      console.log('Google API response status:', response.status);
      console.log('Google API response data:', JSON.stringify(response.data, null, 2));

      const answer = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!answer) {
        console.error('No answer in Google response:', response.data);
        throw new Error('Invalid response format from Google AI');
      }

      console.log('Google API answer:', answer.substring(0, 100) + '...');
      return {
        answer: answer.trim(),
        rawResponse: response.data,
      };
    } catch (error) {
      console.error('Google API call failed:', error.message);
      if (error.response) {
        console.error('Google API error response:', error.response.status, error.response.data);
      }
      throw error;
    }
  }

  async callHuggingFace(question) {
    const response = await axios.post(
      this.apis[2].endpoint,
      {
        inputs: question,
        parameters: {
          max_length: this.apiConfig.huggingface.parameters.max_length,
          temperature: this.apiConfig.huggingface.parameters.temperature,
          do_sample: true,
          top_p: 0.95,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000, // HuggingFace can be slower
        validateStatus: (status) => status < 500,
      },
    );

    // HuggingFace returns an array of generated texts
    let answer = response.data?.[0]?.generated_text;

    if (Array.isArray(response.data)) {
      answer = response.data[0]?.generated_text || '';
    }

    return {
      answer: answer.trim(),
      rawResponse: response.data,
    };
  }

  // Alternative free APIs (no key required or free tier available)
  async fallbackAnswer(question) {
    console.log('Using fallback APIs...');

    // Strategy 1: Try multiple free APIs in parallel
    const fallbackAPIs = [
      this.tryDuckDuckGo(question),
      this.tryWikipedia(question),
      this.tryWolframAlpha(question), // Free tier available
    ];

    // Try all fallbacks in parallel, take first successful one
    const results = await Promise.allSettled(fallbackAPIs);

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        console.log('Fallback succeeded');
        return {
          ...result.value,
          source: 'fallback',
        };
      }
    }

    // Strategy 2: Use a simple rule-based response
    return {
      answer: this.generateGenericAnswer(question),
      source: 'generic',
    };
  }

  async tryDuckDuckGo(question) {
    try {
      const response = await axios.get(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(question)}&format=json&pretty=1&no_html=1&skip_disambig=1`,
        {
          timeout: 3000,
          headers: {
            'Accept': 'application/json',
          },
        },
      );

      if (response.data.AbstractText) {
        return {
          answer: response.data.AbstractText.substring(0, 200),
          rawResponse: response.data,
        };
      }

      // Try related topics
      if (response.data.RelatedTopics && response.data.RelatedTopics.length > 0) {
        const firstTopic = response.data.RelatedTopics[0];
        const text = firstTopic.Text || firstTopic.FirstURL || '';
        if (text) {
          return {
            answer: text.substring(0, 200),
            rawResponse: response.data,
          };
        }
      }
    } catch (error) {
      console.log('DuckDuckGo fallback failed:', error.message);
    }
    return null;
  }

  async tryWikipedia(question) {
    try {
      const response = await axios.get(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(question)}&limit=1&format=json`,
        { timeout: 3000 },
      );

      if (response.data && response.data[2] && response.data[2][0]) {
        return {
          answer: response.data[2][0].substring(0, 200),
          rawResponse: response.data,
        };
      }
    } catch (error) {
      console.log('Wikipedia fallback failed:', error.message);
    }
    return null;
  }

  async tryWolframAlpha(question) {
    try {
      // Note: WolframAlpha requires an app ID (free tier available)
      const appId = process.env.WOLFRAM_APP_ID;
      if (!appId) return null;

      const response = await axios.get(
        `http://api.wolframalpha.com/v1/result?appid=${appId}&i=${encodeURIComponent(question)}`,
        { timeout: 5000 },
      );

      if (response.data) {
        return {
          answer: response.data.substring(0, 200),
          rawResponse: response.data,
        };
      }
    } catch (error) {
      console.log('WolframAlpha fallback failed:', error.message);
    }
    return null;
  }

  generateGenericAnswer(question) {
    // Simple rule-based responses
    const questionLower = question.toLowerCase();

    if (questionLower.includes('what is') || questionLower.includes('who is')) {
      return 'This appears to be asking for a definition or explanation. For specific information, please try rephrasing your question or check reliable sources.';
    } else if (questionLower.includes('how to') || questionLower.includes('how do i')) {
      return 'This seems to be asking for instructions. For step-by-step guidance, please provide more specific details about what you\'re trying to accomplish.';
    } else if (questionLower.includes('why')) {
      return 'This question is asking for reasons or explanations. The answer would depend on specific context and details not provided.';
    } else {
      return 'I understand your question. For the most accurate and detailed answer, please ensure you have a stable internet connection and try again with more specific details.';
    }
  }

  normalizeQuestion(question) {
    return question
      .toLowerCase()
      .trim()
      .replace(/[^\w\s?]/g, '') // Remove special chars except ?
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .replace(/\?+$/, '?')     // Ensure only one ? at end
      .substring(0, 500);       // Limit length
  }

  // Health check for all APIs
  async checkAPIHealth() {
    const healthStatus = {};

    for (const api of this.apis) {
      try {
        const hasKey = !!process.env[api.requiredKey];
        healthStatus[api.name] = {
          configured: hasKey,
          healthy: hasKey ? await this.testAPI(api) : false,
          priority: api.priority,
        };
      } catch (error) {
        healthStatus[api.name] = {
          configured: !!process.env[api.requiredKey],
          healthy: false,
          error: error.message,
        };
      }
    }

    return healthStatus;
  }

  async testAPI(api) {
    try {
      // Test with a simple question
      const testQuestion = 'What is 2+2?';
      await this.callAPI(api, testQuestion);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new AIService();
