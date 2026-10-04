import React, { useState } from 'react';

interface Props {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: '鎌ケ谷市での子育てをスムーズに',
      desc: '妊娠から小学校入学前までの、鎌ケ谷市の制度や手続き、健診などのタスクを自動でリストアップします。',
      icon: '👶'
    },
    {
      title: '勝手にカレンダーを汚さない',
      desc: '自動ですべての予定をカレンダーに入れるのではなく、夫婦で「行く日」を決めたタスクだけを、ワンクリックでGoogleカレンダーに追加できます。',
      icon: '🗓️'
    },
    {
      title: 'パパの活躍を全力サポート',
      desc: '「パパ単独OK」のタスクが一目でわかります。ママが動けない時期のタスク分担を直感的にサポートします。',
      icon: '🧔'
    },
    {
      title: '個人情報も安心',
      desc: '会員登録やログインは一切不要。データはすべてあなた自身の端末に保存されるので、プライバシーも守られます。',
      icon: '🔒'
    }
  ];

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e1e8e5',
      borderRadius: '18px',
      padding: '2rem 1.5rem',
      textAlign: 'center',
      marginBottom: '1rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    }}>
      <h2 style={{ fontSize: '1.4rem', color: '#1a3328', marginBottom: '1.5rem' }}>かまがや親子カレンダーへようこそ！</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2rem' }}>
        {steps.map((s, i) => (
          <div key={i} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            textAlign: 'left',
            opacity: step >= i ? 1 : 0.3,
            transition: 'opacity 0.3s ease'
          }}>
            <div style={{ fontSize: '2.5rem' }}>{s.icon}</div>
            <div>
              <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.3rem 0', color: '#2b7055' }}>{s.title}</h3>
              <p style={{ fontSize: '0.85rem', margin: 0, color: '#555', lineHeight: '1.4' }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {step < steps.length - 1 ? (
        <button 
          onClick={() => setStep(step + 1)}
          style={{
            background: '#2b7055', color: '#fff', border: 'none', 
            padding: '1rem 2rem', borderRadius: '30px', fontSize: '1rem', 
            fontWeight: 'bold', width: '100%', cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(43, 112, 85, 0.2)'
          }}
        >
          次へ
        </button>
      ) : (
        <button 
          onClick={onComplete}
          style={{
            background: '#e86a42', color: '#fff', border: 'none', 
            padding: '1rem 2rem', borderRadius: '30px', fontSize: '1rem', 
            fontWeight: 'bold', width: '100%', cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(232, 106, 66, 0.2)'
          }}
        >
          設定をはじめる
        </button>
      )}
    </div>
  );
}
