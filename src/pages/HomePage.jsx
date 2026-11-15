import React from 'react';
import './HomePage.css';

export default function HomePage({ onStartDemo, onUploadJson, loading, demoAvailable }) {
  return (
    <main className="home-page">
      <section className="home-content">
        <div className="home-eyebrow">VISUAL STORY RUNTIME</div>
        <div className="home-emblem" aria-hidden="true">V</div>
        <h1>VSR<span>/</span></h1>
        <p className="home-description">Một không gian dành cho những câu chuyện tương tác.</p>
        <div className="home-actions">
          <button className="button button-primary" type="button" onClick={onStartDemo} disabled={loading || !demoAvailable}>
            Chạy demo <span aria-hidden="true" className="icon">↗</span>
          </button>
          <button className="button button-secondary" type="button" onClick={onUploadJson}>
            <span aria-hidden="true" className="icon">↑</span> Tải JSON lên
          </button>
        </div>
        <div className="home-footnote">BROWSER-BASED INTERACTIVE STORY ENGINE</div>
      </section>
    </main>
  );
}
