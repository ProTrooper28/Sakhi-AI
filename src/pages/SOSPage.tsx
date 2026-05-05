import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, EyeOff, Eye, Phone, MapPin, Video, Watch, Users, ShieldAlert, CheckCircle2, Navigation, Bell, Shield } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";

const SOSPage = () => {
  const { sosState, triggerSOS, cancelSOS, addEvidence, locationState } = useApp();

  // Native MediaRecorder State
  const [isMediaRecording, setIsMediaRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Format MM:SS
  const formatDuration = (secs: number) => {
     const m = Math.floor(secs / 60);
     const s = secs % 60;
     return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const stopNativeRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      
      setIsMediaRecording(false);
      setRecordingDuration(0);
  };

  useEffect(() => {
     if (sosState.active) {
         const startRecording = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                mediaStreamRef.current = stream;
                
                const recorder = new MediaRecorder(stream);
                mediaChunksRef.current = [];
                
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) mediaChunksRef.current.push(e.data);
                };

                recorder.onstop = () => {
                    if (mediaChunksRef.current.length > 0) {
                        const blob = new Blob(mediaChunksRef.current, { type: "video/webm" });
                        const url = URL.createObjectURL(blob);
                        
                        addEvidence({
                            type: "sos-recording",
                            name: `SOS_Evidence_${new Date().toLocaleTimeString().replace(/:/g, "-")}.webm`,
                            fileType: "video/webm",
                            fileUrl: url,
                            timestamp: new Date().toISOString(),
                            location: sosState.location,
                        });
                    }
                };

                mediaRecorderRef.current = recorder;
                recorder.start();
                setIsMediaRecording(true);
                
                durationTimerRef.current = setInterval(() => {
                    setRecordingDuration(d => d + 1);
                }, 1000);

            } catch (err) {
                console.error("Media permission denied", err);
            }
         };
         
         startRecording();
     } else {
         stopNativeRecording();
     }
     
     return stopNativeRecording;
  }, [sosState.active, addEvidence, sosState.location]);

  // ── ACTIVE FULL-SCREEN STATE ────────────────────────────────────────────────
  if (sosState.active) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#Fdf5f5] text-slate-800 flex flex-col items-center pt-16 pb-32">
        {/* Background Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.12)_0%,_rgba(253,245,245,0)_70%)] pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex flex-col items-center mb-10">
          <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-1.5 rounded-full border border-red-100 font-bold tracking-widest text-[13px] shadow-sm mb-2">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            EMERGENCY ALERT ACTIVE
          </div>
          <p className="text-[13px] text-slate-500 font-medium">Transmitting real-time data to security teams</p>
        </div>

        {/* Central SOS Button */}
        <div className="relative z-10 flex flex-col items-center justify-center mb-10">
          {/* Outer dashed ring */}
          <div className="absolute w-[260px] h-[260px] rounded-full border-[1.5px] border-dashed border-red-300/80 animate-[spin_30s_linear_infinite]" />
          {/* Inner solid ring */}
          <div className="absolute w-[220px] h-[220px] rounded-full border border-red-200" />
          
          <div className="w-[170px] h-[170px] rounded-full bg-[#A30000] flex flex-col items-center justify-center shadow-[0_10px_40px_rgba(239,68,68,0.4)] border-[6px] border-red-50 relative overflow-hidden">
             {/* Gradient overlay on button */}
             <div className="absolute inset-0 bg-gradient-to-b from-red-600 to-[#900000]" />
             <span className="relative z-10 text-white text-[38px] font-black leading-none mb-1 shadow-sm" style={{ fontFamily: "Manrope, sans-serif" }}>SOS</span>
             <span className="relative z-10 text-white text-[17px] font-bold tracking-widest leading-none mb-3 shadow-sm">ACTIVATED</span>
             <span className="relative z-10 text-red-200 text-[7px] font-bold tracking-wider text-center uppercase leading-tight max-w-[90px]">Emergency Protocols In Progress</span>
          </div>
        </div>

        {/* Status List */}
        <div className="relative z-10 flex flex-col gap-3 mb-10 text-[12px] font-semibold text-slate-600 w-full max-w-[280px]">
           <div className="flex items-center gap-3 text-red-600">
             <div className="w-3.5 h-3.5 rounded-full border-2 border-red-600" /> Recording Started (just now)
           </div>
           <div className="flex items-center gap-3">
             <MapPin className="w-4 h-4" /> Location shared (2s ago)
           </div>
           <div className="flex items-center gap-3">
             <Navigation className="w-4 h-4 rotate-90" /> Alerts dispatched (12s ago)
           </div>
        </div>

        {/* Grid of Cards */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl px-6">
          
          {/* LIVE REC Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 border-t-4 border-t-red-600 flex flex-col h-[260px]">
            <div className="flex justify-between items-start mb-auto">
              <div className="flex items-center gap-2 text-red-600 font-bold text-[11px] tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" /> LIVE REC
              </div>
              <div className="flex gap-3 text-slate-500">
                <Mic className="w-4 h-4" />
                <Video className="w-4 h-4" />
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center flex-1">
              <div className="text-[42px] font-black tracking-tight text-slate-900 mb-2">{formatDuration(recordingDuration)}</div>
              <p className="text-[12px] font-bold text-slate-500">Cloud Encryption Active</p>
            </div>
          </div>

          {/* CONTACTS Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-[260px]">
             <p className="text-[11px] font-bold text-slate-400 tracking-wider mb-8 uppercase">Emergency Contacts</p>
             <div className="flex justify-around items-center flex-1">
                <div className="flex flex-col items-center gap-2">
                   <div className="relative">
                     <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-lg">D</div>
                     <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /></div>
                   </div>
                   <p className="font-bold text-[13px] text-slate-900">Dad</p>
                   <p className="text-[8px] font-bold text-green-500 uppercase tracking-wider">Acknowledged</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <div className="relative">
                     <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-lg">M</div>
                     <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /></div>
                   </div>
                   <p className="font-bold text-[13px] text-slate-900">Mom</p>
                   <p className="text-[8px] font-bold text-blue-500 uppercase tracking-wider">Delivered</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <div className="relative">
                     <div className="w-11 h-11 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-lg">ST</div>
                     <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center"><Navigation className="w-3.5 h-3.5 text-orange-500" /></div>
                   </div>
                   <p className="font-bold text-[13px] text-slate-900">Security</p>
                   <p className="text-[8px] font-bold text-orange-500 uppercase tracking-wider">Dispatched</p>
                </div>
             </div>
          </div>

          {/* MAP Card */}
          <div className="bg-[#1f242e] rounded-2xl relative overflow-hidden h-[260px] shadow-sm border border-slate-700">
             {/* Map background placeholder (grid lines) */}
             <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
                transform: "perspective(300px) rotateX(60deg) scale(2)",
                transformOrigin: "center top"
             }} />
             <div className="absolute inset-0 bg-gradient-to-t from-[#1f242e] via-transparent to-[#1f242e]" />
             
             <div className="absolute inset-0 flex items-center justify-center pb-4">
                <div className="relative flex flex-col items-center">
                   <div className="absolute w-20 h-20 bg-teal-500/10 rounded-full animate-ping" />
                   <div className="absolute w-24 h-24 border border-teal-500/20 rounded-full" />
                   
                   <div className="relative z-10 w-8 h-10 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-t-full rounded-b-full bg-teal-600/50 backdrop-blur-sm border-2 border-teal-400 flex items-center justify-center" style={{ borderBottomLeftRadius: 0, transform: 'rotate(45deg)' }}>
                         <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm" style={{ transform: 'rotate(-45deg)' }} />
                      </div>
                   </div>
                </div>
             </div>
             <div className="absolute bottom-4 left-4 bg-black/90 rounded-md px-2.5 py-1.5 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[8px] text-white font-bold tracking-wider uppercase">Live Signal Active</span>
             </div>
          </div>

        </div>

        {/* Bottom Sticky Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#Fdf5f5] border-t border-slate-200 p-4 flex justify-center gap-4 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
           <button className="bg-[#C82121] hover:bg-[#A30000] text-white font-bold tracking-widest text-[11px] px-8 py-3.5 rounded-xl shadow-lg flex items-center gap-2 transition-colors">
              <Phone className="w-4 h-4" /> CALL POLICE
           </button>
           <button onClick={cancelSOS} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold tracking-widest text-[11px] px-8 py-3.5 rounded-xl transition-colors">
              CANCEL (LONG PRESS)
           </button>
        </div>

      </div>
    );
  }

  // ── STANDBY STATE ───────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-[#fdfdfd]">
        {/* Top Header matching screenshot */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white shrink-0">
          <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>Emergency Assistance</h1>
          <div className="flex items-center gap-6">
             <Bell className="w-5 h-5 text-slate-600" />
             <Shield className="w-5 h-5 text-slate-600" />
             <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                <img src="https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff" alt="User" />
             </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 p-6 items-center justify-start relative bg-[#fdfdfd] overflow-y-auto">
          
          {/* Status Pill & Subtitle */}
          <div className="mt-6 flex flex-col items-center mb-10">
            <div className="flex items-center gap-2 bg-teal-50/70 text-teal-500 px-4 py-1.5 rounded-full border border-teal-100 font-bold text-[12px] shadow-sm mb-3">
               <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
               Monitoring Active
            </div>
            <p className="text-slate-500 text-[13px] font-semibold">Press SOS to instantly alert your safety network</p>
          </div>

          {/* Centered circular SOS button */}
          <div className="relative mb-14 mt-4 flex items-center justify-center">
            {/* Subtle pulse rings */}
            <div className="absolute w-[280px] h-[280px] rounded-full border border-red-100" />
            <div className="absolute w-[360px] h-[360px] rounded-full border border-red-50" />
            
            <button 
              onClick={triggerSOS}
              className="relative z-10 w-48 h-48 rounded-full bg-[#da2929] flex flex-col items-center justify-center shadow-[0_15px_40px_rgba(218,41,41,0.3)] transition-transform active:scale-95 hover:bg-[#c52525]"
            >
              <span style={{ fontFamily: "Manrope, sans-serif" }} className="text-white text-[56px] font-black leading-none mb-1">SOS</span>
              <span className="text-white font-bold text-[11px] tracking-widest uppercase">HOLD TO TRIGGER</span>
            </button>
          </div>

          {/* Options grid */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-[700px] relative z-10 mb-14">
            
            <div className="bg-white rounded-2xl p-5 flex items-start gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 hover:border-slate-200 transition-colors">
               <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                 <EyeOff className="w-4 h-4 text-slate-400" />
               </div>
               <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between mb-1.5">
                     <h3 className="text-[13px] font-bold text-slate-900">Silent Mode</h3>
                     {/* Toggle switch (visual only for now) */}
                     <div className="w-7 h-4 bg-slate-200 rounded-full relative shadow-inner">
                        <div className="w-3 h-3 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm" />
                     </div>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-[1.4] pr-2">Send alerts without sound or screen indication</p>
               </div>
            </div>

            <div className="bg-white rounded-2xl p-5 flex items-start gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 hover:border-slate-200 transition-colors">
               <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                 <Mic className="w-4 h-4 text-slate-400" />
               </div>
               <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between mb-1.5">
                     <h3 className="text-[13px] font-bold text-slate-900">Voice Trigger</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-[1.4]">Activate SOS using secure voice command</p>
               </div>
            </div>

            <div className="bg-white rounded-2xl p-5 flex items-start gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 hover:border-slate-200 transition-colors">
               <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                 <Watch className="w-4 h-4 text-slate-400" />
               </div>
               <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between mb-1.5">
                     <h3 className="text-[13px] font-bold text-slate-900">Wearable Trigger</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-[1.4]">Trigger SOS from connected smartwatch</p>
               </div>
            </div>

            <div className="bg-white rounded-2xl p-5 flex items-start gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 hover:border-slate-200 transition-colors">
               <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                 <Eye className="w-4 h-4 text-slate-400" />
               </div>
               <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between mb-1.5">
                     <h3 className="text-[13px] font-bold text-slate-900">Guardian View</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-[1.4]">Preview what contacts will see during alert</p>
               </div>
            </div>

          </div>

          {/* Bottom Stats Row */}
          <div className="w-full max-w-[700px] flex justify-between items-center mt-auto pb-4">
             <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                   <img src="https://ui-avatars.com/api/?name=Dad&background=1e293b&color=fff" className="w-8 h-8 rounded-full border-2 border-white relative z-20" />
                   <img src="https://ui-avatars.com/api/?name=Mom&background=1e293b&color=fff" className="w-8 h-8 rounded-full border-2 border-white relative z-10" />
                   <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center relative z-0">+1</div>
                </div>
                <div>
                   <p className="text-[12px] font-bold text-slate-900 leading-tight mb-0.5">3 Trusted Contacts Ready</p>
                   <p className="text-[10px] text-slate-500 font-medium">Will be alerted instantly</p>
                </div>
             </div>

             <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-teal-500 shrink-0" />
                <div>
                   <p className="text-[12px] font-bold text-slate-900 leading-tight mb-0.5">Live Location Sharing</p>
                   <p className="text-[10px] text-slate-500 font-medium">Enabled & Precise</p>
                </div>
             </div>

             <div className="flex items-center gap-3">
                <div className="relative">
                   <Watch className="w-4 h-4 text-teal-500 shrink-0" />
                   <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-teal-400 rounded-full border border-white" />
                </div>
                <div>
                   <p className="text-[12px] font-bold text-slate-900 leading-tight mb-0.5">Wearable Status</p>
                   <p className="text-[10px] text-slate-500 font-medium">Connected & Synced</p>
                </div>
             </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
};

export default SOSPage;
