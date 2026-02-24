// Responsive Layout - Phase 4.1
export interface Breakpoint {
  name: string;
  minWidth: number;
  columns: number;
}

export const breakpoints: Breakpoint[] = [
  { name: 'xs', minWidth: 0, columns: 1 },
  { name: 'sm', minWidth: 640, columns: 1 },
  { name: 'md', minWidth: 768, columns: 2 },
  { name: 'lg', minWidth: 1024, columns: 3 },
  { name: 'xl', minWidth: 1280, columns: 4 },
];

export class ResponsiveManager {
  private bp: Breakpoint = breakpoints[0];
  isMobile(): boolean { return this.bp.minWidth < 768; }
  isDesktop(): boolean { return this.bp.minWidth >= 1024; }
  getCurrent(): Breakpoint { return this.bp; }
}
