/* eslint-disable @typescript-eslint/no-explicit-any */

declare module "pdf-table-extractor" {
  interface PageTable {
    page: number;
    tables: string[];
    merges: any;
    merge_alias: any;
    width: number;
    height: number;
  }

  interface SuccessCallback {
    pageTables: PageTable[];
  }

  type ErrorCallback = any;

  function pdf_table_extractor(
    pdfPath: string,
    success: (arg: SuccessCallback) => void,
    error: (arg: ErrorCallback) => void
  ): void;

  export = pdf_table_extractor;
}
