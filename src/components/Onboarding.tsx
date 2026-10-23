import { NURSERIES } from '../data/nurseries'

interface Props {
  onComplete: () => void
}

export function Onboarding({ onComplete }: Props) {
  const features = [
    {
      num: '01',
      title: '鎌ケ谷市の制度・手続きを時期別に自動整理',
      desc: '出産予定日または生年月日を入力するだけで、母子手帳交付・妊婦健診・給付金・予防接種・保活まで、その時期に必要な手続きを推奨期間つきで一覧化します。',
    },
    {
      num: '02',
      title: '夫婦で決めた予定だけをカレンダーへ登録',
      desc: '勝手に大量の予定を書き込むのではなく、週末の夫婦会議で「いつ・誰が行くか」を決めたタスクだけをGoogleカレンダーやiPhoneカレンダーへ追加できます。',
    },
    {
      num: '03',
      title: 'パパ単独で動ける手続き・保活・助成金を一元管理',
      desc: `窓口の委任状条件や同時手続きのコツ、市内${NURSERIES.length}施設のエリア別比較、もらい損ね防止トラッカー（医療費控除試算つき）をひとつの画面で確認できます。`,
    },
    {
      num: '04',
      title: 'ログイン不要・端末内保存でプライバシーを保護',
      desc: 'アカウント登録は不要です。入力した予定やメモはご自身のブラウザ内にのみ保存され、共有リンクを発行したときだけパートナーの端末へ引き継げます。',
    },
  ]

  return (
    <section className="onboarding-card">
      <div className="onboarding-head">
        <span className="kicker">KAMAGAYA PARENTING SCHEDULE</span>
        <h2>かまがや親子カレンダー</h2>
        <p>妊娠期から小学校入学前までの手続き・健診・保活・お金を夫婦で分担するための進行管理ノートです。</p>
      </div>

      <div className="onboarding-grid">
        {features.map((f) => (
          <div key={f.num} className="onboarding-item">
            <span className="onboarding-num">{f.num}</span>
            <div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="onboarding-foot">
        <button type="button" className="primary large-btn" onClick={onComplete}>
          時期・予定日の設定へ進む
        </button>
      </div>
    </section>
  )
}
