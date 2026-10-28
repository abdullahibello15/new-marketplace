import { useState } from 'react';
import { ProfileSection } from './ProfileSection';
import { PhotoPicker } from './PhotoPicker';
import { usePhotoDraft } from '../../hooks/usePhotoDraft';

const MAX_PORTFOLIO_PHOTOS = 10;

interface PortfolioEditorProps {
  saved: string[];
  vendorName: string;
  onSave: (photos: string[]) => void;
}

export function PortfolioEditor({ saved, vendorName, onSave }: PortfolioEditorProps) {
  const draft = usePhotoDraft(saved, MAX_PORTFOLIO_PHOTOS);
  const [isSaved, setIsSaved] = useState(false);

  return (
    <ProfileSection
      id="profile-portfolio"
      title="Portfolio"
      description="Photos of your past work. Customers see these on your profile."
      saveLabel="Save photos"
      saved={isSaved}
      onSubmit={() => {
        onSave(draft.commit());
        setIsSaved(true);
      }}>

      <PhotoPicker
        photos={draft.photos}
        problems={draft.problems}
        max={MAX_PORTFOLIO_PHOTOS}
        isUnsaved={draft.isUnsaved}
        onAddFiles={(files) => {
          if (draft.addFiles(files)) setIsSaved(false);
        }}
        onRemove={(url) => {
          draft.remove(url);
          setIsSaved(false);
        }}
        altPrefix={`Work by ${vendorName}`} />

    </ProfileSection>);

}
