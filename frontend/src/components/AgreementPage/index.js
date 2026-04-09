import React from 'react';
import useT from '../../hooks/useT';

function AgreementPage() {
  const t = useT();
  const agreements = [
    { id: 'bl-agreement', label: t('bl_agreement'), category: t('bl') },
    { id: 'uv-agreement', label: t('uv_agreement'), category: t('uv') },
  ];

  return (
    <div className="agreement-page">
      <h2>{t('app_title')}</h2>
      <div className="agreement-grid">
        {agreements.map(agreement => (
          <div key={agreement.id} className="agreement-card">
            <div className="agreement-icon">📄</div>
            <div className="agreement-info">
              <h3>{agreement.label}</h3>
              <p>{t('filter')}: {agreement.category}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AgreementPage;
