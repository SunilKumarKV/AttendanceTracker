CREATE TABLE "CommunicationTemplate" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunicationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunicationTemplate_institutionId_key_channel_key" ON "CommunicationTemplate"("institutionId", "key", "channel");
CREATE INDEX "CommunicationTemplate_institutionId_channel_isActive_idx" ON "CommunicationTemplate"("institutionId", "channel", "isActive");

ALTER TABLE "CommunicationTemplate" ADD CONSTRAINT "CommunicationTemplate_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
