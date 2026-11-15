import React, { useEffect, useRef, useState } from 'react';
import { Button, DescriptionList, DescriptionListItem, Grid } from '../../design-system/index.js';
import ScenarioCover from '../../components/scenario-preview/ScenarioCover.jsx';

function ExperienceItem({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="vsr-card vsr-experience-item">
      <span className="vsr-text-secondary vsr-experience-item__label">{label}</span>
      <strong className="vsr-experience-item__value">{value}</strong>
    </div>
  );
}

function ScenarioDescription({ description }) {
  const descriptionRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    const element = descriptionRef.current;
    if (!element || isExpanded) return undefined;

    const measureOverflow = () => {
      setCanExpand(element.scrollHeight > element.clientHeight + 1);
    };

    measureOverflow();
    if (typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(measureOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [description, isExpanded]);

  if (!description) return null;

  return (
    <div className="vsr-stack vsr-stack--gap-1">
      <p
        ref={descriptionRef}
        className={isExpanded ? undefined : 'vsr-line-clamp vsr-line-clamp--5'}
      >
        {description}
      </p>
      {canExpand && (
        <Button
          variant="tertiary"
          size="sm"
          onClick={() => setIsExpanded(value => !value)}
          trailingIcon={
            <span className="vsr-icon" aria-hidden="true">
              {isExpanded ? 'expand_less' : 'expand_more'}
            </span>
          }
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Thu gọn' : 'Đọc toàn bộ mô tả'}
        </Button>
      )}
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
  const experienceItems = [
    { label: 'Độ tuổi', value: metadata.ageRating },
    { label: 'Độ khó', value: formatDifficulty(metadata.difficulty) },
    { label: 'Thời lượng dự kiến', value: formatPlayTime(metadata.estimatedPlayTime) }
  ].filter(item => item.value !== null && item.value !== undefined && item.value !== '');

  const publicationItems = [
    { label: 'Tác giả', value: metadata.writer },
    { label: 'Đơn vị phát triển', value: metadata.studio },
    { label: 'Phiên bản kịch bản', value: metadata.version },
    { label: 'Ngôn ngữ', value: formatLanguage(metadata.language) },
    { label: 'Ngày tạo', value: formatDate(metadata.createdAt) },
    { label: 'Cập nhật lần cuối', value: formatDate(metadata.updatedAt) }
  ];

  const hasLegalInformation = Boolean(metadata.copyright || metadata.license);

  return (
    <main className="vsr-page-shell vsr-page-shell--start">
      <article className="vsr-content-width vsr-content-width--medium vsr-stack vsr-stack--gap-6">
        <ScenarioCover url={metadata.cover?.url} title={metadata.title} />

        <header className="vsr-stack vsr-stack--gap-2">
          <h1 className="vsr-heading-display">{metadata.title || 'Kịch bản chưa có tiêu đề'}</h1>
          {metadata.subtitle && (
            <p className="vsr-text-secondary vsr-text-body">{metadata.subtitle}</p>
          )}
          <ScenarioDescription description={metadata.description} />
        </header>

        {experienceItems.length > 0 && (
          <section className="vsr-stack vsr-stack--gap-3" aria-labelledby="scenario-experience-title">
            <h2 id="scenario-experience-title">Thông tin trải nghiệm</h2>
            <Grid columns="auto" gap="3">
              {experienceItems.map(item => (
                <ExperienceItem key={item.label} label={item.label} value={item.value} />
              ))}
            </Grid>
          </section>
        )}

        {Array.isArray(metadata.tags) && metadata.tags.length > 0 && (
          <section className="vsr-stack vsr-stack--gap-2" aria-labelledby="scenario-tags-title">
            <h2 id="scenario-tags-title">Thẻ kịch bản</h2>
            <ul className="vsr-tag-list">
              {metadata.tags.map((tag, index) => (
                <li className="vsr-tag" key={`${tag}-${index}`}>{tag}</li>
              ))}
            </ul>
          </section>
        )}

        {publicationItems.some(item => item.value !== null && item.value !== undefined && item.value !== '') && (
          <section className="vsr-stack vsr-stack--gap-3" aria-labelledby="scenario-publication-title">
            <h2 id="scenario-publication-title">Thông tin xuất bản</h2>
            <DescriptionList layout="grid" columns="auto" gap="comfortable">
              {publicationItems.map(item => (
                <DescriptionListItem key={item.label} label={item.label} value={item.value} />
              ))}
            </DescriptionList>
          </section>
        )}

        {hasLegalInformation && (
          <section className="vsr-stack vsr-stack--gap-3" aria-labelledby="scenario-legal-title">
            <h2 id="scenario-legal-title">Bản quyền và giấy phép</h2>
            <DescriptionList layout="list" gap="comfortable" divided>
              <DescriptionListItem label="Bản quyền" value={metadata.copyright} />
              <DescriptionListItem label="Giấy phép" value={metadata.license} />
            </DescriptionList>
          </section>
        )}

        {metadata.notes && (
          <section className="vsr-stack vsr-stack--gap-2" aria-labelledby="scenario-notes-title">
            <h2 id="scenario-notes-title">Ghi chú</h2>
            <p className="vsr-text-secondary">{metadata.notes}</p>
          </section>
        )}

        <footer>
          <Button
            variant="secondary"
            size="md"
            onClick={onBack}
            leadingIcon={<span className="vsr-icon" aria-hidden="true">arrow_back</span>}
          >
            Quay lại
          </Button>
        </footer>
      </article>
    </main>
  );
}
