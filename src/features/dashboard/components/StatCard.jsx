export default function StatCard({ label, value, hint }) {
  return (
    <article className="dashboard-stat-card">
      <p className="dashboard-stat-label">{label}</p>
      <p className="dashboard-stat-value">{value}</p>
      <p className="dashboard-stat-hint">{hint}</p>
    </article>
  );
}
