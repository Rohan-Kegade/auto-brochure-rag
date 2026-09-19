import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { MAX_PDFS, MAX_FILE_SIZE_MB } from "../constants/config";
import { fetchActiveFiles, uploadFilesApi, deleteFileApi } from "../api/api";
import { getErrorMessage } from "../utils/errors";

export function useFileManager(onUploadSuccess, onRemoveSuccess) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const [limits, setLimits] = useState({
    maxPdfs: MAX_PDFS,
    maxFileSizeMb: MAX_FILE_SIZE_MB,
  });

  const activePdfCount = uploadedFiles.length;
  const hasActivePdfs = activePdfCount > 0;
  const maxPdfsReached = activePdfCount >= limits.maxPdfs;

  const syncActiveFiles = useCallback(async () => {
    try {
      const data = await fetchActiveFiles();
      if (data.indexed_files) {
        setUploadedFiles(data.indexed_files.map((name) => ({ name })));
      }
      setLimits({
        maxPdfs: data.max_pdfs ?? MAX_PDFS,
        maxFileSizeMb: data.max_file_size_mb ?? MAX_FILE_SIZE_MB,
      });
    } catch (err) {
      console.error(err.message);
      toast.error(getErrorMessage(err, "Couldn't load your files."), {
        id: "files-load-error",
      });
    }
  }, []);

  useEffect(() => {
    syncActiveFiles();
  }, [syncActiveFiles]);

  const handleFileChange = (e, fileInputRef) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validPdfs = files.filter(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf"),
    );

    if (validPdfs.length !== files.length) {
      toast.error("Only PDF files are supported.");
    }

    const maxBytes = limits.maxFileSizeMb * 1024 * 1024;
    const sizedPdfs = validPdfs.filter((file) => file.size <= maxBytes);

    if (sizedPdfs.length !== validPdfs.length) {
      toast.error(`Each PDF must be ${limits.maxFileSizeMb} MB or smaller.`);
    }

    const existingNames = new Set(uploadedFiles.map((file) => file.name));
    const newFiles = sizedPdfs.filter((file) => !existingNames.has(file.name));

    if (!newFiles.length) {
      // Only claim "already active" when files actually passed the type/size
      // checks; otherwise the rejection was already reported above.
      if (sizedPdfs.length > 0) {
        toast.warning(
          sizedPdfs.length === 1
            ? "That PDF is already active."
            : "Those PDFs are already active.",
        );
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const availableSlots = limits.maxPdfs - activePdfCount;
    if (newFiles.length > availableSlots) {
      toast.warning(
        `Limit reached: You can only add ${availableSlots} more PDF${availableSlots === 1 ? "" : "s"}.`,
      );
      setSelectedFiles(newFiles.slice(0, availableSlots));
    } else {
      setSelectedFiles(newFiles);
    }
  };

  const uploadDocuments = async (fileInputRef) => {
    if (!selectedFiles.length) {
      toast.warning("Select at least one PDF to add.");
      return;
    }

    setIsUploading(true);
    try {
      const data = await uploadFilesApi(selectedFiles);
      const uploadedNames =
        data.uploaded || selectedFiles.map((file) => file.name);
      const newlyUploadedFiles = selectedFiles.filter((file) =>
        uploadedNames.includes(file.name),
      );
      const skippedFiles = selectedFiles.filter(
        (file) => !uploadedNames.includes(file.name),
      );

      setUploadedFiles((prev) => [...prev, ...newlyUploadedFiles]);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (newlyUploadedFiles.length > 0) {
        toast.success(
          `${newlyUploadedFiles.length} brochure${newlyUploadedFiles.length > 1 ? "s" : ""} added successfully!`,
        );
      }

      if (skippedFiles.length > 0) {
        toast.warning(
          skippedFiles.length === 1
            ? `Couldn't add "${skippedFiles[0].name}" — it may be unreadable or already added.`
            : `Couldn't add ${skippedFiles.length} files — they may be unreadable or already added.`,
        );
      }

      if (newlyUploadedFiles.length > 0 && onUploadSuccess) {
        onUploadSuccess(newlyUploadedFiles);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to upload brochure."));
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = async (fileName) => {
    try {
      await deleteFileApi(fileName);
      setUploadedFiles((prev) => prev.filter((file) => file.name !== fileName));
      toast.info(`Removed ${fileName}`);
      if (onRemoveSuccess) {
        onRemoveSuccess(fileName);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to remove ${fileName}`));
    }
  };

  return {
    selectedFiles,
    uploadedFiles,
    isUploading,
    activePdfCount,
    hasActivePdfs,
    maxPdfsReached,
    maxPdfs: limits.maxPdfs,
    handleFileChange,
    uploadDocuments,
    removeFile,
  };
}
