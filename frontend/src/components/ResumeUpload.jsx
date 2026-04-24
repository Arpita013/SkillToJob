import { useMemo, useRef, useState } from 'react';
import { FileUp, Loader2, UploadCloud } from 'lucide-react';
import { fetchApi } from '../utils/apiClient.js';

function isAllowed(file) {
  const type = String(file?.type || '').toLowerCase();
  return (
    type === 'application/pdf' ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type === 'application/msword'
  );
}

export default function ResumeUpload({ targetJob, existingSkills, onApplied }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const hint = useMemo(() => {
    const role = String(targetJob || '').trim();
    return role ? `We’ll extract skills for: ${role}` : 'We’ll extract skills & suggest job matches.';
  }, [targetJob]);

  const uploadFile = async (file) => {
    if (!file) return;
    setError('');

    if (!isAllowed(file)) {
      setError('Unsupported file. Please upload a PDF or DOCX.');
      return;
    }

    setIsUploading(true);
    setFileName(file.name || '');
    try {
      const form = new FormData();
      form.append('resume', file);
      form.append('targetJob', String(targetJob || '').trim());
      form.append(
        'existingSkills',
        JSON.stringify(Array.isArray(existingSkills) ? existingSkills : []),
      );

      const response = await fetchApi('/api/resume', {
        method: 'POST',
        body: form,
      });

      const contentType = String(response.headers.get('content-type') || '');
      let data = null;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(
          `Server did not return JSON. Check API URL/proxy. Response: ${text.slice(0, 140)}`,
        );
      }

      const ok =
        (data?.success === true) ||
        (String(data?.status || '').toLowerCase() === 'success');

      if (!response.ok || !ok) {
        throw new Error(data?.message || 'Resume upload failed');
      }

      onApplied?.({
        skills: Array.isArray(data?.skills) ? data.skills : [],
        jobMatches: Array.isArray(data?.jobMatches) ? data.jobMatches : [],
        source: data?.source,
      });
    } catch (e) {
      setError(String(e?.message || 'Upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="resume-upload-card glass-effect">
      <div className="resume-upload-head">
        <div>
          <h3>Upload Resume</h3>
          <p className="resume-upload-sub">{hint}</p>
        </div>
        <button
          type="button"
          className="resume-choose-btn"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          <FileUp size={18} />
          <span>Choose File</span>
        </button>
      </div>

      <div
        className={`resume-dropzone ${isDragging ? 'dragging' : ''}`}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          const file = e.dataTransfer?.files?.[0];
          uploadFile(file);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onClick={() => inputRef.current?.click()}
      >
        <div className="resume-dropzone-icon" aria-hidden="true">
          <UploadCloud size={22} />
        </div>
        <div className="resume-dropzone-text">
          <div className="resume-dropzone-title">
            Drag & drop your resume here
          </div>
          <div className="resume-dropzone-hint">PDF / DOCX • up to 5MB</div>
        </div>
        <div className="resume-dropzone-status">
          {isUploading ? (
            <span className="resume-uploading">
              <Loader2 size={16} className="spin" />
              <span>Uploading...</span>
            </span>
          ) : fileName ? (
            <span className="resume-filename">{fileName}</span>
          ) : null}
        </div>
      </div>

      {error ? <div className="resume-upload-error">{error}</div> : null}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
        onChange={(e) => uploadFile(e.target.files?.[0])}
      />
    </section>
  );
}
