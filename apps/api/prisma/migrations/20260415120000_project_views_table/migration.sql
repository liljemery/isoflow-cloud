-- CreateTable
CREATE TABLE "project_views" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "view_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_views_project_id_view_key_key" ON "project_views"("project_id", "view_key");

-- CreateIndex
CREATE INDEX "project_views_project_id_sort_order_idx" ON "project_views"("project_id", "sort_order");

-- AddForeignKey
ALTER TABLE "project_views" ADD CONSTRAINT "project_views_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: one row per view from legacy embedded JSON
INSERT INTO "project_views" ("project_id", "view_key", "sort_order", "payload", "created_at", "updated_at")
SELECT
    p."id",
    v->>'id',
    (t.ord - 1)::integer,
    v::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "projects" AS p,
LATERAL jsonb_array_elements(COALESCE(p."model"::jsonb->'views', '[]'::jsonb)) WITH ORDINALITY AS t(v, ord);

-- Drop embedded views from JSON; shared model fields stay in projects.model
UPDATE "projects" SET "model" = ("model"::jsonb - 'views')::json;
