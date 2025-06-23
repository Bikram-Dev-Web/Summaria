import { GoogleGenerativeAI } from "@google/generative-ai";
import { SUMMARY_SYSTEM_PROMPT } from "@/utils/prompt";

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const generateSummaryFromGemini = async (pdfText: string) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // Using flash for speed and cost-effectiveness
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500,
      },
      // You can also add the system prompt here
      systemInstruction: SUMMARY_SYSTEM_PROMPT,
    });
    
    // *** FIX 2: The prompt now correctly provides just the text content ***
    const prompt = `Transform this document into an engaging, easy-to-read summary with contextually relevant emojis and proper markdown formatting:\n\n${pdfText}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    if (!response.text()) {
      throw new Error('Empty response from Gemini API');
    }

    return response.text();
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Re-throw the error so the calling function knows it failed
    throw error;
  }
};


















// // import { SUMMARY_SYSTEM_PROMPT } from '@/utils/prompts';
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { SUMMARY_SYSTEM_PROMPT } from "@/utils/prompt";

// //Initialize the Gemini API with your API key
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// export const generateSummaryFromGemini = async (pdfText: string) => {
//   try {
//     const model = genAI.getGenerativeModel({
//       model: "gemini-1.5-pro-002",
//       generationConfig: {
//         temperature: 0.7,
//         maxOutputTokens: 1500,
//       },
//     });

//     const prompt = {
//       content: [
//         {
//           role: "user",
//           parts: [
//             { text: SUMMARY_SYSTEM_PROMPT },
//             {
//               text: `Transform this document into an engaging, easy-to-read summary with contextually relevant emojis and proper markdown formatting:\n\n${pdfText}`,
//             },
//           ],
//         },
//       ],
//     };

//     const result = await model.generateContent(prompt);
//     const response = await result.response;

//     if(!response.text()){
//       throw new Error ('Empty response from Gemini API')
//     }

//     return response.text();
//   } catch (error: any) {
   
//     console.error("Gemini API Error:", error);
//     throw error;
//   }
// };
