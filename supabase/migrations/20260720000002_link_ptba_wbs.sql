-- 1. Ajouter la colonne wbs_task_id à ptba_activities
ALTER TABLE ptba_activities 
ADD COLUMN IF NOT EXISTS wbs_task_id UUID REFERENCES wbs_tasks(id) ON DELETE CASCADE;

-- 2. Pour éviter les doublons d'une même tâche dans la même année PTBA
ALTER TABLE ptba_activities
ADD CONSTRAINT ptba_activities_wbs_year_key UNIQUE (wbs_task_id, fiscal_year);

-- 3. Optionnel : Nettoyage des anciennes données ou mise à jour (Ici on considère que c'est une nouvelle implémentation, donc pas besoin de migration de données complexe, mais on peut laisser les lignes existantes sans wbs_task_id pour l'instant).
