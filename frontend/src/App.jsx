import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  Database,
  Dices,
  RefreshCw,
  Ticket,
  UploadCloud,
} from 'lucide-react';
import './styles.css';

const API_BASE_URL = 'http://localhost:8081/api';
const DRAW_API_URL = `${API_BASE_URL}/draw`;
const ARCHIVE_API_URL = `${API_BASE_URL}/archive`;
const MIN_TICKET_COUNT = 1;
const MAX_TICKET_COUNT = 10;

const games = {
  LOTTO: {
    label: 'Lotto',
    short: '6 z 49',
    accent: '#f2c14e',
    range: '1-49',
  },
  MINI_LOTTO: {
    label: 'Mini Lotto',
    short: '5 z 42',
    accent: '#61b7a4',
    range: '1-42',
  },
  EURO_JACKPOT: {
    label: 'Euro Jackpot',
    short: '5 + 2',
    accent: '#7db7d8',
    range: '1-50 + 1-12',
  },
};

const sections = [
  { id: 'generate', label: 'Generuj', icon: Dices },
  { id: 'archive', label: 'Wyniki archiwalne', icon: UploadCloud },
  { id: 'stats', label: 'Statystyki', icon: BarChart3 },
];

function App() {
  const [activeGame, setActiveGame] = useState('LOTTO');
  const [activeSection, setActiveSection] = useState('generate');
  const [openGames, setOpenGames] = useState({ LOTTO: true });
  const [ticketCount, setTicketCount] = useState(1);
  const [tickets, setTickets] = useState([]);
  const [archivedDraws, setArchivedDraws] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentGame = games[activeGame];
  const currentSection = sections.find((section) => section.id === activeSection);
  const latestTicket = tickets.find((ticket) => ticket.gameType === activeGame);

  useEffect(() => {
    fetchArchivedDraws(activeGame);
  }, [activeGame]);

  const hotNumbers = useMemo(() => {
    const frequency = new Map();

    archivedDraws.forEach((draw) => {
      [...draw.numbers, ...(draw.extraNumbers ?? [])].forEach((number) => {
        frequency.set(number, (frequency.get(number) ?? 0) + 1);
      });
    });

    return [...frequency.entries()]
      .sort((first, second) => second[1] - first[1] || first[0] - second[0])
      .slice(0, 8);
  }, [archivedDraws]);

  function toggleGame(gameKey) {
    setOpenGames((current) => ({
      ...current,
      [gameKey]: !current[gameKey],
    }));
    setActiveGame(gameKey);
  }

  function selectSection(gameKey, sectionId) {
    setActiveGame(gameKey);
    setActiveSection(sectionId);
    setOpenGames((current) => ({ ...current, [gameKey]: true }));
  }

  function handleTicketCountChange(event) {
    const nextCount = Number.parseInt(event.target.value, 10);

    if (!Number.isFinite(nextCount)) {
      setTicketCount(MIN_TICKET_COUNT);
      return;
    }

    setTicketCount(Math.min(MAX_TICKET_COUNT, Math.max(MIN_TICKET_COUNT, nextCount)));
  }

  async function generateTicket() {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        gameType: activeGame,
        count: String(ticketCount),
      });
      const response = await fetch(`${DRAW_API_URL}?${params}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Nie udało się wygenerować kuponu.');
      }

      setTickets(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchArchivedDraws(gameType) {
    setArchiveLoading(true);
    setArchiveError('');

    try {
      const params = new URLSearchParams({ gameType });
      const response = await fetch(`${ARCHIVE_API_URL}?${params}`);

      if (!response.ok) {
        throw new Error('Nie udało się pobrać archiwum losowań.');
      }

      setArchivedDraws(await response.json());
    } catch (err) {
      setArchiveError(err.message);
      setArchivedDraws([]);
    } finally {
      setArchiveLoading(false);
    }
  }

  async function importArchiveFile(event) {
    const [file] = event.target.files;

    if (!file) {
      return;
    }

    setArchiveLoading(true);
    setArchiveError('');
    setImportStatus('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${ARCHIVE_API_URL}/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Nie udało się zaimportować pliku CSV.');
      }

      const result = await response.json();
      setImportStatus(
        `Zaimportowano: ${result.imported}, pominięto duplikaty: ${result.skipped}, błędy: ${result.errors.length}`
      );
      await fetchArchivedDraws(activeGame);
    } catch (err) {
      setArchiveError(err.message);
    } finally {
      event.target.value = '';
      setArchiveLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Nawigacja gier">
        <div className="brand-block">
          <div className="brand-mark">
            <Ticket size={22} />
          </div>
          <div>
            <strong>Lotek Studio</strong>
            <span>Panel losowań</span>
          </div>
        </div>

        <nav className="game-nav">
          {Object.entries(games).map(([gameKey, game]) => {
            const isOpen = openGames[gameKey];

            return (
              <div className="game-group" key={gameKey}>
                <button
                  className={`game-trigger ${activeGame === gameKey ? 'active' : ''}`}
                  onClick={() => toggleGame(gameKey)}
                  type="button"
                >
                  <span className="game-dot" style={{ background: game.accent }} />
                  <span>
                    <strong>{game.label}</strong>
                    <small>{game.short}</small>
                  </span>
                  <ChevronDown className={isOpen ? 'rotated' : ''} size={17} />
                </button>

                {isOpen && (
                  <div className="section-list">
                    {sections.map((section) => {
                      const Icon = section.icon;

                      return (
                        <button
                          className={
                            activeGame === gameKey && activeSection === section.id ? 'active' : ''
                          }
                          key={section.id}
                          onClick={() => selectSection(gameKey, section.id)}
                          type="button"
                        >
                          <Icon size={16} />
                          {section.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{currentGame.label}</p>
            <h1>{currentSection.label}</h1>
          </div>

          <div className="status-strip">
            <span>Zakres: {currentGame.range}</span>
            <span>Ostatnie dane: MySQL</span>
          </div>
        </header>

        {activeSection === 'generate' && (
          <GenerateView
            currentGame={currentGame}
            error={error}
            generateTicket={generateTicket}
            loading={loading}
            ticketCount={ticketCount}
            tickets={tickets}
            onTicketCountChange={handleTicketCountChange}
          />
        )}

        {activeSection === 'archive' && (
          <ArchiveView
            archiveError={archiveError}
            archiveLoading={archiveLoading}
            archivedDraws={archivedDraws}
            currentGame={currentGame}
            importStatus={importStatus}
            onImportArchiveFile={importArchiveFile}
          />
        )}

        {activeSection === 'stats' && (
          <StatsView
            archivedDraws={archivedDraws}
            currentGame={currentGame}
            hotNumbers={hotNumbers}
            latestTicket={latestTicket}
          />
        )}
      </section>
    </main>
  );
}

function GenerateView({
  currentGame,
  error,
  generateTicket,
  loading,
  onTicketCountChange,
  ticketCount,
  tickets,
}) {
  return (
    <div className="content-grid">
      <section className="tool-panel">
        <div className="panel-header">
          <div>
            <h2>Generator kuponów</h2>
            <p>Wybierz liczbę zestawów i wygeneruj propozycje dla aktywnej gry.</p>
          </div>
        </div>

        <div className="generator-controls">
          <label className="count-control">
            <span>Liczba zestawów</span>
            <input
              max={MAX_TICKET_COUNT}
              min={MIN_TICKET_COUNT}
              onChange={onTicketCountChange}
              type="number"
              value={ticketCount}
            />
          </label>

          <button className="primary-button" disabled={loading} onClick={generateTicket} type="button">
            <RefreshCw size={18} />
            {loading ? 'Losowanie...' : ticketCount === 1 ? 'Generuj' : `Generuj ${ticketCount}`}
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}
      </section>

      <section className="result-section">
        <div className="section-header">
          <h2>Wylosowane liczby</h2>
          <span>{currentGame.short}</span>
        </div>

        {tickets.length === 0 ? (
          <p className="empty-state">Kliknij Generuj, aby zobaczyć nowe zestawy.</p>
        ) : (
          <div className="ticket-list">
            {tickets.map((ticket, index) => (
              <TicketCard key={`${ticket.createdAt}-${index}`} ticket={ticket} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ArchiveView({
  archiveError,
  archiveLoading,
  archivedDraws,
  currentGame,
  importStatus,
  onImportArchiveFile,
}) {
  return (
    <div className="content-grid">
      <section className="tool-panel">
        <div className="panel-header">
          <div>
            <h2>Import wyników</h2>
            <p>Załaduj plik CSV z kolumnami: gameType, drawDate, numbers, extraNumbers.</p>
          </div>
          <Database size={22} />
        </div>

        <label className="secondary-button file-button">
          <UploadCloud size={18} />
          Załaduj CSV
          <input accept=".csv,text/csv" onChange={onImportArchiveFile} type="file" />
        </label>

        {archiveError && <p className="error-message">{archiveError}</p>}
        {importStatus && <p className="success-message">{importStatus}</p>}
      </section>

      <section className="result-section">
        <div className="section-header">
          <h2>Ostatnie losowania</h2>
          <span>{currentGame.label}</span>
        </div>

        {archiveLoading ? (
          <p className="empty-state">Ładowanie archiwum...</p>
        ) : archivedDraws.length === 0 ? (
          <p className="empty-state">Brak losowań w bazie dla tej gry.</p>
        ) : (
          <div className="draw-table">
            {archivedDraws.map((draw) => (
              <article className="draw-row" key={draw.id ?? draw.drawDate}>
                <time>{draw.drawDate}</time>
                <NumberRow extraNumbers={draw.extraNumbers} numbers={draw.numbers} />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatsView({ archivedDraws, currentGame, hotNumbers, latestTicket }) {
  return (
    <div className="content-grid">
      <section className="stats-grid">
        <article className="metric-card">
          <span>Losowania w bazie</span>
          <strong>{archivedDraws.length}</strong>
        </article>
        <article className="metric-card">
          <span>Format gry</span>
          <strong>{currentGame.short}</strong>
        </article>
        <article className="metric-card">
          <span>Ostatni kupon</span>
          <strong>{latestTicket ? 'Gotowy' : 'Brak'}</strong>
        </article>
      </section>

      <section className="result-section">
        <div className="section-header">
          <h2>Najczęściej widoczne liczby</h2>
          <span>Dane z archiwum</span>
        </div>

        {hotNumbers.length === 0 ? (
          <p className="empty-state">Zaimportuj archiwum, aby zobaczyć statystyki.</p>
        ) : (
          <div className="frequency-list">
            {hotNumbers.map(([number, count]) => (
              <div className="frequency-row" key={number}>
                <span className="number-ball">{number}</span>
                <div>
                  <strong>{count} wystąpienia</strong>
                  <div className="frequency-track">
                    <span style={{ width: `${Math.max(24, count * 34)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TicketCard({ ticket }) {
  return (
    <article className="ticket-card">
      <div className="ticket-meta">
        <strong>{games[ticket.gameType]?.label ?? ticket.gameType}</strong>
        <span>{new Date(ticket.createdAt).toLocaleString('pl-PL')}</span>
      </div>
      <NumberRow extraNumbers={ticket.extraNumbers} numbers={ticket.numbers} />
    </article>
  );
}

function NumberRow({ extraNumbers = [], numbers }) {
  return (
    <div className="number-wrap">
      <div className="number-row">
        {numbers.map((number) => (
          <span className="number-ball" key={number}>
            {number}
          </span>
        ))}
      </div>

      {extraNumbers.length > 0 && (
        <div className="extra-number-group">
          <span>Euroliczby</span>
          <div className="number-row">
            {extraNumbers.map((number) => (
              <span className="number-ball extra" key={number}>
                {number}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
