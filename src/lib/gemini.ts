import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Create a reusable model instance
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Create a reusable vision model instance
const visionModel = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

export const generateResponse = async (
  input: string,
  category?: string,
  file?: File
): Promise<string> => {
  try {
    let prompt = `You are Dragon AI, an advanced filmmaking assistant. ${
      category ? `The user is asking about ${category}. ` : ''
    }`;

    if (file) {
      // Add file context to prompt
      prompt += `The user has uploaded a ${file.type} file named "${file.name}". `;
    }

    // Add user's input
    prompt += `Please provide a detailed, professional response about: ${input}`;

    if (file) {
      // Handle file-based prompts
      if (file.type.startsWith('image/')) {
        // Convert file to base64
        const base64Data = await fileToBase64(file);
        const result = await visionModel.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: file.type
            }
          }
        ]);
        return result.response.text();
      }

      // For non-image files, include file type context in response
      const result = await model.generateContent([
        prompt + `\n\nPlease consider the uploaded ${file.type} file in your response.`
      ]);
      return result.response.text();
    }

    // Text-only response
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to generate response');
  }
};

// Helper function to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      // Remove data URL prefix
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Function to analyze file content
export const analyzeFile = async (file: File): Promise<string> => {
  try {
    if (file.type.startsWith('image/')) {
      const base64Data = await fileToBase64(file);
      const result = await visionModel.generateContent([
        'Analyze this image in the context of filmmaking. Consider aspects like composition, lighting, color grading, and cinematography techniques.',
        {
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        }
      ]);
      return result.response.text();
    } else if (file.type.startsWith('video/')) {
      return 'I can help analyze your video footage. Please let me know what specific aspects you\'d like me to focus on: editing, pacing, composition, or technical details.';
    } else if (file.type === 'application/pdf' || file.type.includes('document')) {
      return 'I can help analyze your script or document. Would you like me to focus on story structure, character development, dialogue, or technical formatting?';
    }
    return 'I can help analyze this file. What specific aspects would you like me to focus on?';
  } catch (error) {
    console.error('File analysis error:', error);
    throw new Error('Failed to analyze file');
  }
};