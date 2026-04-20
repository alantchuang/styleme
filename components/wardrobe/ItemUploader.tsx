"use client";

import { useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { validateMimeType, validateFileSize } from "@/lib/wardrobeValidation";

const MAX_BATCH = 20;

interface ItemUploaderProps {
  onSuccess: () => void;
}

type UploaderState =
  | { status: "idle" }
  | { status: "preview"; files: File[]; previewUrls: string[] }
  | { status: "uploading"; current: number; total: number }
  | { status: "done"; uploaded: number; failed: number }
  | { status: "error"; message: string };

function friendlyError(code: string): string {
  switch (code) {
    case "invalid_file_type":
      return "Only JPEG, PNG, and WebP images are supported.";
    case "file_too_large":
      return "File must be under 20 MB.";
    case "wardrobe_full":
      return "Your wardrobe is full (200 items maximum). Remove some items to add more.";
    case "tagging_failed":
      return "Couldn't analyse the image. Please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export default function ItemUploader({ onSuccess }: ItemUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploaderState>({ status: "idle" });
  const uploadAction = useAction(api.wardrobeUpload.upload);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    // Capture files as Array before resetting input — Safari clears the live
    // FileList when input.value is set, so this order matters.
    const files = Array.from(fileList).slice(0, MAX_BATCH);
    e.target.value = "";

    // Validate all files
    for (const file of files) {
      if (!validateMimeType(file.type)) {
        setState({ status: "error", message: friendlyError("invalid_file_type") });
        return;
      }
      if (!validateFileSize(file.size)) {
        setState({ status: "error", message: friendlyError("file_too_large") });
        return;
      }
    }

    const previewUrls = files.map((f) => URL.createObjectURL(f));
    setState({ status: "preview", files, previewUrls });
  }

  async function handleUpload() {
    if (state.status !== "preview") return;
    const { files, previewUrls } = state;
    previewUrls.forEach((url) => URL.revokeObjectURL(url));

    let uploaded = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      setState({ status: "uploading", current: i + 1, total: files.length });
      try {
        const arrayBuffer = await files[i].arrayBuffer();
        await uploadAction({ fileBuffer: arrayBuffer, mimeType: files[i].type });
        uploaded++;
      } catch (err: unknown) {
        console.error("ItemUploader.handleUpload", err);
        failed++;
      }
    }

    setState({ status: "done", uploaded, failed });
    onSuccess();
  }

  function handleCancel() {
    if (state.status === "preview") {
      state.previewUrls.forEach((url) => URL.revokeObjectURL(url));
    }
    setState({ status: "idle" });
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Floating add button */}
      {state.status === "idle" && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="fixed bottom-20 right-4 w-12 h-12 bg-violet-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl active:scale-95 transition-transform z-30"
          aria-label="Add wardrobe item"
        >
          +
        </button>
      )}

      {/* Preview — thumbnail grid */}
      {state.status === "preview" && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center p-6 gap-4">
          <p className="text-white font-medium">
            {state.files.length} {state.files.length === 1 ? "image" : "images"} selected
            {state.files.length === MAX_BATCH && " (max)"}
          </p>
          <div className="grid grid-cols-4 gap-2 w-full max-w-xs max-h-64 overflow-y-auto">
            {state.previewUrls.map((url, i) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden bg-slate-100">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={handleCancel}
              className="flex-1 border border-slate-200 bg-white text-slate-700 rounded-xl px-6 py-3 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              className="flex-1 bg-violet-700 text-white rounded-xl px-6 py-3 text-sm font-medium active:scale-[0.98]"
            >
              Upload all
            </button>
          </div>
        </div>
      )}

      {/* Uploading progress */}
      {state.status === "uploading" && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-violet-400 border-t-transparent animate-spin" />
          <p className="text-white text-sm">
            Uploading {state.current} of {state.total}…
          </p>
        </div>
      )}

      {/* Done summary */}
      {state.status === "done" && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center space-y-3">
            <p className="text-slate-900 font-medium">Upload complete</p>
            <p className="text-slate-500 text-sm">
              {state.uploaded} uploaded{state.failed > 0 ? `, ${state.failed} failed` : ""}
            </p>
            <button
              onClick={handleCancel}
              className="w-full bg-violet-700 text-white rounded-xl px-6 py-3 text-sm font-medium active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {state.status === "error" && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center space-y-3">
            <p className="text-slate-900 font-medium">Upload failed</p>
            <p className="text-slate-500 text-sm">{state.message}</p>
            <button
              onClick={handleCancel}
              className="w-full bg-violet-700 text-white rounded-xl px-6 py-3 text-sm font-medium active:scale-[0.98]"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
