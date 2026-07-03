import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import './styles.css';

const API_URL = 'http://localhost:8081/api/draw';

const gameLabels = {
  LOTTO: 'Lotto',
  MINI_LOTTO: 'Mini Lotto',
  EURO_JACKPOT: 'Euro Jackpot',
};

function App() {
  const [gameType, setGameType] = useState('LOTTO');
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const extraNumbers = ticket?.extraNumbers ?? [];

  async function generateTicket() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}?gameType=${gameType}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Nie udalo sie wygenerowac kuponu.');
      }

      setTicket(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="generator-panel">
        <div>
          <p className="eyebrow">Generator typow</p>
          <h1>Program losujący - Lotek</h1>
        </div>

        <div className="controls">
          <div className="segmented-control" aria-label="Wybierz gre">
            {Object.entries(gameLabels).map(([value, label]) => (
              <button
                className={gameType === value ? 'active' : ''}
                key={value}
                onClick={() => setGameType(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <button className="primary-button" disabled={loading} onClick={generateTicket} type="button">
            <RefreshCw size={18} />
            {loading ? 'Losowanie...' : 'Generuj'}
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}
      </section>

      <section className="result-section">
        <div className="section-header">
          <h2>Wylosowane liczby</h2>
        </div>

        {!ticket ? (
          <p className="empty-state">Wybierz gre i kliknij Generuj.</p>
        ) : (
          <article className="ticket-card single-result">
            <div className="ticket-meta">
              <strong>{gameLabels[ticket.gameType]}</strong>
              <span>{new Date(ticket.createdAt).toLocaleString('pl-PL')}</span>
            </div>

            <div className="number-row">
              {ticket.numbers.map((number) => (
                <span className="number-ball" key={number}>
                  {number}
                </span>
              ))}
            </div>

            {extraNumbers.length > 0 && (
              <div className="extra-number-group">
                <span className="extra-label">Euroliczby</span>
                <div className="number-row">
                  {extraNumbers.map((number) => (
                    <span className="number-ball extra" key={number}>
                      {number}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>
        )}
      </section>
    </main>
  );
}

export default App;
