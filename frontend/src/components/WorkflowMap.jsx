import React, { useRef } from 'react';
import { Check, Lock, Target, Workflow, Code, Database, Sparkles } from 'lucide-react';

const ICONS = [Code, Database, Workflow, Sparkles];

export default function WorkflowMap({
  roadmap,
  targetJob,
  currentStepIndex = 0,
  completedSteps = [],
  selectedStep = 0,
  onSelectStep,
}) {
  const containerRef = useRef(null);
  const completedSet = new Set((Array.isArray(completedSteps) ? completedSteps : []).map((step) => Number(step) || 0));
  const safeCurrentStepIndex = Math.max(0, Math.min(Number(currentStepIndex) || 0, Math.max((roadmap?.length || 1) - 1, 0)));
  const currentStepNumber = Number(roadmap?.[safeCurrentStepIndex]?.step) || safeCurrentStepIndex + 1;
  const selectedStepNumber = Number(selectedStep) || currentStepNumber;

  return (
    <div className="bg-transparent p-2 sm:p-8 pb-12 text-slate-800 relative font-sans w-full max-w-5xl mx-auto mt-2">
      {/* Background glow effects - retained but muted for light mode */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-300/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-300/20 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 px-4">
        <div>
          <h2 className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase mb-1.5">Node Journey</h2>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
             {targetJob ? `${targetJob} Map` : 'Workflow Map'}
          </h1>
        </div>
        
        <div className="flex gap-4 text-xs font-semibold bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200 mt-4 sm:mt-0 shadow-sm text-slate-600">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full border border-emerald-500 bg-emerald-500/20" /> Completed</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-hexagon border border-indigo-500 bg-indigo-500/20" /> Current Phase</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full border border-slate-300 bg-slate-200" /> Locked</div>
        </div>
      </div>

      {/* Map Area */}
      <div className="relative w-full mx-auto mt-8" ref={containerRef}>
        
        <div className="flex flex-col relative z-10">
          
          <div className="w-full flex justify-center mb-12 relative z-10">
             <div className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase bg-white px-5 py-2 border border-slate-200 rounded-lg shadow-sm">Starting Point</div>
          </div>

          {roadmap && roadmap.length > 0 ? (
            roadmap.map((step, idx) => {
              const stepNumber = Number(step?.step) || idx + 1;
              const state = completedSet.has(stepNumber) ? 'completed' : stepNumber === currentStepNumber ? 'current' : 'locked';
              const isSelected = stepNumber === selectedStepNumber;
              const isEven = idx % 2 === 0;
              const isLast = idx === roadmap.length - 1;
              const Icon = ICONS[idx % ICONS.length] || Sparkles;
              
              const nodePos = isEven ? 35 : 65;
              const nextNodePos = isEven ? 65 : 35;
              
              return (
                <div key={idx} className="relative w-full h-[140px] sm:h-[150px] group">
                   
                   {/* Clean central SVG connection */}
                   {!isLast && (
                      <svg className="absolute w-full h-full pointer-events-none" style={{ top: '20px' }} viewBox="0 0 100 100" preserveAspectRatio="none">
                         <path 
                           d={`M ${nodePos} 0 C ${nodePos} 60, ${nextNodePos} 40, ${nextNodePos} 100`} 
                           stroke={state === 'completed' ? 'rgba(16, 185, 129, 0.5)' : state === 'current' ? 'rgba(99, 102, 241, 0.6)' : 'rgba(148, 163, 184, 0.8)'} 
                           strokeWidth="3" 
                           fill="none" 
                           strokeDasharray={(state === 'current' || state === 'locked') ? "8, 6" : "none"}
                           vectorEffect="non-scaling-stroke"
                         />
                      </svg>
                   )}

                   {/* Node Icon container positioned at 35% or 65% */}
                   <div 
                      className="absolute top-0 z-30 transition-transform duration-300"
                      style={{ left: `${nodePos}%`, transform: 'translateX(-50%)' }}
                   >
                       {/* Icon Visual */}
                       <div className="relative bg-white rounded-full p-2 border-2 border-slate-100 group-hover:border-indigo-200 transition-colors cursor-pointer shadow-md z-30 group-hover:scale-110">
                         <button
                          type="button"
                          onClick={() => onSelectStep?.(stepNumber)}
                          style={{ background: 'transparent', border: 'none', padding: 0 }}
                          className={`
                            flex justify-center items-center pointer-events-auto transition-all duration-300
                            ${isSelected ? 'ring-4 ring-indigo-200 ring-offset-2 ring-offset-white' : ''}
                            ${state === 'completed' ? 'w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-200 text-emerald-500 shadow-[0_0_20px_rgba(52,211,153,0.3)]' : ''}
                            ${state === 'current' ? 'w-10 h-10 node-hexagon bg-indigo-500/10 border border-indigo-200 text-indigo-500 glow-pulse shadow-[0_0_20px_rgba(99,102,241,0.3)]' : ''}
                            ${state === 'locked' ? 'w-7 h-7 rounded-full bg-slate-50 border border-slate-200 text-slate-400' : ''}
                          `}
                        >
                            {state === 'completed' && <Check strokeWidth={3} size={16} />}
                            {state === 'current' && <Icon size={18} />}
                            {state === 'locked' && <Lock size={12} />}
                          </button>
                       </div>
                       
                       {/* Info Card floating OUTSIDE to avoid center path */}
                       <div 
                           className={`absolute top-0 w-[240px] sm:w-[320px] p-4 rounded-2xl bg-white/90 border border-slate-200 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 group-hover:bg-white group-hover:-translate-y-1 block`}
                           style={isEven 
                               ? { right: '100%', marginRight: '24px' } 
                               : { left: '100%', marginLeft: '24px' }
                           }
                       >
                          <div className="flex justify-between items-start mb-2">
                             <div className="text-[10px] uppercase tracking-widest font-bold">
                                {state === 'completed' && <span className="text-emerald-500">Completed</span>}
                                {state === 'current' && <span className="text-indigo-500">Current Phase</span>}
                                {state === 'locked' && <span className="text-slate-400">Locked</span>}
                             </div>
                             <span className="text-[9px] font-bold tracking-wider text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded shadow-sm">
                               Phase {stepNumber}
                             </span>
                          </div>
                          
                          <h3 className={`text-sm font-bold mb-1.5 leading-snug line-clamp-2 transition-colors duration-300 ${state === 'locked' ? 'text-slate-500' : 'text-slate-900'}`}>
                            {step.title}
                          </h3>
                          
                          <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                             {step.description}
                          </p>

                          {/* Footer Meta */}
                          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] sm:text-[11px] text-slate-600 font-medium">
                             <div className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                               <Workflow size={12} />
                               {Array.isArray(step.resources) ? step.resources.length : 2} Resources
                             </div>
                             <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                               <Check size={12} />
                               2 Weeks
                             </div>
                          </div>
                       </div>
                   </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-slate-500 text-sm py-12">No roadmap data generated to display.</div>
          )}
          
          {/* Curve from last step to Dream Job node */}
          {roadmap && roadmap.length > 0 && (
             <div className="relative w-full h-[70px] pointer-events-none mt-2">
                 <svg className="absolute w-full h-full" style={{ top: '-40px' }} viewBox="0 0 100 100" preserveAspectRatio="none">
                     <path 
                       d={(roadmap.length - 1) % 2 === 0 
                         ? "M 35 0 C 35 60, 50 40, 50 100" 
                         : "M 65 0 C 65 60, 50 40, 50 100"
                       } 
                       stroke="rgba(148, 163, 184, 0.8)" 
                       strokeWidth="3" 
                       fill="none" 
                       strokeDasharray="8, 6"
                       vectorEffect="non-scaling-stroke"
                     />
                 </svg>
             </div>
          )}

          {/* Final Dream Job Node fixed at 50% */}
          <div className="relative w-full flex justify-center z-10 group mt-0">
            <div className="flex flex-col items-center">
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-indigo-200 blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
                <div className="relative w-16 h-16 rounded-2xl bg-white border border-indigo-200 group-hover:border-indigo-300 flex justify-center items-center text-indigo-500 shadow-[0_8px_30px_rgb(99,102,241,0.15)] transform group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-500 cursor-pointer">
                  <Target size={28} strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] mb-1.5">Destination</h3>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">{targetJob || 'Dream Job Target'}</h2>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
