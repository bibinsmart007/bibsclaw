import * as fs from "fs";
import * as path from "path";

export interface ReportConfig {
  title: string;
  dateRange: { start: Date; end: Date };
  sections: ReportSection[];
  format: "csv" | "json" | "pdf" | "html";
  outputDir: string;
}

export interface ReportSection {
  name: string;
  type: "table" | "chart" | "summary" | "list";
  data: Record<string, unknown>[];
  columns?: string[];
}

export class ReportExporter {
  private outputDir: string;

  constructor(outputDir: string = "./reports") {
    this.outputDir = outputDir;
    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true });
  }

  async exportCSV(config: ReportConfig): Promise<string> {
    const lines: string[] = [];
    for (const section of config.sections) {
      lines.push("# " + section.name);
      if (section.data.length > 0) {
        const headers = section.columns || Object.keys(section.data[0]);
        lines.push(headers.join(","));
        for (const row of section.data) {
          const values = headers.map(h => { const str = String(row[h] ?? ""); return str.includes(",") ? "\"" + str + "\"" : str; });
          lines.push(values.join(","));
        }
      }
      lines.push("");
    }
    const fp = path.join(this.outputDir, this.genName(config.title, "csv"));
    fs.writeFileSync(fp, lines.join("
"), "utf-8");
    return fp;
  }

  async exportJSON(config: ReportConfig): Promise<string> {
    const report = { title: config.title, generatedAt: new Date().toISOString(),
      dateRange: { start: config.dateRange.start.toISOString(), end: config.dateRange.end.toISOString() },
      sections: config.sections.map(s => ({ name: s.name, type: s.type, recordCount: s.data.length, data: s.data })) };
    const fp = path.join(this.outputDir, this.genName(config.title, "json"));
    fs.writeFileSync(fp, JSON.stringify(report, null, 2), "utf-8");
    return fp;
  }

  async exportHTML(config: ReportConfig): Promise<string> {
    const sections = config.sections.map(s => {
      if (s.data.length === 0) return "<p>No data</p>";
      const h = s.columns || Object.keys(s.data[0]);
      const hdr = h.map(c => "<th>" + c + "</th>").join("");
      const rows = s.data.map(r => "<tr>" + h.map(c => "<td>" + String(r[c] ?? "") + "</td>").join("") + "</tr>").join("");
      return "<h2>" + s.name + "</h2><table><thead><tr>" + hdr + "</tr></thead><tbody>" + rows + "</tbody></table>";
    }).join("");
    const css = "body{font-family:Inter,sans-serif;margin:2rem;background:#0f172a;color:#f1f5f9}table{width:100%;border-collapse:collapse;margin:1rem 0}th,td{padding:8px 12px;border:1px solid #334155;text-align:left}th{background:#1e293b}tr:nth-child(even){background:#1e293b}h1{color:#6366f1}h2{color:#22d3ee}";
    const html = "<!DOCTYPE html><html><head><title>" + config.title + "</title><style>" + css + "</style></head><body><h1>" + config.title + "</h1><p>Generated: " + new Date().toISOString() + "</p>" + sections + "</body></html>";
    const fp = path.join(this.outputDir, this.genName(config.title, "html"));
    fs.writeFileSync(fp, html, "utf-8");
    return fp;
  }

  async export(config: ReportConfig): Promise<string> {
    switch (config.format) {
      case "csv": return this.exportCSV(config);
      case "json": return this.exportJSON(config);
      case "html": return this.exportHTML(config);
      default: return this.exportJSON(config);
    }
  }

  private genName(title: string, ext: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_" + new Date().toISOString().slice(0, 10) + "." + ext;
  }

  listReports(): { name: string; size: number; created: Date }[] {
    if (!fs.existsSync(this.outputDir)) return [];
    return fs.readdirSync(this.outputDir).map(n => { const s = fs.statSync(path.join(this.outputDir, n)); return { name: n, size: s.size, created: s.birthtime }; });
  }
}

export const reportExporter = new ReportExporter();
