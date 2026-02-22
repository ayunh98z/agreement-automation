import React from 'react';

function AgreementPage() {
  const agreements = [
    { id: 'bl-agreement', label: 'BL Agreement', category: 'BL' },
    { id: 'uv-agreement', label: 'UV Agreement', category: 'UV' },
  ];

  return (
    <div className="agreement-page">
      <h2>Agreement Management</h2>
      <div className="agreement-grid">
        {agreements.map(agreement => (
          <div key={agreement.id} className="agreement-card">
            <div className="agreement-icon">📄</div>
            <div className="agreement-info">
              <h3>{agreement.label}</h3>
              <p>Category: {agreement.category}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AgreementPage;
