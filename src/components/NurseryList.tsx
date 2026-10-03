import React, { useState } from 'react';
import { NURSERIES, Nursery, NurseryType } from '../data/nurseries';
import { Settings } from '../types';

interface NurseryListProps {
  settings: Settings;
  onUpdateSettings: (newSettings: Settings) => void;
}

export const NurseryList: React.FC<NurseryListProps> = ({ settings, onUpdateSettings }) => {
  const [filterType, setFilterType] = useState<NurseryType | 'all'>('all');
  const favorites = settings.nurseryFavorites || [];

  const toggleFavorite = (id: string) => {
    const newFavs = favorites.includes(id)
      ? favorites.filter(fav => fav !== id)
      : [...favorites, id];
    onUpdateSettings({ ...settings, nurseryFavorites: newFavs });
  };

  const filtered = NURSERIES.filter(n => filterType === 'all' || n.type === filterType);

  return (
    <div className="nursery-container" style={{ padding: '1rem', paddingBottom: '80px' }}>
      <h2>鎌ケ谷市の保育園・こども園</h2>
      <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
        ※一覧は一例です。最新の空き状況は市役所HP（こども支援課）をご確認ください。
        気になった園は「★」を押しておくと、夫婦間で共有できます。
      </p>

      <div className="filters" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
        <button 
          onClick={() => setFilterType('all')} 
          style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid #ccc', background: filterType === 'all' ? '#2b7055' : '#fff', color: filterType === 'all' ? '#fff' : '#333' }}
        >すべて</button>
        <button 
          onClick={() => setFilterType('認可保育園')}
          style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid #ccc', background: filterType === '認可保育園' ? '#2b7055' : '#fff', color: filterType === '認可保育園' ? '#fff' : '#333', whiteSpace: 'nowrap' }}
        >認可保育園</button>
        <button 
          onClick={() => setFilterType('認定こども園')}
          style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid #ccc', background: filterType === '認定こども園' ? '#2b7055' : '#fff', color: filterType === '認定こども園' ? '#fff' : '#333', whiteSpace: 'nowrap' }}
        >認定こども園</button>
        <button 
          onClick={() => setFilterType('小規模保育')}
          style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid #ccc', background: filterType === '小規模保育' ? '#2b7055' : '#fff', color: filterType === '小規模保育' ? '#fff' : '#333', whiteSpace: 'nowrap' }}
        >小規模保育</button>
      </div>

      <div className="nursery-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filtered.map(n => (
          <div key={n.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.75rem', background: '#e0f2e9', color: '#2b7055', padding: '2px 6px', borderRadius: '4px' }}>{n.type}</span>
                <h3 style={{ margin: '0.3rem 0', fontSize: '1.1rem' }}>{n.name}</h3>
              </div>
              <button 
                onClick={() => toggleFavorite(n.id)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: favorites.includes(n.id) ? '#ffd700' : '#ccc' }}
              >
                {favorites.includes(n.id) ? '★' : '☆'}
              </button>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div>📍 {n.address}</div>
              <div>👶 定員: {n.capacity}名</div>
              <div>🕒 開園: {n.openHours} {n.extendedHours && '(延長保育あり)'}</div>
              {n.note && <div style={{ marginTop: '0.3rem', padding: '0.4rem', background: '#f9f9f9', borderRadius: '4px' }}>📝 {n.note}</div>}
              {n.url && <div style={{ marginTop: '0.3rem' }}><a href={n.url} target="_blank" rel="noreferrer" style={{ color: '#2b7055' }}>🌐 公式サイトを開く</a></div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
