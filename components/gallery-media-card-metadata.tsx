import type { AdminMediaItem } from "@/lib/admin-media-shared";
import {
  formatGalleryMediaAspectDisplay,
  formatGalleryMediaCategoryDisplay,
  formatGalleryMediaTypeDisplay
} from "@/lib/gallery-media-display";

type GalleryMediaCardMetadataProps = {
  item: AdminMediaItem;
};

export function GalleryMediaCardMetadata({ item }: GalleryMediaCardMetadataProps) {
  return (
    <dl className="admin-gallery-card-metadata-readout">
      <div className="admin-gallery-card-metadata-row">
        <dt>Category</dt>
        <dd>{formatGalleryMediaCategoryDisplay(item.mediaCategory)}</dd>
      </div>
      <div className="admin-gallery-card-metadata-row">
        <dt>Type</dt>
        <dd>{formatGalleryMediaTypeDisplay(item.mediaType, item)}</dd>
      </div>
      <div className="admin-gallery-card-metadata-row">
        <dt>Aspect</dt>
        <dd>{formatGalleryMediaAspectDisplay(item)}</dd>
      </div>
    </dl>
  );
}
