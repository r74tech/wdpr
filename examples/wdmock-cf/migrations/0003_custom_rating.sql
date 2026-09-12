CREATE TABLE site_rating_axes (
  site_id INTEGER NOT NULL,
  axis_key TEXT NOT NULL COLLATE BINARY CHECK(length(axis_key) > 0),
  label TEXT NOT NULL,
  allow_uv INTEGER NOT NULL DEFAULT 1 CHECK(allow_uv IN (0, 1)),
  allow_nv INTEGER NOT NULL DEFAULT 0 CHECK(allow_nv IN (0, 1)),
  allow_dv INTEGER NOT NULL DEFAULT 1 CHECK(allow_dv IN (0, 1)),
  can_vote INTEGER NOT NULL DEFAULT 1 CHECK(can_vote IN (0, 1)),
  can_cancel INTEGER NOT NULL DEFAULT 1 CHECK(can_cancel IN (0, 1)),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
  show_aggregate INTEGER NOT NULL DEFAULT 1 CHECK(show_aggregate IN (0, 1)),
  PRIMARY KEY (site_id, axis_key)
);

CREATE UNIQUE INDEX pages_site_page ON pages (site_id, page_id);

CREATE TABLE page_custom_rate_vote (
  site_id INTEGER NOT NULL,
  page_id INTEGER NOT NULL,
  axis_key TEXT NOT NULL COLLATE BINARY,
  user_id INTEGER NOT NULL,
  rate INTEGER NOT NULL CHECK(rate IN (-1, 0, 1)),
  date TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (site_id, page_id, axis_key, user_id),
  FOREIGN KEY (site_id, page_id) REFERENCES pages(site_id, page_id) ON DELETE CASCADE,
  FOREIGN KEY (site_id, axis_key) REFERENCES site_rating_axes(site_id, axis_key) ON DELETE CASCADE
);

CREATE INDEX custom_rate_axis_page ON page_custom_rate_vote (site_id, axis_key, page_id);
