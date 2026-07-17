import React, { useState, useEffect } from 'react';
import { Play, StepForward, RotateCcw, CheckCircle2, Sparkles, MessageCircle, Loader2, Building2, UserPlus, RefreshCw } from 'lucide-react';

const nodes = {
  csp: { x: 50, y: 6, label: 'External CSP', sub: 'Communication Service Provider', category: 'external' },
  nginx: { x: 50, y: 19, label: 'NGINX Gateway', sub: 'Load Balancer & Router', category: 'gateway' },
  onboarding: { x: 20, y: 36, label: 'Onboarding', sub: 'api/v3/onboarding', category: 'core' },
  syncentities: { x: 50, y: 36, label: 'Syncentities', sub: 'api/v3/syncentities', category: 'core' },
  tenantmgmt: { x: 80, y: 36, label: 'Tenant Mgmt', sub: 'api/v3/tenantmanagement', category: 'core' },
  auth: { x: 92, y: 26, label: 'Auth', sub: 'Authorization Svc', category: 'auth' },
  orchestration: { x: 20, y: 56, label: 'Orchestration', sub: 'Plan Execution Engine', category: 'orchestration' },
  catalog: { x: 50, y: 56, label: 'Catalog Proxy', sub: 'Product Templates', category: 'proxy' },
  charging: { x: 80, y: 56, label: 'Charging Proxy', sub: 'Billing Specs', category: 'proxy' },
  ordering: { x: 80, y: 74, label: 'Ordering', sub: 'Orders & Subscriptions', category: 'proxy' },
  kafka: { x: 20, y: 74, label: 'Kafka', sub: 'Event Streaming', category: 'infra' },
  database: { x: 50, y: 74, label: 'Database', sub: 'PostgreSQL', category: 'infra' },
};

const categoryColors = {
  external: { bg: 'bg-slate-700', border: 'border-slate-500', text: 'text-slate-200', glow: 'node-active-blue' },
  gateway: { bg: 'bg-cyan-900/80', border: 'border-cyan-500', text: 'text-cyan-200', glow: 'node-active-emerald' },
  core: { bg: 'bg-blue-900/80', border: 'border-blue-500', text: 'text-blue-200', glow: 'node-active-blue' },
  auth: { bg: 'bg-rose-900/80', border: 'border-rose-500', text: 'text-rose-200', glow: 'node-active-purple' },
  orchestration: { bg: 'bg-amber-900/80', border: 'border-amber-500', text: 'text-amber-200', glow: 'node-active-amber' },
  proxy: { bg: 'bg-orange-900/80', border: 'border-orange-500', text: 'text-orange-200', glow: 'node-active-amber' },
  infra: { bg: 'bg-purple-900/80', border: 'border-purple-500', text: 'text-purple-200', glow: 'node-active-purple' },
};

const workflows = {
  supplier: {
    title: "Supplier Onboarding",
    subtitle: "CSP registers as supplier → Sync Tenant provisioned",
    icon: <Building2 className="w-4 h-4" />,
    steps: [
      { from: 'csp', to: 'nginx', title: 'CSP Sends Onboarding Request', description: 'The external CSP sends POST /api/v3/onboarding/onboard_supplier through the NGINX gateway to register as a supplier in the LFAMP ecosystem.', details: { API: 'POST /onboard_supplier', Payload: 'Supplier entity, operator config, integration params' } },
      { from: 'nginx', to: 'onboarding', title: 'Request Routed to Onboarding', description: 'NGINX load balancer routes the request to the Onboarding Service based on the /api/v3/onboarding path prefix.', details: { Routing: 'Path-based → Onboarding Pod', Auth: 'Bearer token passed in header' } },
      { from: 'onboarding', to: 'auth', title: 'Token Validation', description: 'The Onboarding Service validates the caller\'s Bearer token against the Authorization Service before processing.', details: { Service: 'Authorization Service', Action: 'Validate Bearer token, check permissions', Result: 'Token valid → proceed; Invalid → 401' } },
      { from: 'onboarding', to: 'tenantmgmt', title: 'Create Sync Tenant', description: 'Onboarding instructs Tenant Management to create a Sync Tenant — the integration proxy layer that lets the CSP connect without being a full LF customer.', details: { API: 'POST /tenant/create', Type: 'Sync Tenant (Integration Proxy)', Naming: 'sync_l1csp{N}_{id}', Parent: 'Under Aggregator Tenant' } },
      { from: 'tenantmgmt', to: 'orchestration', title: 'Execute Provisioning Plan', description: 'Tenant Management triggers the Orchestration Engine to execute the supplier_sync_tenant_provisioning plan — a multi-step infrastructure setup.', details: { Plan: 'supplier_sync_tenant_provisioning', Steps: 'Create config → Provision endpoints → Setup Kafka → Configure proxies' } },
      { from: 'orchestration', to: 'kafka', title: 'Provision Infrastructure', description: 'The orchestration plan provisions Kafka event topics, database schemas, and proxy configurations for the new sync tenant.', details: { Kafka: 'Sync event topics created', Database: 'Tenant schema provisioned', Proxies: 'Catalog + Charging configured' } },
      { from: 'orchestration', to: 'database', title: 'Persist Tenant State', description: 'Tenant state and configuration are persisted to the database. The sync tenant is now marked as ACTIVE.', details: { Action: 'Write tenant config to DB', Status: 'Sync Tenant → ACTIVE', Schema: 'Tenant-specific tables created' } },
      { from: 'onboarding', to: 'csp', title: 'Return Sync Tenant Config', description: 'The Onboarding Service returns the full sync tenant configuration to the CSP. The supplier can now use POST /api/v3/syncentities/sync to push data.', details: { Response: '201 Created', Body: 'Tenant ID, endpoints, credentials', 'CSP Can Now': 'Sync catalog & charging entities' } },
    ]
  },
  customer: {
    title: "Customer Onboarding",
    subtitle: "Supplier registers customer → Business Tenant created",
    icon: <UserPlus className="w-4 h-4" />,
    steps: [
      { from: 'csp', to: 'nginx', title: 'Supplier Sends Customer Request', description: 'A Supplier operating on their Sync Tenant sends POST /onboard_customer to register a new customer (Business Tenant).', details: { API: 'POST /api/v3/onboarding/onboard_customer', Payload: 'supplierId, aggregatorOperatorName, customer org data' } },
      { from: 'nginx', to: 'onboarding', title: 'Route to Onboarding', description: 'NGINX routes the customer onboarding request to the Onboarding Service.', details: { Validation: 'Supplier must have an ACTIVE Sync Tenant' } },
      { from: 'onboarding', to: 'auth', title: 'Validate Supplier Token', description: 'Authorization Service confirms the supplier has permission to onboard customers under their Sync Tenant.', details: { Check: 'Token valid + supplier has onboarding rights', Scope: 'Scoped to supplier\'s Sync Tenant' } },
      { from: 'onboarding', to: 'tenantmgmt', title: 'Register Business Tenant', description: 'Onboarding registers the customer as a new Business Tenant under the supplier\'s Sync Tenant — completing the three-tier hierarchy.', details: { 'Tenant Type': 'Business Tenant', Hierarchy: 'Aggregator → Sync Tenant → Business Tenant', 'Managed By': 'CSP-managed or LF-managed' } },
      { from: 'tenantmgmt', to: 'ordering', title: 'Create Subscriptions', description: 'Tenant Management instructs the Ordering Service to create initial orders and subscriptions from the supplier\'s catalog.', details: { Service: 'Ordering Service', Action: 'Create initial orders from catalog', Events: 'Order events → Kafka' } },
      { from: 'tenantmgmt', to: 'database', title: 'Persist Customer', description: 'Customer entity and subscription data are persisted to the database.', details: { Action: 'Write Business Tenant + orders to DB', Status: 'Business Tenant → ACTIVE' } },
      { from: 'onboarding', to: 'csp', title: 'Customer Registered', description: 'Response returned to the supplier with the customer\'s Business Tenant details. Customer can now access subscribed services.', details: { Response: '201 Created', Body: 'Customer tenant ID, subscription details' } },
    ]
  },
  sync: {
    title: "Entity Synchronization",
    subtitle: "Sync catalog & charging entities between tenants",
    icon: <RefreshCw className="w-4 h-4" />,
    steps: [
      { from: 'csp', to: 'nginx', title: 'Client Sends Sync Request', description: 'An API client (CSP via Sync Tenant) sends a sync request specifying source tenant, destination, and entity filters.', details: { API: 'POST /api/v3/syncentities/sync', Payload: 'source_tenant, source_address, destination, filters' } },
      { from: 'nginx', to: 'syncentities', title: 'Route to Syncentities', description: 'NGINX routes the sync request to the Syncentities Service which manages all entity synchronization logic.', details: { Service: 'Syncentities Manager', Alt: '/full_sync, /resolve_aggregation' } },
      { from: 'syncentities', to: 'auth', title: 'Validate Permissions', description: 'Syncentities validates the caller has sync permissions for both source and destination tenants.', details: { Check: 'Bearer token + tenant access rights', Scope: 'Source AND destination tenant access required' } },
      { from: 'syncentities', to: 'catalog', title: 'Fetch Catalog Entities', description: 'The Catalog Proxy fetches product catalog templates from BOTH source and destination tenants for diffing.', details: { Action: 'GET source catalog + GET destination catalog', Data: 'Product templates, offerings, specifications' } },
      { from: 'syncentities', to: 'charging', title: 'Fetch Charging Entities', description: 'The Charging Proxy fetches charging specifications from both tenants for comparison.', details: { Action: 'GET source charging + GET destination charging', Data: 'Pricing specs, billing rules, rate cards' } },
      { from: 'syncentities', to: 'orchestration', title: 'Execute Sync Plan', description: 'After computing the diff and building sync actions, Syncentities hands the execution plan to the Orchestration Engine.', details: { Plan: 'Ordered CREATE/UPDATE/DELETE actions', Ordering: 'Dependency-aware (parents before children)', Execution: 'Atomic per-action with rollback' } },
      { from: 'orchestration', to: 'database', title: 'Apply Changes', description: 'The Orchestration Engine applies all entity changes to the destination tenant and persists execution state.', details: { Writes: 'Destination catalog + charging updated', State: 'Execution log persisted', Events: 'Each change → Kafka audit trail' } },
      { from: 'syncentities', to: 'csp', title: 'Sync Complete', description: 'Response returned with full action summary — entities created, updated, and removed. Audit trail available via Kafka.', details: { Response: '200 OK', Body: 'Action summary: created/updated/deleted counts', Audit: 'Full event trail in Kafka topic' } },
    ]
  }
};

export default function ArchitectureSimulator() {
  const [activeWorkflow, setActiveWorkflow] = useState('supplier');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedConnections, setCompletedConnections] = useState([]);
  const [packetPos, setPacketPos] = useState(null);
  const [showPacket, setShowPacket] = useState(false);

  const [aiExplanations, setAiExplanations] = useState({});
  const [isGeneratingEli5, setIsGeneratingEli5] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatAnswers, setChatAnswers] = useState({});
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);

  const workflow = workflows[activeWorkflow];
  const steps = workflow.steps;
  const activeStepData = currentStep > 0 ? steps[currentStep - 1] : null;

  useEffect(() => {
    if (activeStepData) {
      const fromNode = nodes[activeStepData.from];
      const toNode = nodes[activeStepData.to];
      setPacketPos({ x: fromNode.x, y: fromNode.y });
      setShowPacket(true);
      const timer = setTimeout(() => {
        setPacketPos({ x: toNode.x, y: toNode.y });
      }, 100);
      const hideTimer = setTimeout(() => {
        setShowPacket(false);
        setCompletedConnections(prev => [...prev, `${activeStepData.from}-${activeStepData.to}`]);
      }, 1600);
      return () => { clearTimeout(timer); clearTimeout(hideTimer); };
    }
  }, [currentStep, activeWorkflow]);

  const generateText = async (prompt) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    if (!apiKey) return "⚠️ API key not configured. Add VITE_GEMINI_API_KEY secret to the repo.";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
          body: JSON.stringify(payload)
        });
        if (response.status === 429) return "⏳ Rate limit reached — wait a moment and try again.";
        if (response.status === 503 || response.status === 403) {
          if (attempt < 2) { await new Promise(r => setTimeout(r, 2000)); continue; }
          return "⏳ Gemini unavailable — try again shortly.";
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
      } catch (error) {
        if (attempt < 2) { await new Promise(r => setTimeout(r, 2000)); continue; }
        return `Error: ${error.message}`;
      }
    }
  };

  const handleGenerateEli5 = async (step) => {
    setIsGeneratingEli5(true);
    const prompt = `You are explaining the LFAMP (LF API Marketplace) architecture. Explain this step in simple terms (ELI5) with an analogy. 2-3 sentences max.\n\nWorkflow: ${workflow.title}\nStep: ${step.title}\nFrom: ${nodes[step.from].label} → To: ${nodes[step.to].label}\nDescription: ${step.description}`;
    const text = await generateText(prompt);
    setAiExplanations(prev => ({ ...prev, [`${activeWorkflow}-${currentStep}`]: text }));
    setIsGeneratingEli5(false);
  };

  const handleAskQuestion = async (step) => {
    if (!chatInput.trim()) return;
    setIsGeneratingAnswer(true);
    const prompt = `You are an LFAMP (LF API Marketplace) architecture expert. Multi-tenant telecom API marketplace: Lua, Kubernetes, Kafka, PostgreSQL. Three-tier model: Aggregator → Sync Tenant → Business Tenant.\n\nCurrent step: ${step.title}\nFrom: ${nodes[step.from].label} → To: ${nodes[step.to].label}\nContext: ${step.description}\n\nQuestion: ${chatInput}\n\nAnswer in 2-4 sentences. Reference real LFAMP services.`;
    const text = await generateText(prompt);
    setChatAnswers(prev => ({ ...prev, [`${activeWorkflow}-${currentStep}`]: { q: chatInput, a: text } }));
    setChatInput("");
    setIsGeneratingAnswer(false);
  };

  const switchWorkflow = (wf) => { setActiveWorkflow(wf); setCurrentStep(0); setIsPlaying(false); setCompletedConnections([]); setShowPacket(false); };
  const startSimulation = () => { setIsPlaying(true); setCurrentStep(1); setCompletedConnections([]); };
  const nextStep = () => { if (currentStep < steps.length) setCurrentStep(currentStep + 1); else setIsPlaying(false); };
  const resetSimulation = () => { setIsPlaying(false); setCurrentStep(0); setCompletedConnections([]); setShowPacket(false); };

  const isNodeActive = (nodeId) => {
    if (!activeStepData) return false;
    return activeStepData.from === nodeId || activeStepData.to === nodeId;
  };

  const isConnectionCompleted = (fromId, toId) => completedConnections.includes(`${fromId}-${toId}`);

  const aiKey = `${activeWorkflow}-${currentStep}`;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">

        {/* Header + Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">LFAMP Architecture Simulator</h1>
            <p className="text-xs text-slate-400">LF API Marketplace — Multi-Tenant Provisioning Flows</p>
          </div>
          <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
            {Object.entries(workflows).map(([key, wf]) => (
              <button
                key={key}
                onClick={() => switchWorkflow(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all
                  ${activeWorkflow === key ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                {wf.icon} {wf.title}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between bg-slate-900/50 rounded-xl border border-slate-800 px-4 py-3">
          <div>
            <span className="text-sm font-medium text-slate-200">{workflow.title}</span>
            <span className="text-xs text-slate-500 ml-3">{workflow.subtitle}</span>
          </div>
          <div className="flex gap-2">
            {!isPlaying && currentStep === 0 && (
              <button onClick={startSimulation} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors">
                <Play className="w-3.5 h-3.5" /> Start
              </button>
            )}
            {isPlaying && currentStep <= steps.length && (
              <button onClick={nextStep} className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-900 px-4 py-2 rounded-lg text-xs font-medium transition-colors">
                {currentStep === steps.length ? <CheckCircle2 className="w-3.5 h-3.5" /> : <StepForward className="w-3.5 h-3.5" />}
                {currentStep === steps.length ? "Done" : `Step ${currentStep}/${steps.length}`}
              </button>
            )}
            {currentStep > 0 && (
              <button onClick={resetSimulation} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-xs font-medium transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Architecture Diagram */}
        <div className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-2xl border border-slate-800 overflow-hidden" style={{ height: '420px' }}>
          {/* Layer labels */}
          <div className="absolute left-2 top-2 text-[9px] text-slate-600 uppercase tracking-wider">External</div>
          <div className="absolute left-2 top-[16%] text-[9px] text-slate-600 uppercase tracking-wider">Gateway</div>
          <div className="absolute left-2 top-[32%] text-[9px] text-slate-600 uppercase tracking-wider">Core Services</div>
          <div className="absolute left-2 top-[52%] text-[9px] text-slate-600 uppercase tracking-wider">Integration</div>
          <div className="absolute left-2 top-[70%] text-[9px] text-slate-600 uppercase tracking-wider">Data Layer</div>

          {/* SVG Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            {/* Draw all possible connections as faint lines */}
            {steps.map((step, i) => {
              const from = nodes[step.from];
              const to = nodes[step.to];
              const isActive = currentStep - 1 === i;
              const isCompleted = isConnectionCompleted(step.from, step.to);
              return (
                <line
                  key={i}
                  x1={`${from.x}%`} y1={`${from.y}%`}
                  x2={`${to.x}%`} y2={`${to.y}%`}
                  stroke={isActive ? '#3b82f6' : isCompleted ? '#1e40af' : 'transparent'}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  strokeOpacity={isActive ? 1 : isCompleted ? 0.5 : 0}
                  className={isActive ? 'connection-active' : ''}
                />
              );
            })}
            {/* Packet dot */}
            {showPacket && packetPos && (
              <circle
                className="packet-dot"
                cx={`${packetPos.x}%`}
                cy={`${packetPos.y}%`}
                r="5"
                fill="#60a5fa"
                filter="url(#glow)"
              />
            )}
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
          </svg>

          {/* Nodes */}
          {Object.entries(nodes).map(([id, node]) => {
            const colors = categoryColors[node.category];
            const active = isNodeActive(id);
            return (
              <div
                key={id}
                className={`absolute node-box flex flex-col items-center justify-center text-center rounded-lg border px-2 py-1.5
                  ${colors.bg} ${colors.border} ${colors.text}
                  ${active ? colors.glow : 'opacity-60'}
                `}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: active ? 10 : 2,
                  minWidth: '90px',
                }}
              >
                <span className="text-[10px] font-bold leading-tight">{node.label}</span>
                <span className="text-[8px] opacity-70 leading-tight">{node.sub}</span>
              </div>
            );
          })}

          {/* Tenant Hierarchy Inset */}
          <div className="absolute bottom-3 right-3 bg-slate-800/80 border border-slate-700 rounded-lg p-2.5 text-[9px] backdrop-blur-sm" style={{ zIndex: 5 }}>
            <div className="text-slate-400 font-bold uppercase tracking-wider mb-1.5">Tenant Hierarchy</div>
            <div className="flex items-center gap-1.5">
              <span className="bg-red-900/60 border border-red-700 text-red-300 px-1.5 py-0.5 rounded">Aggregator</span>
              <span className="text-slate-500">→</span>
              <span className="bg-teal-900/60 border border-teal-700 text-teal-300 px-1.5 py-0.5 rounded">Sync Tenant</span>
              <span className="text-slate-500">→</span>
              <span className="bg-emerald-900/60 border border-emerald-700 text-emerald-300 px-1.5 py-0.5 rounded">Business</span>
            </div>
          </div>

          {/* Step indicator overlay */}
          {activeStepData && (
            <div className="absolute top-3 right-3 bg-blue-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm" style={{ zIndex: 5 }}>
              Step {currentStep} / {steps.length}
            </div>
          )}
        </div>

        {/* Details Panel */}
        {activeStepData && (
          <div className="detail-panel bg-slate-900/80 rounded-xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-blue-900/50 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full font-medium">
                    {nodes[activeStepData.from].label} → {nodes[activeStepData.to].label}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{activeStepData.title}</h3>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed max-w-2xl">{activeStepData.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(activeStepData.details).map(([key, value]) => (
                <div key={key} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-2.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{key}</div>
                  <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">{value}</div>
                </div>
              ))}
            </div>

            {/* AI Section */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> AI Assistant
                </span>
                {!aiExplanations[aiKey] && (
                  <button onClick={() => handleGenerateEli5(activeStepData)} disabled={isGeneratingEli5}
                    className="text-[10px] bg-indigo-900/50 hover:bg-indigo-800/50 text-indigo-300 border border-indigo-700/50 px-2.5 py-1 rounded-md flex items-center gap-1 disabled:opacity-40">
                    {isGeneratingEli5 ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Simplify
                  </button>
                )}
              </div>
              {aiExplanations[aiKey] && (
                <div className="bg-indigo-950/50 border border-indigo-800/50 rounded-lg p-3 text-xs text-indigo-200 leading-relaxed">
                  {aiExplanations[aiKey]}
                </div>
              )}
              {chatAnswers[aiKey] && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-xs space-y-1.5">
                  <div className="text-slate-400"><span className="text-slate-500">Q:</span> {chatAnswers[aiKey].q}</div>
                  <div className="text-slate-200"><span className="text-indigo-400">A:</span> {chatAnswers[aiKey].a}</div>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion(activeStepData)}
                  placeholder="Ask about this step..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={() => handleAskQuestion(activeStepData)}
                  disabled={isGeneratingAnswer || !chatInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:text-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {isGeneratingAnswer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />} Ask
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Idle state */}
        {currentStep === 0 && (
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6 text-center">
            <p className="text-sm text-slate-400">Click <strong>Start</strong> to watch data flow through the LFAMP architecture for the <strong>{workflow.title}</strong> workflow.</p>
            <div className="flex gap-2 mt-3 flex-wrap justify-center">
              {steps.map((s, i) => (
                <span key={i} className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-1 rounded">
                  {i + 1}. {s.title}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="text-center text-[10px] text-slate-600 py-1">
          LFAMP — Aggregator → Sync Tenant → Business Tenant | Lua • Kubernetes • Kafka • PostgreSQL
        </div>
      </div>
  );
}
