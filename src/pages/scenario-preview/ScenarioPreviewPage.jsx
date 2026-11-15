import React from 'react';
import { Button } from '../../design-system/index.js';
import ScenarioCover from '../../components/scenario-preview/ScenarioCover.jsx';

function MetadataRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="vsr-description-list__row">
      <dt className="vsr-description-list__term">{label}</dt>
      <dd className="vsr-description-list__detail">{value}</dd>
    </div>
  );
}

function formatPlayTime(minutes) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return null;
  return minutes < 60
    ? `${minutes} phút`
    : `${Math.floor(minutes / 60)} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ''}`;
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
}

function formatLanguage(value) {
  const languageNames = {
    vi: 'Tiếng Việt',
    en: 'Tiếng Anh',
    ja: 'Tiếng Nhật',
    ko: 'Tiếng Hàn',
    zh: 'Tiếng Trung'
  };
  return languageNames[value] || value;
}

function formatDifficulty(value) {
  const labels = { easy: 'Dễ', normal: 'Trung bình', hard: 'Khó' };
  return labels[value] || value;
}

export default function ScenarioPreviewPage({ preview, onBack }) {
  const metadata = preview?.metadata || {};
  const summary = preview?.summary || {};

  return (
    <main className="vsr-page-shell">
      <article className="vsr-content-width vsr-content-width--medium vsr-stack vsr-stack--gap-6">
        <header className="vsr-stack vsr-stack--gap-3">
          <Button variant="secondary" size="md" onClick={onBack} leadingIcon={<span className="vsr-icon" aria-hidden="true">arrow_back</span>}>
            Quay lại
          </Button>
          <div className="vsr-stack vsr-stack--gap-2">
            <span className="vsr-eyebrow">XEM TRƯỚC KỊCH BẢN</span>
            <h1 className="vsr-heading-display">{metadata.title || 'Kịch bản chưa có tiêu đề'}</h1>
            {metadata.subtitle && <p className="vsr-text-secondary vsr-text-body">{metadata.subtitle}</p>}
            {metadata.description && <p>{metadata.description}</p>}
          </div>
        </header>

        <ScenarioCover url={metadata.cover?.url} title={metadata.title} />

        {Array.isArray(metadata.tags) && metadata.tags.length > 0 && (
          <section className="vsr-stack vsr-stack--gap-2" aria-labelledby="scenario-tags-title">
            <h2 id="scenario-tags-title">Thẻ kịch bản</h2>
            <p className="vsr-text-secondary">{metadata.tags.join(' · ')}</p>
          </section>
        )}

        <section className="vsr-stack vsr-stack--gap-3" aria-labelledby="scenario-metadata-title">
          <h2 id="scenario-metadata-title">Thông tin kịch bản</h2>
          <dl className="vsr-description-list">
            <MetadataRow label="Tác giả" value={metadata.writer} />
            <MetadataRow label="Đơn vị phát triển" value={metadata.studio} />
            <MetadataRow label="Phiên bản kịch bản" value={metadata.version} />
            <MetadataRow label="Phiên bản định dạng VSR" value={preview?.formatVersion} />
            <MetadataRow label="Ngôn ngữ" value={formatLanguage(metadata.language)} />
            <MetadataRow label="Phân loại độ tuổi" value={metadata.ageRating} />
            <MetadataRow label="Độ khó" value={formatDifficulty(metadata.difficulty)} />
            <MetadataRow label="Thời lượng dự kiến" value={formatPlayTime(metadata.estimatedPlayTime)} />
            <MetadataRow label="Mã cảnh bắt đầu" value={metadata.entryScene} />
            <MetadataRow label="Ngày tạo" value={formatDate(metadata.createdAt)} />
            <MetadataRow label="Cập nhật lần cuối" value={formatDate(metadata.updatedAt)} />
            <MetadataRow label="Bản quyền" value={metadata.copyright} />
            <MetadataRow label="Giấy phép" value={metadata.license} />
          </dl>
        </section>

        {metadata.notes && (
          <section className="vsr-stack vsr-stack--gap-2" aria-labelledby="scenario-notes-title">
            <h2 id="scenario-notes-title">Ghi chú</h2>
            <p className="vsr-text-secondary">{metadata.notes}</p>
          </section>
        )}

        <section className="vsr-stack vsr-stack--gap-3" aria-labelledby="scenario-size-title">
          <h2 id="scenario-size-title">Quy mô kịch bản</h2>
          <p className="vsr-text-secondary">
            {summary.sceneCount ?? 0} cảnh · {summary.characterCount ?? 0} nhân vật · {summary.actionCount ?? 0} hành động · {summary.itemCount ?? 0} vật phẩm · {summary.chatCount ?? 0} hội thoại
          </p>
        </section>

        <footer>
          <Button variant="secondary" size="md" onClick={onBack} leadingIcon={<span className="vsr-icon" aria-hidden="true">arrow_back</span>}>
            Quay lại trang chủ
          </Button>
        </footer>
      </article>
    </main>
  );
}
