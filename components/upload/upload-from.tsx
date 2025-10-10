"use client";

import UploadFormInput from "@/components/upload/upload-form-input";
import { useUploadThing } from "@/utils/uploadthings";
import { use, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { generatePdfSummary, storePdfSummaryAction } from "@/action/upload-action";
import { Router } from "next/router";
import { useRouter } from "next/navigation";
import { fi } from "zod/v4/locales";

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
  // const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [isLoading , setIsLoading] = useState(false);
  const router = useRouter();

  const { startUpload, routeConfig } = useUploadThing("pdfUploader", {
    onClientUploadComplete: () => {
      console.log("uploaded successfully!");
    },
    onUploadError: (error: Error) => {
      console.log("error occurred while uploading: " + error.message);

      toast.error("Error occurred while uploading", {
        description: error.message || "An unexpected error occurred",
      });
    },
    onUploadBegin: ({ file }) => {
      console.log("upload started", file);
    },
  });
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      const formData = new FormData(e.currentTarget);
      const file = formData.get("file") as File;
      console.log("Form submitted");
      //validate the fields
      const validatedFields = schema.safeParse({ file });
      console.log(validatedFields);
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

      //schema validation can be done here with zod
      //upload the file to Uploadthing
      const resp = await startUpload([file]);
      if (!resp) {
        toast.error("Something went wrong", {
          description: "Please use a different file",
        });
        setIsLoading(false);
        return;
      }

      toast.info("Processing PDF", {
        description: "Hang tight! Our AI is reading through your document!",
      });

      //parse the PDF using lang chain
      const result = await generatePdfSummary(resp);
      console.log(result);
      const { data = null, message = null } = result || {};

      if (data) {
        let storeResult: any;
        toast.info("Saving PDF", {
          description: "Hang tight! We are saving your summary!",
        });
     
        if(data.summary){
          storeResult= await storePdfSummaryAction({
            summary: data.summary,
            fileName: resp[0].serverData.file.name,
            title: data.title,
            fileUrl: resp[0].serverData.file.url,
          });
          toast.success("PDF Summary generated", {
            description: "Your PDF summary has been saved ",});

               formRef.current?.reset();
               router.push(`/summaries/${storeResult.data.id}`);
               //redirect to the summary page
        }
      }

      //summaraize the pdf using AI

      //redirect to the summary page
    } catch (error) {
      setIsLoading(false);
      console.error("Error occured", error);
      formRef.current?.reset();
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto">
      <UploadFormInput isLoading={isLoading} ref={formRef} onSubmit={handleSubmit} />
    </div>
  );
}
