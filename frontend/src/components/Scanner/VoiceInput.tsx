import { useState, useCallback } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  onCommand: (command: string, text: string) => void;
  lang?: 'ar' | 'en';
}

// Command patterns (Arabic + English)
const COMMANDS = [
  { pattern: /^(ابحث عن|search for|find)\s+(.+)/i, cmd: 'search' },
  { pattern: /^(أضف|add)\s+(\d+)\s+(وحدة|unit|units)?\s*(.+)/i, cmd: 'add' },
  { pattern: /^(بيع|sell)\s+(\d+)\s+(وحدة|unit|units)?\s*(.+)/i, cmd: 'sell' },
  { pattern: /^(حوّل|transfer)\s+(\d+)\s+(.+)/i, cmd: 'transfer' },
  { pattern: /^(مسح|scan)\s+(.+)/i, cmd: 'scan' },
  { pattern: /^(تقرير|report)\s*(.*)/i, cmd: 'report' },
];

function parseCommand(text: string): { cmd: string; text: string } {
  for (const { pattern, cmd } of COMMANDS) {
    if (pattern.test(text)) return { cmd, text };
  }
  return { cmd: 'unknown', text };
}

export default function VoiceInput({ onCommand, lang = 'ar' }: Props) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
    return SpeechRec ? new SpeechRec() : null;
  }, []);

  const start = useCallback(() => {
    const rec = recognitionRef();
    if (!rec) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }
    rec.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e: Event) => {
      const event = e as unknown as { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; [j: number]: { transcript: string } } } };
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscript(final || interim);
      if (final) {
        const parsed = parseCommand(final.trim());
        onCommand(parsed.cmd, final.trim());
        toast.success(`Command: ${final.trim()}`);
      }
    };

    rec.onerror = () => {
      setListening(false);
      toast.error('Voice recognition error');
    };

    rec.onend = () => setListening(false);

    rec.start();
    setListening(true);
  }, [lang, onCommand, recognitionRef]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          className={`btn ${listening ? 'btn-danger' : 'btn-primary'}`}
          onClick={listening ? undefined : start}
          disabled={false}
          style={{ position: 'relative' }}
        >
          {listening ? <MicOff size={18} /> : <Mic size={18} />}
          {listening ? (lang === 'ar' ? 'جارٍ الاستماع...' : 'Listening...') : (lang === 'ar' ? 'تحدث الآن' : 'Voice Command')}
          {listening && <span className="animate-pulse-ring" style={{ position: 'absolute', inset: 0, borderRadius: 12 }} />}
        </button>

        {transcript && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <Volume2 size={16} />
            <span>&ldquo;{transcript}&rdquo;</span>
          </div>
        )}
      </div>

      {/* Command hints */}
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        {lang === 'ar' ? (
          <>
            <strong>أمثلة:</strong> &quot;ابحث عن حليب&quot; · &quot;أضف 10 وحدة كيس دقيق&quot; · &quot;بيع 5 عصير&quot; · &quot;تقرير&quot;
          </>
        ) : (
          <>
            <strong>Examples:</strong> &quot;Search for milk&quot; · &quot;Add 10 units flour&quot; · &quot;Sell 5 juice&quot; · &quot;Report&quot;
          </>
        )}
      </div>
    </div>
  );
}
