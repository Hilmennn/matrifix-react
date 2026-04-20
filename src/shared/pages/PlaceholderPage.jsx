import '../styles/placeholder.css';

export default function PlaceholderPage({ title, description }) {
  return (
    <section className="placeholder-card">
      <h2 className="placeholder-title">{title}</h2>
      <p className="placeholder-text">{description}</p>
    </section>
  );
}
