import type { ChatAttachmentInput } from "@/types";

export const MAX_ATTACHMENT_TEXT_CHARS = 40000;
export const MAX_ATTACHMENT_SIZE_BYTES = 2 * 1024 * 1024;

export const SUPPORTED_ATTACHMENT_ACCEPT =
  ".txt,.md,.markdown,.json,.csv,.log,.ts,.tsx,.js,.jsx,.rs,.py,.go,.java,.sql,.yaml,.yml,.docx";

const TEXT_ATTACHMENT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "log",
  "ts",
  "tsx",
  "js",
  "jsx",
  "rs",
  "py",
  "go",
  "java",
  "sql",
  "yaml",
  "yml",
]);

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
}

function fileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function isTextAttachment(file: File): boolean {
  if (file.type.startsWith("text/")) return true;
  return TEXT_ATTACHMENT_EXTENSIONS.has(fileExtension(file.name));
}

export function isWordDocumentAttachment(file: File): boolean {
  return (
    fileExtension(file.name) === "docx" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export async function buildChatAttachmentInput(file: File): Promise<ChatAttachmentInput> {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error(`附件「${file.name}」超过 ${formatFileSize(MAX_ATTACHMENT_SIZE_BYTES)}，第一版请先使用较小的文件。`);
  }

  if (isTextAttachment(file)) {
    return {
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      content_text: limitAttachmentText(await file.text()),
      status: "ready",
    };
  }

  if (isWordDocumentAttachment(file)) {
    const content = await extractDocxText(await file.arrayBuffer());
    return {
      file_name: file.name,
      mime_type:
        file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size_bytes: file.size,
      content_text: limitAttachmentText(content),
      status: content.trim() ? "ready" : "unsupported",
    };
  }

  return {
    file_name: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    content_text: null,
    status: "unsupported",
  };
}

export async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const data = new Uint8Array(buffer);
  const entries = readZipEntries(data);
  const documentEntry = entries.find((entry) => entry.name === "word/document.xml");
  if (!documentEntry) {
    throw new Error("Word 文档缺少 word/document.xml，无法读取正文。");
  }
  const xmlBytes = await readZipEntry(data, documentEntry);
  const xml = new TextDecoder("utf-8").decode(xmlBytes);
  return extractWordDocumentXmlText(xml);
}

export function extractWordDocumentXmlText(xml: string): string {
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const parseError = doc.getElementsByTagName("parsererror")[0];
    if (parseError) {
      throw new Error("Word XML 解析失败。");
    }
    return Array.from(doc.getElementsByTagNameNS("*", "p"))
      .map((paragraph) => extractParagraphText(paragraph))
      .map((text) => text.trim())
      .filter(Boolean)
      .join("\n");
  }

  return fallbackExtractWordText(xml);
}

function extractParagraphText(paragraph: Element): string {
  const parts: string[] = [];
  paragraph.querySelectorAll("*").forEach((node) => {
    if (node.localName === "t") {
      parts.push(node.textContent ?? "");
    } else if (node.localName === "tab") {
      parts.push("\t");
    } else if (node.localName === "br" || node.localName === "cr") {
      parts.push("\n");
    }
  });
  return parts.join("");
}

function fallbackExtractWordText(xml: string): string {
  return Array.from(xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g))
    .map((paragraphMatch) =>
      Array.from(paragraphMatch[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g))
        .map((textMatch) => decodeXmlEntities(textMatch[1] ?? ""))
        .join(""),
    )
    .map((text) => text.trim())
    .filter(Boolean)
    .join("\n");
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function limitAttachmentText(content: string): string {
  if (content.length <= MAX_ATTACHMENT_TEXT_CHARS) return content;
  return `${content.slice(0, MAX_ATTACHMENT_TEXT_CHARS)}\n\n[文件内容已截断，仅保留前 ${MAX_ATTACHMENT_TEXT_CHARS} 字符]`;
}

function readZipEntries(data: Uint8Array): ZipEntry[] {
  const eocdOffset = findEndOfCentralDirectory(data);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const entryCount = view.getUint16(eocdOffset + 10, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  const decoder = new TextDecoder("utf-8");
  const entries: ZipEntry[] = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("DOCX ZIP 中央目录格式异常。");
    }
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameStart = offset + 46;
    const name = decoder.decode(data.slice(nameStart, nameStart + fileNameLength));
    entries.push({ name, method, compressedSize, localHeaderOffset });
    offset = nameStart + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(data: Uint8Array): number {
  const minOffset = Math.max(0, data.length - 65557);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let offset = data.length - 22; offset >= minOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      return offset;
    }
  }
  throw new Error("文件不是有效的 DOCX ZIP 包。");
}

async function readZipEntry(data: Uint8Array, entry: ZipEntry): Promise<Uint8Array> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const offset = entry.localHeaderOffset;
  if (view.getUint32(offset, true) !== 0x04034b50) {
    throw new Error("DOCX ZIP 本地文件头格式异常。");
  }
  const fileNameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const compressed = data.slice(dataStart, dataStart + entry.compressedSize);

  if (entry.method === 0) return compressed;
  if (entry.method === 8) return inflateRaw(compressed);
  throw new Error(`暂不支持 DOCX ZIP 压缩方式：${entry.method}`);
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("当前系统 WebView 不支持 DOCX 解压能力。");
  }
  const bytes = new Uint8Array(data);
  const stream = new Blob([bytes.buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
