const axios = require('axios');

const API_KEY = process.env.TMDB_API_KEY || '6f260ad398044fdb6affceaa84c86761';
const BASE_URL = 'https://api.themoviedb.org/3';

// Create axios instance
const tmdbApi = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
    language: 'en-US'
  }
});

// Fetch movie details
const fetchMovieDetails = async (movieId) => {
  try {
    if (!movieId) {
      throw new Error('Movie ID is required');
    }
    
    const response = await tmdbApi.get(`/movie/${movieId}`, {
      timeout: 8000
    });
    
    if (!response || !response.data) {
      throw new Error('Invalid response from TMDB API');
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching movie details for ID ${movieId}:`, error);
    
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        throw new Error('API key invalid or unauthorized. Check your TMDB API key.');
      } else if (status === 404) {
        throw new Error(`Movie with ID ${movieId} not found.`);
      } else if (status === 429) {
        throw new Error('Rate limit exceeded. Too many requests to TMDB API.');
      } else {
        throw new Error(`TMDB API error: ${status} ${error.response.statusText}`);
      }
    } else if (error.request) {
      throw new Error('No response from TMDB API. Check your internet connection.');
    } else if (error.message.includes('timeout')) {
      throw new Error('Request to TMDB API timed out. Try again later.');
    } else {
      throw new Error(`Error fetching movie details: ${error.message}`);
    }
  }
};

module.exports = {
  fetchMovieDetails
};