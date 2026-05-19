import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, EyeOff, Eye, Phone, MapPin, Video, Watch, Users, ShieldAlert, CheckCircle2, Navigation, Bell, Shield, Asterisk, ArrowLeft, BatteryMedium, Heart, Wifi } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";

// ── SOS BUTTON COMPONENT ─────────────────────────────────────────────────────
const SOSButtonArea = ({ onTrigger }: { onTrigger: () => void }) => {
  const [isHeld, setIsHeld]           = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [ripples, setRipples]         = useState<number[]>([]);
  const holdTimer       = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const rippleInterval  = useRef<ReturnType<typeof setInterval> | null>(null);
  const activationTimer = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const rippleId        = useRef(0);

  const startHold = useCallback(() => {
    if (isActivating) return;
    setIsHeld(true);
    rippleInterval.current = setInterval(() => {
      const id = rippleId.current++;
      setRipples(prev => [...prev, id]);
      setTimeout(() => setRipples(prev => prev.filter(r => r !== id)), 1200);
    }, 400);
    holdTimer.current = setTimeout(() => {
      // clear hold state
      setIsHeld(false);
      if (rippleInterval.current) { clearInterval(rippleInterval.current); rippleInterval.current = null; }
      setRipples([]);
      // enter activation phase
      setIsActivating(true);
      activationTimer.current = setTimeout(() => {
        setIsActivating(false);
        onTrigger();
      }, 600);
    }, 1500);
  }, [onTrigger, isActivating]);

  const cleanup = useCallback(() => {
    if (isActivating) return; // never interrupt activation
    setIsHeld(false);
    if (holdTimer.current)      { clearTimeout(holdTimer.current);       holdTimer.current = null; }
    if (rippleInterval.current) { clearInterval(rippleInterval.current); rippleInterval.current = null; }
    setRipples([]);
  }, [isActivating]);

  useEffect(() => () => {
    if (holdTimer.current)      clearTimeout(holdTimer.current);
    if (rippleInterval.current) clearInterval(rippleInterval.current);
    if (activationTimer.current) clearTimeout(activationTimer.current);
  }, []);

  return (
    <div className="relative mb-16 mt-4 flex items-center justify-center select-none">

      {/* ── ACTIVATION: full-screen red radial burst ── */}
      <AnimatePresence>
        {isActivating && (
          <motion.div
            key="burst"
            initial={{ opacity: 0.7, scale: 0.2 }}
            animate={{ opacity: 0, scale: 9 }}
            exit={{}}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="fixed rounded-full bg-red-600 pointer-events-none"
            style={{ width: 208, height: 208, top: "50%", left: "50%", marginLeft: -104, marginTop: -104, zIndex: 45 }}
          />
        )}
      </AnimatePresence>

      {/* ── ACTIVATION: subtle dark focus overlay ── */}
      <AnimatePresence>
        {isActivating && (
          <motion.div
            key="dim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/18 pointer-events-none"
            style={{ zIndex: 44 }}
          />
        )}
      </AnimatePresence>

      {/* Ambient outer glow ring */}
      <motion.div
        animate={isActivating
          ? { scale: 1.6, opacity: 0.5 }
          : { scale: [1, 1.08, 1], opacity: [0.18, 0.06, 0.18] }}
        transition={isActivating
          ? { duration: 0.3 }
          : { repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
        className="absolute w-[340px] h-[340px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(220,38,38,0.22) 0%, transparent 70%)" }}
      />
      {/* Inner breathing ring */}
      <motion.div
        animate={isActivating
          ? { scale: 1.35, opacity: 0.35 }
          : { scale: [1, 1.04, 1], opacity: [0.25, 0.08, 0.25] }}
        transition={{ repeat: isActivating ? 0 : Infinity, duration: 3.5, ease: "easeInOut", delay: 0.3 }}
        className="absolute w-[270px] h-[270px] rounded-full bg-red-100 border border-red-200"
      />

      {/* Hold ripples */}
      <AnimatePresence>
        {ripples.map(id => (
          <motion.div
            key={id}
            initial={{ scale: 0.85, opacity: 0.6 }}
            animate={{ scale: 2.1, opacity: 0 }}
            exit={{}}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="absolute w-[208px] h-[208px] rounded-full border-2 border-red-400/50 pointer-events-none"
          />
        ))}
      </AnimatePresence>

      {/* ── SOS BUTTON ── */}
      <motion.button
        onMouseDown={startHold}
        onMouseUp={cleanup}
        onMouseLeave={cleanup}
        onTouchStart={startHold}
        onTouchEnd={cleanup}
        animate={
          isActivating ? {
            scale: [0.93, 1.13, 1.06],
            x: [0, -4, 4, -3, 3, -1, 0],
            boxShadow: ["0 0 80px rgba(220,38,38,1)", "0 0 130px rgba(220,38,38,0.9)", "0 0 90px rgba(220,38,38,1)"]
          } : isHeld ? {
            scale: 0.96,
            boxShadow: ["0 0 60px rgba(220,38,38,0.85)", "0 0 90px rgba(220,38,38,1)"]
          } : {
            scale: [1, 1.04, 1],
            boxShadow: ["0 0 18px rgba(220,38,38,0.35)", "0 0 42px rgba(220,38,38,0.6)", "0 0 18px rgba(220,38,38,0.35)"]
          }
        }
        transition={
          isActivating
            ? { duration: 0.5, ease: "easeOut", x: { duration: 0.45, times: [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1] } }
            : isHeld
            ? { duration: 0.15, ease: "easeOut" }
            : { repeat: Infinity, duration: 2.8, ease: "easeInOut" }
        }
        className="relative z-10 w-52 h-52 rounded-full bg-gradient-to-b from-[#DC2626] to-[#7F1D1D] flex flex-col items-center justify-center border-4 border-white/20 shadow-2xl overflow-hidden cursor-pointer"
        style={{ WebkitTapHighlightColor: "transparent", zIndex: 46 }}
      >
        {/* Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10 pointer-events-none" />
        {/* Press/activation glow */}
        <AnimatePresence>
          {(isHeld || isActivating) && (
            <motion.div
              key="pressglow"
              initial={{ opacity: 0 }}
              animate={{ opacity: isActivating ? 0.65 : 0.35 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-red-300/50 pointer-events-none rounded-full"
            />
          )}
        </AnimatePresence>

        <span style={{ fontFamily: "Manrope, sans-serif" }} className="relative z-10 text-white text-[64px] font-black leading-none mb-1 drop-shadow-md">SOS</span>

        {/* Label — animates between states */}
        <AnimatePresence mode="wait">
          {isActivating ? (
            <motion.span
              key="activated"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 text-white font-black text-[11px] tracking-[0.2em] uppercase drop-shadow-sm"
            >
              SOS ACTIVATED
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative z-10 text-white font-bold text-[11px] tracking-[0.2em] uppercase drop-shadow-sm"
            >
              {isHeld ? "HOLD..." : "HOLD TO TRIGGER"}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

const SOSPage = () => {
  const { sosState, triggerSOS, cancelSOS, addEvidence, locationState } = useApp();
  const navigate = useNavigate();

  // Option card toggle state
  const [options, setOptions] = useState({ silent: false, voice: false, wearable: true, guardian: false });
  const toggleOption = (key: keyof typeof options) => setOptions(prev => ({ ...prev, [key]: !prev[key] }));

  // Safety mode selection
  const [safetyMode, setSafetyMode] = useState<"standard" | "offline" | "lownet">("standard");

  // Live system status cycling
  const STATUS_MESSAGES = ["Monitoring active…", "Waiting for input…", "All systems ready", "Monitoring active…"];
  const [statusIdx, setStatusIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStatusIdx(i => (i + 1) % STATUS_MESSAGES.length), 3500);
    return () => clearInterval(t);
  }, []);

  // Native MediaRecorder State
  const [isMediaRecording, setIsMediaRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);

  // Real-time SOS Timer (Stable, non-drifting)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (sosState.active && sosState.triggeredAt) {
      const startTime = new Date(sosState.triggeredAt).getTime();
      
      const updateTimer = () => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      };
      
      updateTimer(); // Initial update
      interval = setInterval(updateTimer, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [sosState.active, sosState.triggeredAt]);

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
      setIsMediaRecording(false);
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
      <div className="fixed inset-0 z-50 overflow-hidden bg-[#Fdf5f5] dark:bg-[#0B1220] text-slate-800 dark:text-white flex flex-col items-center pt-16 pb-32">
        {/* State Change Transition Overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 bg-red-600/10 pointer-events-none"
        />

        {/* Main Content container (No more global shake) */}
        <div className="w-full h-full flex flex-col items-center overflow-y-auto relative z-10">
          {/* Background Radial Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.15)_0%,_rgba(253,245,245,0)_70%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.25)_0%,_rgba(11,18,32,0)_70%)] pointer-events-none" />

          {/* Top Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 flex flex-col items-center mb-10"
          >
            <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-1.5 rounded-full border border-red-100 font-bold tracking-widest text-[13px] shadow-sm mb-2">
              <motion.div 
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.5)]" 
              />
              EMERGENCY ALERT ACTIVE
            </div>
            <p className="text-[13px] text-slate-500 font-medium">Transmitting real-time data to security teams</p>
          </motion.div>

          {/* Central SOS Button Active Area */}
          <div className="relative z-10 flex flex-col items-center justify-center mb-10 w-full">
            {/* Ripples */}
            <AnimatePresence>
               {[0, 1, 2].map((i) => (
                 <motion.div
                   key={i}
                   initial={{ scale: 0.8, opacity: 0.6 }}
                   animate={{ scale: 2.2, opacity: 0 }}
                   transition={{ 
                     duration: 3, 
                     repeat: Infinity, 
                     delay: i * 1,
                     ease: "easeOut"
                   }}
                   className="absolute w-[170px] h-[170px] rounded-full border-2 border-red-400/30 pointer-events-none"
                 />
               ))}
            </AnimatePresence>

            {/* Outer rotating dashed ring */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
              className="absolute w-[260px] h-[260px] rounded-full border-[1.5px] border-dashed border-red-300/80" 
            />
            
            {/* Central SOS Button with Stable Shake */}
            <motion.div 
              animate={{ 
                x: [-0.5, 0.5, -0.5, 0.5, 0],
                rotate: [-0.5, 0.5, -0.5, 0.5, 0],
                scale: [1, 1.05, 1],
                boxShadow: [
                  "0 10px 50px rgba(239,68,68,0.5)",
                  "0 10px 80px rgba(239,68,68,0.8)",
                  "0 10px 50px rgba(239,68,68,0.5)"
                ]
              }}
              transition={{ repeat: Infinity, duration: 0.15, scale: { duration: 1.5, repeat: Infinity }, boxShadow: { duration: 1.5, repeat: Infinity } }}
              style={{ transformOrigin: "center" }}
              className="relative w-[170px] h-[170px] rounded-full bg-gradient-to-b from-[#EF4444] to-[#991B1B] flex flex-col items-center justify-center border-4 border-red-200/50 shadow-2xl overflow-hidden"
            >
               {/* Gradient overlay on button */}
               <div className="absolute inset-0 bg-red-600/30 mix-blend-overlay" />
               <motion.span 
                 animate={{ scale: [1, 1.1, 1] }}
                 transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                 className="relative z-10 text-white text-[42px] font-black leading-none mb-1 drop-shadow-lg" 
                 style={{ fontFamily: "Manrope, sans-serif" }}
               >
                 SOS
               </motion.span>
               <span className="relative z-10 text-white text-[17px] font-black tracking-widest leading-none mb-2 drop-shadow-md">ACTIVATED</span>
               <span className="relative z-10 text-red-100 text-[8px] font-bold tracking-wider text-center uppercase leading-tight max-w-[100px]">Emergency Protocols In Progress</span>
            </motion.div>
          </div>

          {/* Real-time System Response Feed */}
          <div className="relative z-10 flex flex-col gap-3 mb-12 w-full max-w-[320px] bg-white/70 backdrop-blur-md rounded-[20px] p-5 border border-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            {/* Live Indicator Header */}
            <div className="flex items-center justify-between border-b border-slate-200/50 pb-3 mb-1">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                  className="w-2 h-2 rounded-full bg-red-500"
                />
                <span className="text-[10px] font-black text-slate-800 tracking-widest uppercase">Live System Log</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tracking Active</span>
            </div>

            {/* Sequential Steps */}
            {[
              { icon: Asterisk, title: "Recording started", detail: "Audio & video locked", delay: 0.5, color: "text-red-500", dot: "bg-red-500", time: "just now" },
              { icon: MapPin, title: "Location shared", detail: "GPS pinpointed", delay: 1.8, color: "text-teal-600", dot: "bg-teal-500", time: "1s ago" },
              { icon: Users, title: "Contacts alerted", detail: "Help is being notified", delay: 3.2, color: "text-indigo-600", dot: "bg-indigo-500", time: "3s ago" }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: step.delay, duration: 0.4, ease: "easeOut" }}
                className="flex items-start gap-3"
              >
                <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-white shadow-sm border border-slate-100 ${step.color}`}>
                  {step.icon === Asterisk ? (
                     <div className={`w-1.5 h-1.5 rounded-full ${step.dot} shadow-[0_0_4px_rgba(239,68,68,0.5)]`} />
                  ) : (
                     <step.icon className="w-3 h-3" />
                  )}
                </div>
                <div className="flex-1 flex justify-between items-start pt-0.5">
                   <div className="flex flex-col">
                     <span className="text-[13px] font-black text-slate-800 leading-none mb-1">{step.title}</span>
                     <span className="text-[10px] font-bold text-slate-500 leading-none">{step.detail}</span>
                   </div>
                   <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap ml-2">{step.time}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Grid of Cards - Sequential Fade-In */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl px-8">
            
            {/* LIVE REC Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-white rounded-3xl p-8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-slate-100 border-t-4 border-t-red-600 flex flex-col h-[280px]"
            >
              <div className="flex justify-between items-start mb-auto">
                <div className="flex items-center gap-2 text-red-600 font-black text-[11px] tracking-widest uppercase">
                  <motion.div 
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_6px_rgba(239,68,68,0.5)]" 
                  /> 
                  LIVE REC
                </div>
                <div className="flex gap-4 text-slate-400">
                  <Mic className="w-4 h-4" />
                  <Video className="w-4 h-4" />
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center flex-1">
                <motion.div 
                  key={recordingDuration}
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 1 }}
                  className="text-5xl font-black tracking-tighter text-slate-900 mb-2"
                >
                  {formatDuration(recordingDuration)}
                </motion.div>
                <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">End-to-End Encrypted</p>
              </div>
            </motion.div>

            {/* CONTACTS Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="bg-white rounded-3xl p-8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col h-[280px]"
            >
               <p className="text-[11px] font-black text-slate-400 tracking-widest mb-8 uppercase">Emergency Network</p>
               <div className="flex justify-around items-center flex-1">
                  {[
                    { label: "D", name: "Dad", status: "Acknowledged", color: "text-green-500", icon: CheckCircle2 },
                    { label: "M", name: "Mom", status: "Delivered", color: "text-blue-500", icon: CheckCircle2 },
                    { label: "ST", name: "Security", status: "Dispatched", color: "text-orange-500", icon: Navigation },
                  ].map((c, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.2 + i * 0.15 }}
                      className="flex flex-col items-center gap-2"
                    >
                       <div className="relative">
                         <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-700 font-black border border-slate-100 flex items-center justify-center text-lg shadow-sm">{c.label}</div>
                         <motion.div 
                           initial={{ scale: 0 }}
                           animate={{ scale: 1 }}
                           transition={{ type: "spring", delay: 1.6 + i * 0.15 }}
                           className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full border border-slate-50 flex items-center justify-center shadow-md"
                         >
                           <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
                         </motion.div>
                       </div>
                       <p className="font-black text-[13px] text-slate-900">{c.name}</p>
                       <p className={`text-[9px] font-black uppercase tracking-wider ${c.color}`}>{c.status}</p>
                    </motion.div>
                  ))}
               </div>
            </motion.div>

            {/* MAP Card Redesign */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="bg-[#1e293b] rounded-3xl relative overflow-hidden h-[280px] shadow-[0_4px_25px_rgba(0,0,0,0.1)] border border-slate-700 flex flex-col"
            >
               {/* Map Background Grid */}
               <div className="absolute inset-0 opacity-[0.08]" style={{
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                  transform: "perspective(500px) rotateX(45deg) scale(2)",
                  transformOrigin: "center top"
               }} />
               <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b] via-transparent to-[#1e293b]" />
               
               {/* Map Content */}
               <div className="absolute inset-0 pb-8 pointer-events-none">
                  {/* User Location Center */}
                  <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                     {/* Ripples */}
                     <motion.div 
                        animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                        className="absolute w-16 h-16 bg-red-500/30 rounded-full" 
                     />
                     
                     {/* User Marker */}
                     <motion.div 
                        animate={{ y: [0, -3, 0] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                        className="relative z-10 flex flex-col items-center"
                     >
                        <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow-[0_0_15px_rgba(239,68,68,0.6)] flex items-center justify-center">
                           <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                        <div className="mt-1 bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded text-[9px] text-white font-bold tracking-wider whitespace-nowrap shadow-sm border border-slate-700/50">
                           YOUR LOCATION
                        </div>
                     </motion.div>
                  </div>

                  {/* Nearby Police */}
                  <div className="absolute top-[25%] left-[25%] flex flex-col items-center opacity-80">
                     <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 mb-1">
                        <Shield className="w-3 h-3" />
                     </div>
                     <span className="text-[8px] text-blue-300 font-bold uppercase tracking-wider bg-[#1e293b]/50 px-1 rounded">Police (800m)</span>
                  </div>

                  {/* Nearby Hospital */}
                  <div className="absolute top-[60%] left-[75%] flex flex-col items-center opacity-90">
                     <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-1">
                        <div className="w-3 h-3 relative flex items-center justify-center">
                          <span className="absolute w-3 h-1 bg-emerald-400 rounded-sm" />
                          <span className="absolute w-1 h-3 bg-emerald-400 rounded-sm" />
                        </div>
                     </div>
                     <span className="text-[8px] text-emerald-300 font-bold uppercase tracking-wider bg-[#1e293b]/50 px-1 rounded">Hospital</span>
                     <span className="text-[8px] text-emerald-300 font-bold bg-[#1e293b]/50 px-1 rounded mt-0.5">450m</span>
                  </div>
               </div>

               {/* Top Label */}
               <div className="absolute top-4 left-5 right-5 flex justify-between items-start z-20">
                  <div className="flex flex-col gap-1">
                     <div className="bg-red-500/20 text-red-400 text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded w-fit border border-red-500/30">
                        Help is on the way
                     </div>
                     <p className="text-[10px] text-slate-300 font-medium ml-0.5">Location shared with contacts</p>
                  </div>
               </div>

               {/* Bottom Status Bar */}
               <div className="absolute bottom-4 left-5 right-5 flex justify-between items-end z-20">
                  <div className="bg-slate-900/90 backdrop-blur-md rounded-lg px-3 py-1.5 flex items-center gap-2 border border-slate-700 shadow-xl">
                     <motion.div 
                       animate={{ opacity: [1, 0.3, 1] }}
                       transition={{ repeat: Infinity, duration: 1.5 }}
                       className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" 
                     />
                     <span className="text-[9px] text-white font-bold tracking-widest uppercase">Live tracking active</span>
                  </div>
                  <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-3 py-1.5 flex flex-col items-end shadow-lg backdrop-blur-md">
                     <span className="text-[8px] text-emerald-400 font-black uppercase tracking-widest mb-0.5">Nearest Help</span>
                     <span className="text-[11px] text-emerald-300 font-bold leading-none">450m away</span>
                  </div>
               </div>
            </motion.div>

          </div>

          {/* Bottom Bar - Slide up */}
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", damping: 20, delay: 1.4 }}
            className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 p-6 flex justify-center gap-6 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]"
          >
             <motion.button 
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => window.location.href = "tel:100"}
               className="bg-[#C82121] hover:bg-[#A30000] text-white font-black tracking-widest text-[12px] px-10 py-4 rounded-2xl shadow-xl shadow-red-100 flex items-center gap-3 transition-colors cursor-pointer"
             >
                <Phone className="w-5 h-5 fill-current" /> CALL POLICE
             </motion.button>
             <motion.button 
               whileTap={{ scale: 0.95 }}
               onClick={cancelSOS}
               className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black tracking-widest text-[12px] px-10 py-4 rounded-2xl transition-colors cursor-pointer"
             >
                CANCEL SOS
             </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── STANDBY STATE ───────────────────────────────────────────────────────────
  const isSilent = options.silent;

  return (
    <AppLayout>
      {/* Silent Mode global overlay — fixed, pointer-events-none so everything stays clickable */}
      <AnimatePresence>
        {isSilent && (
          <motion.div
            key="silent-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-40 pointer-events-none"
            style={{ backgroundColor: "rgba(10, 15, 30, 0.11)" }}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col h-full bg-[#fcfcfd]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white/90 shrink-0">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/home")}
              className="icon-btn w-8 h-8 text-slate-500 hover:text-slate-900 mr-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <h1 className="text-xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Emergency Assistance</h1>
          </div>
          {/* Silent Mode Active label */}
          <AnimatePresence>
            {isSilent && (
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="flex items-center gap-2 bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full border border-slate-200 text-[11px] font-black uppercase tracking-widest"
              >
                <EyeOff className="w-3 h-3" />
                Silent Mode Active
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col flex-1 p-8 items-center justify-start relative overflow-y-auto"
          style={{
            background: "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(20,184,166,0.06) 0%, #fcfcfd 70%)"
          }}
        >
          
          {/* Live System Status Indicator */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex flex-col items-center mb-12"
          >
            {/* System Ready pill with blinking dot */}
            <div className="flex items-center gap-2 bg-teal-50 text-teal-600 px-5 py-2 rounded-full border border-teal-100 font-black text-[11px] uppercase tracking-widest shadow-sm mb-3">
              <motion.div
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                className="w-2 h-2 rounded-full bg-teal-500"
              />
              System Ready
            </div>
            {/* Dynamic status text — cycles every 3.5s */}
            <AnimatePresence mode="wait">
              <motion.p
                key={statusIdx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="text-slate-400 text-[13px] font-semibold tracking-wide"
              >
                {STATUS_MESSAGES[statusIdx]}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          {/* SOS Button Normal State - ENHANCED */}
          <SOSButtonArea onTrigger={triggerSOS} />

          {/* Controls Section */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-4 w-full max-w-[750px] relative z-10 mb-10"
          >
            {/* Row 1: Silent Mode + Voice Activation */}
            <div className="grid grid-cols-2 gap-4">

              {/* Silent Mode Toggle */}
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleOption("silent")}
                animate={{
                  borderColor: options.silent ? "rgba(94,234,212,0.6)" : "rgba(241,245,249,1)",
                  boxShadow: options.silent ? "0 4px 20px rgba(20,184,166,0.08)" : "0 4px 16px rgba(0,0,0,0.02)"
                }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-[24px] p-5 flex items-start gap-4 border cursor-pointer text-left"
              >
                <motion.div
                  animate={{
                    backgroundColor: options.silent ? "rgb(240,253,250)" : "rgb(248,250,252)",
                    borderColor: options.silent ? "rgb(204,251,241)" : "rgb(226,232,240)",
                    color: options.silent ? "rgb(20,184,166)" : "rgb(148,163,184)"
                  }}
                  transition={{ duration: 0.2 }}
                  className="w-10 h-10 rounded-[16px] flex items-center justify-center shrink-0 border"
                >
                  <EyeOff className="w-4 h-4" />
                </motion.div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-[13px] font-black text-slate-900 leading-none">Silent Mode</h3>
                    <motion.div
                      animate={{ backgroundColor: options.silent ? "rgb(20,184,166)" : "rgb(226,232,240)" }}
                      transition={{ duration: 0.2 }}
                      className="w-8 h-[18px] rounded-full relative flex-shrink-0"
                    >
                      <motion.span
                        animate={{ x: options.silent ? 13 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        className="absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full shadow-sm"
                        style={{ position: "absolute" }}
                      />
                    </motion.div>
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">Alerts sent without any sound</p>
                </div>
              </motion.button>

              {/* Voice Activation — Passive system, no toggle */}
              <div className="bg-white rounded-[24px] p-5 flex items-start gap-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
                <div className="w-10 h-10 rounded-[16px] flex items-center justify-center shrink-0 border bg-violet-50 border-violet-100 text-violet-500">
                  <Mic className="w-4 h-4" />
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-[13px] font-black text-slate-900 leading-none mb-1.5">Voice Activation</p>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed mb-2">
                    Listening for "Help", "Bachao"
                  </p>
                  {/* Minimal waveform bars */}
                  <div className="flex items-end gap-[3px] h-4">
                    {[0.5, 0.9, 0.6, 1, 0.7, 0.85, 0.5].map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{ scaleY: [h, h * 0.4, h] }}
                        transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.1, ease: "easeInOut" }}
                        style={{ height: `${h * 100}%`, transformOrigin: "bottom" }}
                        className="w-[3px] rounded-full bg-violet-300"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Wearable Device Card — enhanced, no toggle */}
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)] overflow-hidden">
              {/* Top row: device identity + status */}
              <div className="flex items-center gap-4 px-5 pt-4 pb-3 border-b border-slate-50">
                <div className="w-10 h-10 rounded-[16px] flex items-center justify-center shrink-0 border bg-indigo-50 border-indigo-100 text-indigo-500 relative">
                  <Watch className="w-4 h-4" />
                  <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-400 rounded-full border-2 border-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-black text-slate-900 leading-none mb-0.5">Sakhi Ring</p>
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                      className="w-1.5 h-1.5 rounded-full bg-teal-400"
                    />
                    <p className="text-[10px] text-teal-600 font-black uppercase tracking-widest">Connected</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-semibold">
                  <Wifi className="w-3 h-3 text-teal-500" />
                  <span className="text-teal-600 font-black">Strong</span>
                </div>
              </div>
              {/* Bottom row: stats */}
              <div className="grid grid-cols-3 divide-x divide-slate-50 px-1 py-2">
                <div className="flex flex-col items-center gap-1 px-3 py-1">
                  <BatteryMedium className="w-3.5 h-3.5 text-teal-500" />
                  <p className="text-[12px] font-black text-slate-800">78%</p>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Battery</p>
                </div>
                <div className="flex flex-col items-center gap-1 px-3 py-1">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  <p className="text-[12px] font-black text-slate-400">-- bpm</p>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Heart Rate</p>
                </div>
                <div className="flex flex-col items-center gap-1 px-3 py-1">
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    className="w-3.5 h-3.5 flex items-center justify-center"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  </motion.div>
                  <p className="text-[12px] font-black text-slate-800">Just now</p>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Last Sync</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Safety Mode Section */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="w-full max-w-[750px] relative z-10 mb-10"
          >
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Safety Mode</p>
            <div className="grid grid-cols-3 gap-3">
              {([
                {
                  id: "standard" as const,
                  dot: "bg-teal-400",
                  label: "Standard",
                  desc: "Full protection with tracking and alerts",
                  activeRing: "border-teal-300",
                  activeBg: "bg-teal-50",
                  activeText: "text-teal-700",
                },
                {
                  id: "offline" as const,
                  dot: "bg-slate-400",
                  label: "Offline",
                  desc: "Works without internet, records locally",
                  activeRing: "border-slate-300",
                  activeBg: "bg-slate-50",
                  activeText: "text-slate-700",
                },
                {
                  id: "lownet" as const,
                  dot: "bg-amber-400",
                  label: "Low Network",
                  desc: "Uses less data, slower updates",
                  activeRing: "border-amber-300",
                  activeBg: "bg-amber-50",
                  activeText: "text-amber-700",
                },
              ] as const).map((mode) => {
                const isActive = safetyMode === mode.id;
                return (
                  <motion.button
                    key={mode.id}
                    onClick={() => setSafetyMode(mode.id)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    animate={{
                      borderColor: isActive ? undefined : "rgba(241,245,249,1)",
                      boxShadow: isActive
                        ? "0 4px 16px rgba(0,0,0,0.06)"
                        : "0 2px 8px rgba(0,0,0,0.02)",
                    }}
                    transition={{ duration: 0.2 }}
                    className={`rounded-[20px] p-4 flex flex-col gap-2 border cursor-pointer text-left transition-colors duration-200 ${
                      isActive
                        ? `${mode.activeBg} ${mode.activeRing}`
                        : "bg-white border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${mode.dot} ${
                        isActive ? "" : "opacity-50"
                      }`} />
                      <span className={`text-[12px] font-black leading-none ${
                        isActive ? mode.activeText : "text-slate-500"
                      }`}>{mode.label}</span>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-auto w-4 h-4 rounded-full bg-white border border-slate-200 flex items-center justify-center"
                        >
                          <div className={`w-2 h-2 rounded-full ${mode.dot}`} />
                        </motion.div>
                      )}
                    </div>
                    <p className={`text-[10px] font-semibold leading-snug ${
                      isActive ? "text-slate-500" : "text-slate-400"
                    }`}>{mode.desc}</p>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Bottom Info Row - Fade in */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="w-full max-w-[750px] flex justify-between items-center mt-auto pb-6"
          >
             <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                   <div className="w-10 h-10 rounded-full border-4 border-white bg-slate-200 overflow-hidden relative z-20">
                      <img src="https://ui-avatars.com/api/?name=D&background=1e293b&color=fff" />
                   </div>
                   <div className="w-10 h-10 rounded-full border-4 border-white bg-slate-200 overflow-hidden relative z-10">
                      <img src="https://ui-avatars.com/api/?name=M&background=1e293b&color=fff" />
                   </div>
                   <div className="w-10 h-10 rounded-full border-4 border-white bg-slate-900 text-white text-[10px] font-black flex items-center justify-center relative z-0">+1</div>
                </div>
                <div>
                   <p className="text-[13px] font-black text-slate-900 leading-none mb-1">3 Trusted Contacts Ready</p>
                   <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Active Guardians</p>
                </div>
             </div>

             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center border border-teal-100">
                   <MapPin className="w-5 h-5 text-teal-500" />
                </div>
                <div>
                   <p className="text-[13px] font-black text-slate-900 leading-none mb-1">Precise Location</p>
                   <p className="text-[11px] text-teal-600 font-black uppercase tracking-widest">GPS Locked</p>
                </div>
             </div>

          </motion.div>

        </div>
      </div>
    </AppLayout>
  );
};

export default SOSPage;
