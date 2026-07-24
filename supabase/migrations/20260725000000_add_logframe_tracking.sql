ALTER TABLE logframe_items 
ADD COLUMN IF NOT EXISTS s1_value text,
ADD COLUMN IF NOT EXISTS s2_value text,
ADD COLUMN IF NOT EXISTS s3_value text;
