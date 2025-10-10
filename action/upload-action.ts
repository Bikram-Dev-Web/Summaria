"use server";

import { getDbConnection } from "@/lib/db";
import { generateSummaryFromGemini } from "@/lib/geminiai";
import { fetchAndExtractPdfText } from "@/lib/langchain";
import { generateSummaryFromOpenAI } from "@/lib/openai";
import { formatFileNameAsTitle } from "@/utils/format-utils";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { _success } from "zod/v4/core";

export async function generatePdfSummary(
  uploadResponse: [
    {
      serverData: {
        userId: string;
        file: {
          url: string;
          name: string;
        };
      };
    },
  ]
) {
  if (!uploadResponse) {
    return {
      success: false,
      message: "File upload failed",
      data: null,
    };
  }

  const {
    serverData: {
      userId,
      file: { url: pdfUrl, name: fileName },
    },
  } = uploadResponse[0];

  if (!pdfUrl) {
    return {
      success: false,
      message: "File upload failed",
      data: null,
    };
  }

  try {
    const pdfText = await fetchAndExtractPdfText(pdfUrl);
    console.log(pdfText);

    let summary;
    try {
      summary = await generateSummaryFromGemini(pdfText);
      console.log({ summary });
    } catch (error) {
      console.log(error);
      //call gemini
      if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
        try {
          summary = await generateSummaryFromOpenAI(pdfText);
        } catch (geminiError) {
          console.error(
            "Gemini API failed after OpenAI quote exceeded",
            geminiError
          );
          throw new Error(
            "Failed to generate summary with available AI providers"
          );
        }
      }
    }
    if (!summary) {
      return {
        success: false,
        message: "Failed to generate summary",
        data: null,
      };
    }

    // You can return or continue processing here:
  const formattedFileName= formatFileNameAsTitle(fileName);

    return {
      success: true,
      message: "Summary generated successfully",
      data: {
        title: formattedFileName,
        summary,
      },
    };
  } catch (err) {
    return {
      success: false,
      message: "File upload failed",
      data: null,
    };
  }
}
type PdfSummaryType = {
  userId?: string;
  fileUrl: string;
  summary: string;
  title: string;
  fileName: string;
};

async function savePdfSummary({userId , fileUrl , summary, title, fileName}:PdfSummaryType) {
  //sql inserting
  try{
  const  sql = await getDbConnection();
  await sql`INSERT INTO pdf_summaries (
  user_id,
  original_file_url,
  summary_text,

  title,
  file_name
)
VALUES (
  ${userId},
  ${fileUrl},
  ${summary},
  ${title},
  ${fileName}
);
`
  } catch(error){
    console.error('Error saving PDF summary',error);
    throw error;
  }
  
}

export async function storePdfSummaryAction( {
  fileUrl , summary, title, fileName}: PdfSummaryType) {
  //user id logged in and has a userid
  //savepdfsummery
  //savepdfsummry()


  let saveSummary: any;
  try {
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        message: "User not found",
      };
    } 
    saveSummary = await savePdfSummary({
    userId , fileUrl , summary, title, fileName,
  });
  if(!saveSummary) {
    return {
      success: false,
      message: "Failed to save PDF summary, try again ...",
    };
  }


  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Error saving PDF summary",
    };
  }
  //revalidate the cache
  revalidatePath(`/summaries/${saveSummary.id}`);


    return {
    success: true,
    message: "PDF summary saved successfully",
    data:{
      id:saveSummary.id,
    }
  };
}
