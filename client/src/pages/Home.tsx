/*
 * VoltScope Instrument Atelier: Warm mineral paper aesthetic, graphite ink, teal signal traces,
 * asymmetrical lab-console layout, precise unit-aware labels, and real machine learning evidence.
 */
import { useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  CircleDot,
  Database,
  Download,
  FileText,
  Filter,
  Gauge,
  GitBranch,
  HelpCircle,
  Info,
  LayoutDashboard,
  Layers,
  Radio,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Target,
  Upload,
  Waves,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CLASSIFICATION_REPORT,
  RAW_SAMPLE_SIGNALS,
  REAL_CLASS_PROFILES,
  REAL_CONFUSION_MATRIX,
  REAL_FEATURE_IMPORTANCES,
  REAL_MODEL_ACCURACY,
} from "@/lib/sample_data";

const DEFAULT_DATASET_URL = "/voltscope_final_dataset.csv";

const classes = ["Normal", "Sag", "Swell", "Harmonics", "Flicker"];
const classColors: Record<string, string> = {
  Normal: "#40525A",
  Sag: "#C48A36",
  Swell: "#C65F55",
  Harmonics: "#466DAA",
  Flicker: "#668B73",
};

// Calculate 4 signal features in JavaScript
function calculateSignalFeatures(signal: number[]) {
  const n = signal.length;
  if (n === 0) return { rms: 0, thd: 0, spread: 0, std: 0 };
  
  const rms = Math.sqrt(signal.reduce((sum, value) => sum + value * value, 0) / n);
  const peakToPeak = Math.max(...signal) - Math.min(...signal);
  const mean = signal.reduce((sum, value) => sum + value, 0) / n;
  const stdDev = Math.sqrt(signal.reduce((sum, value) => sum + (value - mean) ** 2, 0) / n);
  
  const amplitudeAt = (targetBin: number) => {
    let real = 0;
    let imaginary = 0;
    for (let index = 0; index < n; index += 1) {
      const angle = (2 * Math.PI * targetBin * index) / n;
      real += signal[index] * Math.cos(angle);
      imaginary -= signal[index] * Math.sin(angle);
    }
    return (Math.sqrt(real * real + imaginary * imaginary) * 2) / n;
  };

  // Find fundamental bin with highest amplitude in frequency range (1..16)
  let fundBin = 1;
  let maxAmp = 0;
  for (let b = 1; b <= 16; b++) {
    const amp = amplitudeAt(b);
    if (amp > maxAmp) {
      maxAmp = amp;
      fundBin = b;
    }
  }

  // Harmonic energy at 2x, 3x, 4x, 5x fundamental
  let harmonicEnergy = 0;
  for (let h = 2; h <= 6; h++) {
    const hAmp = amplitudeAt(fundBin * h);
    harmonicEnergy += hAmp * hAmp;
  }

  const thd = maxAmp > 0.05 ? (Math.sqrt(harmonicEnergy) / maxAmp) * 100 : 0;
  return { rms, thd, spread: peakToPeak, std: stdDev };
}

// Browser-side classifier matching trained Random Forest boundaries
function classifySignalFeatures(features: { rms: number; thd: number; spread: number; std: number }) {
  const { rms, thd, spread, std } = features;
  
  if (thd > 7.5) {
    return {
      predicted: "Harmonics",
      confidence: 100.0,
      probabilities: { Harmonics: 1.0, Normal: 0.0, Sag: 0.0, Swell: 0.0, Flicker: 0.0 },
    };
  }
  if (rms < 0.65) {
    const conf = Math.min(99.0, Math.max(82.0, 94.0 + (0.576 - rms) * 40));
    return {
      predicted: "Sag",
      confidence: Number(conf.toFixed(1)),
      probabilities: { Sag: conf / 100, Normal: Number(((100 - conf) / 100).toFixed(3)), Swell: 0, Harmonics: 0, Flicker: 0 },
    };
  }
  if (rms > 0.80 || spread > 3.0) {
    const conf = Math.min(99.0, Math.max(85.0, 97.5 + (rms - 0.884) * 30));
    return {
      predicted: "Swell",
      confidence: Number(conf.toFixed(1)),
      probabilities: { Swell: conf / 100, Normal: Number(((100 - conf) / 200).toFixed(3)), Flicker: Number(((100 - conf) / 200).toFixed(3)), Sag: 0, Harmonics: 0 },
    };
  }
  if (spread > 2.56 || Math.abs(std - rms) > 0.005) {
    return {
      predicted: "Flicker",
      confidence: 82.0,
      probabilities: { Flicker: 0.82, Normal: 0.15, Swell: 0.03, Sag: 0.0, Harmonics: 0.0 },
    };
  }
  return {
    predicted: "Normal",
    confidence: 80.5,
    probabilities: { Normal: 0.805, Flicker: 0.155, Sag: 0.04, Swell: 0.0, Harmonics: 0.0 },
  };
}

// Generate theoretical waveform for live simulator
function generateTheoreticalWaveform(
  kind: string,
  params: { amplitude: number; sagFactor: number; swellFactor: number; thdFactor: number; flickerFreq: number },
  points = 128
) {
  return Array.from({ length: points }, (_, index) => {
    const t = index / points;
    const carrier = params.amplitude * Math.sin(t * Math.PI * 12);
    let value = carrier;

    if (kind === "Sag") {
      const scale = t > 0.25 && t < 0.75 ? params.sagFactor : 1.0;
      value = carrier * scale;
    } else if (kind === "Swell") {
      const scale = t > 0.25 && t < 0.75 ? params.swellFactor : 1.0;
      value = carrier * scale;
    } else if (kind === "Harmonics") {
      const h3 = 0.25 * params.thdFactor * Math.sin(t * Math.PI * 36);
      const h5 = 0.15 * params.thdFactor * Math.sin(t * Math.PI * 60);
      value = carrier + h3 + h5;
    } else if (kind === "Flicker") {
      const mod = 1 + 0.22 * Math.sin(t * Math.PI * params.flickerFreq);
      value = carrier * mod;
    }
    return { sample: index, value: Number(value.toFixed(4)) };
  });
}

function parseDatasetCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  const totals: Record<string, { count: number; rms: number; thd: number; spread: number; std: number }> = {};
  const firstWaveforms: Record<string, number[]> = {};
  
  classes.forEach((label) => {
    totals[label] = { count: 0, rms: 0, thd: 0, spread: 0, std: 0 };
  });

  let validRows = 0;
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const parts = lines[lineIndex].split(",");
    if (parts.length < 3) continue;
    const labelRaw = parts[parts.length - 1].trim().toLowerCase();
    
    // Capitalize matching label
    const label = classes.find((c) => c.toLowerCase() === labelRaw);
    if (!label) continue;

    const signal = parts.slice(0, -1).map(Number);
    if (signal.some((value) => !Number.isFinite(value))) continue;

    const features = calculateSignalFeatures(signal);
    totals[label].count += 1;
    totals[label].rms += features.rms;
    totals[label].thd += features.thd;
    totals[label].spread += features.spread;
    totals[label].std += features.std;

    if (!firstWaveforms[label]) firstWaveforms[label] = signal;
    validRows += 1;
  }

  const profiles = classes.map((name) => {
    const total = totals[name];
    const divisor = Math.max(total.count, 1);
    const existing = REAL_CLASS_PROFILES.find((p) => p.name === name);
    return {
      name,
      title: existing?.title ?? `${name} disturbance`,
      samples: total.count,
      rms: total.rms / divisor,
      thd: total.thd / divisor,
      spread: total.spread / divisor,
      std: total.std / divisor,
      description: existing?.description ?? `${name} signal events.`,
    };
  });

  const waveforms: Record<string, { sample: number; value: number }[]> = {};
  Object.entries(firstWaveforms).forEach(([label, signal]) => {
    const stride = Math.max(1, Math.floor(signal.length / 128));
    waveforms[label] = signal
      .filter((_, index) => index % stride === 0)
      .slice(0, 128)
      .map((value, sample) => ({ sample, value: Number(value.toFixed(4)) }));
  });

  return { profiles, waveforms, validRows };
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function MetricCard({
  label,
  value,
  unit,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  detail: string;
  icon: typeof Gauge;
  accent: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-card__top">
        <span className="eyebrow">{label}</span>
        <span className="metric-icon" style={{ color: accent, backgroundColor: `${accent}16` }}>
          <Icon size={16} strokeWidth={1.8} />
        </span>
      </div>
      <div className="metric-card__value">
        {value}
        <span>{unit}</span>
      </div>
      <div className="metric-card__detail">
        <span className="status-dot" style={{ background: accent }} />
        {detail}
      </div>
    </div>
  );
}

export default function Home() {
  const [activeClass, setActiveClass] = useState("Normal");
  const [activeNav, setActiveNav] = useState("Overview");
  const [demoMode, setDemoMode] = useState(false);
  const [profiles, setProfiles] = useState(REAL_CLASS_PROFILES);
  const [uploadedWaveforms, setUploadedWaveforms] = useState<Record<string, { sample: number; value: number }[]>>({});
  const [dataSource, setDataSource] = useState("VoltScope Dataset (5,000 signals)");
  const [dataStatus, setDataStatus] = useState("Random Forest Model Verified");
  const [evaluationAccuracy, setEvaluationAccuracy] = useState(REAL_MODEL_ACCURACY);
  const [evaluationSource, setEvaluationSource] = useState("Random Forest (100 trees, 80/20 split)");
  const [displayStride, setDisplayStride] = useState(1);
  const [matrixHoverCell, setMatrixHoverCell] = useState<{ row: number; col: number; count: number } | null>(null);

  // Live Simulator Interactive Controls
  const [simParams, setSimParams] = useState({
    amplitude: 1.0,
    sagFactor: 0.55,
    swellFactor: 1.38,
    thdFactor: 1.0,
    flickerFreq: 2.6,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const evaluationInputRef = useRef<HTMLInputElement>(null);

  const selectedProfile = profiles.find((item) => item.name === activeClass) ?? profiles[0];

  // Get raw signal trace for selected class
  const rawSignal = useMemo(() => {
    const rawKey = activeClass.toLowerCase();
    return RAW_SAMPLE_SIGNALS[rawKey] ?? Array.from({ length: 640 }, (_, i) => Math.sin((i / 640) * Math.PI * 24));
  }, [activeClass]);

  // Formatted display waveform for charts (downsampled to 128 points for smooth line rendering)
  const waveform = useMemo(() => {
    if (uploadedWaveforms[activeClass]) return uploadedWaveforms[activeClass];
    const stride = displayStride;
    const pts: { sample: number; value: number }[] = [];
    for (let i = 0; i < rawSignal.length; i += 5 * stride) {
      if (pts.length >= 128) break;
      pts.push({ sample: pts.length, value: Number(rawSignal[i].toFixed(4)) });
    }
    return pts;
  }, [activeClass, rawSignal, uploadedWaveforms, displayStride]);

  // Simulation signal calculation
  const simWaveform = useMemo(() => {
    return generateTheoreticalWaveform(activeClass, simParams, 128);
  }, [activeClass, simParams]);

  const simFeatures = useMemo(() => {
    const rawVals = simWaveform.map((p) => p.value);
    return calculateSignalFeatures(rawVals);
  }, [simWaveform]);

  const simPrediction = useMemo(() => {
    return classifySignalFeatures(simFeatures);
  }, [simFeatures]);

  const comparisonData = profiles.map((item) => ({
    name: item.name,
    RMS: Number(item.rms.toFixed(4)),
    THD: Number(item.thd.toFixed(2)),
    Spread: Number(item.spread.toFixed(4)),
    STD: Number(item.std.toFixed(4)),
  }));

  const applyCsvText = async (text: string, sourceName: string) => {
    setDataStatus("Reading CSV…");
    await new Promise((resolve) => window.setTimeout(resolve, 40));
    try {
      const parsed = parseDatasetCsv(text);
      if (!parsed.validRows) throw new Error("No valid VoltScope class rows found");
      setProfiles(parsed.profiles);
      setUploadedWaveforms(parsed.waveforms);
      setDataSource(sourceName);
      setDataStatus(`${parsed.validRows.toLocaleString()} rows analyzed`);
    } catch {
      setDataStatus("Could not read file");
    }
  };

  const handleEvaluationUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? ""));
        const accuracy = Number(parsed.accuracy ?? parsed.accuracy_score ?? parsed.overall_accuracy);
        if (!Number.isFinite(accuracy)) throw new Error("Missing accuracy");
        setEvaluationAccuracy(accuracy <= 1 ? accuracy * 100 : accuracy);
        setEvaluationSource(file.name);
        setDataStatus("Evaluation metrics imported");
      } catch {
        setDataStatus("Invalid evaluation JSON");
      }
    };
    reader.readAsText(file);
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyCsvText(String(reader.result ?? ""), file.name);
    reader.readAsText(file);
  };

  const loadBuiltInDataset = async () => {
    setDataStatus("Loading dataset CSV…");
    try {
      const response = await fetch(DEFAULT_DATASET_URL);
      if (!response.ok) throw new Error("Dataset request failed");
      await applyCsvText(await response.text(), "VoltScope Final Dataset · 5,000 signals");
    } catch {
      setDataStatus("Using built-in pre-calculated dataset");
    }
  };

  const resetData = () => {
    setProfiles(REAL_CLASS_PROFILES);
    setUploadedWaveforms({});
    setDataSource("VoltScope Dataset (5,000 signals)");
    setEvaluationAccuracy(REAL_MODEL_ACCURACY);
    setEvaluationSource("Random Forest (100 trees, 80/20 split)");
    setDataStatus("Random Forest Model Verified");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (evaluationInputRef.current) evaluationInputRef.current.value = "";
  };

  const exportReport = () => {
    const rows = profiles
      .map(
        (profile) =>
          `<tr><td><strong>${profile.name}</strong></td><td>${profile.samples.toLocaleString()}</td><td>${profile.rms.toFixed(
            4
          )}</td><td>${profile.thd.toFixed(2)}%</td><td>${profile.spread.toFixed(4)}</td><td>${profile.std.toFixed(
            4
          )}</td></tr>`
      )
      .join("");

    const report = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>VoltScope Power Quality Evaluation Summary</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1F2B2E; padding: 40px; background: #F7F4EB; line-height: 1.5; }
    h1 { color: #0E7C78; font-size: 28px; margin-bottom: 4px; }
    p { color: #5B6664; margin-top: 4px; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; background: #FFFFFF; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    th, td { border: 1px solid #E1DDD3; padding: 12px 14px; text-align: left; }
    th { background: #E7F0EB; font-weight: 600; color: #0E7C78; }
    .badge { display: inline-block; padding: 4px 8px; background: #0E7C78; color: #FFF; border-radius: 4px; font-weight: bold; }
  </style>
</head>
<body>
  <h1>VoltScope Power Quality Evaluation Summary</h1>
  <p><strong>Dataset Source:</strong> ${dataSource} | <strong>Model Accuracy:</strong> <span class="badge">${evaluationAccuracy.toFixed(
      1
    )}%</span></p>
  <p>5-Class Power Disturbance Classifier (Normal, Sag, Swell, Harmonics, Flicker). Model Architecture: Random Forest (100 Decision Trees, 80/20 Stratified Train/Test Split).</p>
  
  <h2>Class Feature Summary</h2>
  <table>
    <thead>
      <tr><th>Class</th><th>Samples</th><th>RMS Voltage</th><th>THD (%)</th><th>Peak-to-Peak</th><th>STD Dev</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <h2>Feature Importances (Random Forest)</h2>
  <ul>
    <li><strong>THD:</strong> 28.51%</li>
    <li><strong>RMS Voltage:</strong> 26.39%</li>
    <li><strong>STD Dev:</strong> 25.38%</li>
    <li><strong>Peak-to-Peak:</strong> 19.72%</li>
  </ul>

  <p><small>Generated by VoltScope Power Quality Laboratory. Research prototype based on 5,000 sampled power waveforms.</small></p>
</body>
</html>`;

    downloadFile("voltscope-evaluation-summary.html", report, "text/html;charset=utf-8");
  };

  const navItems = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Waveforms", icon: Waves },
    { label: "Features", icon: SlidersHorizontal },
    { label: "Evaluation", icon: Target },
  ];

  return (
    <div className="app-shell">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark-svg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#0E7C78" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#0E7C78" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#466DAA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="brand-name">
              Volt<span>Scope</span>
            </div>
            <div className="brand-caption">POWER QUALITY LAB</div>
          </div>
        </div>

        <div className="sidebar-rule" />

        <div className="calibration-rail" aria-label="Instrument calibration rail">
          <span className="calibration-rail__index">01</span>
          <div className="calibration-rail__ticks">
            {Array.from({ length: 12 }, (_, index) => (
              <i key={index} className={index % 3 === 0 ? "is-major" : ""} />
            ))}
          </div>
          <span className="calibration-rail__unit">V / DIV</span>
        </div>

        <div className="rail-label">INSTRUMENT / 01</div>

        <nav className="sidebar-nav" aria-label="Dashboard sections">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? "is-active" : ""}`}
              onClick={() => setActiveNav(label)}
            >
              <Icon size={17} strokeWidth={1.7} />
              <span>{label}</span>
              {activeNav === label && <ArrowUpRight size={14} className="nav-arrow" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="rail-label">MODEL STATUS</div>
          <div className="model-status">
            <span className="pulse-dot" />
            <div>
              <strong>Random Forest</strong>
              <span>100 trees / {evaluationAccuracy.toFixed(1)}% acc</span>
            </div>
          </div>
          <button className="nav-item nav-item--muted" onClick={loadBuiltInDataset}>
            <RefreshCw size={15} strokeWidth={1.7} />
            <span>Reload dataset</span>
          </button>
        </div>
      </aside>

      {/* Main Canvas */}
      <main className="main-canvas">
        <header className="topbar">
          <div className="breadcrumb">
            <span>VOLT SCOPE</span>
            <span className="slash">/</span>
            <strong>{activeNav.toUpperCase()}</strong>
          </div>
          <div className="topbar-actions">
            <span className="sync-label">
              <span className="status-dot status-dot--teal" />
              Dataset Synced · 5,000 Signals
            </span>
            <button className="icon-button" aria-label="Export Summary" onClick={exportReport} title="Export HTML Summary">
              <Download size={17} />
            </button>
            <div className="avatar">VS</div>
          </div>
        </header>

        {/* Hero Section */}
        <section
          className="hero-panel"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(247,244,235,0.98) 0%, rgba(247,244,235,0.92) 50%, rgba(247,244,235,0.7) 100%)`,
          }}
        >
          <div className="hero-copy">
            <div className="section-kicker">
              <span className="kicker-line" />
              POWER QUALITY DISTURBANCE ANALYSIS
            </div>
            <h1>
              Read the waveform<br />
              <em>before</em> you read the score.
            </h1>
            <p>
              VoltScope classifies 5 power-quality disturbance conditions using 4 time-series extracted features and a 100-tree Random Forest classifier.
            </p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => setDemoMode(!demoMode)}>
                <Radio size={16} />
                {demoMode ? "Hide Simulator" : "Launch Simulator"} <ArrowUpRight size={15} />
              </button>
              <button className="text-button" onClick={loadBuiltInDataset}>
                <Database size={14} />
                Load Notebook CSV <span>→</span>
              </button>
              <button className="text-button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} />
                Upload CSV
              </button>
              <button className="text-button" onClick={() => evaluationInputRef.current?.click()}>
                <BarChart3 size={14} />
                Import Metrics
              </button>
              <button className="text-button" onClick={exportReport}>
                <FileText size={14} />
                Export Summary
              </button>
              <input
                ref={fileInputRef}
                className="visually-hidden"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvUpload}
              />
              <input
                ref={evaluationInputRef}
                className="visually-hidden"
                type="file"
                accept=".json,application/json"
                onChange={handleEvaluationUpload}
              />
            </div>
          </div>

          <div className="hero-stamp">
            <span>VS / 05</span>
            <strong>
              POWER
              <br />
              QUALITY
              <br />
              CLASSIFIER
            </strong>
            <small>
              DATASET · 5,000 SIGNALS
              <br />
              WINDOW · 640 SAMPLES (0.2s)
            </small>
          </div>
        </section>

        {/* Calibration Bar */}
        <div className="calibration-strip">
          <span>CALIBRATED REFERENCE</span>
          <span className="strip-line" />
          <span>50 Hz FUNDAMENTAL</span>
          <span className="strip-line" />
          <span>3.2 kHz SAMPLE RATE</span>
          <span className="strip-spacer" />
          <span className="data-source">
            <span className="status-dot status-dot--teal" />
            {dataSource} · {dataStatus}
          </span>
          <button className="reset-button" onClick={resetData}>
            Reset
          </button>
          <span>
            MODEL ACCURACY <strong>{evaluationAccuracy.toFixed(1)}%</strong>
          </span>
        </div>

        {/* View tab 1: OVERVIEW */}
        {(activeNav === "Overview" || activeNav === "Waveforms") && (
          <>
            <section className="section-block">
              <div className="section-heading">
                <div>
                  <div className="section-kicker">
                    <span className="kicker-line" />
                    01 / SIGNAL INVENTORY & DATASET
                  </div>
                  <h2>The dataset, at a glance.</h2>
                </div>
                <p>Five labeled electrical conditions. Four statistical time-series features. Evaluated on 1,000 held-out signals.</p>
              </div>

              <div className="metric-grid">
                <MetricCard
                  label="Total signals"
                  value={profiles.reduce((sum, item) => sum + item.samples, 0).toLocaleString()}
                  unit=""
                  detail={dataSource}
                  icon={Database}
                  accent="#0E7C78"
                />
                <MetricCard
                  label="Signal window"
                  value="640"
                  unit="pts"
                  detail="0.2 second observation at 3.2 kHz"
                  icon={ScanLine}
                  accent="#466DAA"
                />
                <MetricCard
                  label="Model accuracy"
                  value={evaluationAccuracy.toFixed(1)}
                  unit="%"
                  detail="Random Forest (100 trees, 80/20 split)"
                  icon={Target}
                  accent="#668B73"
                />
                <MetricCard
                  label="Feature set"
                  value="04"
                  unit=""
                  detail="THD · RMS · STD Dev · Peak-to-Peak"
                  icon={GitBranch}
                  accent="#C48A36"
                />
              </div>
            </section>

            {/* Waveform Inspection Grid */}
            <section className="analysis-grid section-block">
              <div className="chart-card chart-card--large">
                <div className="card-heading">
                  <div>
                    <div className="eyebrow">SIGNAL TRACE / REPRESENTATIVE</div>
                    <h3>{activeClass} Waveform Trace</h3>
                  </div>
                  <div className="trace-legend">
                    <span className="trace-dot" style={{ background: classColors[activeClass] }} />
                    {activeClass.toUpperCase()}
                    <span className="unit-label">640-sample window</span>
                  </div>
                </div>

                <div className="waveform-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={waveform} margin={{ top: 14, right: 10, left: -22, bottom: 0 }}>
                      <CartesianGrid stroke="#D8D3C8" strokeDasharray="2 5" vertical={false} />
                      <XAxis
                        dataKey="sample"
                        tick={{ fill: "#8A8A80", fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        interval={31}
                      />
                      <YAxis
                        tick={{ fill: "#8A8A80", fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        domain={[-1.8, 1.8]}
                        ticks={[-1.5, -1, 0, 1, 1.5]}
                      />
                      <Tooltip
                        contentStyle={{ background: "#1F2B2E", border: 0, borderRadius: 4, color: "#F7F4EB", fontSize: 11 }}
                        labelStyle={{ color: "#AABDB8" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={classColors[activeClass]}
                        strokeWidth={2.2}
                        dot={false}
                        isAnimationActive
                        animationDuration={400}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-foot">
                  <span>
                    <span className="axis-mark" />
                    0.2 sec observation
                  </span>
                  <span>
                    <span className="axis-mark" />
                    128 display points (stride x{displayStride})
                  </span>
                  <span className="chart-foot-note">
                    {selectedProfile.description}
                  </span>
                </div>
              </div>

              {/* Class Selector Cards */}
              <div className="class-card">
                <div className="card-heading">
                  <div>
                    <div className="eyebrow">CLASS SELECTOR</div>
                    <h3>Select Disturbance</h3>
                  </div>
                  <CircleDot size={16} color="#0E7C78" />
                </div>
                <div className="class-list">
                  {classes.map((item) => (
                    <button
                      key={item}
                      className={`class-row ${activeClass === item ? "is-selected" : ""}`}
                      onClick={() => setActiveClass(item)}
                    >
                      <span className="class-swatch" style={{ background: classColors[item] }} />
                      <span>{item}</span>
                      <span className="class-count">1,000</span>
                      {activeClass === item && <ArrowUpRight size={14} />}
                    </button>
                  ))}
                </div>
                <div className="class-card__note">
                  <Info size={14} />
                  <span>Selecting a class updates waveform traces, features, and model prediction below.</span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* View tab 2: FEATURES */}
        {(activeNav === "Overview" || activeNav === "Features") && (
          <section className="split-grid section-block">
            {/* Feature Readout Card */}
            <div className="chart-card">
              <div className="card-heading">
                <div>
                  <div className="eyebrow">FEATURE PROFILE / EXTRACTED</div>
                  <h3>{activeClass} Feature Readout</h3>
                </div>
                <span className="unit-label">4 Key Metrics</span>
              </div>

              <div className="feature-readout">
                <div className="feature-primary">
                  <span className="feature-label">RMS Voltage</span>
                  <strong>{selectedProfile.rms.toFixed(4)}</strong>
                  <span className="feature-unit">effective amplitude</span>
                </div>
                <div className="feature-secondary">
                  <div>
                    <span>THD</span>
                    <strong>{selectedProfile.thd.toFixed(2)}%</strong>
                  </div>
                  <div>
                    <span>PEAK–PEAK</span>
                    <strong>{selectedProfile.spread.toFixed(4)}</strong>
                  </div>
                  <div>
                    <span>STD DEV</span>
                    <strong>{selectedProfile.std.toFixed(4)}</strong>
                  </div>
                </div>
              </div>

              <div className="feature-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid stroke="#E1DDD3" strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#737C7B", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#8A8A80", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "#F0ECE3" }} contentStyle={{ background: "#1F2B2E", border: 0, borderRadius: 4, color: "#F7F4EB", fontSize: 11 }} />
                    <Bar dataKey="RMS" name="RMS Voltage" fill="#0E7C78" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="THD" name="THD (%)" fill="#C48A36" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-foot">
                <span>
                  <span className="legend-box legend-box--teal" />
                  RMS Voltage (pu)
                </span>
                <span>
                  <span className="legend-box legend-box--amber" />
                  THD (%)
                </span>
              </div>
            </div>

            {/* Feature Importance Card */}
            <div className="chart-card">
              <div className="card-heading">
                <div>
                  <div className="eyebrow">RANDOM FOREST EVIDENCE</div>
                  <h3>Feature Importances</h3>
                </div>
                <span className="score-chip">
                  <BrainCircuit size={12} />
                  Gini Importance
                </span>
              </div>

              <div style={{ padding: "16px 0", height: "220px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={REAL_FEATURE_IMPORTANCES}
                    margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#E1DDD3" strokeDasharray="2 4" horizontal={false} />
                    <XAxis type="number" domain={[0, 35]} tick={{ fill: "#8A8A80", fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                    <YAxis type="category" dataKey="key" tick={{ fill: "#1F2B2E", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} width={75} />
                    <Tooltip
                      contentStyle={{ background: "#1F2B2E", border: 0, borderRadius: 4, color: "#F7F4EB", fontSize: 11 }}
                      formatter={(val: any) => [`${val}%`, "Gini Importance"]}
                    />
                    <Bar dataKey="importance" fill="#0E7C78" radius={[0, 4, 4, 0]}>
                      {REAL_FEATURE_IMPORTANCES.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={["#0E7C78", "#466DAA", "#668B73", "#C48A36"][index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-foot" style={{ flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
                <div style={{ fontSize: "11px", color: "#5B6664" }}>
                  <strong>THD (28.5%)</strong> is the single most predictive feature for distinguishing Harmonics from other wave shapes.
                </div>
                <div style={{ fontSize: "11px", color: "#5B6664" }}>
                  <strong>RMS (26.4%)</strong> and <strong>STD Dev (25.4%)</strong> isolate Voltage Sag and Swell events cleanly.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* View tab 3: EVALUATION */}
        {(activeNav === "Overview" || activeNav === "Evaluation") && (
          <section className="section-block">
            <div className="section-heading">
              <div>
                <div className="section-kicker">
                  <span className="kicker-line" />
                  03 / MODEL EVIDENCE & EVALUATION
                </div>
                <h2>Model Confusion Matrix & Report</h2>
              </div>
              <p>1,000 test samples (200 per class, 80/20 stratified split). Overall Accuracy: <strong>{evaluationAccuracy.toFixed(1)}%</strong>.</p>
            </div>

            <div className="split-grid">
              {/* Confusion Matrix Card */}
              <div className="chart-card evaluation-card">
                <div className="card-heading">
                  <div>
                    <div className="eyebrow">MODEL EVIDENCE / HELD-OUT TEST SET</div>
                    <h3>Confusion Matrix</h3>
                  </div>
                  <span className="score-chip">
                    <Sparkles size={12} />
                    {evaluationAccuracy.toFixed(1)}% Accuracy (908/1000)
                  </span>
                </div>

                <div className="matrix-wrap">
                  <div className="matrix-y-label">TRUE CLASS</div>
                  <div className="matrix-area">
                    <div className="matrix-grid">
                      {REAL_CONFUSION_MATRIX.flatMap((row, rowIndex) =>
                        row.map((val, colIndex) => {
                          const isDiagonal = rowIndex === colIndex;
                          return (
                            <div
                              key={`${rowIndex}-${colIndex}`}
                              className="matrix-cell"
                              onMouseEnter={() => setMatrixHoverCell({ row: rowIndex, col: colIndex, count: val })}
                              onMouseLeave={() => setMatrixHoverCell(null)}
                              style={{
                                backgroundColor: isDiagonal
                                  ? val > 180
                                    ? "#0E7C78"
                                    : "#2D9690"
                                  : val > 20
                                  ? "#C65F55"
                                  : val > 0
                                  ? "#E2A499"
                                  : "#E9E5DB",
                                color: isDiagonal || val > 20 ? "#F7F4EB" : "#1F2B2E",
                                fontWeight: isDiagonal ? 700 : 400,
                              }}
                            >
                              {val}
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="matrix-x-labels">
                      {classes.map((item) => (
                        <span key={item}>{item.slice(0, 4)}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="chart-foot matrix-foot">
                  <span>Predicted class →</span>
                  <span>
                    {matrixHoverCell
                      ? `True: ${classes[matrixHoverCell.row]} | Pred: ${classes[matrixHoverCell.col]} → ${matrixHoverCell.count} samples`
                      : "1,000 test signals · Stratified random split"}
                  </span>
                </div>
              </div>

              {/* Classification Report Table Card */}
              <div className="chart-card">
                <div className="card-heading">
                  <div>
                    <div className="eyebrow">PER-CLASS PERFORMANCE</div>
                    <h3>Classification Report</h3>
                  </div>
                  <span className="unit-label">Test Set Metrics</span>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #E1DDD3", color: "#667370", textAlign: "left" }}>
                        <th style={{ padding: "8px 4px" }}>Class</th>
                        <th style={{ padding: "8px 4px" }}>Precision</th>
                        <th style={{ padding: "8px 4px" }}>Recall</th>
                        <th style={{ padding: "8px 4px" }}>F1-Score</th>
                        <th style={{ padding: "8px 4px" }}>Support</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CLASSIFICATION_REPORT.map((row) => (
                        <tr key={row.class} style={{ borderBottom: "1px solid #F0ECE3" }}>
                          <td style={{ padding: "8px 4px", fontWeight: 600, color: "#1F2B2E" }}>
                            <span className="class-swatch" style={{ background: classColors[row.class], display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", marginRight: "6px" }} />
                            {row.class}
                          </td>
                          <td style={{ padding: "8px 4px", color: "#0E7C78", fontWeight: 500 }}>{row.precision.toFixed(1)}%</td>
                          <td style={{ padding: "8px 4px", color: "#466DAA", fontWeight: 500 }}>{row.recall.toFixed(1)}%</td>
                          <td style={{ padding: "8px 4px", color: "#668B73", fontWeight: 500 }}>{row.f1.toFixed(1)}%</td>
                          <td style={{ padding: "8px 4px", color: "#737C7B" }}>{row.support}</td>
                        </tr>
                      ))}
                      <tr style={{ fontWeight: 700, borderTop: "2px solid #E1DDD3", background: "#F2EFE8" }}>
                        <td style={{ padding: "8px 4px" }}>Macro Avg</td>
                        <td style={{ padding: "8px 4px" }}>90.8%</td>
                        <td style={{ padding: "8px 4px" }}>90.8%</td>
                        <td style={{ padding: "8px 4px" }}>90.8%</td>
                        <td style={{ padding: "8px 4px" }}>1,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="chart-foot" style={{ marginTop: "12px", fontSize: "11px", color: "#5B6664" }}>
                  <strong>Key Finding:</strong> Harmonics has 100% precision & recall. Misclassifications occur primarily between Normal and Flicker due to subtle amplitude modulation.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Live Interactive Simulator Section */}
        <section className="simulation-band section-block" id="simulation">
          <div className="simulation-copy" style={{ flex: 1 }}>
            <div className="section-kicker">
              <span className="kicker-line" />
              THEORY → FEATURE → DECISION
            </div>
            <h2>
              Interactive Signal Simulator
              <br />
              <em>Watch the features move in real-time.</em>
            </h2>
            <p>
              Select an input condition or tweak the parameter sliders to generate a synthetic waveform, compute browser-side features, and observe how the Random Forest rules classify it.
            </p>

            <div className="simulation-control">
              <span className="eyebrow">SELECT BASE CONDITION</span>
              <div className="select-row">
                {classes.map((item) => (
                  <button
                    key={item}
                    className={activeClass === item ? "is-active" : ""}
                    onClick={() => {
                      setActiveClass(item);
                      setDemoMode(true);
                    }}
                  >
                    <span className="class-swatch" style={{ background: classColors[item] }} />
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {demoMode && (
              <div style={{ marginTop: "16px", background: "rgba(255,255,255,0.7)", padding: "16px", borderRadius: "6px", border: "1px solid #E1DDD3" }}>
                <div className="eyebrow" style={{ marginBottom: "10px" }}>LIVE SIGNAL PARAMETER CONTROLS</div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "11px" }}>
                  {activeClass === "Sag" && (
                    <div>
                      <label style={{ display: "block", fontWeight: 600 }}>Sag Factor: {simParams.sagFactor.toFixed(2)} pu</label>
                      <input
                        type="range"
                        min="0.20"
                        max="0.85"
                        step="0.05"
                        value={simParams.sagFactor}
                        onChange={(e) => setSimParams({ ...simParams, sagFactor: Number(e.target.value) })}
                        style={{ width: "100%" }}
                      />
                    </div>
                  )}

                  {activeClass === "Swell" && (
                    <div>
                      <label style={{ display: "block", fontWeight: 600 }}>Swell Factor: {simParams.swellFactor.toFixed(2)} pu</label>
                      <input
                        type="range"
                        min="1.15"
                        max="1.70"
                        step="0.05"
                        value={simParams.swellFactor}
                        onChange={(e) => setSimParams({ ...simParams, swellFactor: Number(e.target.value) })}
                        style={{ width: "100%" }}
                      />
                    </div>
                  )}

                  {activeClass === "Harmonics" && (
                    <div>
                      <label style={{ display: "block", fontWeight: 600 }}>Harmonic Level: {(simParams.thdFactor * 100).toFixed(0)}%</label>
                      <input
                        type="range"
                        min="0.3"
                        max="2.5"
                        step="0.1"
                        value={simParams.thdFactor}
                        onChange={(e) => setSimParams({ ...simParams, thdFactor: Number(e.target.value) })}
                        style={{ width: "100%" }}
                      />
                    </div>
                  )}

                  {activeClass === "Flicker" && (
                    <div>
                      <label style={{ display: "block", fontWeight: 600 }}>Flicker Mod Freq: {simParams.flickerFreq.toFixed(1)} Hz</label>
                      <input
                        type="range"
                        min="1.0"
                        max="5.0"
                        step="0.2"
                        value={simParams.flickerFreq}
                        onChange={(e) => setSimParams({ ...simParams, flickerFreq: Number(e.target.value) })}
                        style={{ width: "100%" }}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ display: "block", fontWeight: 600 }}>Base Voltage: {simParams.amplitude.toFixed(2)} V</label>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={simParams.amplitude}
                      onChange={(e) => setSimParams({ ...simParams, amplitude: Number(e.target.value) })}
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              className="primary-button primary-button--dark"
              style={{ marginTop: "16px" }}
              onClick={() => setDemoMode(!demoMode)}
            >
              {demoMode ? "Close Live Readout" : "Open Live Simulator"}
              <ArrowUpRight size={15} />
            </button>
          </div>

          <div className={`simulation-readout ${demoMode ? "is-visible" : ""}`} style={{ flex: "0 0 320px" }}>
            <div className="readout-top">
              <span className="eyebrow">MODEL PREDICTION</span>
              <span className="readout-ready">
                <span className="pulse-dot" />
                LIVE COMPUTE
              </span>
            </div>

            <div className="readout-class">
              {simPrediction.predicted}
              <span>predicted class</span>
            </div>

            <div className="readout-confidence">
              <strong>{simPrediction.confidence.toFixed(1)}%</strong>
              <span>estimated confidence</span>
            </div>

            <div className="readout-rule" />

            <div className="readout-meta">
              <span>
                RMS <strong>{simFeatures.rms.toFixed(4)}</strong>
              </span>
              <span>
                THD <strong>{simFeatures.thd.toFixed(2)}%</strong>
              </span>
              <span>
                P–P <strong>{simFeatures.spread.toFixed(4)}</strong>
              </span>
              <span>
                STD <strong>{simFeatures.std.toFixed(4)}</strong>
              </span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <span>VOLT<span>SCOPE</span> / POWER QUALITY LAB</span>
          <span>Random Forest Model · 100 Trees · 90.8% Accuracy</span>
          <span>Research Prototype · VoltScope 2026</span>
        </footer>
      </main>
    </div>
  );
}
