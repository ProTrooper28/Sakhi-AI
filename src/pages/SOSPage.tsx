import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, EyeOff, Eye, Phone, MapPin, Video, Watch, Users, ShieldAlert, CheckCircle2, Navigation, Bell, Shield, Asterisk, ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";

const SOSPage = () => {
  const { sosState, triggerSOS, cancelSOS, addEvidence, locationState } = useApp();
  const navigate = useNavigate();

  // Option card toggle state
  const [options, setOptions] = useState({ silent: false, voice: false, wearable: true, guardian: false });
  const toggleOption = (key: keyof typeof options) => setOptions(prev => ({ ...prev, [key]: !prev[key] }));

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

          {/* Status List - Sequential Fade-In */}
          <div className="relative z-10 flex flex-col gap-4 mb-10 text-[12px] font-semibold text-slate-600 w-full max-w-[280px]">
             {[
               { icon: Asterisk, text: "Recording Started", time: "just now", color: "text-red-600" },
               { icon: MapPin, text: "Location shared", time: "2s ago" },
               { icon: Navigation, text: "Alerts dispatched", time: "12s ago", rotate: 90 },
             ].map((item, i) => (
               <motion.div 
                 key={i}
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 0.5 + i * 0.2 }}
                 className={`flex items-center gap-3 ${item.color || ""}`}
               >
                 {item.icon === Asterisk ? (
                   <div className="w-3.5 h-3.5 rounded-full border-2 border-red-600 flex items-center justify-center">
                     <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                   </div>
                 ) : (
                   <item.icon className={`w-4 h-4 ${item.rotate ? `rotate-${item.rotate}` : ""}`} />
                 )}
                 {item.text} ({item.time})
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
              className="bg-[#1e293b] rounded-3xl relative overflow-hidden h-[280px] shadow-[0_4px_25px_rgba(0,0,0,0.1)] border border-slate-700"
            >
               <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                  transform: "perspective(500px) rotateX(45deg) scale(2)",
                  transformOrigin: "center top"
               }} />
               <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b] via-transparent to-[#1e293b]" />
               
               <div className="absolute inset-0 flex items-center justify-center pb-4">
                  <div className="relative flex flex-col items-center">
                     {/* Map Ripples */}
                     <motion.div 
                        animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                        className="absolute w-20 h-20 bg-teal-400/20 rounded-full" 
                     />
                     <div className="absolute w-24 h-24 border border-teal-400/10 rounded-full" />
                     
                     <motion.div 
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="relative z-10 w-8 h-10 flex flex-col items-center"
                     >
                        <div className="w-8 h-8 rounded-t-full rounded-b-full bg-teal-500/80 backdrop-blur-sm border-2 border-white flex items-center justify-center shadow-lg" style={{ borderBottomLeftRadius: 0, transform: 'rotate(45deg)' }}>
                           <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm" style={{ transform: 'rotate(-45deg)' }} />
                        </div>
                     </motion.div>
                  </div>
               </div>
               <div className="absolute bottom-6 left-6 bg-slate-900/90 backdrop-blur-md rounded-xl px-4 py-2 flex items-center gap-2 border border-slate-700 shadow-xl">
                  <motion.div 
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" 
                  />
                  <span className="text-[10px] text-white font-black tracking-widest uppercase">Target Sync: Active</span>
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
  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-[#fcfcfd]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50 bg-white shrink-0">
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
        </div>

        <div className="flex flex-col flex-1 p-8 items-center justify-start relative bg-[#fcfcfd] overflow-y-auto">
          
          {/* Status Pill */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex flex-col items-center mb-12"
          >
            <div className="flex items-center gap-2 bg-teal-50 text-teal-600 px-5 py-2 rounded-full border border-teal-100 font-black text-[11px] uppercase tracking-widest shadow-sm mb-4">
               <motion.div 
                 animate={{ opacity: [1, 0.4, 1] }}
                 transition={{ repeat: Infinity, duration: 2 }}
                 className="w-2 h-2 rounded-full bg-teal-500" 
               />
               System Ready
            </div>
            <p className="text-slate-400 text-[14px] font-bold">Press SOS to instantly alert your safety network</p>
          </motion.div>

          {/* SOS Button Normal State - PULSING */}
          <div className="relative mb-16 mt-4 flex items-center justify-center">
            {/* Breathing Glow & Rings */}
            <motion.div 
               animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
               transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
               className="absolute w-[280px] h-[280px] rounded-full bg-red-50 border border-red-100 dark:bg-red-900/20 dark:border-red-900/30" 
            />
            <motion.div 
               animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.05, 0.2] }}
               transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
               className="absolute w-[360px] h-[360px] rounded-full border border-red-50 dark:border-red-900/20" 
            />
            
            <motion.button 
              onClick={triggerSOS}
              whileHover={{ scale: 1.05, filter: "brightness(1.1)" }}
              whileTap={{ scale: 0.95 }}
              animate={{ 
                scale: [1, 1.05, 1],
                boxShadow: [
                  "0 0 20px rgba(220, 38, 38, 0.4)",
                  "0 0 50px rgba(220, 38, 38, 0.7)",
                  "0 0 20px rgba(220, 38, 38, 0.4)"
                ]
              }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              className="relative z-10 w-52 h-52 rounded-full bg-gradient-to-b from-[#DC2626] to-[#7F1D1D] flex flex-col items-center justify-center border-4 border-white/20 shadow-2xl overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 bg-red-600/20 mix-blend-overlay pointer-events-none" />
              <span style={{ fontFamily: "Manrope, sans-serif" }} className="relative z-10 text-white text-[64px] font-black leading-none mb-1 drop-shadow-md">SOS</span>
              <span className="relative z-10 text-white font-bold text-[11px] tracking-[0.2em] uppercase drop-shadow-sm">HOLD TO TRIGGER</span>
            </motion.button>
          </div>

          {/* Options grid - Fade in sequentially */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
            className="grid grid-cols-2 gap-5 w-full max-w-[750px] relative z-10 mb-16"
          >
            {[
              { icon: EyeOff, title: "Silent Mode", desc: "Send alerts without sound or visual indication", key: "silent" as const },
              { icon: Mic,    title: "Voice Trigger", desc: "Activate SOS using your secure voice command", key: "voice" as const },
              { icon: Watch,  title: "Wearable Sync", desc: "Trigger SOS from your connected smart ring", key: "wearable" as const },
              { icon: Eye,    title: "Guardian View", desc: "Preview what contacts see during an alert", key: "guardian" as const },
            ].map((opt) => (
              <motion.button
                key={opt.key}
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleOption(opt.key)}
                className={`bg-white rounded-[28px] p-6 flex items-start gap-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border transition-all cursor-pointer text-left ${
                  options[opt.key] ? "border-teal-200 shadow-teal-50" : "border-slate-50"
                }`}
              >
                 <div className={`w-12 h-12 rounded-[20px] flex items-center justify-center shrink-0 border transition-colors ${
                   options[opt.key] ? "bg-teal-50 border-teal-100 text-teal-500" : "bg-slate-50 border-slate-100 text-slate-400"
                 }`}>
                   <opt.icon className="w-5 h-5" />
                 </div>
                 <div className="flex-1 pt-1">
                    <div className="flex items-center justify-between mb-2">
                       <h3 className="text-[14px] font-black text-slate-900 leading-none">{opt.title}</h3>
                       {/* Toggle pill */}
                       <div className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${
                         options[opt.key] ? "bg-teal-500" : "bg-slate-200"
                       }`}>
                         <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                           options[opt.key] ? "translate-x-4" : "translate-x-0.5"
                         }`} />
                       </div>
                    </div>
                    <p className="text-[12px] text-slate-400 font-bold leading-relaxed">{opt.desc}</p>
                 </div>
              </motion.button>
            ))}
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

             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 relative">
                   <Watch className="w-5 h-5 text-indigo-500" />
                   <div className="absolute top-1 right-1 w-2 h-2 bg-indigo-400 rounded-full border-2 border-white" />
                </div>
                <div>
                   <p className="text-[13px] font-black text-slate-900 leading-none mb-1">Sakhi Ring</p>
                   <p className="text-[11px] text-indigo-600 font-black uppercase tracking-widest">Connected</p>
                </div>
             </div>
          </motion.div>

        </div>
      </div>
    </AppLayout>
  );
};

export default SOSPage;
