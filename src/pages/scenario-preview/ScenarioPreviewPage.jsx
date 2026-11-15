import React from 'react';
import { Button } from '../../design-system/index.js';

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

export default function ScenarioPreviewPage({ preview, onBack }) {
  const metadata = preview?.metadata || {};
  const summary = preview?.summary || {};

  return (
    <main className="vsr-page-shell">
      <article className="vsr-content-width vsr-content-width--medium vsr-stack vsr-stack--gap-6">
        <header className="vsr-stack vsr-stack--gap-3">
          <Button variant="secondary" size="md" onClick={onBack} leadingIcon={<span aria-hidden="true">arrow_back</span>}>
            Quay lại
          </Button>
          <div className="vsr-stack vsr-stack--gap-2">
            <span className="vsr-eyebrow">SCENARIO PREVIEW</span>
            <h1 className="vsr-heading-display">{metadata.title || 'Kịch bản chưa có tiêu đề'}</h1>
            {metadata.subtitle && <p className="vsr-text-secondary vsr-text-body">{metadata.subtitle}</p>}
            {metadata.description && <p>{metadata.description}</p>}
          </div>
        </header>

        {metadata.cover?.url && (
          <figure className="vsr-stack vsr-stack--gap-2">
            <img
              src={metadata.cover.url}
              alt={metadata.title ? `Ảnh bìa ${metadata.title}` : 'Ảnh bìa kịch bản'}
              style={{ display: 'block', width: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: 'var(--vsr-radius-lg)' }}
            />
          </figure>
        )}

        {Array.isArray(metadata.tags) && metadata.tags.length > 0 && (
          <section className="vsr-stack vsr-stack--gap-2" aria-label="Thể loại">
            <h2>Thể loại</h2>
            <p className="vsr-text-secondary">{metadata.tags.join(' · ')}</p>
          </section>
        )}

        <section className="vsr-stack vsr-stack--gap-3">
          <h2>Thông tin kịch bản</h2>
          <dl className="vsr-stack vsr-stack--gap-3">
            <MetadataRow label="Tác giả" value={metadata.writer} />
            <MetadataRow label="Studio" value={metadata.studio} />
            <MetadataRow label="Phiên bản" value={metadata.version} />
            <MetadataRow label="Định dạng" value={preview?.formatVersion} />
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
          <section className="vsr-stack vsr-stack--gap-2">
            <h2>Ghi chú</h2>
            <p className="vsr-text-secondary">{metadata.notes}</p>
          </section>
        )}

        <section className="vsr-stack vsr-stack--gap-3">
          <h2>Quy mô kịch bản</h2>
          <p className="vsr-text-secondary">
            {summary.sceneCount ?? 0} scene · {summary.characterCount ?? 0} nhân vật · {summary.actionCount ?? 0} action · {summary.itemCount ?? 0} vật phẩm · {summary.chatCount ?? 0} hội thoại
          </p>
        </section>

        <footer>
          <Button variant="secondary" size="md" onClick={onBack} leadingIcon={<span aria-hidden="true">arrow_back</span>}>
            Quay lại trang chủ
          </Button>
        </footer>
      </article>
    </main>
  );
}
