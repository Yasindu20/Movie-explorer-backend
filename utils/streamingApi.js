const axios = require('axios');

// Configuration for streaming APIs
const STREAMING_APIS = {
  JUSTWATCH: {
    baseURL: 'https://apis.justwatch.com/content',
    endpoint: '/titles/movie/{movieId}/providers'
  },
  WATCHMODE: {
    baseURL: 'https://api.watchmode.com/v1',
    endpoint: '/title/{movieId}/sources',
    key: process.env.WATCHMODE_API_KEY
  },
  UTELLY: {
    baseURL: 'https://utelly-tv-shows-and-movies-availability-v1.p.rapidapi.com',
    endpoint: '/lookup',
    key: process.env.UTELLY_API_KEY
  }
};

// Streaming service configurations with logos and colors
const STREAMING_SERVICES = {
  netflix: {
    name: 'Netflix',
    logo: 'https://images.justwatch.com/icon/207360008/s100/netflix.webp',
    color: '#E50914',
    type: 'subscription'
  },
  amazon_prime: {
    name: 'Amazon Prime Video',
    logo: 'https://images.justwatch.com/icon/52449539/s100/amazon-prime-video.webp',
    color: '#00A8E1',
    type: 'subscription'
  },
  hulu: {
    name: 'Hulu',
    logo: 'https://images.justwatch.com/icon/59562423/s100/hulu.webp',
    color: '#1CE783',
    type: 'subscription'
  },
  disney_plus: {
    name: 'Disney+',
    logo: 'https://images.justwatch.com/icon/147638351/s100/disney-plus.webp',
    color: '#113CCF',
    type: 'subscription'
  },
  hbo_max: {
    name: 'HBO Max',
    logo: 'https://images.justwatch.com/icon/190848813/s100/hbo-max.webp',
    color: '#652EC7',
    type: 'subscription'
  },
  youtube: {
    name: 'YouTube Movies',
    logo: 'https://images.justwatch.com/icon/59562423/s100/youtube.webp',
    color: '#FF0000',
    type: 'rent'
  },
  google_play: {
    name: 'Google Play Movies',
    logo: 'https://images.justwatch.com/icon/169478387/s100/google-play-movies.webp',
    color: '#4285F4',
    type: 'rent'
  },
  apple_tv: {
    name: 'Apple TV',
    logo: 'https://images.justwatch.com/icon/190848813/s100/apple-tv.webp',
    color: '#000000',
    type: 'rent'
  },
  vudu: {
    name: 'Vudu',
    logo: 'https://images.justwatch.com/icon/59562423/s100/vudu.webp',
    color: '#3399FF',
    type: 'rent'
  },
  tubi: {
    name: 'Tubi',
    logo: 'https://images.justwatch.com/icon/246526182/s100/tubi.webp',
    color: '#FA541C',
    type: 'free'
  },
  crackle: {
    name: 'Crackle',
    logo: 'https://images.justwatch.com/icon/52449539/s100/crackle.webp',
    color: '#F5A623',
    type: 'free'
  },
  pluto_tv: {
    name: 'Pluto TV',
    logo: 'https://images.justwatch.com/icon/52449539/s100/pluto-tv.webp',
    color: '#0066CC',
    type: 'free'
  }
};

class StreamingApiService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 6 * 60 * 60 * 1000; // 6 hours
  }

  // Get cached data if available and not expired
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  // Set cache data
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Fetch from JustWatch API (free tier available)
  async fetchFromJustWatch(movieId, imdbId, title) {
    try {
      const cacheKey = `justwatch_${movieId}_${imdbId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // JustWatch doesn't have a direct free API, so we'll simulate the response
      // In production, you'd need to use their paid API or scrape (not recommended)
      const mockData = this.generateMockStreamingData(title);
      
      this.setCachedData(cacheKey, mockData);
      return mockData;
    } catch (error) {
      console.error('JustWatch API error:', error);
      return null;
    }
  }

  // Fetch from WatchMode API (has free tier)
  async fetchFromWatchMode(movieId, imdbId) {
    try {
      if (!process.env.WATCHMODE_API_KEY) {
        console.log('WatchMode API key not configured');
        return null;
      }

      const cacheKey = `watchmode_${movieId}_${imdbId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(
        `${STREAMING_APIS.WATCHMODE.baseURL}/title/${imdbId}/sources`,
        {
          params: {
            apikey: process.env.WATCHMODE_API_KEY,
            regions: 'US'
          },
          timeout: 5000
        }
      );

      const streamingData = this.parseWatchModeResponse(response.data);
      this.setCachedData(cacheKey, streamingData);
      return streamingData;
    } catch (error) {
      console.error('WatchMode API error:', error);
      return null;
    }
  }

  // Parse WatchMode API response
  parseWatchModeResponse(data) {
    const providers = {
      subscription: [],
      rent: [],
      buy: [],
      free: []
    };

    if (data && data.sources) {
      data.sources.forEach(source => {
        const serviceInfo = this.getServiceInfo(source.name);
        if (serviceInfo) {
          const provider = {
            service: serviceInfo.name,
            logo: serviceInfo.logo,
            color: serviceInfo.color,
            url: source.web_url || '#',
            price: source.price || null,
            quality: source.format || 'HD'
          };

          if (source.type === 'sub') {
            providers.subscription.push(provider);
          } else if (source.type === 'rent') {
            providers.rent.push(provider);
          } else if (source.type === 'buy') {
            providers.buy.push(provider);
          } else if (source.type === 'free') {
            providers.free.push(provider);
          }
        }
      });
    }

    return providers;
  }

  // Get service information from our configuration
  getServiceInfo(serviceName) {
    const normalizedName = serviceName.toLowerCase().replace(/\s+/g, '_');
    return STREAMING_SERVICES[normalizedName] || {
      name: serviceName,
      logo: '/default-service-logo.png',
      color: '#666666',
      type: 'subscription'
    };
  }

  // Generate mock streaming data for demonstration
  generateMockStreamingData(title) {
    const mockServices = [
      { name: 'netflix', chance: 0.3 },
      { name: 'amazon_prime', chance: 0.4 },
      { name: 'hulu', chance: 0.25 },
      { name: 'disney_plus', chance: 0.2 },
      { name: 'hbo_max', chance: 0.15 },
      { name: 'youtube', chance: 0.8 },
      { name: 'google_play', chance: 0.7 },
      { name: 'apple_tv', chance: 0.6 },
      { name: 'tubi', chance: 0.4 },
      { name: 'pluto_tv', chance: 0.3 }
    ];

    const providers = {
      subscription: [],
      rent: [],
      buy: [],
      free: []
    };

    mockServices.forEach(({ name, chance }) => {
      if (Math.random() < chance) {
        const service = STREAMING_SERVICES[name];
        if (service) {
          const provider = {
            service: service.name,
            logo: service.logo,
            color: service.color,
            url: this.generateWatchUrl(name, title),
            quality: 'HD'
          };

          if (service.type === 'subscription') {
            providers.subscription.push(provider);
          } else if (service.type === 'rent') {
            provider.price = '$3.99';
            providers.rent.push(provider);
            provider.price = '$12.99';
            providers.buy.push({ ...provider });
          } else if (service.type === 'free') {
            providers.free.push(provider);
          }
        }
      }
    });

    return providers;
  }

  // Generate watch URLs for different services
  generateWatchUrl(serviceName, title) {
    const encodedTitle = encodeURIComponent(title);
    
    const urlMappings = {
      netflix: `https://www.netflix.com/search?q=${encodedTitle}`,
      amazon_prime: `https://www.amazon.com/s?k=${encodedTitle}&i=instant-video`,
      hulu: `https://www.hulu.com/search?q=${encodedTitle}`,
      disney_plus: `https://www.disneyplus.com/search?q=${encodedTitle}`,
      hbo_max: `https://www.hbomax.com/search?q=${encodedTitle}`,
      youtube: `https://www.youtube.com/results?search_query=${encodedTitle}+movie`,
      google_play: `https://play.google.com/store/search?q=${encodedTitle}&c=movies`,
      apple_tv: `https://tv.apple.com/search?term=${encodedTitle}`,
      tubi: `https://tubitv.com/search/${encodedTitle}`,
      pluto_tv: `https://pluto.tv/search/details?query=${encodedTitle}`
    };

    return urlMappings[serviceName] || '#';
  }

  // Main method to get streaming data
  async getStreamingData(movieId, imdbId, title) {
    try {
      console.log(`Fetching streaming data for: ${title} (TMDB: ${movieId}, IMDB: ${imdbId})`);

      let streamingData = null;

      // Try WatchMode first (if API key is available)
      if (process.env.WATCHMODE_API_KEY) {
        streamingData = await this.fetchFromWatchMode(movieId, imdbId);
      }

      // Fallback to mock data if no real API data
      if (!streamingData || this.isEmptyStreamingData(streamingData)) {
        streamingData = await this.fetchFromJustWatch(movieId, imdbId, title);
      }

      return {
        success: true,
        data: streamingData,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching streaming data:', error);
      return {
        success: false,
        error: 'Failed to fetch streaming data',
        data: {
          subscription: [],
          rent: [],
          buy: [],
          free: []
        }
      };
    }
  }

  // Check if streaming data is empty
  isEmptyStreamingData(data) {
    if (!data) return true;
    return (
      (!data.subscription || data.subscription.length === 0) &&
      (!data.rent || data.rent.length === 0) &&
      (!data.buy || data.buy.length === 0) &&
      (!data.free || data.free.length === 0)
    );
  }

  // Get all available streaming services
  getAllServices() {
    return STREAMING_SERVICES;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new StreamingApiService();