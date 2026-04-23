-- Store the "view in browser" URL from the original retailer email
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source_email_link text;
