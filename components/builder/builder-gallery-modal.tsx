import Image from "next/image";
import type { AdminMediaItem } from "@/lib/admin-media";

type BuilderGalleryModalProps = {
  media: AdminMediaItem[];
  isUploading: boolean;
  onSelectImage: (imagePath: string) => void;
  onClose: () => void;
};

export function BuilderGalleryModal({
  media,
  isUploading,
  onSelectImage,
  onClose
}: BuilderGalleryModalProps) {
  return (
    <div className="builder-gallery-overlay" onClick={onClose} role="presentation">
      <div
        className="builder-gallery-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Media gallery"
      >
        <div className="builder-gallery-header">
          <div>
            <div className="panel-label">Media Gallery</div>
            <h3>Choose from `/images` and `/images/gallery`</h3>
          </div>
          <button className="secondary-button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="builder-gallery-body">
          <div className="builder-gallery-grid">
          {media.map((image) => (
            <button
              className="builder-gallery-card"
              key={image.path}
              onClick={() => onSelectImage(image.path)}
              type="button"
            >
              <div className="builder-gallery-thumb">
                {image.kind === "image" ? (
                  <Image alt={image.name} fill sizes="180px" src={image.path} />
                ) : (
                  <video className="builder-gallery-video" controls preload="metadata" src={image.path} />
                )}
              </div>
              <span>{image.name}</span>
              <small className="gallery-meta">
                {image.directory} · {image.kind}
              </small>
            </button>
          ))}
          {media.length === 0 ? (
            <div className="builder-gallery-empty">
              {isUploading ? "Uploading..." : "No media found in `/images` or `/images/gallery`."}
            </div>
          ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
