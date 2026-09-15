PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS _miraicms_migrations (
  id         TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT,
  avatar        TEXT,
  role          TEXT NOT NULL DEFAULT 'subscriber',
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT users_id_positive CHECK (id > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));
DROP TRIGGER IF EXISTS users_set_updated_at;
CREATE TRIGGER users_set_updated_at
  AFTER UPDATE ON users
  FOR EACH ROW
BEGIN
  UPDATE users
     SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
   WHERE id = NEW.id
     AND updated_at IS NOT strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
END;

CREATE TABLE IF NOT EXISTS collections (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  type          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('published', 'draft', 'trash')),
  slug          TEXT NOT NULL,
  title         TEXT NOT NULL,
  fields        TEXT NOT NULL DEFAULT '{}',
  blocks        TEXT NOT NULL DEFAULT '[]',
  author_id     INTEGER REFERENCES users (id) ON DELETE SET NULL,
  parent_id     INTEGER REFERENCES collections (id) ON DELETE SET NULL,
  menu_order    INTEGER NOT NULL DEFAULT 0,
  password_hash TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  published_at  TEXT,
  CONSTRAINT collections_id_positive CHECK (id > 0),
  CONSTRAINT collections_parent_not_self CHECK (parent_id IS NULL OR parent_id != id),
  CONSTRAINT collections_published_at_present
    CHECK (status <> 'published' OR published_at IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS collections_type_parent_slug_unique
  ON collections (type, COALESCE(parent_id, 0), slug);
CREATE INDEX IF NOT EXISTS collections_type_status_published_idx
  ON collections (type, status, published_at DESC);
CREATE INDEX IF NOT EXISTS collections_author_id_idx ON collections (author_id);
CREATE INDEX IF NOT EXISTS collections_parent_id_idx ON collections (parent_id);
DROP TRIGGER IF EXISTS collections_set_updated_at;
CREATE TRIGGER collections_set_updated_at
  AFTER UPDATE ON collections
  FOR EACH ROW
BEGIN
  UPDATE collections
     SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
   WHERE id = NEW.id
     AND updated_at IS NOT strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
END;
DROP TRIGGER IF EXISTS collections_prevent_hierarchy_cycle;
CREATE TRIGGER collections_prevent_hierarchy_cycle
  BEFORE UPDATE OF parent_id ON collections
  FOR EACH ROW
  WHEN NEW.parent_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'collections: row cannot be its own parent')
   WHERE NEW.parent_id = NEW.id;

  SELECT RAISE(ABORT, 'collections: hierarchy cycle detected')
   WHERE EXISTS (
     WITH RECURSIVE walk (id, depth) AS (
       SELECT NEW.parent_id, 1
       UNION ALL
       SELECT c.parent_id, walk.depth + 1
         FROM walk
         JOIN collections AS c ON c.id = walk.id
        WHERE walk.id IS NOT NULL
          AND walk.depth < 1000
     )
     SELECT 1 FROM walk WHERE id = NEW.id
   );

  SELECT RAISE(ABORT, 'collections: hierarchy exceeds 1000 levels (corrupt data?)')
   WHERE EXISTS (
     WITH RECURSIVE walk (id, depth) AS (
       SELECT NEW.parent_id, 1
       UNION ALL
       SELECT c.parent_id, walk.depth + 1
         FROM walk
         JOIN collections AS c ON c.id = walk.id
        WHERE walk.id IS NOT NULL
          AND walk.depth < 1000
     )
     SELECT 1
       FROM walk AS w
       JOIN collections AS c ON c.id = w.id
      WHERE w.depth = 999
        AND c.parent_id IS NOT NULL
   );
END;
DROP TRIGGER IF EXISTS collections_prevent_hierarchy_cycle_insert;
CREATE TRIGGER collections_prevent_hierarchy_cycle_insert
  BEFORE INSERT ON collections
  FOR EACH ROW
  WHEN NEW.parent_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'collections: row cannot be its own parent')
   WHERE NEW.parent_id = NEW.id;

  SELECT RAISE(ABORT, 'collections: hierarchy cycle detected')
   WHERE EXISTS (
     WITH RECURSIVE walk (id, depth) AS (
       SELECT NEW.parent_id, 1
       UNION ALL
       SELECT c.parent_id, walk.depth + 1
         FROM walk
         JOIN collections AS c ON c.id = walk.id
        WHERE walk.id IS NOT NULL
          AND walk.depth < 1000
     )
     SELECT 1 FROM walk WHERE id = NEW.id
   );

  SELECT RAISE(ABORT, 'collections: hierarchy exceeds 1000 levels (corrupt data?)')
   WHERE EXISTS (
     WITH RECURSIVE walk (id, depth) AS (
       SELECT NEW.parent_id, 1
       UNION ALL
       SELECT c.parent_id, walk.depth + 1
         FROM walk
         JOIN collections AS c ON c.id = walk.id
        WHERE walk.id IS NOT NULL
          AND walk.depth < 1000
     )
     SELECT 1
       FROM walk AS w
       JOIN collections AS c ON c.id = w.id
      WHERE w.depth = 999
        AND c.parent_id IS NOT NULL
   );
END;

CREATE TABLE IF NOT EXISTS collection_meta (
  collection_id INTEGER NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
  key           TEXT NOT NULL,
  value         TEXT,
  PRIMARY KEY (collection_id, key)
);

CREATE TABLE IF NOT EXISTS collection_revisions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id INTEGER NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
  author_id     INTEGER REFERENCES users (id) ON DELETE SET NULL,
  data          TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT collection_revisions_id_positive CHECK (id > 0)
);
CREATE INDEX IF NOT EXISTS collection_revisions_collection_created_idx
  ON collection_revisions (collection_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS media (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  filename        TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  filesize        INTEGER NOT NULL CHECK (filesize >= 0),
  width           INTEGER CHECK (width > 0),
  height          INTEGER CHECK (height > 0),
  alt             TEXT,
  caption         TEXT,
  uploaded_by     INTEGER REFERENCES users (id) ON DELETE SET NULL,
  variants        TEXT NOT NULL DEFAULT '[]',
  variants_status TEXT NOT NULL DEFAULT 'none'
                    CHECK (variants_status IN ('none', 'pending', 'ready', 'failed')),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT media_id_positive CHECK (id > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS media_filename_unique ON media (filename);
CREATE INDEX IF NOT EXISTS media_uploaded_by_idx ON media (uploaded_by);
DROP TRIGGER IF EXISTS media_set_updated_at;
CREATE TRIGGER media_set_updated_at
  AFTER UPDATE ON media
  FOR EACH ROW
BEGIN
  UPDATE media
     SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
   WHERE id = NEW.id
     AND updated_at IS NOT strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
END;

CREATE TABLE IF NOT EXISTS dictionaries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL,
  title      TEXT NOT NULL,
  type       TEXT NOT NULL,
  fields     TEXT NOT NULL DEFAULT '{}',
  parent_id  INTEGER REFERENCES dictionaries (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT dictionaries_id_positive CHECK (id > 0),
  CONSTRAINT dictionaries_parent_not_self CHECK (parent_id IS NULL OR parent_id != id)
);
CREATE UNIQUE INDEX IF NOT EXISTS dictionaries_type_parent_slug_unique
  ON dictionaries (type, COALESCE(parent_id, 0), slug);
CREATE INDEX IF NOT EXISTS dictionaries_parent_id_idx ON dictionaries (parent_id);
CREATE INDEX IF NOT EXISTS dictionaries_type_parent_idx ON dictionaries (type, parent_id);
DROP TRIGGER IF EXISTS dictionaries_set_updated_at;
CREATE TRIGGER dictionaries_set_updated_at
  AFTER UPDATE ON dictionaries
  FOR EACH ROW
BEGIN
  UPDATE dictionaries
     SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
   WHERE id = NEW.id
     AND updated_at IS NOT strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
END;
DROP TRIGGER IF EXISTS dictionaries_prevent_hierarchy_cycle;
CREATE TRIGGER dictionaries_prevent_hierarchy_cycle
  BEFORE UPDATE OF parent_id ON dictionaries
  FOR EACH ROW
  WHEN NEW.parent_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'dictionaries: row cannot be its own parent')
   WHERE NEW.parent_id = NEW.id;

  SELECT RAISE(ABORT, 'dictionaries: hierarchy cycle detected')
   WHERE EXISTS (
     WITH RECURSIVE walk (id, depth) AS (
       SELECT NEW.parent_id, 1
       UNION ALL
       SELECT d.parent_id, walk.depth + 1
         FROM walk
         JOIN dictionaries AS d ON d.id = walk.id
        WHERE walk.id IS NOT NULL
          AND walk.depth < 1000
     )
     SELECT 1 FROM walk WHERE id = NEW.id
   );

  SELECT RAISE(ABORT, 'dictionaries: hierarchy exceeds 1000 levels (corrupt data?)')
   WHERE EXISTS (
     WITH RECURSIVE walk (id, depth) AS (
       SELECT NEW.parent_id, 1
       UNION ALL
       SELECT d.parent_id, walk.depth + 1
         FROM walk
         JOIN dictionaries AS d ON d.id = walk.id
        WHERE walk.id IS NOT NULL
          AND walk.depth < 1000
     )
     SELECT 1
       FROM walk AS w
       JOIN dictionaries AS d ON d.id = w.id
      WHERE w.depth = 999
        AND d.parent_id IS NOT NULL
   );
END;
DROP TRIGGER IF EXISTS dictionaries_prevent_hierarchy_cycle_insert;
CREATE TRIGGER dictionaries_prevent_hierarchy_cycle_insert
  BEFORE INSERT ON dictionaries
  FOR EACH ROW
  WHEN NEW.parent_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'dictionaries: row cannot be its own parent')
   WHERE NEW.parent_id = NEW.id;

  SELECT RAISE(ABORT, 'dictionaries: hierarchy cycle detected')
   WHERE EXISTS (
     WITH RECURSIVE walk (id, depth) AS (
       SELECT NEW.parent_id, 1
       UNION ALL
       SELECT d.parent_id, walk.depth + 1
         FROM walk
         JOIN dictionaries AS d ON d.id = walk.id
        WHERE walk.id IS NOT NULL
          AND walk.depth < 1000
     )
     SELECT 1 FROM walk WHERE id = NEW.id
   );

  SELECT RAISE(ABORT, 'dictionaries: hierarchy exceeds 1000 levels (corrupt data?)')
   WHERE EXISTS (
     WITH RECURSIVE walk (id, depth) AS (
       SELECT NEW.parent_id, 1
       UNION ALL
       SELECT d.parent_id, walk.depth + 1
         FROM walk
         JOIN dictionaries AS d ON d.id = walk.id
        WHERE walk.id IS NOT NULL
          AND walk.depth < 1000
     )
     SELECT 1
       FROM walk AS w
       JOIN dictionaries AS d ON d.id = w.id
      WHERE w.depth = 999
        AND d.parent_id IS NOT NULL
   );
END;

CREATE TABLE IF NOT EXISTS collection_dictionaries (
  collection_id INTEGER NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
  dictionary_id INTEGER NOT NULL REFERENCES dictionaries (id) ON DELETE CASCADE,
  PRIMARY KEY (collection_id, dictionary_id)
);
CREATE INDEX IF NOT EXISTS collection_dictionaries_dictionary_idx
  ON collection_dictionaries (dictionary_id);

CREATE TABLE IF NOT EXISTS options (
  key      TEXT PRIMARY KEY,
  value    TEXT
);