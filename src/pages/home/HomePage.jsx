import React, { useRef } from 'react';
import { Button, Dialog } from '../../design-system/index.js';
import HomeActionCard from '../../components/home/HomeActionCard.jsx';

function MetadataRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <dt className="vsr-text-secondary">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatPlayTime(minutes) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return null;
  return minutes < 60 ? `${minutes} phút` : `${Math.floor(minutes / 60)} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ''}`;
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
}

export default function HomePage({
  onRunDemo,
  onImportFile,
  preview = null,
  onCancelPreview,
  onConfirmPreview,
  busy = false,
  error = ''
}) {
  const fileInputRef = useRef(null);
  const metadata = preview?.metadata || {};
  const summary = preview?.summary || {};

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (file) onImportFile?.(file);
    event.target.value = '';
  }

  return (
    <>
      <main className="vsr-page-shell">
        <section className="vsr-content-width vsr-content-width--medium vsr-stack vsr-stack--center" aria-labelledby="home-title">
          <div className="vsr-content-width vsr-content-width--narrow vsr-page-shell__content vsr-page-shell__content--center vsr-page-shell__content--padded vsr-stack vsr-stack--center vsr-stack--gap-8">
            <header className="vsr-stack vsr-stack--center vsr-stack--gap-2">
              <span className="vsr-eyebrow">VISUAL STORY RUNTIME</span>
              <h1 id="home-title" className="vsr-heading-display">Visual Story Runtime</h1>
              <p className="vsr-text-secondary vsr-text-body">A runtime for interactive stories.</p>
            </header>

            <div className="vsr-stack vsr-stack--gap-3" aria-label="Start an experience">
              <HomeActionCard
                icon="play_circle"
                title="Run Demo Script"
                description="Xem thông tin kịch bản demo trước khi chạy."
                variant="primary"
                onClick={onRunDemo}
                disabled={Boolean(busy)}
                loading={busy === 'demo'}
              />
              <HomeActionCard
                icon="data_object"
                title="Import JSON"
                description="Kiểm tra và xem metadata của kịch bản JSON."
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={Boolean(busy)}
                loading={busy === 'import'}
              />
              <input
                ref={fileInputRef}
                className="vsr-visually-hidden"
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                aria-label="Chọn tệp kịch bản JSON"
                tabIndex={-1}
              />
            </div>
            {error && <p className="vsr-text-error" role="alert">{error}</p>}
          </div>
        </section>
      </main>

      <Dialog
        open={Boolean(preview)}
        onClose={onCancelPreview}
        title="Thông tin kịch bản"
        description="Metadata được Engine chuẩn hóa và xác thực trước khi khởi chạy."
        size="lg"
      >
        <div className="vsr-stack vsr-stack--gap-4">
          <header className="vsr-stack vsr-stack--gap-2">
            <h3>{metadata.title || 'Kịch bản chưa có tiêu đề'}</h3>
            {metadata.subtitle && <p className="vsr-text-secondary">{metadata.subtitle}</p>}
            {metadata.description && <p>{metadata.description}</p>}
          </header>

          {Array.isArray(metadata.tags) && metadata.tags.length > 0 && (
            <section aria-label="Thể loại">
              <h4>Thể loại</h4>
              <p>{metadata.tags.join(' · ')}</p>
            </section>
          )}

          <section className="vsr-stack vsr-stack--gap-2">
            <h4>Thông tin</h4>
            <dl className="vsr-stack vsr-stack--gap-2">
              <MetadataRow label="Tác giả" value={metadata.writer} />
              <MetadataRow label="Studio" value={metadata.studio} />
              <MetadataRow label="Phiên bản" value={metadata.version} />
              <MetadataRow label="Ngôn ngữ" value={metadata.language} />
              <MetadataRow label="Độ tuổi" value={metadata.ageRating} />
              <MetadataRow label="Độ khó" value={metadata.difficulty} />
              <MetadataRow label="Thời lượng dự kiến" value={formatPlayTime(metadata.estimatedPlayTime)} />
              <MetadataRow label="Scene bắt đầu" value={metadata.entryScene} />
              <MetadataRow label="Ngày tạo" value={formatDate(metadata.createdAt)} />
              <MetadataRow label="Cập nhật" value={formatDate(metadata.updatedAt)} />
              <MetadataRow label="Bản quyền" value={metadata.copyright} />
              <MetadataRow label="Giấy phép" value={metadata.license} />
            </dl>
          </section>

          {metadata.notes && (
            <section className="vsr-stack vsr-stack--gap-1">
              <h4>Ghi chú</h4>
              <p className="vsr-text-secondary">{metadata.notes}</p>
            </section>
          )}

          <section className="vsr-stack vsr-stack--gap-2">
            <h4>Quy mô kịch bản</h4>
            <p className="vsr-text-secondary">
              {summary.sceneCount ?? 0} scene · {summary.characterCount ?? 0} nhân vật · {summary.actionCount ?? 0} action · {summary.itemCount ?? 0} vật phẩm · {summary.chatCount ?? 0} hội thoại
            </p>
          </section>

          <div className="vsr-stack vsr-stack--gap-2">
            <Button variant="primary" size="lg" block onClick={onConfirmPreview} disabled={Boolean(busy)} loading={Boolean(busy)}>
              Chạy kịch bản
            </Button>
            <Button variant="secondary" size="md" block onClick={onCancelPreview} disabled={Boolean(busy)}>
              Quay lại
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
