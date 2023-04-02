-- CreateTable
CREATE TABLE "xkcd" (
    "id" INTEGER NOT NULL,
    "uses" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "xkcd_pkey" PRIMARY KEY ("id")
);
