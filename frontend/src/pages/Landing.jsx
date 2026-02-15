import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Map, BarChart3, Users, Share2, Shield, Clock } from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div>
      <header className="app-header">
        <Link to="/" className="logo">
          <Map size={24} />
          PlanRoad
        </Link>
        <nav>
          <a href="#features">Fonctionnalites</a>
          <a href="#cta">Avantages</a>
          {user ? (
            <Link to="/app" className="btn btn-primary">Acceder a l'application</Link>
          ) : (
            <Link to="/login" className="btn btn-primary">Se connecter</Link>
          )}
        </nav>
      </header>

      <section className="landing-hero">
        <h1>Planifiez vos projets,<br />partagez vos roadmaps</h1>
        <p>
          PlanRoad est la plateforme collaborative qui simplifie la gestion de vos roadmaps projets.
          Visualisez, partagez et suivez l'avancement en temps reel.
        </p>
        <Link to={user ? '/app' : '/login'} className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '0.8rem 2.5rem' }}>
          Commencer maintenant
        </Link>
      </section>

      <section className="landing-features" id="features">
        <h2>Tout ce dont vous avez besoin</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="icon"><BarChart3 size={28} /></div>
            <h3>Visualisation Gantt</h3>
            <p>Affichez vos lots sous forme de timeline avec les phases de developpement, tests et activation clairement identifiees.</p>
          </div>
          <div className="feature-card">
            <div className="icon"><Share2 size={28} /></div>
            <h3>Partage facile</h3>
            <p>Partagez vos roadmaps avec vos clients externes en quelques clics. Chaque partie prenante voit ce qui la concerne.</p>
          </div>
          <div className="feature-card">
            <div className="icon"><Users size={28} /></div>
            <h3>Multi-utilisateurs</h3>
            <p>Gerez les acces avec 3 niveaux de roles : administrateur, utilisateur interne et client externe.</p>
          </div>
          <div className="feature-card">
            <div className="icon"><Clock size={28} /></div>
            <h3>Import CSV / Google Sheets</h3>
            <p>Importez vos donnees depuis un fichier CSV ou un Google Sheet pour creer vos roadmaps en un instant.</p>
          </div>
          <div className="feature-card">
            <div className="icon"><Shield size={28} /></div>
            <h3>Gestion de projets</h3>
            <p>Organisez vos projets avec leurs objectifs et KPIs. Suivez plusieurs roadmaps par projet.</p>
          </div>
          <div className="feature-card">
            <div className="icon"><Map size={28} /></div>
            <h3>Sprints configurables</h3>
            <p>Definissez le nombre de semaines par sprint pour adapter la roadmap a votre methodologie de travail.</p>
          </div>
        </div>
      </section>

      <section className="landing-cta" id="cta">
        <h2>Pret a organiser vos projets ?</h2>
        <p>Rejoignez PlanRoad et commencez a partager vos roadmaps avec votre equipe et vos clients.</p>
        <Link to={user ? '/app' : '/login'} className="btn">
          Acceder a la plateforme
        </Link>
      </section>

      <footer className="landing-footer">
        <p>PlanRoad - Plateforme de gestion de roadmaps projets</p>
      </footer>
    </div>
  );
}
