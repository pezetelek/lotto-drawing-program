import { useEffect, useMemo, useRef, useState } from 'react';
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
const generationOptionDefinitions = [
  { key: 'excludeLastDraw', label: 'Pomiń liczby z ostatniego losowania' },
  { key: 'uniqueHistorical', label: 'Tylko zestaw, który wcześniej nie wystąpił' },
  { key: 'balancedParity', label: 'Równowaga parzyste / nieparzyste' },
  { key: 'balancedRange', label: 'Równowaga niskie / wysokie' },
  { key: 'maxTwoConsecutive', label: 'Bez więcej niż dwóch kolejnych liczb' },
];

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
  const [generationOptionsByGame, setGenerationOptionsByGame] = useState({});
  const [entryModeByGame, setEntryModeByGame] = useState({});
  const [manualNumbersByGame, setManualNumbersByGame] = useState({});
  const [manualErrorsByGame, setManualErrorsByGame] = useState({});
  const [ticketsByGame, setTicketsByGame] = useState({});
  const [ticketChecksByGame, setTicketChecksByGame] = useState({});
  const [archivedDrawsByGame, setArchivedDrawsByGame] = useState({});
  const [archiveLoadingByGame, setArchiveLoadingByGame] = useState({
    LOTTO: true,
    MINI_LOTTO: true,
    EURO_JACKPOT: true,
  });
  const [archiveErrorsByGame, setArchiveErrorsByGame] = useState({});
  const [importStatus, setImportStatus] = useState('');
  const [loadingByGame, setLoadingByGame] = useState({});
  const [errorsByGame, setErrorsByGame] = useState({});
  const archiveRequestIds = useRef({});
  const generationRequestIds = useRef({});

  const currentGame = games[activeGame];
  const currentSection = sections.find((section) => section.id === activeSection);
  const currentTickets = ticketsByGame[activeGame] ?? [];
  const latestTicket = currentTickets[0];
  const currentArchivedDraws = archivedDrawsByGame[activeGame] ?? [];
  const currentArchiveLoading = archiveLoadingByGame[activeGame] ?? false;
  const currentArchiveError = archiveErrorsByGame[activeGame] ?? '';
  const currentLoading = loadingByGame[activeGame] ?? false;
  const currentError = errorsByGame[activeGame] ?? '';
  const currentGenerationOptions = generationOptionsByGame[activeGame] ?? {};

  useEffect(() => {
    fetchArchivedDraws(activeGame);
  }, [activeGame]);

  const hotNumbers = useMemo(() => {
    const frequency = new Map();

    currentArchivedDraws.forEach((draw) => {
      [...draw.numbers, ...(draw.extraNumbers ?? [])].forEach((number) => {
        frequency.set(number, (frequency.get(number) ?? 0) + 1);
      });
    });

    return [...frequency.entries()]
      .sort((first, second) => second[1] - first[1] || first[0] - second[0])
      .slice(0, 8);
  }, [currentArchivedDraws]);

  const repeatedDrawSets = useMemo(() => {
    const groups = new Map();
    currentArchivedDraws.forEach((draw) => {
      const main = [...draw.numbers].sort((a, b) => a - b);
      const extra = [...(draw.extraNumbers ?? [])].sort((a, b) => a - b);
      const key = `${main.join(',')}:${extra.join(',')}`;
      const current = groups.get(key) ?? { numbers: main, extraNumbers: extra, count: 0 };
      current.count += 1;
      groups.set(key, current);
    });
    return [...groups.values()]
      .filter((group) => group.count > 1)
      .sort((first, second) => second.count - first.count);
  }, [currentArchivedDraws]);

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

  function adjustTicketCount(amount) {
    setTicketCount((current) => Math.min(MAX_TICKET_COUNT, Math.max(MIN_TICKET_COUNT, current + amount)));
  }

  function toggleGenerationOption(optionKey) {
    setGenerationOptionsByGame((current) => ({
      ...current,
      [activeGame]: {
        ...(current[activeGame] ?? {}),
        [optionKey]: !(current[activeGame]?.[optionKey] ?? false),
      },
    }));
  }

  async function generateTicket() {
    const gameType = activeGame;
    const requestId = (generationRequestIds.current[gameType] ?? 0) + 1;
    generationRequestIds.current[gameType] = requestId;
    setLoadingByGame((current) => ({ ...current, [gameType]: true }));
    setErrorsByGame((current) => ({ ...current, [gameType]: '' }));

    try {
      const params = new URLSearchParams({
        gameType,
        count: String(ticketCount),
        ...Object.fromEntries(
          generationOptionDefinitions.map(({ key }) => [key, String(currentGenerationOptions[key] ?? false)])
        ),
      });
      const response = await fetch(`${DRAW_API_URL}?${params}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const problem = await response.json().catch(() => null);
        throw new Error(problem?.detail ?? 'Nie udało się wygenerować kuponu.');
      }

      const generatedTickets = await response.json();
      if (generationRequestIds.current[gameType] === requestId) {
        setTicketsByGame((current) => ({ ...current, [gameType]: generatedTickets }));
        setTicketChecksByGame((current) => ({ ...current, [gameType]: {} }));
      }
    } catch (err) {
      if (generationRequestIds.current[gameType] === requestId) {
        setErrorsByGame((current) => ({ ...current, [gameType]: err.message }));
      }
    } finally {
      if (generationRequestIds.current[gameType] === requestId) {
        setLoadingByGame((current) => ({ ...current, [gameType]: false }));
      }
    }
  }

  function checkTicketAgainstArchive(ticket, ticketIndex) {
    const matches = currentArchivedDraws.filter((draw) =>
      sameNumbers(ticket.numbers, draw.numbers)
      && sameNumbers(ticket.extraNumbers ?? [], draw.extraNumbers ?? [])
    );
    setTicketChecksByGame((current) => ({
      ...current,
      [activeGame]: {
        ...(current[activeGame] ?? {}),
        [ticketIndex]: matches,
      },
    }));
  }

  function removeTicket(ticketIndex) {
    setTicketsByGame((current) => ({
      ...current,
      [activeGame]: (current[activeGame] ?? []).filter((_, index) => index !== ticketIndex),
    }));
    setTicketChecksByGame((current) => {
      const gameChecks = { ...(current[activeGame] ?? {}) };
      delete gameChecks[ticketIndex];
      return { ...current, [activeGame]: gameChecks };
    });
  }

  function addManualTicket(numbers, extraNumbers) {
    const createdAt = new Date().toISOString();
    const manualTicket = { id: `manual-${createdAt}`, gameType: activeGame, numbers, extraNumbers, createdAt };
    setTicketsByGame((current) => ({
      ...current,
      [activeGame]: [manualTicket, ...(current[activeGame] ?? [])],
    }));
    setTicketChecksByGame((current) => ({ ...current, [activeGame]: {} }));
  }

  async function fetchArchivedDraws(gameType) {
    const requestId = (archiveRequestIds.current[gameType] ?? 0) + 1;
    archiveRequestIds.current[gameType] = requestId;
    setArchiveLoadingByGame((current) => ({ ...current, [gameType]: true }));
    setArchiveErrorsByGame((current) => ({ ...current, [gameType]: '' }));

    try {
      const params = new URLSearchParams({ gameType });
      const response = await fetch(`${ARCHIVE_API_URL}?${params}`);

      if (!response.ok) {
        throw new Error('Nie udało się pobrać archiwum losowań.');
      }

      const draws = await response.json();
      if (archiveRequestIds.current[gameType] === requestId) {
        setArchivedDrawsByGame((current) => ({ ...current, [gameType]: draws }));
      }
    } catch (err) {
      if (archiveRequestIds.current[gameType] === requestId) {
        setArchiveErrorsByGame((current) => ({ ...current, [gameType]: err.message }));
        setArchivedDrawsByGame((current) => ({ ...current, [gameType]: [] }));
      }
    } finally {
      if (archiveRequestIds.current[gameType] === requestId) {
        setArchiveLoadingByGame((current) => ({ ...current, [gameType]: false }));
      }
    }
  }

  async function importArchiveFile(event) {
    const [file] = event.target.files;

    if (!file) {
      return;
    }

    const gameType = activeGame;
    setArchiveLoadingByGame((current) => ({ ...current, [gameType]: true }));
    setArchiveErrorsByGame((current) => ({ ...current, [gameType]: '' }));
    setImportStatus('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('gameType', gameType);

      const response = await fetch(`${ARCHIVE_API_URL}/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Nie udało się zaimportować pliku CSV.');
      }

      const result = await response.json();
      const errorDetails = result.errors.slice(0, 3).join(' | ');
      setImportStatus(
        `Zaimportowano: ${result.imported}, pominięto duplikaty: ${result.skipped}, błędy: ${result.errors.length}${errorDetails ? ` (${errorDetails})` : ''}`
      );
      await fetchArchivedDraws(gameType);
    } catch (err) {
      setArchiveErrorsByGame((current) => ({ ...current, [gameType]: err.message }));
      setArchiveLoadingByGame((current) => ({ ...current, [gameType]: false }));
    } finally {
      event.target.value = '';
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
            error={currentError}
            generateTicket={generateTicket}
            loading={currentLoading}
            ticketCount={ticketCount}
            tickets={currentTickets}
            ticketChecks={ticketChecksByGame[activeGame] ?? {}}
            checkTicket={checkTicketAgainstArchive}
            removeTicket={removeTicket}
            archiveLoading={currentArchiveLoading}
            onTicketCountChange={handleTicketCountChange}
            onAdjustTicketCount={adjustTicketCount}
            generationOptions={currentGenerationOptions}
            onToggleGenerationOption={toggleGenerationOption}
            gameType={activeGame}
            entryMode={entryModeByGame[activeGame] ?? 'random'}
            onEntryModeChange={(mode) => setEntryModeByGame((current) => ({ ...current, [activeGame]: mode }))}
            manualNumbers={manualNumbersByGame[activeGame] ?? { numbers: [], extraNumbers: [] }}
            onManualNumbersChange={(value) => setManualNumbersByGame((current) => ({ ...current, [activeGame]: value }))}
            manualError={manualErrorsByGame[activeGame] ?? ''}
            onManualErrorChange={(value) => setManualErrorsByGame((current) => ({ ...current, [activeGame]: value }))}
            onAddManualTicket={addManualTicket}
          />
        )}

        {activeSection === 'archive' && (
          <ArchiveView
            archiveError={currentArchiveError}
            archiveLoading={currentArchiveLoading}
            archivedDraws={currentArchivedDraws}
            currentGame={currentGame}
            importStatus={importStatus}
            onImportArchiveFile={importArchiveFile}
          />
        )}

        {activeSection === 'stats' && (
          <StatsView
            archiveLoading={currentArchiveLoading}
            archivedDraws={currentArchivedDraws}
            currentGame={currentGame}
            hotNumbers={hotNumbers}
            repeatedDrawSets={repeatedDrawSets}
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
  ticketChecks,
  checkTicket,
  removeTicket,
  archiveLoading,
  onAdjustTicketCount,
  generationOptions,
  onToggleGenerationOption,
  gameType,
  entryMode,
  onEntryModeChange,
  manualNumbers,
  onManualNumbersChange,
  manualError,
  onManualErrorChange,
  onAddManualTicket,
}) {
  const limits = {
    LOTTO: { numbers: 6, maxNumber: 49, extraNumbers: 0, maxExtra: 0 },
    MINI_LOTTO: { numbers: 5, maxNumber: 42, extraNumbers: 0, maxExtra: 0 },
    EURO_JACKPOT: { numbers: 5, maxNumber: 50, extraNumbers: 2, maxExtra: 12 },
  }[gameType];

  return (
    <div className="content-grid">
      <section className="tool-panel">
        <div className="panel-header">
          <div>
            <h2>Generator kuponów</h2>
            <p>Wybierz liczbę zestawów i wygeneruj propozycje dla aktywnej gry.</p>
          </div>
        </div>

        <div className="entry-mode-switch" role="group" aria-label="Sposób tworzenia kuponu">
          <button className={entryMode === 'random' ? 'active' : ''} onClick={() => onEntryModeChange('random')} type="button">
            Losuj liczby
          </button>
          <button className={entryMode === 'manual' ? 'active' : ''} onClick={() => onEntryModeChange('manual')} type="button">
            Wpisz ręcznie
          </button>
        </div>

        {entryMode === 'random' ? <div className="random-generator">
          <div className="generation-options" aria-label="Opcje generowania">
            {generationOptionDefinitions.map((option) => {
              const selected = generationOptions[option.key] ?? false;
              return (
                <button
                  aria-pressed={selected}
                  className={`generation-option ${selected ? 'selected' : ''}`}
                  key={option.key}
                  onClick={() => onToggleGenerationOption(option.key)}
                  type="button"
                >
                  <span className="option-circle" aria-hidden="true" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>

          <div className="generator-controls">
          <label className="count-control">
            <span>Liczba zestawów</span>
            <div className="count-stepper">
              <button
                aria-label="Zmniejsz liczbę zestawów"
                className="stepper-button"
                disabled={ticketCount <= MIN_TICKET_COUNT}
                onClick={() => onAdjustTicketCount(-1)}
                type="button"
              >−</button>
              <input
                aria-label="Liczba zestawów"
                max={MAX_TICKET_COUNT}
                min={MIN_TICKET_COUNT}
                onChange={onTicketCountChange}
                type="number"
                value={ticketCount}
              />
              <button
                aria-label="Zwiększ liczbę zestawów"
                className="stepper-button"
                disabled={ticketCount >= MAX_TICKET_COUNT}
                onClick={() => onAdjustTicketCount(1)}
                type="button"
              >+</button>
            </div>
          </label>

          <button className="primary-button" disabled={loading} onClick={generateTicket} type="button">
            <RefreshCw size={18} />
            {loading ? 'Losowanie...' : 'Generuj'}
          </button>
          </div>
        </div> : (
          <ManualTicketForm
            gameType={gameType}
            limits={limits}
            values={manualNumbers}
            error={manualError}
            onValuesChange={onManualNumbersChange}
            onErrorChange={onManualErrorChange}
            onSubmit={onAddManualTicket}
          />
        )}

        <div className="archive-ready-state" hidden={!archiveLoading}>
          Ładowanie archiwum gry...
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
              <TicketCard
                key={`${ticket.createdAt}-${index}`}
                ticket={ticket}
                checkResult={ticketChecks[index]}
                onCheck={() => checkTicket(ticket, index)}
                onRemove={() => removeTicket(index)}
                checkDisabled={archiveLoading}
              />
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
            <p>Obsługiwane CSV: numer;data;godzina;liczby;... lub gameType,drawDate,numbers,extraNumbers.</p>
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
                <strong className="draw-number">Nr losowania {draw.drawNumber ?? '—'}</strong>
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

function StatsView({ archiveLoading, archivedDraws, currentGame, hotNumbers, latestTicket, repeatedDrawSets }) {
  return (
    <div className="content-grid">
      <section className="stats-grid">
        <article className="metric-card">
          <span>Losowania w bazie</span>
          <strong>{archiveLoading ? '…' : archivedDraws.length}</strong>
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
          <h2>Powielone zestawy ({archiveLoading ? '…' : repeatedDrawSets.length})</h2>
          <span>Wyniki występujące więcej niż raz</span>
        </div>
        {archiveLoading ? (
          <p className="empty-state">Ładowanie archiwum...</p>
        ) : repeatedDrawSets.length === 0 ? (
          <p className="empty-state">Brak powielonych zestawów w archiwum tej gry.</p>
        ) : (
          <div className="repeated-set-list">
            {repeatedDrawSets.map((set) => (
              <div className="repeated-set-row" key={`${set.numbers.join('-')}:${set.extraNumbers.join('-')}`}>
                <NumberRow extraNumbers={set.extraNumbers} numbers={set.numbers} />
                <strong>{set.count} wystąpienia</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="result-section">
        <div className="section-header">
          <h2>Najczęściej widoczne liczby</h2>
          <span>Dane z archiwum</span>
        </div>

        {archiveLoading ? (
          <p className="empty-state">Ładowanie statystyk…</p>
        ) : hotNumbers.length === 0 ? (
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

function ManualTicketForm({ gameType, limits, values, error, onValuesChange, onErrorChange, onSubmit }) {
  const updateGroup = (field, count, index, value) => {
    const next = [...(values[field] ?? Array(count).fill(''))];
    next[index] = value;
    onValuesChange({ ...values, [field]: next });
    onErrorChange('');
  };

  const submit = (event) => {
    event.preventDefault();
    const parseGroup = (field, count, maximum, label) => {
      const rawValues = Array.from({ length: count }, (_, index) => values[field]?.[index] ?? '');
      if (rawValues.some((value) => value === '')) throw new Error(`Wpisz ${count} ${label}.`);
      const parsed = rawValues.map(Number);
      if (parsed.some((value) => !Number.isInteger(value) || value < 1 || value > maximum)) {
        throw new Error(`${label} muszą być z zakresu 1-${maximum}.`);
      }
      if (new Set(parsed).size !== parsed.length) throw new Error(`${label} nie mogą się powtarzać.`);
      return parsed.sort((a, b) => a - b);
    };

    try {
      const numbers = parseGroup('numbers', limits.numbers, limits.maxNumber, 'liczby główne');
      const extraNumbers = limits.extraNumbers
        ? parseGroup('extraNumbers', limits.extraNumbers, limits.maxExtra, 'Euroliczby')
        : [];
      onSubmit(numbers, extraNumbers);
      onValuesChange({ numbers: [], extraNumbers: [] });
      onErrorChange('');
    } catch (validationError) {
      onErrorChange(validationError.message);
    }
  };

  const renderInputs = (field, count, maximum, label) => (
    <fieldset className="manual-number-group">
      <legend>{label} (1-{maximum})</legend>
      <div className="manual-number-inputs">
        {Array.from({ length: count }, (_, index) => (
          <input
            key={`${gameType}-${field}-${index}`}
            aria-label={`${label}, liczba ${index + 1}`}
            inputMode="numeric"
            max={maximum}
            min="1"
            onChange={(event) => updateGroup(field, count, index, event.target.value)}
            type="number"
            value={values[field]?.[index] ?? ''}
          />
        ))}
      </div>
    </fieldset>
  );

  return (
    <form className="manual-ticket-form" onSubmit={submit}>
      {renderInputs('numbers', limits.numbers, limits.maxNumber, 'Liczby główne')}
      {limits.extraNumbers > 0 && renderInputs('extraNumbers', limits.extraNumbers, limits.maxExtra, 'Euroliczby')}
      {error && <p className="error-message">{error}</p>}
      <div className="manual-form-actions">
        <button className="primary-button" type="submit">Dodaj kupon</button>
        <button
          className="secondary-button"
          onClick={() => {
            onValuesChange({ numbers: [], extraNumbers: [] });
            onErrorChange('');
          }}
          type="button"
        >Wyczyść</button>
      </div>
    </form>
  );
}

function TicketCard({ ticket, checkResult, onCheck, onRemove, checkDisabled = false }) {
  return (
    <article className="ticket-card">
      <div className="ticket-meta">
        <strong>{games[ticket.gameType]?.label ?? ticket.gameType}</strong>
        <span>{new Date(ticket.createdAt).toLocaleString('pl-PL')}</span>
      </div>
      <NumberRow extraNumbers={ticket.extraNumbers} numbers={ticket.numbers} />
      <div className="ticket-check">
        <div className="ticket-check-actions">
        <button className="secondary-button" disabled={checkDisabled} onClick={onCheck} type="button">
          Sprawdź w archiwum
        </button>
        <button className="secondary-button" onClick={onRemove} type="button">
          Wyczyść
        </button>
        </div>
        {checkResult && (checkResult.length === 0 ? (
          <p className="check-result">Ten zestaw nie wystąpił wcześniej w archiwum.</p>
        ) : (
          <p className="check-result check-result-match">
            Ten zestaw już wylosowano: {checkResult.map((draw) =>
              `${draw.drawNumber ? `nr ${draw.drawNumber}, ` : ''}${draw.drawDate}`
            ).join('; ')}.
          </p>
        ))}
      </div>
    </article>
  );
}

function sameNumbers(first = [], second = []) {
  if (first.length !== second.length) return false;
  const normalizedFirst = [...first].sort((a, b) => a - b);
  const normalizedSecond = [...second].sort((a, b) => a - b);
  return normalizedFirst.every((number, index) => number === normalizedSecond[index]);
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
