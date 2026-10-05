import { PhotoPicker } from '../../../../components/vendor/PhotoPicker';
import { errorText } from '../../../../components/vendor/formStyles';
import { JOB_PHOTOS_MAX } from '../../constants';

const NEVER_UNSAVED = () => false;

interface JobPhotosFieldProps {
  photos: string[];
  problems: string[];
  onAddFiles: (files: File[]) => void;
  onRemove: (url: string) => void;
  error?: string;
}

/** 1–5 JPG/PNG photos up to 5 MB each, with previews and remove (shared picker and file checks). */
export function JobPhotosField({ photos, problems, onAddFiles, onRemove, error }: JobPhotosFieldProps) {
  const errorId = 'job-photos-error';
  return (
    <div id="job-photos" tabIndex={-1} className="rounded-xl focus:outline-none">
      <PhotoPicker
        photos={photos}
        problems={problems}
        max={JOB_PHOTOS_MAX}
        isUnsaved={NEVER_UNSAVED}
        onAddFiles={onAddFiles}
        onRemove={onRemove}
        altPrefix="Job photo"
        invalid={Boolean(error)}
        describedBy={error ? errorId : undefined} />

      {error &&
      <p id={errorId} className={errorText}>
          {error}
        </p>
      }
    </div>);

}
