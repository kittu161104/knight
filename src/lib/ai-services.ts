import OpenAI from 'openai';
import { HfInference } from '@huggingface/inference';
import axios from 'axios';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  organization: import.meta.env.VITE_OPENAI_ORG_ID
});

// Initialize Hugging Face
const hf = new HfInference(import.meta.env.VITE_HUGGINGFACE_TOKEN);

// Azure Vision API
const azureVision = {
  endpoint: import.meta.env.VITE_AZURE_VISION_ENDPOINT,
  key: import.meta.env.VITE_AZURE_VISION_KEY,
  region: import.meta.env.VITE_AZURE_REGION
};

// AIVA API
const aivaConfig = {
  clientId: import.meta.env.VITE_AIVA_CLIENT_ID,
  clientSecret: import.meta.env.VITE_AIVA_CLIENT_SECRET
};

// Runway ML API
const runwayConfig = {
  token: import.meta.env.VITE_RUNWAY_API_TOKEN
};

// TMDb API
const tmdbConfig = {
  key: import.meta.env.VITE_TMDB_API_KEY
};

// IMDb RapidAPI
const imdbConfig = {
  key: import.meta.env.VITE_IMDB_API_KEY,
  host: import.meta.env.VITE_IMDB_API_HOST
};

// OpenAI Functions
export const generateWithGPT4 = async (prompt: string): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });
    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('OpenAI error:', error);
    throw new Error('Failed to generate GPT-4 response');
  }
};

// Azure Vision Functions
export const analyzeImageWithAzure = async (imageUrl: string): Promise<any> => {
  try {
    const response = await axios.post(
      `${azureVision.endpoint}/vision/v3.2/analyze`,
      { url: imageUrl },
      {
        headers: {
          'Ocp-Apim-Subscription-Key': azureVision.key,
          'Content-Type': 'application/json'
        },
        params: {
          visualFeatures: 'Categories,Description,Color'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Azure Vision error:', error);
    throw new Error('Failed to analyze image with Azure');
  }
};

// Hugging Face Functions
export const generateWithHuggingFace = async (prompt: string, model: string): Promise<string> => {
  try {
    const response = await hf.textGeneration({
      model,
      inputs: prompt,
      parameters: {
        max_length: 100,
        temperature: 0.7
      }
    });
    return response.generated_text;
  } catch (error) {
    console.error('Hugging Face error:', error);
    throw new Error('Failed to generate with Hugging Face');
  }
};

// TMDb Functions
export const searchMovies = async (query: string): Promise<any> => {
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/search/movie`,
      {
        params: {
          api_key: tmdbConfig.key,
          query,
          language: 'en-US',
          page: 1
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('TMDb error:', error);
    throw new Error('Failed to search movies');
  }
};

// IMDb Functions
export const getMovieDetails = async (movieId: string): Promise<any> => {
  try {
    const response = await axios.get(
      `https://imdb8.p.rapidapi.com/title/get-details`,
      {
        params: { tconst: movieId },
        headers: {
          'X-RapidAPI-Key': imdbConfig.key,
          'X-RapidAPI-Host': imdbConfig.host
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('IMDb error:', error);
    throw new Error('Failed to get movie details');
  }
};

// AIVA Functions
export const generateMusic = async (prompt: string): Promise<string> => {
  try {
    // Implement AIVA music generation
    // This is a placeholder as AIVA's API implementation would depend on their specific API structure
    return 'Music generation with AIVA will be implemented based on their API documentation';
  } catch (error) {
    console.error('AIVA error:', error);
    throw new Error('Failed to generate music');
  }
};

// Runway ML Functions
export const generateAnimation = async (prompt: string): Promise<string> => {
  try {
    // Implement Runway ML animation generation
    // This is a placeholder as Runway's API implementation would depend on their specific API structure
    return 'Animation generation with Runway ML will be implemented based on their API documentation';
  } catch (error) {
    console.error('Runway ML error:', error);
    throw new Error('Failed to generate animation');
  }
};

// Combined Analysis Function
export const analyzeContent = async (
  content: string | File,
  type: 'text' | 'image' | 'video' | 'audio'
): Promise<any> => {
  try {
    switch (type) {
      case 'text':
        const gpt4Response = await generateWithGPT4(content as string);
        const hfResponse = await generateWithHuggingFace(content as string, 'gpt2');
        return {
          gpt4Analysis: gpt4Response,
          hfAnalysis: hfResponse
        };
      
      case 'image':
        if (content instanceof File) {
          const imageUrl = URL.createObjectURL(content);
          const azureAnalysis = await analyzeImageWithAzure(imageUrl);
          return {
            azureAnalysis
          };
        }
        break;

      case 'video':
        // Implement video analysis
        return 'Video analysis will be implemented';

      case 'audio':
        // Implement audio analysis
        return 'Audio analysis will be implemented';

      default:
        throw new Error('Unsupported content type');
    }
  } catch (error) {
    console.error('Content analysis error:', error);
    throw new Error('Failed to analyze content');
  }
};