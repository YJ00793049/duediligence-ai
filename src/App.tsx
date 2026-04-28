import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import './App.css'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

interface DDReport {
  company: string
  ticker: string
  sector: string
  recommendation: string
  confidence: number
  target_price: string
  current_price: string
  upside: string
  executive_summary: string
  scores: {
    financial_health: number
    growth_potential: number
    competitive_moat: number
    management_quality: number
    risk_profile: number
    valuation: number
  }
  financials: {
    revenue: string
    revenue_growth: string
    net_income: string
    margin: string
    debt_equity: string
    cash: string
  }
  bull_case: string[]
  bear_case: string[]
  key_risks: { risk: string; severity: string }[]
  checklist: { item: string; status: string; note: string }[]
}

async function runDueDiligence(text: string): Promise<DDReport> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `You are a managing director at Goldman Sachs conducting institutional due diligence. Analyze this document and return ONLY a JSON object, no other text.

Return this exact structure:
{
  "company": "<company name>",
  "ticker": "<ticker symbol or N/A>",
  "sector": "<sector>",
  "recommendation": "<Strong Buy|Buy|Hold|Sell|Strong Sell>",
  "confidence": <0-100>,
  "target_price": "<price or N/A>",
  "current_price": "<price or N/A>",
  "upside": "<percentage upside or N/A>",
  "executive_summary": "<3-4 sentence institutional-grade summary>",
  "scores": {
    "financial_health": <0-100>,
    "growth_potential": <0-100>,
    "competitive_moat": <0-100>,
    "management_quality": <0-100>,
    "risk_profile": <0-100>,
    "valuation": <0-100>
  },
  "financials": {
    "revenue": "<value>",
    "revenue_growth": "<YoY %>",
    "net_income": "<value>",
    "margin": "<net margin %>",
    "debt_equity": "<ratio>",
    "cash": "<value>"
  },
  "bull_case": ["<point 1>", "<point 2>", "<point 3>"],
  "bear_case": ["<point 1>", "<point 2>", "<point 3>"],
  "key_risks": [
    {"risk": "<risk name>", "severity": "<High|Medium|Low>"}
  ],
  "checklist": [
    {"item": "Revenue Growth", "status": "<Pass|Fail|Warning>", "note": "<brief note>"},
    {"item": "Profit Margins", "status": "<Pass|Fail|Warning>", "note": "<brief note>"},
    {"item": "Debt Levels", "status": "<Pass|Fail|Warning>", "note": "<brief note>"},
    {"item": "Cash Position", "status": "<Pass|Fail|Warning>", "note": "<brief note>"},
    {"item": "Competitive Position", "status": "<Pass|Fail|Warning>", "note": "<brief note>"},
    {"item": "Management Track Record", "status": "<Pass|Fail|Warning>", "note": "<brief note>"},
    {"item": "Valuation", "status": "<Pass|Fail|Warning>", "note": "<brief note>"},
    {"item": "Market Opportunity", "status": "<Pass|Fail|Warning>", "note": "<brief note>"}
  ]
}

Document:
${text.slice(0, 14000)}`
      }]
    })
  })
  const data = await response.json()
  const clean = data.content[0].text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

const STEPS = ['Upload', 'Analysis', 'Report']

export default function App() {
  const [step, setStep] = useState(0)
  const [report, setReport] = useState<DDReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [activeSection, setActiveSection] = useState('overview')

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setFileName(file.name)
    setStep(1)
    setLoading(true)
    setError('')
    try {
      const text = await file.text()
      const result = await runDueDiligence(text)
      setReport(result)
      setStep(2)
    } catch (e) {
      setError('Analysis failed. Please try again.')
      setStep(0)
    }
    setLoading(false)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.txt'], 'text/html': ['.html', '.htm'], 'text/csv': ['.csv'] },
    maxFiles: 1
  })

  const getRecColor = (rec: string) => {
    if (rec?.includes('Buy')) return '#00C853'
    if (rec?.includes('Sell')) return '#FF1744'
    return '#FFB300'
  }

  const getStatusColor = (s: string) => s === 'Pass' ? '#00C853' : s === 'Fail' ? '#FF1744' : '#FFB300'
  const getSevColor = (s: string) => s === 'High' ? '#FF1744' : s === 'Medium' ? '#FFB300' : '#00C853'

  const radarData = report ? [
    { subject: 'Financial', value: report.scores.financial_health },
    { subject: 'Growth', value: report.scores.growth_potential },
    { subject: 'Moat', value: report.scores.competitive_moat },
    { subject: 'Management', value: report.scores.management_quality },
    { subject: 'Risk', value: report.scores.risk_profile },
    { subject: 'Valuation', value: report.scores.valuation },
  ] : []

  const barData = report ? [
    { name: 'Financial', score: report.scores.financial_health },
    { name: 'Growth', score: report.scores.growth_potential },
    { name: 'Moat', score: report.scores.competitive_moat },
    { name: 'Mgmt', score: report.scores.management_quality },
    { name: 'Risk', score: report.scores.risk_profile },
    { name: 'Value', score: report.scores.valuation },
  ] : []

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-icon">◈</span>
          <div>
            <div className="sidebar-title">DueDiligenceAI</div>
            <div className="sidebar-sub">by Artificio</div>
          </div>
        </div>

        <div className="sidebar-steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`sidebar-step ${step >= i ? 'active' : ''} ${step === i ? 'current' : ''}`}>
              <div className="step-dot">{step > i ? '✓' : i + 1}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>

        {report && (
          <nav className="sidebar-nav">
            {['overview', 'financials', 'scorecard', 'risks', 'checklist'].map(sec => (
              <button
                key={sec}
                className={`nav-item ${activeSection === sec ? 'nav-active' : ''}`}
                onClick={() => setActiveSection(sec)}
              >
                {sec.charAt(0).toUpperCase() + sec.slice(1)}
              </button>
            ))}
          </nav>
        )}

        <div className="sidebar-footer">Built by Yuvraj Jindal<br />Artificio AI Internship</div>
      </aside>

      <main className="content">
        {step === 0 && (
          <div className="upload-screen">
            <div className="upload-heading">
              <h1>Institutional Due Diligence</h1>
              <p>Upload a company's 10-K, annual report, or financial filing. Get a Goldman Sachs-style investment report in seconds.</p>
            </div>
            <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'drag' : ''}`}>
              <input {...getInputProps()} />
              <div className="upload-icon">⬆</div>
              <div className="upload-text">Drop your document here</div>
              <div className="upload-sub">TXT · HTML · CSV · Annual Reports · 10-K filings</div>
              <button className="upload-btn">Choose File</button>
            </div>
            <div className="how-to">
              <div className="how-title">How to get the best results</div>
              <div className="how-steps">
                <div className="how-step"><span>1</span>Go to sec.gov and find the company's 10-K filing</div>
                <div className="how-step"><span>2</span>Open the .htm file and save as "Web Page, HTML Only"</div>
                <div className="how-step"><span>3</span>Upload here for institutional-grade due diligence</div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && loading && (
          <div className="analyzing-screen">
            <div className="analyzing-spinner" />
            <h2>Running Due Diligence</h2>
            <p>Analyzing {fileName}...</p>
            <div className="analyzing-steps">
              <div className="a-step">✓ Document parsed</div>
              <div className="a-step a-active">⟳ Running financial analysis...</div>
              <div className="a-step a-pending">○ Generating investment report</div>
            </div>
          </div>
        )}

        {error && <div className="error-box">{error}</div>}

        {step === 2 && report && (
          <div className="report-screen">
            <div className="report-topbar">
              <div>
                <div className="report-company">{report.company}</div>
                <div className="report-meta">{report.ticker} · {report.sector}</div>
              </div>
              <div className="report-rec" style={{ color: getRecColor(report.recommendation), borderColor: getRecColor(report.recommendation) }}>
                {report.recommendation}
                <span className="rec-conf">{report.confidence}% confidence</span>
              </div>
            </div>

            {activeSection === 'overview' && (
              <div className="section">
                <div className="section-title">Executive Summary</div>
                <p className="exec-summary">{report.executive_summary}</p>

                <div className="price-row">
                  <div className="price-card">
                    <div className="price-label">Current Price</div>
                    <div className="price-val">{report.current_price}</div>
                  </div>
                  <div className="price-card">
                    <div className="price-label">Target Price</div>
                    <div className="price-val green">{report.target_price}</div>
                  </div>
                  <div className="price-card">
                    <div className="price-label">Upside</div>
                    <div className="price-val green">{report.upside}</div>
                  </div>
                </div>

                <div className="bull-bear">
                  <div className="bull-card">
                    <div className="bb-title">🟢 Bull Case</div>
                    {report.bull_case.map((b, i) => <div key={i} className="bb-item bull-item">{b}</div>)}
                  </div>
                  <div className="bear-card">
                    <div className="bb-title">🔴 Bear Case</div>
                    {report.bear_case.map((b, i) => <div key={i} className="bb-item bear-item">{b}</div>)}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'financials' && (
              <div className="section">
                <div className="section-title">Financial Snapshot</div>
                <div className="fin-grid">
                  {Object.entries(report.financials).map(([k, v]) => (
                    <div key={k} className="fin-card">
                      <div className="fin-label">{k.replace(/_/g, ' ').toUpperCase()}</div>
                      <div className="fin-val">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'scorecard' && (
              <div className="section">
                <div className="section-title">Investment Scorecard</div>
                <div className="charts-row">
                  <div className="chart-box">
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 11 }} />
                        <Radar dataKey="value" stroke="#C9A84C" fill="#C9A84C" fillOpacity={0.15} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-box">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={barData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fill: '#555', fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" tick={{ fill: '#888', fontSize: 11 }} width={60} />
                        <Tooltip contentStyle={{ background: '#0F0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FFF' }} />
                        <Bar dataKey="score" fill="#C9A84C" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'risks' && (
              <div className="section">
                <div className="section-title">Key Risks</div>
                <div className="risks-list">
                  {report.key_risks.map((r, i) => (
                    <div key={i} className="risk-row">
                      <span className="risk-name">{r.risk}</span>
                      <span className="risk-badge" style={{ color: getSevColor(r.severity), borderColor: getSevColor(r.severity) }}>{r.severity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'checklist' && (
              <div className="section">
                <div className="section-title">Due Diligence Checklist</div>
                <div className="checklist">
                  {report.checklist.map((c, i) => (
                    <div key={i} className="check-row">
                      <div className="check-status" style={{ color: getStatusColor(c.status) }}>
                        {c.status === 'Pass' ? '✓' : c.status === 'Fail' ? '✗' : '⚠'}
                      </div>
                      <div className="check-item">{c.item}</div>
                      <div className="check-note">{c.note}</div>
                      <div className="check-badge" style={{ color: getStatusColor(c.status), borderColor: getStatusColor(c.status) }}>{c.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
