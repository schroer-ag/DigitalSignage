"use client";

import { useState } from "react";
import { createAsset, updateAsset } from "./actions";
import { createClient } from "@/lib/supabase/client";

const selectClass = "rounded border border-gray-800 bg-[#0f1115] px-2 py-1 text-sm text-gray-200";
const textClass = "rounded border border-gray-800 bg-[#0f1115] px-2 py-1 text-sm text-gray-200";
const fileClass =
  "rounded border border-gray-800 bg-[#0f1115] px-2 py-1 text-xs text-gray-200 file:mr-2 file:rounded file:border-0 file:bg-gray-800 file:px-2 file:py-1 file:text-xs file:text-gray-200";

const STORAGE_BUCKET = "assets";

const KIND_OPTIONS = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "embed", label: "Website" },
  { value: "calendar_agenda", label: "Calendar Agenda" },
];

// Which of the optional fields a kind actually uses -- shown/hidden instead
// of always-present-but-ignored, so picking a Type only surfaces what's
// relevant to it.
function showsUpload(kind: string): boolean {
  return kind === "image" || kind === "video";
}
function showsDaysAhead(kind: string): boolean {
  return kind === "calendar_agenda";
}
function showsDefaultDuration(kind: string): boolean {
  // Video plays to its own natural end (DisplayPlayer ignores
  // duration_seconds for it) -- a default duration would just be ignored.
  return kind !== "video";
}

function KindSelect({ kind, onChange }: { kind: string; onChange: (kind: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">Type</label>
      <select name="kind" value={kind} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {KIND_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Shared upload state + logic for both Add and Edit forms. The file goes
// straight from the browser to Supabase Storage -- never through a Server
// Action -- because Vercel's serverless functions have a hard ~4.5MB
// request body cap that no Next.js config can raise. Only the resulting
// (small) public URL is submitted with the rest of the form.
function useFileUpload(org: string) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setUploadError(null);
    setUploadedUrl(null);
    setUploadedName(null);
    if (!file) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
      const path = `${org}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (error) {
        setUploadError(error.message);
        return;
      }

      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      setUploadedUrl(data.publicUrl);
      setUploadedName(file.name);
    } catch {
      setUploadError("Upload failed -- check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setUploadError(null);
    setUploadedUrl(null);
    setUploadedName(null);
  }

  return { uploading, uploadError, uploadedUrl, uploadedName, handleFileChange, reset };
}

export function AddAssetForm({ org, folderId }: { org: string; folderId: string | null }) {
  const [kind, setKind] = useState("image");
  const upload = useFileUpload(org);

  return (
    <>
      <form
        action={createAsset}
        onSubmit={(e) => {
          if (upload.uploading) e.preventDefault();
        }}
        className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-gray-800 p-4"
      >
        <input type="hidden" name="org" value={org} />
        <input type="hidden" name="folder_id" value={folderId ?? ""} />
        <input type="hidden" name="file_url" value={upload.uploadedUrl ?? ""} />
        <input type="hidden" name="file_name" value={upload.uploadedName ?? ""} />

        <KindSelect
          kind={kind}
          onChange={(k) => {
            setKind(k);
            upload.reset();
          }}
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Label</label>
          <input name="label" className={textClass} placeholder="Fall CDE Results" />
        </div>

        <div className="flex flex-1 min-w-[220px] flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">
            {kind === "calendar_agenda" ? "Calendar email or ID" : "Link"}
          </label>
          <input
            name="url"
            className={`w-full ${textClass}`}
            placeholder={kind === "calendar_agenda" ? "name@group.calendar.google.com" : "https://..."}
          />
        </div>

        {showsUpload(kind) && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Or upload a file</label>
            <input type="file" accept="image/*,video/*" className={fileClass} onChange={upload.handleFileChange} />
            {upload.uploading && <div className="text-[11px] text-amber-400">Uploading…</div>}
            {upload.uploadedUrl && <div className="text-[11px] text-emerald-400">Uploaded ✓</div>}
            {upload.uploadError && <div className="text-[11px] text-red-400">{upload.uploadError}</div>}
          </div>
        )}

        {showsDaysAhead(kind) && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Days ahead</label>
            <input type="number" name="days_ahead" min={1} max={90} defaultValue={30} className={`w-24 ${textClass}`} />
          </div>
        )}

        {showsDefaultDuration(kind) && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Default duration (seconds)</label>
            <input
              type="number"
              name="default_duration_seconds"
              min={1}
              max={300}
              defaultValue={10}
              className={`w-28 ${textClass}`}
            />
          </div>
        )}

        <button
          disabled={upload.uploading}
          className="rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {upload.uploading ? "Uploading…" : "Add asset"}
        </button>
      </form>
      <p className="mt-1 text-xs text-gray-400">
        Either paste a link or upload a file -- if both are filled in, the uploaded file wins.
        Uploads are capped at 50MB. Default duration is how long this asset stays on screen when
        added to a playlist (you can still change it per playlist). For Calendar Agenda, the
        calendar must be public (Settings → Access permissions → Make available to public) and
        must list upcoming events automatically.
      </p>
    </>
  );
}

type EditableAsset = {
  id: string;
  kind: string;
  label: string | null;
  url: string;
  days_ahead: number;
  default_duration_seconds: number;
};

export function EditAssetForm({
  org,
  folderId,
  asset,
  cancelHref,
}: {
  org: string;
  folderId: string | null;
  asset: EditableAsset;
  cancelHref: string;
}) {
  const [kind, setKind] = useState(asset.kind);
  const upload = useFileUpload(org);

  return (
    <form
      action={updateAsset}
      onSubmit={(e) => {
        if (upload.uploading) e.preventDefault();
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="asset_id" value={asset.id} />
      <input type="hidden" name="org" value={org} />
      <input type="hidden" name="folder_id" value={folderId ?? ""} />
      <input type="hidden" name="file_url" value={upload.uploadedUrl ?? ""} />
      <input type="hidden" name="file_name" value={upload.uploadedName ?? ""} />

      <KindSelect
        kind={kind}
        onChange={(k) => {
          setKind(k);
          upload.reset();
        }}
      />

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Label</label>
        <input name="label" defaultValue={asset.label ?? ""} className={textClass} />
      </div>

      <div className="flex flex-1 min-w-[220px] flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">
          {kind === "calendar_agenda" ? "Calendar email or ID" : "Link"}
        </label>
        <input name="url" defaultValue={asset.url} className={`w-full ${textClass}`} />
      </div>

      {showsUpload(kind) && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Replace with a file</label>
          <input type="file" accept="image/*,video/*" className={fileClass} onChange={upload.handleFileChange} />
          {upload.uploading && <div className="text-[11px] text-amber-400">Uploading…</div>}
          {upload.uploadedUrl && <div className="text-[11px] text-emerald-400">Uploaded ✓</div>}
          {upload.uploadError && <div className="text-[11px] text-red-400">{upload.uploadError}</div>}
        </div>
      )}

      {showsDaysAhead(kind) && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Days ahead</label>
          <input
            type="number"
            name="days_ahead"
            min={1}
            max={90}
            defaultValue={asset.days_ahead}
            className={`w-24 ${textClass}`}
          />
        </div>
      )}

      {showsDefaultDuration(kind) && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Default duration (seconds)</label>
          <input
            type="number"
            name="default_duration_seconds"
            min={1}
            max={300}
            defaultValue={asset.default_duration_seconds}
            className={`w-28 ${textClass}`}
          />
        </div>
      )}

      <button
        disabled={upload.uploading}
        className="rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {upload.uploading ? "Uploading…" : "Save"}
      </button>
      <a href={cancelHref} className="rounded border border-gray-700 px-3 py-1.5 text-sm font-medium hover:bg-gray-800">
        Cancel
      </a>
    </form>
  );
}
