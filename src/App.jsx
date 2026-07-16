import React, { useState } from 'react';
import { Play, StepForward, RotateCcw, ShieldCheck, Key, UserCheck, CloudCog, CheckCircle2, Sparkles, MessageCircle, Loader2, AppWindow, Send, Download } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: "AppOwner Registration",
    plane: "Management Plane",
    icon: <UserCheck className="w-12 h-12 text-blue-500" />,
    description: "The AppOwner (ASP) gets registered on the Management Plane (MP) via TMF931. No credentials are generated at this stage.",
    details: {
      Actor: "ASP / Aduna Admin",
      Action: "Registers the Application Owner entity.",
      Credentials: "None generated."
    }
  },
  {
    id: 2,
    title: "App Registration",
    plane: "Management Plane",
    icon: <AppWindow className="w-12 h-12 text-indigo-500" />,
    description: "The Application is registered on the Management Plane under the approved AppOwner.",
    details: {
      Actor: "ASP via Aduna Portal",
      Action: "Registers the Application.",
      Context: "Establishes the app profile before credential generation."
    }
  },
  {
    id: 3,
    title: "MP-to-TP Notification",
    plane: "Inter-Plane Communication",
    icon: <Send className="w-12 h-12 text-emerald-500" />,
    description: "The MP sends a customer-related entity update event to inform the Traffic Plane (TP) of the new app context.",
    details: {
      Event: "Customer Entity Update",
      Source: "Management Plane (MP)",
      Destination: "Traffic Plane (TP)"
    }
  },
  {
    id: 4,
    title: "Credential Generation",
    plane: "Traffic Plane (Keycloak)",
    icon: <Key className="w-12 h-12 text-amber-500" />,
    description: "The TP Auth Server (Keycloak) generates and stores the credentials locally to process future runtime token validation.",
    details: {
      Actor: "Keycloak (TP Auth Server)",
      Action: "Generates App Credentials (e.g., Client ID/Secret).",
      Storage: "Stored securely in the TP for validating future runtime API calls."
    }
  },
  {
    id: 5,
    title: "The Handback (TP to MP)",
    plane: "Traffic Plane -> Management Plane",
    icon: <ShieldCheck className="w-12 h-12 text-teal-500" />,
    description: "The TP sends these credentials back to the MP, which securely stores them inside the canonical application record.",
    details: {
      Action: "Credential Sync",
      Destination: "MP Canonical Application Record",
      Validation: "TP keeps a copy to validate runtime API calls against these credentials."
    }
  },
  {
    id: 6,
    title: "Manual App Retrieval",
    plane: "Developer Portal",
    icon: <Download className="w-12 h-12 text-purple-500" />,
    description: "Credentials are NOT automatically pushed to the App or AppOwner. They must log into the Developer Self-Service Portal to manually retrieve them.",
    details: {
      Actor: "AppOwner (ASP)",
      Action: "Manual secure login to retrieve credentials.",
      Security: "Prevents credential interception via email or insecure auto-push pipelines."
    }
  }
];

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aiExplanations, setAiExplanations] = useState({});
  const [isGeneratingEli5, setIsGeneratingEli5] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatAnswers, setChatAnswers] = useState({});
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);

  const generateText = async (prompt) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.status === 429) return "⏳ Rate limit reached — please wait a moment and try again.";
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
    } catch (error) {
      return `Something went wrong: ${error.message}`;
    }
  };

  const handleGenerateEli5 = async (step) => {
    setIsGeneratingEli5(true);
    const prompt = `Explain the following technical architecture step in very simple, easy-to-understand terms (like ELI5) using an analogy if possible. Keep it to 2-3 sentences. \n\nTitle: ${step.title}\nDescription: ${step.description}\nDetails: ${JSON.stringify(step.details)}`;
    const text = await generateText(prompt);
    setAiExplanations(prev => ({ ...prev, [step.id]: text }));
    setIsGeneratingEli5(false);
  };

  const handleAskQuestion = async (step) => {
    if (!chatInput.trim()) return;
    setIsGeneratingAnswer(true);
    const prompt = `You are an expert cloud and telecom architect. The user is asking a question about this specific step in an authorization flow:\n\nTitle: ${step.title}\nDescription: ${step.description}\n\nUser Question: ${chatInput}\n\nAnswer the question clearly and concisely in 2-4 sentences. Explain any acronyms.`;
    const text = await generateText(prompt);
    setChatAnswers(prev => ({ ...prev, [step.id]: { question: chatInput, answer: text } }));
    setChatInput("");
    setIsGeneratingAnswer(false);
  };

  const startSimulation = () => { setIsPlaying(true); setCurrentStep(1); };
  const nextStep = () => {
    if (currentStep < steps.length) { setCurrentStep(currentStep + 1); }
    else { setIsPlaying(false); }
  };
  const resetSimulation = () => { setIsPlaying(false); setCurrentStep(0); };

  const activeStepData = currentStep > 0 ? steps[currentStep - 1] : null;

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">App Registration &amp; Credential Flow</h1>
            <p className="text-sm text-slate-500 mt-1">Management Plane to Traffic Plane Synchronization</p>
          </div>
          <div className="flex gap-3">
            {!isPlaying && currentStep === 0 && (
              <button onClick={startSimulation} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors">
                <Play className="w-4 h-4" /> Start Simulation
              </button>
            )}
            {isPlaying && currentStep <= steps.length && (
              <button onClick={nextStep} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium transition-colors">
                {currentStep === steps.length ? <CheckCircle2 className="w-4 h-4" /> : <StepForward className="w-4 h-4" />}
                {currentStep === steps.length ? "Finish" : "Next Step"}
              </button>
            )}
            {currentStep > 0 && (
              <button onClick={resetSimulation} className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg font-medium transition-colors">
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[400px] flex flex-col relative overflow-hidden">
          {currentStep === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <CloudCog className="w-20 h-20 text-slate-300 mb-2" />
              <h2 className="text-xl font-semibold text-slate-700">Ready to Initiate</h2>
              <p className="text-slate-500 max-w-md">Click start to step through the App Registration flow, exploring how credentials are generated in the Traffic Plane, synced back to the Management Plane, and manually retrieved.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-10 relative">
                <div className="absolute left-0 top-1/2 w-full h-0.5 bg-slate-100 -z-10 transform -translate-y-1/2"></div>
                <div
                  className="absolute left-0 top-1/2 h-0.5 bg-blue-500 -z-10 transform -translate-y-1/2 transition-all duration-500 ease-in-out"
                  style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                ></div>
                {steps.map((step) => (
                  <div key={step.id} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-2 ${currentStep >= step.id ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400'}`}>
                    {step.id}
                  </div>
                ))}
              </div>

              <div className="flex-1 flex gap-8 items-stretch animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-1/3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center p-6 text-center shadow-inner">
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4 border border-slate-100">
                    {activeStepData.icon}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-3">{activeStepData.plane}</span>
                  <h3 className="text-lg font-bold text-slate-800">{activeStepData.title}</h3>
                </div>

                <div className="w-2/3 flex flex-col justify-center space-y-6">
                  <p className="text-lg text-slate-600 leading-relaxed">{activeStepData.description}</p>
                  <div className="grid grid-cols-1 gap-4">
                    {Object.entries(activeStepData.details).map(([key, value]) => (
                      <div key={key} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-start gap-4">
                        <div className="w-24 shrink-0 font-semibold text-slate-900 text-sm">{key}</div>
                        <div className="text-slate-600 text-sm leading-relaxed">{value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2 text-indigo-900">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        AI Architect Assistant
                      </h4>
                      {!aiExplanations[activeStepData.id] && (
                        <button
                          onClick={() => handleGenerateEli5(activeStepData)}
                          disabled={isGeneratingEli5}
                          className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isGeneratingEli5 ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          Simplify this step ✨
                        </button>
                      )}
                    </div>

                    {aiExplanations[activeStepData.id] && (
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 text-sm text-indigo-900 leading-relaxed shadow-sm">
                        <span className="font-semibold block mb-1">Simple Explanation:</span>
                        {aiExplanations[activeStepData.id]}
                      </div>
                    )}

                    <div className="space-y-3">
                      {chatAnswers[activeStepData.id] && (
                        <div className="bg-white border border-slate-200 rounded-lg p-4 text-sm shadow-sm space-y-2">
                          <div className="text-slate-600 font-medium pb-2 border-b border-slate-100">
                            <span className="text-slate-400 mr-2">Q:</span>{chatAnswers[activeStepData.id].question}
                          </div>
                          <div className="text-slate-800 leading-relaxed pt-1">
                            <span className="text-indigo-500 mr-2 font-medium">A:</span>{chatAnswers[activeStepData.id].answer}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion(activeStepData)}
                          placeholder="Ask a technical question about this step..."
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm"
                        />
                        <button
                          onClick={() => handleAskQuestion(activeStepData)}
                          disabled={isGeneratingAnswer || !chatInput.trim()}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          {isGeneratingAnswer ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                          Ask ✨
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
