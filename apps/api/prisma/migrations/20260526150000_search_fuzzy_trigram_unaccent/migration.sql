-- ─── Smart Search Foundation ─────────────────────────────────────────────
-- Activa las extensiones Postgres necesarias para búsqueda tolerante a
-- typos (pg_trgm) y a tildes (unaccent), más índices GIN para que la
-- evaluación de similitud sea O(log n) sobre el catálogo.
--
-- Supabase trae ambas extensiones pre-instaladas y permite
-- CREATE EXTENSION desde migraciones (no requieren superuser en su
-- pgbouncer pool).
-- ─────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() del extension es STABLE (depende del diccionario cargado),
-- y Postgres exige IMMUTABLE para usar una función dentro de un índice
-- expression. Wrappeamos la forma dictionary-explicit (que sí es
-- IMMUTABLE) en una helper propia. Patrón estándar — ver:
--   https://dba.stackexchange.com/q/177020/65325
-- y la guía oficial de Supabase para fuzzy search.
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1);
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- Índices GIN trigram sobre las columnas que más se buscan. Cada índice
-- pesa ~12-20% del tamaño de la columna pero permite:
--   · LIKE '%foo%'           → uso del índice (no full-scan)
--   · text % 'foo'           → operador trigram similarity
--   · similarity(a, b) > X   → ranking por score
-- Todos accent-insensitive y case-insensitive por el wrapper f_unaccent + lower.

CREATE INDEX IF NOT EXISTS products_name_trgm_idx
  ON products
  USING gin (public.f_unaccent(lower(name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS products_sku_trgm_idx
  ON products
  USING gin (public.f_unaccent(lower(sku)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS categories_name_trgm_idx
  ON categories
  USING gin (public.f_unaccent(lower(name)) gin_trgm_ops);
