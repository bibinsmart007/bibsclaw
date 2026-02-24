// Responsive Layout - Phase 4.1
// Responsive design system for mobile/tablet/desktop

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface BreakpointConfig {
  xs: number; sm: number; md: number; lg: number; xl: number; "2xl": number;
}

export interface LayoutState {
  currentBreakpoint: Breakpoint;
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  sidebarCollapsed: boolean;
}

const DEFAULT_BREAKPOINTS: BreakpointConfig = { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 };

export class ResponsiveLayoutManager {
  private breakpoints: BreakpointConfig;
  private state: LayoutState;
  private listeners: Array<(state: LayoutState) => void> = [];

  constructor(breakpoints?: Partial<BreakpointConfig>) {
    this.breakpoints = { ...DEFAULT_BREAKPOINTS, ...breakpoints };
    this.state = { currentBreakpoint: "lg", width: 1024, height: 768, isMobile: false, isTablet: false, isDesktop: true, sidebarCollapsed: false };
  }

  updateDimensions(width: number, height: number): void {
    this.state.width = width;
    this.state.height = height;
    this.state.currentBreakpoint = this.getBreakpoint(width);
    this.state.isMobile = width < this.breakpoints.md;
    this.state.isTablet = width >= this.breakpoints.md && width < this.breakpoints.lg;
    this.state.isDesktop = width >= this.breakpoints.lg;
    this.state.sidebarCollapsed = this.state.isMobile;
    this.notifyListeners();
  }

  getState(): LayoutState { return { ...this.state }; }

  onResize(listener: (state: LayoutState) => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter((l) => l !== listener); };
  }

  private getBreakpoint(width: number): Breakpoint {
    if (width >= this.breakpoints["2xl"]) return "2xl";
    if (width >= this.breakpoints.xl) return "xl";
    if (width >= this.breakpoints.lg) return "lg";
    if (width >= this.breakpoints.md) return "md";
    if (width >= this.breakpoints.sm) return "sm";
    return "xs";
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) { listener(this.getState()); }
  }
}
