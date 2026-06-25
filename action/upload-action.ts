"use server";

import { getDbConnection } from "@/lib/db";
import { generateSummaryFromGemini } from "@/lib/geminiai";
import { fetchAndExtractPdfText } from "@/lib/langchain";
import { generateSummaryFromOpenAI } from "@/lib/openai";
import { upsertUserFromClerk } from "@/lib/users";
import { formatFileNameAsTitle } from "@/utils/format-utils";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

type UploadSummaryResponse = Array<{
  serverData: {
    userId: string;
    fileUrl: string;
    fileName: string;
  };
}>;

export async function generatePdfSummary(uploadResponse: UploadSummaryResponse) {
  if (!uploadResponse?.[0]?.serverData) {
    return {
      success: false,
      message: "File upload failed",
      data: null,
    };
  }

  const {
    serverData: {
      fileUrl: pdfUrl,
      fileName,
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

    let summary: string | null = null;
    try {
      summary = await generateSummaryFromGemini(pdfText);
    } catch (error) {
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

    const formattedFileName = formatFileNameAsTitle(fileName);

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

async function savePdfSummary({
  userId,
  fileUrl,
  summary,
  title,
  fileName,
}: PdfSummaryType) {
  try {
    const sql = await getDbConnection();
    const result = await sql`
      INSERT INTO pdf_summaries (
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
      )
      RETURNING id
    `;

    return (result[0] as { id: string } | undefined) ?? null;
  } catch (error) {
    console.error("Error saving PDF summary", error);
    throw error;
  }
}

export async function storePdfSummaryAction({
  fileUrl,
  summary,
  title,
  fileName,
}: PdfSummaryType) {
  let saveSummary: { id: string } | null = null;
  try {
    const user = await currentUser();
    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    await upsertUserFromClerk(user);
    saveSummary = await savePdfSummary({
      userId: user.id,
      fileUrl,
      summary,
      title,
      fileName,
    });
    if (!saveSummary) {
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

  revalidatePath("/dashboard");
  revalidatePath(`/summaries/${saveSummary.id}`);

  return {
    success: true,
    message: "PDF summary saved successfully",
    data: {
      id: saveSummary.id,
    },
  };
}
