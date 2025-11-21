import { useState } from "react";

export default function useUpload({ max = 4, maxSizeMB = 5 }) {
  const [files, setFiles] = useState(Array(max).fill(null));
  const [error, setError] = useState("");

  const setFile = (idx, file) => {
    setError("");
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setError("Formato no soportado. Subí JPG o PNG.");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`La imagen supera ${maxSizeMB}MB.`);
      return;
    }
    const next = files.slice();
    next[idx] = file;
    setFiles(next);
  };

  const removeFile = (idx) => {
    const next = files.slice();
    next[idx] = null;
    setFiles(next);
  };

  const canSubmit = files.filter(Boolean).length === max;

  return { files, setFile, removeFile, canSubmit, error };
}
