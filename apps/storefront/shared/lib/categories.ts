/**
 * Helpers de jerarquía de categorías. El backend devuelve la lista plana
 * (`parentId` apunta al padre) y la jerarquía se reconstruye aquí. Soporta
 * profundidad arbitraria — actualmente renderizamos 3 niveles, pero el
 * algoritmo no impone límite.
 */

import type { CategoryEntity } from "@/types/api";

export interface CategoryNode extends CategoryEntity {
  children: CategoryNode[];
  /** Profundidad 0-indexed (root = 0). */
  depth: number;
}

const compareByOrderThenName = (a: CategoryEntity, b: CategoryEntity): number => {
  if (a.order !== b.order) return a.order - b.order;
  return a.name.localeCompare(b.name);
};

/**
 * Construye un árbol recursivo desde la lista plana de categorías. Nodos
 * cuyo `parentId` no resuelva a una categoría existente se promueven a root
 * (para no perderlos por inconsistencias de data). El orden de hermanos sigue
 * `Category.order` ascendente con fallback alfabético por `name`.
 */
export function buildCategoryTree(flat: CategoryEntity[]): CategoryNode[] {
  if (flat.length === 0) return [];

  const nodes = new Map<string, CategoryNode>(
    flat.map((cat) => [cat.id, { ...cat, children: [], depth: 0 }]),
  );

  const roots: CategoryNode[] = [];

  for (const cat of flat) {
    const node = nodes.get(cat.id)!;
    const parent = cat.parentId ? nodes.get(cat.parentId) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (siblings: CategoryNode[], depth: number) => {
    siblings.sort(compareByOrderThenName);
    for (const node of siblings) {
      node.depth = depth;
      if (node.children.length > 0) sortRecursive(node.children, depth + 1);
    }
  };
  sortRecursive(roots, 0);

  return roots;
}

/**
 * Busca un nodo del árbol siguiendo una lista de slugs desde la raíz.
 * Retorna `null` si en cualquier punto del path no encuentra el slug.
 *
 * Ej: `findCategoryByPath(tree, ["joyeria", "anillos", "plata-925"])`
 */
export function findCategoryByPath(
  tree: CategoryNode[],
  slugPath: ReadonlyArray<string>,
): CategoryNode | null {
  if (slugPath.length === 0) return null;

  let siblings = tree;
  let found: CategoryNode | null = null;

  for (const slug of slugPath) {
    const needle = slug.trim().toLowerCase();
    found = siblings.find((c) => c.slug.toLowerCase() === needle) ?? null;
    if (!found) return null;
    siblings = found.children;
  }

  return found;
}

/**
 * Busca recursivamente un nodo del árbol por slug, sin importar la profundidad.
 * Útil como "shortcut amigable" cuando una URL externa apunta a una sub/leaf
 * sin conocer su path completo (ej. `?subcategory=joyas-acero-dorado` desde
 * un banner del home).
 *
 * Si hay varias categorías con el mismo slug a distintas profundidades —algo
 * que el schema previene con `slug @unique`— retorna la primera por DFS.
 */
export function findCategoryBySlugDeep(
  tree: CategoryNode[],
  slug: string,
): CategoryNode | null {
  const needle = slug.trim().toLowerCase();
  const walk = (siblings: CategoryNode[]): CategoryNode | null => {
    for (const node of siblings) {
      if (node.slug.toLowerCase() === needle) return node;
      const found = walk(node.children);
      if (found) return found;
    }
    return null;
  };
  return walk(tree);
}

/**
 * Devuelve la rama (root → ... → target) que termina en la categoría dada.
 * Útil para breadcrumbs.
 */
export function findCategoryBranchById(
  tree: CategoryNode[],
  targetId: string,
): CategoryNode[] {
  const walk = (siblings: CategoryNode[], trail: CategoryNode[]): CategoryNode[] | null => {
    for (const node of siblings) {
      const nextTrail = [...trail, node];
      if (node.id === targetId) return nextTrail;
      const sub = walk(node.children, nextTrail);
      if (sub) return sub;
    }
    return null;
  };
  return walk(tree, []) ?? [];
}
