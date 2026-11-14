'use client';

import { categories, categoryLabel } from '../../lib/report-categories';
import Dictation from './dictation';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, type FormEvent } from 'react';

const PinMap = dynamic(() => import('./pin-map'), { ssr: false });

type Pin = { latitude: number; longitude: number; accuracyM?: number; source: 'device' | 'manual' };
type Receipt = { ticketCode: string; receiptUrl: string };

export default function ReportForm({ wards }: { wards: { id: number; name: string; coverage_hint: string | null }[] }) {
  const [description, setDescription] = useState('');
  const [ward, setWard] = useState('');
  const [category, setCategory] = useState('');
  const [nearby, setNearby] = useState<{ ticket_code: string; summary: string; supporters: number }[]>([]);
  const [supported, setSupported] = useState<string[]>([]);
  const retry = useRef<{ body: string; key: string } | null>(null);
  const [pin, setPin] = useState<Pin | null>(null);
  const [deviceCenter, setDeviceCenter] = useState<Pin | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const moved = useRef(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    let active = true;
    if (navigator.permissions && navigator.geolocation) {
      navigator.permissions.query({ name: 'geolocation' }).then(permission => {
        if (!active || permission.state !== 'granted') return;
        navigator.geolocation.getCurrentPosition(({ coords }) => {
          if (active && !moved.current && Math.abs(coords.latitude - 26.972) < 0.15 &&
              Math.abs(coords.longitude - 75.386) < 0.15) {
            setDeviceCenter({ latitude: coords.latitude, longitude: coords.longitude, source: 'device' });
          }
        }, () => {}, { timeout: 5000 });
      }).catch(() => {});
    }
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ward || !category) return;
    const params = new URLSearchParams({ ward, category });
    if (pin && confirmed) {
      params.set('lat', String(pin.latitude));
      params.set('lng', String(pin.longitude));
    }
    const controller = new AbortController();
    fetch('/api/reports/nearby?' + params, { signal: controller.signal })
      .then(async response => {
        if (response.ok && !controller.signal.aborted) {
          const data = await response.json();
          if (!controller.signal.aborted) setNearby(data.reports);
        }
      }).catch(() => {});
    return () => controller.abort();
  }, [ward, category, pin, confirmed]);

  function deviceId() {
    try {
    let device = localStorage.getItem('mysociety-reporter');
    if (!device) {
      device = crypto.randomUUID();
      localStorage.setItem('mysociety-reporter', device);
    }
    return device;
    } catch { return ''; }
  }

  async function support(ticket: string) {
    try {
      const response = await fetch('/api/reports/nearby?ticket=' + encodeURIComponent(ticket), {
        method: 'POST', headers: { 'X-Reporter-Device': deviceId() },
      });
      if (!response.ok) throw new Error();
      setSupported(previous => [...previous, ticket]);
    } catch {
      setError('Could not record your support. Try again or submit your own report.');
    }
  }

  function locate() {
    moved.current = true;

    if (!navigator.geolocation) {
      setLocationMessage('Location is unavailable. You can submit with a landmark.');
      return;
    }
    setLocating(true);
    setLocationMessage('');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setPin({ latitude: coords.latitude, longitude: coords.longitude, accuracyM: coords.accuracy, source: 'device' });
      setConfirmed(false);
      setDeviceCenter(null);
      setLocationMessage(`Estimated accuracy: ${Math.round(coords.accuracy)} m.`);
      setLocating(false);
    }, () => {
      setLocationMessage('Could not get your location. You can submit with a landmark.');
      setLocating(false);
    }, { timeout: 10000, maximumAge: 0, enableHighAccuracy: true });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (pin && !confirmed) {
      setError('Confirm or remove the pin before submitting.');
      return;
    }
    const data = new FormData(event.currentTarget);
    const body = JSON.stringify({
      wardId: Number(data.get('ward')), category: data.get('category'),
      landmark: String(data.get('landmark')).trim(), description: String(data.get('description')).trim(), location: confirmed ? pin : null,
      callbackName: String(data.get('callbackName')).trim() || undefined,
      callbackPhone: String(data.get('callbackPhone')).trim() || undefined,
    });
    if (retry.current?.body !== body) retry.current = { body, key: crypto.randomUUID() };
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/reports', {
        method: 'POST', body,
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': retry.current.key, 'X-Reporter-Device': deviceId() },
      });
      if (!response.ok) {
        setError(response.status === 429 ? 'You can file up to three reports per day. Try again tomorrow.' : response.status === 422 ? 'Check the ward and the report details.' : 'Could not submit. Please try again.');
        return;
      }
      setReceipt(await response.json());
    } catch {
      setError('Could not reach mySociety. Please try again.');
    } finally {
      setPending(false);
    }
  }

  if (receipt) return <section><h2>Report received</h2><p>Ticket <strong>{receipt.ticketCode}</strong></p>
    <p>Save your private tracking link to check the status.</p><a href={receipt.receiptUrl}>Track your report</a></section>;

  return (
    <form className="report-form" onSubmit={submit}>
      <p>Staff review reports before publication. Leave personal details out of the description.</p>
      <label>Ward<select name="ward" required value={ward} onChange={event => { setWard(event.target.value); setNearby([]); }}><option value="" disabled>Select a ward</option>
        {wards.map(ward => <option key={ward.id} value={ward.id}>{ward.name}</option>)}</select></label>
      {wards.find(item => String(item.id) === ward)?.coverage_hint && <p>{wards.find(item => String(item.id) === ward)?.coverage_hint}</p>}
      <label>Category<select name="category" required value={category} onChange={event => { setCategory(event.target.value); setNearby([]); }}><option value="" disabled>Select a category</option>
        {categories.map(category =>
          <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></label>
      <label>Nearby landmark<input name="landmark" maxLength={200} required /></label>
      <label>Describe the issue<textarea name="description" value={description} onChange={event => setDescription(event.target.value)} rows={5} maxLength={2000} required /></label>
      <Dictation append={phrase => setDescription(previous => (previous + " " + phrase).trimStart().slice(0, 2000))} />
      <fieldset><legend>Issue location (optional)</legend>
        <button type="button" onClick={locate} disabled={locating || pending}>{locating ? 'Finding location…' : 'Use my current location'}</button>
        <p>Tap the map or drag the pin to mark where the issue is. You can also report using just the ward and landmark.</p>
        <PinMap center={pin} deviceCenter={deviceCenter} onChange={point => {
          moved.current = true;
          setPin({ ...point, source: 'manual' });
          setConfirmed(false);
          setLocationMessage('');
        }} />
        {locationMessage && <p role="status">{locationMessage}</p>}
        {pin && <>
          <p role="status">{confirmed ? 'Issue location confirmed.' : 'Confirm this pin to include it with your report.'}</p>
          {!confirmed && <button type="button" onClick={() => setConfirmed(true)}>Confirm issue location</button>}
          <button type="button" onClick={() => { setPin(null); setConfirmed(false); setLocationMessage(''); }}>Remove location</button>
        </>}
      </fieldset>
      {nearby.length > 0 && <fieldset>
        <legend>Similar open reports in this ward</legend>
        {nearby.map(report => <div key={report.ticket_code}>
          <p>{report.ticket_code} · {report.summary} · {report.supporters} supporting</p>
          <button type="button" disabled={supported.includes(report.ticket_code)} onClick={() => support(report.ticket_code)}>
            {supported.includes(report.ticket_code) ? 'Support recorded' : 'I have the same problem'}
          </button>
        </div>)}
      </fieldset>}
      <fieldset className="report-form"><legend>Private callback details (optional)</legend>
        <label>Name<input name="callbackName" maxLength={100} autoComplete="name" /></label>
        <label>Phone<input name="callbackPhone" type="tel" pattern="[+]?[0-9]{10,15}" autoComplete="tel" /></label>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <button disabled={pending || locating}>{pending ? 'Submitting…' : 'Submit report'}</button>
    </form>
  );
}
