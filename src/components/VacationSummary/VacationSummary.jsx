import { calculateTotals } from '../../utils/plannerUtils.js';
import styles from './VacationSummary.module.css';

export default function VacationSummary({ plan }) {
  const { used, remaining, count } = calculateTotals(plan);
  return (
    <div className={styles.summary} aria-label="Resumen de vacaciones">
      <div className={styles.metric}><div className={styles.k}>Tramos</div><div className={styles.v} id="segmentCount">{count}</div></div>
      <div className={styles.metric}><div className={styles.k}>Tomados</div><div className={styles.v} id="usedDays">{used}</div></div>
      <div className={`${styles.metric} ${styles.full} ${remaining >= 0 ? styles.ok : styles.over}`}>
        <div className={styles.k}>Restantes</div><div className={styles.v} id="remainingDays">{remaining}</div>
      </div>
    </div>
  );
}
