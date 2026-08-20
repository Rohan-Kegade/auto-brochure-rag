import { useState, useEffect, useCallback } from "react";
import { MAX_PDFS } from "../constants/config";
import { fetchActiveFiles, uploadFilesApi } from "../api/api";

export function useFileManager(sessionId, onUploadSuccess) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const activePdfCount = uploadedFiles.length;
  const hasActivePdfs = activePdfCount > 0;
  const maxPdfsReached = activePdfCount >= MAX_PDFS;

  const syncActiveFiles = useCallback(async () => {
    try {
      const data = await fetchActiveFiles(sessionId);
      if (data.indexed_files) {
        setUploadedFiles(data.indexed_files.map((name) => ({ name })));
      }
    } catch (err) {
      console.error(err.message);
    }
  }, [sessionId]);

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
      alert("Only PDF files are supported.");
    }

    const existingNames = new Set(uploadedFiles.map((file) => file.name));
    const newFiles = validPdfs.filter((file) => !existingNames.has(file.name));

    if (!newFiles.length) {
      alert("The selected PDF is already active.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const availableSlots = MAX_PDFS - activePdfCount;
    if (newFiles.length > availableSlots) {
      alert(
        `You can have up to ${MAX_PDFS} active PDFs. You can add ${availableSlots} more.`,
      );
      setSelectedFiles(newFiles.slice(0, availableSlots));
    } else {
      setSelectedFiles(newFiles);
    }
  };

  const uploadDocuments = async (fileInputRef) => {
    if (!selectedFiles.length) return;

    setIsUploading(true);
    try {
      const data = await uploadFilesApi(sessionId, selectedFiles);
      const uploadedNames =
        data.uploaded || selectedFiles.map((file) => file.name);
      const newlyUploadedFiles = selectedFiles.filter((file) =>
        uploadedNames.includes(file.name),
      );

      setUploadedFiles((prev) => [...prev, ...newlyUploadedFiles]);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (onUploadSuccess) onUploadSuccess(newlyUploadedFiles);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (fileName) => {
    setUploadedFiles((prev) => prev.filter((file) => file.name !== fileName));
  };

  const resetFiles = () => {
    setUploadedFiles([]);
    setSelectedFiles([]);
  };

  return {
    selectedFiles,
    uploadedFiles,
    isUploading,
    activePdfCount,
    hasActivePdfs,
    maxPdfsReached,
    handleFileChange,
    uploadDocuments,
    removeFile,
    resetFiles,
  };
}
