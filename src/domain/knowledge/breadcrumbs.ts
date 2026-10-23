/**
 * Breadcrumb labels for knowledge routes only (/admin/knowledge/**).
 * Other app routes keep their existing breadcrumb behaviour.
 */
import { KIND_LABELS, isKnowledgeKind } from './labels';

export const KNOWLEDGE_BASE_PATH = '/admin/knowledge';

export interface KnowledgeCrumb { label: string; href: string; isLast: boolean }

const SEGMENT_LABELS: Record<string, string> = {
  admin: 'الإدارة',
  knowledge: 'المعرفة الهندسية',
  integrity: 'سلامة الروابط',
  matrix: 'مصفوفة الحالات',
  doc: 'مستند',
};

export function isKnowledgePath(pathname: string): boolean {
  return pathname === KNOWLEDGE_BASE_PATH || pathname.startsWith(`${KNOWLEDGE_BASE_PATH}/`);
}

/**
 * @param titleForPath resolves a repo doc path to its title (null when unknown;
 *   the file name is used then, never the full path).
 */
export function knowledgeBreadcrumbs(pathname: string, titleForPath: (p: string) => string | null = () => null): KnowledgeCrumb[] {
  const segs = pathname.split('/').filter(Boolean);
  const crumbs: Omit<KnowledgeCrumb, 'isLast'>[] = [];
  let href = '';
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    href += `/${seg}`;
    if (seg === 'doc' && segs[i - 1] === 'knowledge') {
      const docPath = decodeURIComponent(segs.slice(i + 1).join('/'));
      const fileName = docPath.split('/').pop() ?? docPath;
      crumbs.push({ label: titleForPath(docPath) ?? (fileName || SEGMENT_LABELS.doc), href: pathname });
      break;
    }
    const label = SEGMENT_LABELS[seg] ?? (isKnowledgeKind(seg) ? KIND_LABELS[seg] : seg);
    crumbs.push({ label, href });
  }
  return crumbs.map((c, i) => ({ ...c, isLast: i === crumbs.length - 1 }));
}
