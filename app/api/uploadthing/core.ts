import { currentUser } from "@clerk/nextjs/server";
import { assertCanCreateSummary } from "@/lib/billing";
import { upsertUserFromClerk } from "@/lib/users";
import { UploadThingError } from "uploadthing/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  pdfUploader: f({ pdf: { maxFileSize: "32MB" } })
    .middleware(async () => {
      const user = await currentUser();
      if (!user) {
        throw new UploadThingError("Unauthorized");
      }

      await upsertUserFromClerk(user);

      try {
        await assertCanCreateSummary(user.id);
      } catch (error) {
        throw new UploadThingError(
          error instanceof Error ? error.message : "Upload limit reached"
        );
      }

      return {
        userId: user.id,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        userId: metadata.userId,
        fileUrl: file.url,
        fileName: file.name,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
