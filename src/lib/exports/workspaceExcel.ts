import { getCompanySettings } from '@/lib/pdfGeneratorLazy';

export interface ExportColumn { key: string; label: string }

export function nestedExportValue(row: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, row);
}

export function exportMatrix(data: readonly unknown[], columns: readonly ExportColumn[]) {
  return data.map(row => columns.map(column => nestedExportValue(row, column.key) ?? ''));
}

/** XLSX package drawing using the already installed spreadsheet ZIP utilities. */
export async function createWorkspaceWorkbook({ data, columns, title, companyName, date = new Date(), logo }: {
  data: readonly unknown[]; columns: readonly ExportColumn[]; title: string; companyName?: string; date?: Date; logo?: Uint8Array;
}): Promise<Uint8Array> {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.aoa_to_sheet([
    [companyName || title],
    [title],
    [`تاريخ الاستخراج: ${date.toLocaleString('ar-EG')}`],
    [], [], [],
    columns.map(column => column.label),
    ...exportMatrix(data, columns),
  ]);
  worksheet['!cols'] = columns.map(column => ({ wch: Math.max(18, column.label.length + 4) }));
  worksheet['!merges'] = [0, 1, 2].map(row => ({ s: { r: row, c: 0 }, e: { r: row, c: Math.max(0, columns.length - 1) } }));
  worksheet['!rows'] = [{ hpt: 28 }, { hpt: 24 }, { hpt: 22 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }];
  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(workbook, worksheet, 'البيانات');
  const bytes = new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
  if (!logo) return bytes;
  const zip = XLSX.CFB.read(bytes, { type: 'buffer' });
  const addText = (path: string, text: string) => XLSX.CFB.utils.cfb_add(zip, path, new TextEncoder().encode(text));
  const getText = (path: string) => new TextDecoder().decode(new Uint8Array(XLSX.CFB.find(zip, path).content));
  addText('xl/worksheets/sheet1.xml', getText('xl/worksheets/sheet1.xml').replace('</worksheet>', '<drawing xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rIdLogo"/></worksheet>'));
  addText('xl/worksheets/_rels/sheet1.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>');
  addText('xl/drawings/drawing1.xml', '<?xml version="1.0"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>3</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="1143000" cy="571500"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="1" name="Company logo"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>');
  addText('xl/drawings/_rels/drawing1.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/company-logo.png"/></Relationships>');
  XLSX.CFB.utils.cfb_add(zip, 'xl/media/company-logo.png', logo);
  addText('[Content_Types].xml', getText('[Content_Types].xml').replace('</Types>', '<Default Extension="png" ContentType="image/png"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>'));
  return new Uint8Array(XLSX.CFB.write(zip, { type: 'buffer', fileType: 'zip' }));
}

async function logoPng(url: string): Promise<Uint8Array> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = url;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 120;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('تعذر إعداد شعار الشركة');
  const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('تعذر تجهيز الشعار');
  return new Uint8Array(await blob.arrayBuffer());
}

export async function exportWorkspaceExcel(data: readonly unknown[], columns: readonly ExportColumn[], title: string, filename: string) {
  const company = await getCompanySettings();
  const logo = company?.logo_url ? await logoPng(company.logo_url) : undefined;
  const bytes = await createWorkspaceWorkbook({ data, columns, title, companyName: company?.company_name, logo });
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}