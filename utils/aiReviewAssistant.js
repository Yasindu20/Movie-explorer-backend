const axios = require('axios');

class AIReviewAssistant {
  constructor() {
    this.huggingFaceApi = 'https://api-inference.huggingface.co/models/';
    
    // Review writing prompts and templates
    this.reviewTemplates = {
      quick: {
        name: "Quick Review",
        structure: [
          "What did you think overall?",
          "What stood out most?",
          "Would you recommend it?"
        ]
      },
      detailed: {
        name: "Detailed Analysis",
        structure: [
          "Plot and Story",
          "Acting Performances", 
          "Direction and Cinematography",
          "Overall Impression"
        ]
      },
      casual: {
        name: "Casual Review",
        structure: [
          "My honest thoughts...",
          "The good and the bad",
          "Final verdict"
        ]
      },
      critic: {
        name: "Critic Style",
        structure: [
          "Technical Analysis",
          "Artistic Merit",
          "Cultural Impact",
          "Professional Rating"
        ]
      }
    };

    // Writing prompts based on movie aspects
    this.aspectPrompts = {
      plot: [
        "How engaging was the storyline?",
        "Did the plot make sense?",
        "Were there any plot holes?",
        "How was the pacing?"
      ],
      acting: [
        "How were the performances?",
        "Did the actors feel authentic?",
        "Who stood out?",
        "Any weak performances?"
      ],
      direction: [
        "How was the directing?",
        "Did scenes flow well?",
        "Was the vision clear?",
        "Any standout directorial choices?"
      ],
      visuals: [
        "How did it look?",
        "Were the effects convincing?",
        "Was the cinematography good?",
        "Any visual highlights?"
      ],
      audio: [
        "How was the soundtrack?",
        "Did the music fit?",
        "Was the sound design good?",
        "Any memorable audio moments?"
      ]
    };
  }

  // Generate writing suggestions based on user input
  async generateWritingSuggestions(userInput, movieTitle, aspectFocus = null) {
    try {
      // Create context-aware prompts
      const prompts = this.createContextualPrompts(userInput, movieTitle, aspectFocus);
      return prompts;
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return this.getFallbackSuggestions(aspectFocus);
    }
  }

  // Create smart prompts based on context
  createContextualPrompts(userInput, movieTitle, aspectFocus) {
    const suggestions = [];
    
    // General writing suggestions
    if (!userInput || userInput.length < 10) {
      suggestions.push({
        type: 'starter',
        text: `What was your first impression of ${movieTitle}?`,
        category: 'opening'
      });
      
      suggestions.push({
        type: 'starter', 
        text: `How did ${movieTitle} make you feel?`,
        category: 'emotional'
      });
    }
    
    // Aspect-specific suggestions
    if (aspectFocus && this.aspectPrompts[aspectFocus]) {
      this.aspectPrompts[aspectFocus].forEach(prompt => {
        suggestions.push({
          type: 'aspect',
          text: prompt,
          category: aspectFocus
        });
      });
    }
    
    // Content expansion suggestions
    if (userInput && userInput.length > 10) {
      suggestions.push({
        type: 'expansion',
        text: "Can you give a specific example?",
        category: 'detail'
      });
      
      suggestions.push({
        type: 'expansion',
        text: "How does this compare to similar movies?",
        category: 'comparison'
      });
    }
    
    return suggestions;
  }

  // Get review templates
  getReviewTemplates() {
    return this.reviewTemplates;
  }

  // Generate review outline based on template
  generateReviewOutline(templateType, movieTitle, userPreferences = {}) {
    const template = this.reviewTemplates[templateType];
    if (!template) return null;

    return {
      templateName: template.name,
      sections: template.structure.map(section => ({
        title: section,
        placeholder: this.generatePlaceholder(section, movieTitle),
        wordCount: userPreferences.detailed ? 100 : 50
      }))
    };
  }

  generatePlaceholder(section, movieTitle) {
    const placeholders = {
      "What did you think overall?": `Share your overall thoughts about ${movieTitle}...`,
      "What stood out most?": "What was the most memorable part?",
      "Would you recommend it?": "Who would you recommend this to and why?",
      "Plot and Story": "Discuss the storyline without major spoilers...",
      "Acting Performances": "How were the actor performances?",
      "Direction and Cinematography": "Comment on the visual and directorial style...",
      "Overall Impression": "Sum up your final thoughts...",
      "My honest thoughts...": "What's your honest take?",
      "The good and the bad": "What worked and what didn't?",
      "Final verdict": "Your final recommendation...",
      "Technical Analysis": "Analyze the technical aspects...",
      "Artistic Merit": "Discuss the artistic value...",
      "Cultural Impact": "Consider the cultural significance...",
      "Professional Rating": "Provide your professional assessment..."
    };

    return placeholders[section] || `Write about ${section.toLowerCase()}...`;
  }

  // Smart text completion using free models
  async completeText(text, movieTitle, maxLength = 100) {
    try {
      // Use free Hugging Face text generation
      const response = await axios.post(
        this.huggingFaceApi + 'gpt2',
        {
          inputs: text,
          parameters: {
            max_length: maxLength,
            temperature: 0.7,
            return_full_text: false
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      return response.data[0]?.generated_text || null;
    } catch (error) {
      console.error('Text completion error:', error);
      return null;
    }
  }

  // Improve review text using AI
  async improveReviewText(originalText, improvementType = 'clarity') {
    try {
      // For now, provide rule-based improvements
      // You can integrate with free grammar checking APIs later
      
      let improvedText = originalText;
      
      switch (improvementType) {
        case 'clarity':
          improvedText = this.improveClarityRules(originalText);
          break;
        case 'grammar':
          improvedText = this.improveGrammarRules(originalText);
          break;
        case 'engagement':
          improvedText = this.improveEngagementRules(originalText);
          break;
      }
      
      return improvedText;
    } catch (error) {
      console.error('Text improvement error:', error);
      return originalText;
    }
  }

  // Rule-based text improvements
  improveClarityRules(text) {
    return text
      .replace(/\s+/g, ' ') // Remove extra spaces
      .replace(/([.!?])\s*([a-z])/g, '$1 $2') // Fix sentence spacing
      .trim();
  }

  improveGrammarRules(text) {
    return text
      .replace(/\bi\b/g, 'I') // Capitalize I
      .replace(/([.!?])\s*([a-z])/g, (match, p1, p2) => p1 + ' ' + p2.toUpperCase()) // Capitalize after periods
      .replace(/\s+([.!?])/g, '$1'); // Remove spaces before punctuation
  }

  improveEngagementRules(text) {
    // Add some engaging transitions and connectors
    const engagingPhrases = [
      'What really struck me was',
      'I was particularly impressed by',
      'One thing that stood out',
      'The most memorable aspect',
      'What I found fascinating'
    ];
    
    // Simple improvement: suggest engaging starters for bland openings
    if (text.startsWith('The movie') || text.startsWith('This film')) {
      const randomPhrase = engagingPhrases[Math.floor(Math.random() * engagingPhrases.length)];
      return text.replace(/^(The movie|This film)/, randomPhrase);
    }
    
    return text;
  }

  getFallbackSuggestions(aspectFocus) {
    const fallback = [
      {
        type: 'general',
        text: "What was your favorite scene?",
        category: 'favorite'
      },
      {
        type: 'general',
        text: "How did this movie compare to your expectations?",
        category: 'expectations'
      },
      {
        type: 'general',
        text: "What would you tell someone considering watching this?",
        category: 'recommendation'
      }
    ];

    if (aspectFocus && this.aspectPrompts[aspectFocus]) {
      return this.aspectPrompts[aspectFocus].map(prompt => ({
        type: 'aspect',
        text: prompt,
        category: aspectFocus
      }));
    }

    return fallback;
  }

  // Generate review tags based on content
  generateTags(reviewContent, movieGenres = []) {
    const commonTags = [
      'must-watch', 'overrated', 'underrated', 'masterpiece', 'disappointing',
      'entertaining', 'thought-provoking', 'emotional', 'action-packed',
      'visually-stunning', 'great-acting', 'slow-paced', 'fast-paced',
      'plot-twist', 'predictable', 'original', 'cliché', 'rewatchable'
    ];

    const contentLower = reviewContent.toLowerCase();
    const suggestedTags = [];

    // Check for sentiment indicators
    if (contentLower.includes('amazing') || contentLower.includes('excellent') || contentLower.includes('masterpiece')) {
      suggestedTags.push('must-watch', 'masterpiece');
    }
    
    if (contentLower.includes('disappointing') || contentLower.includes('waste of time')) {
      suggestedTags.push('disappointing', 'overrated');
    }

    if (contentLower.includes('emotional') || contentLower.includes('touching')) {
      suggestedTags.push('emotional');
    }

    if (contentLower.includes('visual') || contentLower.includes('cinematography')) {
      suggestedTags.push('visually-stunning');
    }

    // Add genre-based tags
    movieGenres.forEach(genre => {
      if (genre.toLowerCase() === 'action') suggestedTags.push('action-packed');
      if (genre.toLowerCase() === 'drama') suggestedTags.push('thought-provoking');
    });

    return [...new Set(suggestedTags)]; // Remove duplicates
  }
}

module.exports = AIReviewAssistant;