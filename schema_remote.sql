


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."logframe_level" AS ENUM (
    'objectif_global',
    'objectif_specifique',
    'resultat',
    'activite'
);


ALTER TYPE "public"."logframe_level" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'budget_seuil_80',
    'budget_seuil_100',
    'marche_echeance_proche',
    'marche_echeance_depassee',
    'risque_critique',
    'cpi_alerte',
    'spi_alerte'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."operation_status" AS ENUM (
    'planifie',
    'engage',
    'decaisse',
    'annule'
);


ALTER TYPE "public"."operation_status" OWNER TO "postgres";


CREATE TYPE "public"."org_role" AS ENUM (
    'admin',
    'member'
);


ALTER TYPE "public"."org_role" OWNER TO "postgres";


CREATE TYPE "public"."project_role" AS ENUM (
    'OWNER',
    'PROJECT_MANAGER',
    'ACCOUNTANT',
    'FUNDER_READONLY',
    'CONSULTANT'
);


ALTER TYPE "public"."project_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_project_with_budget"("payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_project_id UUID;
  v_fs_map JSONB := '{}'::jsonb;
  v_fs_elem JSONB;
  v_bl_elem JSONB;
  v_new_fs_id UUID;
  v_user_id UUID;
  v_org_id UUID;
  v_currency TEXT;
BEGIN
  v_user_id := (payload->>'user_id')::uuid;
  v_org_id := (payload->>'organization_id')::uuid;
  v_currency := COALESCE(payload->>'currency', 'XOF');

  -- 1. Insérer le projet
  INSERT INTO projects (name, code, start_date, end_date, description, created_by, organization_id, currency)
  VALUES (
    payload->>'name',
    payload->>'code',
    (payload->>'start_date')::date,
    (payload->>'end_date')::date,
    payload->>'description',
    v_user_id,
    v_org_id,
    v_currency
  ) RETURNING id INTO v_project_id;

  -- 2. Insérer le propriétaire dans project_members
  -- Changed from 'owner' to 'OWNER'
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (v_project_id, v_user_id, 'OWNER');

  -- 3. Insérer les bailleurs de fonds (Funding Sources)
  FOR v_fs_elem IN SELECT * FROM jsonb_array_elements(payload->'funding_sources')
  LOOP
    INSERT INTO funding_sources (project_id, name, type, amount_committed)
    VALUES (
      v_project_id,
      v_fs_elem->>'name',
      COALESCE(v_fs_elem->>'type', 'bailleur'),
      (v_fs_elem->>'amount')::numeric
    ) RETURNING id INTO v_new_fs_id;

    -- Map old ID to new UUID
    v_fs_map := jsonb_set(v_fs_map, array[v_fs_elem->>'id'], to_jsonb(v_new_fs_id::text));
  END LOOP;

  -- 4. Insérer les lignes budgétaires
  FOR v_bl_elem IN SELECT * FROM jsonb_array_elements(payload->'budget_lines')
  LOOP
    INSERT INTO budget_lines (project_id, code, label, initial_allocated_amount, funding_source_id)
    VALUES (
      v_project_id,
      v_bl_elem->>'code',
      v_bl_elem->>'label',
      (v_bl_elem->>'amount')::numeric,
      (v_fs_map->>(v_bl_elem->>'funding_source_id'))::uuid
    );
  END LOOP;

  RETURN v_project_id;
END;
$$;


ALTER FUNCTION "public"."create_project_with_budget"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_my_org_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ SELECT organization_id FROM organization_members WHERE user_id = auth.uid(); $$;


ALTER FUNCTION "public"."fn_get_my_org_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_my_org_role"("p_org_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ SELECT org_role FROM organization_members WHERE organization_id = p_org_id AND user_id = auth.uid() LIMIT 1; $$;


ALTER FUNCTION "public"."fn_get_my_org_role"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_user_role"("p_project_id" "uuid") RETURNS "public"."project_role"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_role project_role;
  v_org_role text;
begin
  -- Check if user is an organization owner/admin for this project's organization
  SELECT om.org_role INTO v_org_role
  FROM projects p
  JOIN organization_members om ON p.organization_id = om.organization_id
  WHERE p.id = p_project_id AND om.user_id = auth.uid()
  LIMIT 1;

  IF v_org_role IN ('owner', 'admin') THEN
    -- Changed from 'owner' to 'OWNER' to match the new enum value
    RETURN 'OWNER'::project_role;
  END IF;

  -- Otherwise, check project_members
  select role into v_role from project_members 
  where project_id = p_project_id and user_id = auth.uid()
  limit 1;
  
  return v_role;
end;
$$;


ALTER FUNCTION "public"."fn_user_role"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_project_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select project_id from project_members where user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_project_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organizations"() RETURNS SETOF "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_organizations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_organization"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  -- URL de votre Edge Function (à adapter plus tard avec l'ID de votre projet Supabase)
  webhook_url text := 'https://VOTRE_PROJECT_REF.supabase.co/functions/v1/welcome-email';
  payload json;
BEGIN
  payload := json_build_object(
    'type', 'INSERT',
    'table', 'organizations',
    'record', row_to_json(NEW)
  );

  -- Requête POST asynchrone pour ne pas ralentir la création du compte
  PERFORM net.http_post(
    url := webhook_url,
    body := payload::jsonb,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer VOTRE_ANON_KEY"}'::jsonb
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_organization"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transfer_project_ownership"("p_project_id" "uuid", "p_new_owner_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_current_user_id uuid;
    v_current_user_role project_role;
    v_new_owner_role project_role;
BEGIN
    v_current_user_id := auth.uid();
    
    -- Check current user is OWNER
    SELECT role INTO v_current_user_role FROM project_members 
    WHERE project_id = p_project_id AND user_id = v_current_user_id;
    
    IF v_current_user_role IS NULL OR v_current_user_role != 'OWNER' THEN
        RAISE EXCEPTION 'Not authorized. Must be OWNER.';
    END IF;

    -- Check new owner exists in project and is not already OWNER
    SELECT role INTO v_new_owner_role FROM project_members 
    WHERE project_id = p_project_id AND user_id = p_new_owner_id;

    IF v_new_owner_role IS NULL THEN
        RAISE EXCEPTION 'Target user is not a member of this project.';
    END IF;

    IF v_new_owner_role = 'OWNER' THEN
        RAISE EXCEPTION 'Target user is already an OWNER.';
    END IF;

    -- Atomic swap
    -- 1. Demote all existing owners to PROJECT_MANAGER
    UPDATE project_members 
    SET role = 'PROJECT_MANAGER' 
    WHERE project_id = p_project_id AND role = 'OWNER';

    -- 2. Promote new owner
    UPDATE project_members 
    SET role = 'OWNER' 
    WHERE project_id = p_project_id AND user_id = p_new_owner_id;

END;
$$;


ALTER FUNCTION "public"."transfer_project_ownership"("p_project_id" "uuid", "p_new_owner_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_audit_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_project_id uuid;
  v_new jsonb := to_jsonb(NEW);
  v_old jsonb := to_jsonb(OLD);
begin
  if TG_TABLE_NAME = 'projects' then
    v_project_id := coalesce((v_new->>'id')::uuid, (v_old->>'id')::uuid);
  else
    v_project_id := coalesce((v_new->>'project_id')::uuid, (v_old->>'project_id')::uuid);
  end if;

  insert into audit_log (project_id, user_id, action, entity_table, entity_id, before_data, after_data)
  values (
    v_project_id,
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    coalesce((v_new->>'id')::uuid, (v_old->>'id')::uuid),
    case when TG_OP = 'DELETE' or TG_OP = 'UPDATE' then v_old else null end,
    case when TG_OP = 'INSERT' or TG_OP = 'UPDATE' then v_new else null end
  );
  if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
end;
$$;


ALTER FUNCTION "public"."trg_audit_log"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_analyses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "analysis_type" "text" NOT NULL,
    "input_hash" "text" NOT NULL,
    "result" "jsonb" NOT NULL,
    "model" "text" DEFAULT 'claude-3-5-sonnet-20240620'::"text" NOT NULL,
    "tokens_used" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_analyses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "related_table" "text" NOT NULL,
    "related_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "uploaded_by" "uuid",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "entity_table" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "before_data" "jsonb",
    "after_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budget_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "unit" "text",
    "quantity" numeric(16,2),
    "unit_cost" numeric(16,2),
    "initial_allocated_amount" numeric(16,2) DEFAULT 0 NOT NULL,
    "funding_source_id" "uuid",
    "counterpart_amount" numeric(16,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responsible" "text"
);


ALTER TABLE "public"."budget_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evm_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "control_date" "date" NOT NULL,
    "bac_total" numeric(16,2),
    "pv_total" numeric(16,2),
    "ev_total" numeric(16,2),
    "ac_total" numeric(16,2),
    "cpi_global" numeric(6,4),
    "spi_global" numeric(6,4),
    "eac_global" numeric(16,2),
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."evm_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."funding_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'bailleur'::"text" NOT NULL,
    "amount_committed" numeric(16,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "funding_sources_type_check" CHECK (("type" = ANY (ARRAY['bailleur'::"text", 'donateur'::"text", 'etat'::"text", 'contrepartie'::"text", 'autre'::"text"])))
);


ALTER TABLE "public"."funding_sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "invited_email" "text" NOT NULL,
    "invited_role" "public"."project_role" DEFAULT 'PROJECT_MANAGER'::"public"."project_role" NOT NULL,
    "token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(32), 'hex'::"text") NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."logframe_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "level" "public"."logframe_level" NOT NULL,
    "intervention_label" "text" NOT NULL,
    "indicator" "text",
    "baseline" "text",
    "target" "text",
    "verification_source" "text",
    "risks_assumptions" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "s1_value" "text",
    "s2_value" "text",
    "s3_value" "text"
);


ALTER TABLE "public"."logframe_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "link" "text",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operations_journal" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "budget_line_id" "uuid" NOT NULL,
    "task_code" "text" NOT NULL,
    "phase_wbs" "text",
    "status" "public"."operation_status" DEFAULT 'planifie'::"public"."operation_status" NOT NULL,
    "planned_cost" numeric(16,2) DEFAULT 0 NOT NULL,
    "actual_cost" numeric(16,2),
    "reste_a_engager" numeric(16,2) GENERATED ALWAYS AS (
CASE
    WHEN ("status" = 'planifie'::"public"."operation_status") THEN "planned_cost"
    ELSE (0)::numeric
END) STORED,
    "montant_engage" numeric(16,2) GENERATED ALWAYS AS (
CASE
    WHEN ("status" = 'engage'::"public"."operation_status") THEN "planned_cost"
    ELSE (0)::numeric
END) STORED,
    "montant_decaisse" numeric(16,2) GENERATED ALWAYS AS (
CASE
    WHEN ("status" = 'decaisse'::"public"."operation_status") THEN COALESCE("actual_cost", "planned_cost")
    ELSE (0)::numeric
END) STORED,
    "ecart_budgetaire" numeric(16,2) GENERATED ALWAYS AS (
CASE
    WHEN ("status" = 'decaisse'::"public"."operation_status") THEN ("planned_cost" - COALESCE("actual_cost", (0)::numeric))
    ELSE (0)::numeric
END) STORED,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "funding_source_id" "uuid",
    "wbs_task_id" "uuid",
    "operation_date" "date"
);


ALTER TABLE "public"."operations_journal" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "org_role" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "org_role_check" CHECK (("org_role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "slug" "text" NOT NULL,
    "logo_url" "text",
    "plan" "text" DEFAULT 'trial'::"text" NOT NULL,
    "max_projects" integer DEFAULT 5 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "organizations_plan_check" CHECK (("plan" = ANY (ARRAY['trial'::"text", 'pro'::"text", 'institutionnel'::"text"])))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "id" integer NOT NULL,
    "pro_price" numeric DEFAULT 25000,
    "inst_price" numeric DEFAULT 100000,
    "eur_rate" numeric DEFAULT 655.957,
    "usd_rate" numeric DEFAULT 600.0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."platform_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."procurement_plan" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "market_type" "text",
    "method" "text",
    "review_type" "text",
    "planned_notice_date" "date",
    "contract_signature_date" "date",
    "estimated_amount" numeric(16,2),
    "status" "text" DEFAULT 'planifie'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "procurement_plan_review_type_check" CHECK (("review_type" = ANY (ARRAY['a_priori'::"text", 'a_posteriori'::"text"])))
);


ALTER TABLE "public"."procurement_plan" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "is_org_admin" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notification_prefs" "jsonb" DEFAULT '{}'::"jsonb",
    "is_super_admin" boolean DEFAULT false NOT NULL,
    "notif_email_alerts" boolean DEFAULT true,
    "notif_email_weekly" boolean DEFAULT true,
    "notif_push_critical" boolean DEFAULT true,
    "whatsapp_number" "text",
    "notif_whatsapp" boolean DEFAULT false
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_members" (
    "project_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."project_role" NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"()
);


ALTER TABLE "public"."project_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "currency" "text" DEFAULT 'XOF'::"text" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "evm_control_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "status" "text" DEFAULT 'actif'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "organization_id" "uuid" NOT NULL,
    "budget" numeric,
    "funder" "text",
    "implementing_agency" "text",
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['actif'::"text", 'clos'::"text", 'suspendu'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ptba_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "logframe_item_id" "uuid",
    "code" "text" NOT NULL,
    "description" "text" NOT NULL,
    "responsible" "text",
    "fiscal_year" integer NOT NULL,
    "q1" boolean DEFAULT false NOT NULL,
    "q2" boolean DEFAULT false NOT NULL,
    "q3" boolean DEFAULT false NOT NULL,
    "q4" boolean DEFAULT false NOT NULL,
    "budget_planned" numeric(16,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "wbs_task_id" "uuid",
    "budget_line_id" "uuid"
);


ALTER TABLE "public"."ptba_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."risks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "description" "text" NOT NULL,
    "probability" smallint NOT NULL,
    "impact" smallint NOT NULL,
    "criticality" smallint GENERATED ALWAYS AS (("probability" * "impact")) STORED,
    "mitigation_strategy" "text",
    "responsible" "text",
    "status" "text" DEFAULT 'ouvert'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "risks_impact_check" CHECK ((("impact" >= 1) AND ("impact" <= 3))),
    CONSTRAINT "risks_probability_check" CHECK ((("probability" >= 1) AND ("probability" <= 3))),
    CONSTRAINT "risks_status_check" CHECK (("status" = ANY (ARRAY['ouvert'::"text", 'en_cours'::"text", 'clos'::"text"])))
);


ALTER TABLE "public"."risks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_budget_consumption" AS
 SELECT "bl"."id" AS "budget_line_id",
    "bl"."project_id",
    "bl"."code",
    "bl"."label",
    "bl"."initial_allocated_amount",
    COALESCE("sum"("oj"."montant_engage"), (0)::numeric) AS "total_engage",
    COALESCE("sum"("oj"."montant_decaisse"), (0)::numeric) AS "total_decaisse",
    (("bl"."initial_allocated_amount" - COALESCE("sum"("oj"."montant_engage"), (0)::numeric)) - COALESCE("sum"("oj"."montant_decaisse"), (0)::numeric)) AS "solde_disponible",
        CASE
            WHEN ("bl"."initial_allocated_amount" = (0)::numeric) THEN (0)::numeric
            ELSE ((COALESCE("sum"("oj"."montant_engage"), (0)::numeric) + COALESCE("sum"("oj"."montant_decaisse"), (0)::numeric)) / "bl"."initial_allocated_amount")
        END AS "taux_consommation",
        CASE
            WHEN ("bl"."initial_allocated_amount" = (0)::numeric) THEN 'neutre'::"text"
            WHEN (((COALESCE("sum"("oj"."montant_engage"), (0)::numeric) + COALESCE("sum"("oj"."montant_decaisse"), (0)::numeric)) / "bl"."initial_allocated_amount") >= (1)::numeric) THEN 'rouge'::"text"
            WHEN (((COALESCE("sum"("oj"."montant_engage"), (0)::numeric) + COALESCE("sum"("oj"."montant_decaisse"), (0)::numeric)) / "bl"."initial_allocated_amount") >= 0.8) THEN 'orange'::"text"
            ELSE 'vert'::"text"
        END AS "niveau_alerte",
    "bl"."responsible",
    "bl"."unit",
    "bl"."quantity",
    "bl"."unit_cost"
   FROM ("public"."budget_lines" "bl"
     LEFT JOIN "public"."operations_journal" "oj" ON (("oj"."budget_line_id" = "bl"."id")))
  GROUP BY "bl"."id", "bl"."project_id", "bl"."code", "bl"."label", "bl"."initial_allocated_amount", "bl"."responsible", "bl"."unit", "bl"."quantity", "bl"."unit_cost";


ALTER VIEW "public"."v_budget_consumption" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wbs_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "description" "text" NOT NULL,
    "responsible" "text",
    "date_start" "date" NOT NULL,
    "date_end" "date" NOT NULL,
    "budget_allocated" numeric(16,2) DEFAULT 0 NOT NULL,
    "percent_complete" numeric(5,2) DEFAULT 0 NOT NULL,
    "actual_cost" numeric(16,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parent_id" "uuid",
    "name" "text" NOT NULL,
    "task_type" "text" DEFAULT 'TASK'::"text" NOT NULL,
    "status" "text" DEFAULT 'PLANNED'::"text" NOT NULL,
    "priority" "text" DEFAULT 'MEDIUM'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "responsible_user_id" "uuid",
    CONSTRAINT "wbs_tasks_percent_complete_check" CHECK ((("percent_complete" >= (0)::numeric) AND ("percent_complete" <= (100)::numeric))),
    CONSTRAINT "wbs_tasks_priority_check" CHECK (("priority" = ANY (ARRAY['LOW'::"text", 'MEDIUM'::"text", 'HIGH'::"text", 'CRITICAL'::"text"]))),
    CONSTRAINT "wbs_tasks_status_check" CHECK (("status" = ANY (ARRAY['PLANNED'::"text", 'IN_PROGRESS'::"text", 'COMPLETED'::"text", 'BLOCKED'::"text", 'CANCELLED'::"text"]))),
    CONSTRAINT "wbs_tasks_task_type_check" CHECK (("task_type" = ANY (ARRAY['SUMMARY'::"text", 'TASK'::"text", 'MILESTONE'::"text"])))
);


ALTER TABLE "public"."wbs_tasks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_evm_tasks" AS
 SELECT "t"."id",
    "t"."project_id",
    "t"."code",
    "t"."description",
    "t"."responsible",
    "t"."date_start",
    "t"."date_end",
    "t"."budget_allocated",
    "t"."percent_complete",
    "t"."actual_cost",
    "t"."created_at",
    "t"."updated_at",
    "p"."evm_control_date",
        CASE
            WHEN ("p"."evm_control_date" < "t"."date_start") THEN (0)::numeric
            WHEN ("p"."evm_control_date" >= "t"."date_end") THEN "t"."budget_allocated"
            ELSE ("t"."budget_allocated" * ((("p"."evm_control_date" - "t"."date_start"))::numeric / (("t"."date_end" - "t"."date_start"))::numeric))
        END AS "pv",
    ("t"."budget_allocated" * ("t"."percent_complete" / 100.0)) AS "ev"
   FROM ("public"."wbs_tasks" "t"
     JOIN "public"."projects" "p" ON (("p"."id" = "t"."project_id")));


ALTER VIEW "public"."v_evm_tasks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_evm_indicators" AS
 SELECT "id",
    "project_id",
    "code",
    "description",
    "responsible",
    "date_start",
    "date_end",
    "budget_allocated",
    "percent_complete",
    "actual_cost",
    "created_at",
    "updated_at",
    "evm_control_date",
    "pv",
    "ev",
    ("ev" - "actual_cost") AS "cv",
    ("ev" - "pv") AS "sv",
        CASE
            WHEN ("actual_cost" = (0)::numeric) THEN 1.0
            ELSE "round"(("ev" / NULLIF("actual_cost", (0)::numeric)), 4)
        END AS "cpi",
        CASE
            WHEN ("pv" = (0)::numeric) THEN 1.0
            ELSE "round"(("ev" / NULLIF("pv", (0)::numeric)), 4)
        END AS "spi",
        CASE
            WHEN ("actual_cost" = (0)::numeric) THEN "budget_allocated"
            ELSE "round"(("budget_allocated" / NULLIF(("ev" / NULLIF("actual_cost", (0)::numeric)), (0)::numeric)), 2)
        END AS "eac"
   FROM "public"."v_evm_tasks";


ALTER VIEW "public"."v_evm_indicators" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_evm_project_summary" AS
 SELECT "project_id",
    "sum"("budget_allocated") AS "bac_total",
    "sum"("pv") AS "pv_total",
    "sum"("ev") AS "ev_total",
    "sum"("actual_cost") AS "ac_total",
        CASE
            WHEN ("sum"("actual_cost") = (0)::numeric) THEN 1.0
            ELSE "round"(("sum"("ev") / NULLIF("sum"("actual_cost"), (0)::numeric)), 4)
        END AS "cpi_global",
        CASE
            WHEN ("sum"("pv") = (0)::numeric) THEN 1.0
            ELSE "round"(("sum"("ev") / NULLIF("sum"("pv"), (0)::numeric)), 4)
        END AS "spi_global",
        CASE
            WHEN ("sum"("actual_cost") = (0)::numeric) THEN "sum"("budget_allocated")
            ELSE "round"(("sum"("budget_allocated") / NULLIF(("sum"("ev") / NULLIF("sum"("actual_cost"), (0)::numeric)), (0)::numeric)), 2)
        END AS "eac_global"
   FROM "public"."v_evm_tasks"
  GROUP BY "project_id";


ALTER VIEW "public"."v_evm_project_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_funding_tracking" AS
 SELECT "fs"."id" AS "funding_source_id",
    "fs"."project_id",
    "fs"."name" AS "bailleur_name",
    "fs"."type",
    "fs"."amount_committed",
    COALESCE("sum"("oj"."montant_engage"), (0)::numeric) AS "total_engage",
    COALESCE("sum"("oj"."montant_decaisse"), (0)::numeric) AS "total_decaisse",
    (("fs"."amount_committed" - COALESCE("sum"("oj"."montant_engage"), (0)::numeric)) - COALESCE("sum"("oj"."montant_decaisse"), (0)::numeric)) AS "solde_restant",
        CASE
            WHEN ("fs"."amount_committed" = (0)::numeric) THEN (0)::numeric
            ELSE ((COALESCE("sum"("oj"."montant_engage"), (0)::numeric) + COALESCE("sum"("oj"."montant_decaisse"), (0)::numeric)) / "fs"."amount_committed")
        END AS "taux_utilisation"
   FROM ("public"."funding_sources" "fs"
     LEFT JOIN "public"."operations_journal" "oj" ON ((("oj"."budget_line_id" IN ( SELECT "budget_lines"."id"
           FROM "public"."budget_lines"
          WHERE ("budget_lines"."funding_source_id" = "fs"."id"))) OR ("oj"."funding_source_id" = "fs"."id"))))
  GROUP BY "fs"."id", "fs"."project_id", "fs"."name", "fs"."type", "fs"."amount_committed";


ALTER VIEW "public"."v_funding_tracking" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ai_analyses"
    ADD CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_lines"
    ADD CONSTRAINT "budget_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evm_snapshots"
    ADD CONSTRAINT "evm_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evm_snapshots"
    ADD CONSTRAINT "evm_snapshots_project_id_control_date_key" UNIQUE ("project_id", "control_date");



ALTER TABLE ONLY "public"."funding_sources"
    ADD CONSTRAINT "funding_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."logframe_items"
    ADD CONSTRAINT "logframe_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operations_journal"
    ADD CONSTRAINT "operations_journal_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."procurement_plan"
    ADD CONSTRAINT "procurement_plan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_pkey" PRIMARY KEY ("project_id", "user_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_org_code_key" UNIQUE ("organization_id", "code");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ptba_activities"
    ADD CONSTRAINT "ptba_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ptba_activities"
    ADD CONSTRAINT "ptba_activities_wbs_year_key" UNIQUE ("wbs_task_id", "fiscal_year");



ALTER TABLE ONLY "public"."risks"
    ADD CONSTRAINT "risks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");



ALTER TABLE ONLY "public"."wbs_tasks"
    ADD CONSTRAINT "wbs_tasks_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_operations_journal_wbs_task_id" ON "public"."operations_journal" USING "btree" ("wbs_task_id");



CREATE INDEX "idx_ptba_activities_budget_line_id" ON "public"."ptba_activities" USING "btree" ("budget_line_id");



CREATE OR REPLACE TRIGGER "on_organization_created" AFTER INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_organization"();



CREATE OR REPLACE TRIGGER "trg_audit_attachments" AFTER INSERT OR DELETE OR UPDATE ON "public"."attachments" FOR EACH ROW EXECUTE FUNCTION "public"."trg_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_budget_lines" AFTER INSERT OR DELETE OR UPDATE ON "public"."budget_lines" FOR EACH ROW EXECUTE FUNCTION "public"."trg_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_funding_sources" AFTER INSERT OR DELETE OR UPDATE ON "public"."funding_sources" FOR EACH ROW EXECUTE FUNCTION "public"."trg_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_logframe_items" AFTER INSERT OR DELETE OR UPDATE ON "public"."logframe_items" FOR EACH ROW EXECUTE FUNCTION "public"."trg_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_operations_journal" AFTER INSERT OR DELETE OR UPDATE ON "public"."operations_journal" FOR EACH ROW EXECUTE FUNCTION "public"."trg_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_procurement_plan" AFTER INSERT OR DELETE OR UPDATE ON "public"."procurement_plan" FOR EACH ROW EXECUTE FUNCTION "public"."trg_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_project_members" AFTER INSERT OR DELETE OR UPDATE ON "public"."project_members" FOR EACH ROW EXECUTE FUNCTION "public"."trg_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_projects" AFTER INSERT OR DELETE OR UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."trg_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_ptba_activities" AFTER INSERT OR DELETE OR UPDATE ON "public"."ptba_activities" FOR EACH ROW EXECUTE FUNCTION "public"."trg_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_risks" AFTER INSERT OR DELETE OR UPDATE ON "public"."risks" FOR EACH ROW EXECUTE FUNCTION "public"."trg_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_wbs_tasks" AFTER INSERT OR DELETE OR UPDATE ON "public"."wbs_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."trg_audit_log"();



ALTER TABLE ONLY "public"."ai_analyses"
    ADD CONSTRAINT "ai_analyses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."budget_lines"
    ADD CONSTRAINT "budget_lines_funding_source_id_fkey" FOREIGN KEY ("funding_source_id") REFERENCES "public"."funding_sources"("id");



ALTER TABLE ONLY "public"."budget_lines"
    ADD CONSTRAINT "budget_lines_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evm_snapshots"
    ADD CONSTRAINT "evm_snapshots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."evm_snapshots"
    ADD CONSTRAINT "evm_snapshots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."funding_sources"
    ADD CONSTRAINT "funding_sources_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."logframe_items"
    ADD CONSTRAINT "logframe_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."logframe_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."logframe_items"
    ADD CONSTRAINT "logframe_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operations_journal"
    ADD CONSTRAINT "operations_journal_budget_line_id_fkey" FOREIGN KEY ("budget_line_id") REFERENCES "public"."budget_lines"("id");



ALTER TABLE ONLY "public"."operations_journal"
    ADD CONSTRAINT "operations_journal_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."operations_journal"
    ADD CONSTRAINT "operations_journal_funding_source_id_fkey" FOREIGN KEY ("funding_source_id") REFERENCES "public"."funding_sources"("id");



ALTER TABLE ONLY "public"."operations_journal"
    ADD CONSTRAINT "operations_journal_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operations_journal"
    ADD CONSTRAINT "operations_journal_wbs_task_id_fkey" FOREIGN KEY ("wbs_task_id") REFERENCES "public"."wbs_tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_org_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."procurement_plan"
    ADD CONSTRAINT "procurement_plan_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ptba_activities"
    ADD CONSTRAINT "ptba_activities_budget_line_id_fkey" FOREIGN KEY ("budget_line_id") REFERENCES "public"."budget_lines"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ptba_activities"
    ADD CONSTRAINT "ptba_activities_logframe_item_id_fkey" FOREIGN KEY ("logframe_item_id") REFERENCES "public"."logframe_items"("id");



ALTER TABLE ONLY "public"."ptba_activities"
    ADD CONSTRAINT "ptba_activities_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ptba_activities"
    ADD CONSTRAINT "ptba_activities_wbs_task_id_fkey" FOREIGN KEY ("wbs_task_id") REFERENCES "public"."wbs_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."risks"
    ADD CONSTRAINT "risks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wbs_tasks"
    ADD CONSTRAINT "wbs_tasks_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."wbs_tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wbs_tasks"
    ADD CONSTRAINT "wbs_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wbs_tasks"
    ADD CONSTRAINT "wbs_tasks_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE "public"."ai_analyses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ai_select" ON "public"."ai_analyses" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."organization_id" IN ( SELECT "public"."fn_get_my_org_ids"() AS "fn_get_my_org_ids")))));



ALTER TABLE "public"."attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budget_lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ecriture_autorises" ON "public"."evm_snapshots" FOR INSERT WITH CHECK (("public"."fn_user_role"("project_id") = ANY (ARRAY['OWNER'::"public"."project_role", 'PROJECT_MANAGER'::"public"."project_role"])));



ALTER TABLE "public"."evm_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."funding_sources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_audit" ON "public"."audit_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "inv_insert" ON "public"."invitations" FOR INSERT WITH CHECK ((("organization_id" IN ( SELECT "public"."fn_get_my_org_ids"() AS "fn_get_my_org_ids")) AND ("public"."fn_get_my_org_role"("organization_id") = ANY (ARRAY['owner'::"text", 'admin'::"text"]))));



CREATE POLICY "inv_select" ON "public"."invitations" FOR SELECT USING (("organization_id" IN ( SELECT "public"."fn_get_my_org_ids"() AS "fn_get_my_org_ids")));



CREATE POLICY "inv_update_system" ON "public"."invitations" FOR UPDATE USING (true);



ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lecture_membres" ON "public"."evm_snapshots" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."project_members"
  WHERE (("project_members"."project_id" = "evm_snapshots"."project_id") AND ("project_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "lecture_membres_snapshots" ON "public"."evm_snapshots" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."project_members"
  WHERE (("project_members"."project_id" = "evm_snapshots"."project_id") AND ("project_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "lecture_notifications_proprio" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "lecture_propres_adhesions" ON "public"."organization_members" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."logframe_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "marquer_lue" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "member_delete_owner" ON "public"."organization_members" FOR DELETE USING (("public"."fn_get_my_org_role"("organization_id") = 'owner'::"text"));



CREATE POLICY "member_select" ON "public"."organization_members" FOR SELECT USING (("organization_id" IN ( SELECT "public"."fn_get_my_org_ids"() AS "fn_get_my_org_ids")));



CREATE POLICY "member_self_insert" ON "public"."organization_members" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "modification_autorises" ON "public"."evm_snapshots" FOR UPDATE USING (("public"."fn_user_role"("project_id") = ANY (ARRAY['OWNER'::"public"."project_role", 'PROJECT_MANAGER'::"public"."project_role"])));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."operations_journal" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_delete_owner" ON "public"."organizations" FOR DELETE USING (("public"."fn_get_my_org_role"("id") = 'owner'::"text"));



CREATE POLICY "org_insert_auth" ON "public"."organizations" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "org_select_membres" ON "public"."organizations" FOR SELECT USING (("id" IN ( SELECT "public"."fn_get_my_org_ids"() AS "fn_get_my_org_ids")));



CREATE POLICY "org_update_admin" ON "public"."organizations" FOR UPDATE USING (("public"."fn_get_my_org_role"("id") = ANY (ARRAY['owner'::"text", 'admin'::"text"])));



ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_settings_read_all" ON "public"."platform_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "platform_settings_update_admin" ON "public"."platform_settings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_super_admin" = true)))));



ALTER TABLE "public"."procurement_plan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_delete_org" ON "public"."projects" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."org_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "project_ecriture_org" ON "public"."projects" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."org_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "project_lecture_org" ON "public"."projects" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."project_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_update_org" ON "public"."projects" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."org_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ptba_activities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read_all_attachments" ON "public"."attachments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."project_members"
  WHERE (("project_members"."project_id" = "attachments"."project_id") AND ("project_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "read_all_budget_lines" ON "public"."budget_lines" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."project_members"
  WHERE (("project_members"."project_id" = "budget_lines"."project_id") AND ("project_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "read_all_funding" ON "public"."funding_sources" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."project_members"
  WHERE (("project_members"."project_id" = "funding_sources"."project_id") AND ("project_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "read_all_logframe" ON "public"."logframe_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."project_members"
  WHERE (("project_members"."project_id" = "logframe_items"."project_id") AND ("project_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "read_all_members" ON "public"."project_members" FOR SELECT USING (("project_id" IN ( SELECT "public"."get_my_project_ids"() AS "get_my_project_ids")));



CREATE POLICY "read_all_operations" ON "public"."operations_journal" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."project_members"
  WHERE (("project_members"."project_id" = "operations_journal"."project_id") AND ("project_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "read_all_procurement" ON "public"."procurement_plan" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."project_members"
  WHERE (("project_members"."project_id" = "procurement_plan"."project_id") AND ("project_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "read_all_profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "read_all_projects" ON "public"."projects" FOR SELECT USING (("id" IN ( SELECT "public"."get_my_project_ids"() AS "get_my_project_ids")));



CREATE POLICY "read_all_ptba" ON "public"."ptba_activities" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."project_members"
  WHERE (("project_members"."project_id" = "ptba_activities"."project_id") AND ("project_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "read_all_risks" ON "public"."risks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."project_members"
  WHERE (("project_members"."project_id" = "risks"."project_id") AND ("project_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "read_all_wbs" ON "public"."wbs_tasks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."project_members"
  WHERE (("project_members"."project_id" = "wbs_tasks"."project_id") AND ("project_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "read_audit" ON "public"."audit_log" FOR SELECT USING (("public"."fn_user_role"("project_id") = ANY (ARRAY['OWNER'::"public"."project_role", 'PROJECT_MANAGER'::"public"."project_role"])));



ALTER TABLE "public"."risks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "session_own" ON "public"."user_sessions" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "super_admin_org_members_select" ON "public"."organization_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_super_admin" = true)))));



CREATE POLICY "super_admin_org_select" ON "public"."organizations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_super_admin" = true)))));



CREATE POLICY "super_admin_projects_select" ON "public"."projects" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_super_admin" = true)))));



CREATE POLICY "suppression_autorises" ON "public"."evm_snapshots" FOR DELETE USING (("public"."fn_user_role"("project_id") = ANY (ARRAY['OWNER'::"public"."project_role", 'PROJECT_MANAGER'::"public"."project_role"])));



ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wbs_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "write_attachments_all" ON "public"."attachments" USING (("public"."fn_user_role"("project_id") = ANY (ARRAY['OWNER'::"public"."project_role", 'PROJECT_MANAGER'::"public"."project_role", 'ACCOUNTANT'::"public"."project_role", 'CONSULTANT'::"public"."project_role"])));



CREATE POLICY "write_budget_lines_all" ON "public"."budget_lines" USING (("public"."fn_user_role"("project_id") = ANY (ARRAY['OWNER'::"public"."project_role", 'ACCOUNTANT'::"public"."project_role"])));



CREATE POLICY "write_funding_all" ON "public"."funding_sources" USING (("public"."fn_user_role"("project_id") = ANY (ARRAY['OWNER'::"public"."project_role", 'ACCOUNTANT'::"public"."project_role"])));



CREATE POLICY "write_logframe_all" ON "public"."logframe_items" USING (("public"."fn_user_role"("project_id") = ANY (ARRAY['OWNER'::"public"."project_role", 'PROJECT_MANAGER'::"public"."project_role"])));



CREATE POLICY "write_members_all" ON "public"."project_members" USING (("public"."fn_user_role"("project_id") = 'OWNER'::"public"."project_role"));



CREATE POLICY "write_operations_all" ON "public"."operations_journal" USING (("public"."fn_user_role"("project_id") = ANY (ARRAY['OWNER'::"public"."project_role", 'ACCOUNTANT'::"public"."project_role"])));



CREATE POLICY "write_procurement_all" ON "public"."procurement_plan" USING (("public"."fn_user_role"("project_id") = ANY (ARRAY['OWNER'::"public"."project_role", 'PROJECT_MANAGER'::"public"."project_role"])));



CREATE POLICY "write_projects_all" ON "public"."projects" USING (("public"."fn_user_role"("id") = 'OWNER'::"public"."project_role"));



CREATE POLICY "write_ptba_all" ON "public"."ptba_activities" USING (("public"."fn_user_role"("project_id") = ANY (ARRAY['OWNER'::"public"."project_role", 'PROJECT_MANAGER'::"public"."project_role", 'CONSULTANT'::"public"."project_role"])));



CREATE POLICY "write_risks_all" ON "public"."risks" USING (("public"."fn_user_role"("project_id") = ANY (ARRAY['OWNER'::"public"."project_role", 'PROJECT_MANAGER'::"public"."project_role", 'CONSULTANT'::"public"."project_role"])));



CREATE POLICY "write_wbs_tasks_all" ON "public"."wbs_tasks" USING (("public"."fn_user_role"("project_id") = ANY (ARRAY['OWNER'::"public"."project_role", 'PROJECT_MANAGER'::"public"."project_role", 'CONSULTANT'::"public"."project_role"])));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_project_with_budget"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_project_with_budget"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_project_with_budget"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_my_org_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_my_org_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_my_org_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_my_org_role"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_my_org_role"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_my_org_role"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_user_role"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_user_role"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_user_role"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_project_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_project_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_project_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_organizations"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_organizations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organizations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_organization"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_organization"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_organization"() TO "service_role";



GRANT ALL ON FUNCTION "public"."transfer_project_ownership"("p_project_id" "uuid", "p_new_owner_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."transfer_project_ownership"("p_project_id" "uuid", "p_new_owner_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_project_ownership"("p_project_id" "uuid", "p_new_owner_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_audit_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_audit_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_audit_log"() TO "service_role";



GRANT ALL ON TABLE "public"."ai_analyses" TO "anon";
GRANT ALL ON TABLE "public"."ai_analyses" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_analyses" TO "service_role";



GRANT ALL ON TABLE "public"."attachments" TO "anon";
GRANT ALL ON TABLE "public"."attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."attachments" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."budget_lines" TO "anon";
GRANT ALL ON TABLE "public"."budget_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_lines" TO "service_role";



GRANT ALL ON TABLE "public"."evm_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."evm_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."evm_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."funding_sources" TO "anon";
GRANT ALL ON TABLE "public"."funding_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."funding_sources" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."logframe_items" TO "anon";
GRANT ALL ON TABLE "public"."logframe_items" TO "authenticated";
GRANT ALL ON TABLE "public"."logframe_items" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."operations_journal" TO "anon";
GRANT ALL ON TABLE "public"."operations_journal" TO "authenticated";
GRANT ALL ON TABLE "public"."operations_journal" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."platform_settings" TO "anon";
GRANT ALL ON TABLE "public"."platform_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_settings" TO "service_role";



GRANT ALL ON TABLE "public"."procurement_plan" TO "anon";
GRANT ALL ON TABLE "public"."procurement_plan" TO "authenticated";
GRANT ALL ON TABLE "public"."procurement_plan" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_members" TO "anon";
GRANT ALL ON TABLE "public"."project_members" TO "authenticated";
GRANT ALL ON TABLE "public"."project_members" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."ptba_activities" TO "anon";
GRANT ALL ON TABLE "public"."ptba_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."ptba_activities" TO "service_role";



GRANT ALL ON TABLE "public"."risks" TO "anon";
GRANT ALL ON TABLE "public"."risks" TO "authenticated";
GRANT ALL ON TABLE "public"."risks" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."v_budget_consumption" TO "anon";
GRANT ALL ON TABLE "public"."v_budget_consumption" TO "authenticated";
GRANT ALL ON TABLE "public"."v_budget_consumption" TO "service_role";



GRANT ALL ON TABLE "public"."wbs_tasks" TO "anon";
GRANT ALL ON TABLE "public"."wbs_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."wbs_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."v_evm_tasks" TO "anon";
GRANT ALL ON TABLE "public"."v_evm_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."v_evm_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."v_evm_indicators" TO "anon";
GRANT ALL ON TABLE "public"."v_evm_indicators" TO "authenticated";
GRANT ALL ON TABLE "public"."v_evm_indicators" TO "service_role";



GRANT ALL ON TABLE "public"."v_evm_project_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_evm_project_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_evm_project_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_funding_tracking" TO "anon";
GRANT ALL ON TABLE "public"."v_funding_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."v_funding_tracking" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







