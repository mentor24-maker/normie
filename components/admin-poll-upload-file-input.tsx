type AdminPollUploadFileInputProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  required?: boolean;
};

export function AdminPollUploadFileInput({
  file,
  onFileChange,
  required = true
}: AdminPollUploadFileInputProps) {
  return (
    <div className="admin-poll-upload-file-control">
      <label className="admin-poll-upload-file-picker">
        <input
          className="admin-poll-upload-file-input"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          required={required}
        />
        <span className="admin-poll-upload-file-picker-label">Select CSV</span>
      </label>
      {file ? <p className="admin-poll-upload-file-name">{file.name}</p> : null}
    </div>
  );
}
