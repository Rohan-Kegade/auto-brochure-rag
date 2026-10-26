import { toast } from "sonner";
import { MAX_FILE_SIZE_MB } from "../constants/config";

const isPdf = (file) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

/** Keep only valid PDFs within the size limit, toasting about the rest. */
export function filterPdfs(files) {
  const pdfs = files.filter(isPdf);
  if (pdfs.length !== files.length) toast.error("Only PDF files are supported.");
  const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
  const sized = pdfs.filter((f) => f.size <= maxBytes);
  if (sized.length !== pdfs.length) {
    toast.error(`Each PDF must be ${MAX_FILE_SIZE_MB} MB or smaller.`);
  }
  return sized;
}
