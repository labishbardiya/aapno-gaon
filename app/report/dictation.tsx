'use client';

import { useEffect, useRef, useState } from 'react';

type Recognition = {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};

export default function Dictation({ append }: { append: (text: string) => void }) {
  const engine = useRef<Recognition | null>(null);
  const [available, setAvailable] = useState(false);
  const [language, setLanguage] = useState('hi-IN');
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const browser = window as Window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Engine = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Engine) return;
    const recognition = new Engine();
    engine.current = recognition;
    setAvailable(true);
    return () => {
      recognition.onresult = recognition.onerror = recognition.onend = null;
      recognition.abort();
    };
  }, []);

  if (!available) return null;
  return <div className="home-links">
    <label>Dictation language<select value={language} onChange={event => setLanguage(event.target.value)}>
      <option value="hi-IN">Hindi</option><option value="en-IN">English</option>
    </select></label>
    <button type="button" disabled={listening} onClick={() => {
      const recognition = engine.current;
      if (!recognition) return;
      recognition.lang = language;
      recognition.onresult = event => append(event.results[0][0].transcript);
      recognition.onerror = () => setMessage('Dictation failed. You can type your report.');
      recognition.onend = () => setListening(false);
      setMessage('');
      try { recognition.start(); setListening(true); } catch { setMessage('Could not start dictation.'); }
    }}>{listening ? 'Listening…' : 'Dictate description'}</button>
    {message && <p role="status">{message}</p>}
  </div>;
}
