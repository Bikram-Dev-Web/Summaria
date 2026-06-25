"use client";

import UploadFormInput from "@/components/upload/upload-form-input";
import { useUploadThing } from "@/utils/uploadthings";
import { useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { generatePdfSummary, storePdfSummaryAction } from "@/action/upload-action";
import { useRouter } from "next/navigation";

const schema = z.object({
  file: z
    .instanceof(File, { message: "Invalid file" })
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      "File size must be less than 10MB"
    )
    .refine((file) => file.type === "application/pdf", "File must be a PDF"),
});

export default function UploadForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const { startUpload } = useUploadThing("pdfUploader", {
    onClientUploadComplete: () => {},
    onUploadError: (error: Error) => {
      toast.error("Error occurred while uploading", {
        description: error.message || "An unexpected error occurred",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      const formData = new FormData(e.currentTarget);
      const file = formData.get("file") as File;
      const validatedFields = schema.safeParse({ file });
      if (!validatedFields.success) {
        toast.error("Something went wrong", {
          description:
            validatedFields.error.flatten().fieldErrors.file?.[0] ??
            "Invalid file",
        });
        setIsLoading(false);
        return;
      }

      toast.info("Uploading PDF", {
        description: "We are uploading your PDF!",
      });

      const resp = await startUpload([file]);
      if (!resp?.[0]?.serverData) {
        toast.error("Something went wrong", {
          description: "Please use a different file",
        });
        setIsLoading(false);
        return;
      }

      toast.info("Processing PDF", {
        description: "Hang tight! Our AI is reading through your document!",
      });

      const result = await generatePdfSummary(resp);
      const { data = null } = result || {};

      if (data) {
        toast.info("Saving PDF", {
          description: "Hang tight! We are saving your summary!",
        });

        if (data.summary) {
          const storeResult = await storePdfSummaryAction({
            summary: data.summary,
            fileName: resp[0].serverData.fileName,
            title: data.title,
            fileUrl: resp[0].serverData.fileUrl,
          });

          if (!storeResult.success || !storeResult.data?.id) {
            toast.error("Failed to save PDF summary", {
              description: storeResult.message,
            });
            return;
          }

          toast.success("PDF Summary generated", {
            description: "Your PDF summary has been saved ",
          });

          formRef.current?.reset();
          router.push(`/summaries/${storeResult.data.id}`);
        }
      }
    } catch (error) {
      setIsLoading(false);
      toast.error("Something went wrong", {
        description:
          error instanceof Error ? error.message : "Unexpected upload error",
      });
      formRef.current?.reset();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <UploadFormInput
        isLoading={isLoading}
        ref={formRef}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
