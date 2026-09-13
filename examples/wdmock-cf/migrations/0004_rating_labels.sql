ALTER TABLE site_rating_axes ADD COLUMN uv_label TEXT NOT NULL DEFAULT '+';
ALTER TABLE site_rating_axes ADD COLUMN nv_label TEXT NOT NULL DEFAULT 'Ø';
ALTER TABLE site_rating_axes ADD COLUMN dv_label TEXT NOT NULL DEFAULT '–';
