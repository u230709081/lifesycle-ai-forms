/**
 * Two sample documents, drawn on a canvas, so the scan can be tried without real
 * paperwork. Each has a prepared result that is used when no API key is set.
 * They use the address of the Lifesycle test property and are marked SAMPLE.
 */
export const SAMPLE_DOCS = [
  { label:'Boiler certificate', name:'Sample boiler certificate.png', title:'BOILER INSTALLATION CERTIFICATE', sub:'Building Regulations compliance', rows:[
    ['Property address', '22 East Hanningfield Road, Rettendon Common, Chelmsford, Essex CM3 8EQ'],
    ['Work carried out', 'Installation of a gas combination boiler and radiators'],
    ['Fuel', 'Natural gas (mains supply)'],
    ['Date of installation', '14 June 2016'],
    ['Building Regulations', 'Work notified to the local authority. Complies with Parts J and L.'],
    ['Installer', 'Example Heating Ltd, registration no. 000000'],
    ['Last annual service', '12 March 2026. Appliance safe to use.']
  ], canned:{ doc_type:'Boiler installation certificate', summary:'A gas combi boiler installed on 14 June 2016 and last serviced on 12 March 2026.', facts:[
    { k:'central_heating', v:'Yes', confidence:'high', evidence:'gas combination boiler and radiators' },
    { k:'heating_installed_year', v:'2016', confidence:'high', evidence:'Date of installation: 14 June 2016' },
    { k:'heating_last_serviced', v:'2026-03-12', confidence:'high', evidence:'Last annual service: 12 March 2026' },
    { k:'heating_working', v:'Yes', confidence:'medium', evidence:'Appliance safe to use' },
    { k:'svc_gas', v:'Yes', confidence:'high', evidence:'Natural gas (mains supply)' }
  ], attach_to:['gas_safe_certificate','heating_service_report'], notes:[] } },
  { label:'Energy Performance Certificate', name:'Sample EPC.png', title:'ENERGY PERFORMANCE CERTIFICATE', sub:'Domestic property', rows:[
    ['Address', '22 East Hanningfield Road, Rettendon Common, Chelmsford, Essex CM3 8EQ'],
    ['Certificate date', '3 May 2021'],
    ['Valid until', '2 May 2031'],
    ['Property type', 'Semi-detached house'],
    ['Energy rating', 'D (62). Potential rating C (74).'],
    ['Walls', 'Cavity wall, filled cavity'],
    ['Roof', 'Pitched, 270 mm loft insulation'],
    ['Windows', 'Fully double glazed'],
    ['Main heating', 'Boiler and radiators, mains gas']
  ], canned:{ doc_type:'Energy Performance Certificate', summary:'EPC dated 3 May 2021, valid until 2 May 2031, energy rating D (62).', facts:[
    { k:'epc_available', v:'Yes', confidence:'high', evidence:'Valid until 2 May 2031' },
    { k:'traditional_construction', v:'Yes', confidence:'medium', evidence:'Cavity wall, filled cavity' },
    { k:'central_heating', v:'Yes', confidence:'high', evidence:'Boiler and radiators, mains gas' },
    { k:'svc_gas', v:'Yes', confidence:'high', evidence:'mains gas' }
  ], attach_to:['epc_file'], notes:['The energy rating is D (62). It isn’t a questionnaire field, but buyers will see it on the listing.'] } }
];

function wrapText(g, text, x, y, maxW, lh) {
  let line = '';
  String(text).split(' ').forEach(w => {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; } else line = t;
  });
  if (line) g.fillText(line, x, y);
  return y;
}
export function drawSample(sd) {
  const c = document.createElement('canvas'); c.width = 900; c.height = 1200;
  const g = c.getContext('2d'); if (!g) return Promise.resolve(null);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 900, 1200);
  g.fillStyle = '#111111'; g.font = 'bold 34px Arial, sans-serif'; g.fillText(sd.title, 60, 110);
  g.fillStyle = '#555555'; g.font = '22px Arial, sans-serif'; g.fillText(sd.sub, 60, 148);
  g.fillStyle = '#111111'; g.fillRect(60, 172, 780, 3);
  let y = 232;
  sd.rows.forEach(([k, v]) => {
    g.fillStyle = '#666666'; g.font = '19px Arial, sans-serif'; g.fillText(k.toUpperCase(), 60, y);
    g.fillStyle = '#111111'; g.font = '26px Arial, sans-serif';
    const last = wrapText(g, v, 60, y + 34, 780, 34);
    g.fillStyle = '#dddddd'; g.fillRect(60, last + 22, 780, 1);
    y = last + 62;
  });
  g.save(); g.translate(450, 640); g.rotate(-Math.PI / 6);
  g.fillStyle = 'rgba(200,0,0,0.12)'; g.font = 'bold 150px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('SAMPLE', 0, 0); g.restore();
  g.fillStyle = '#888888'; g.font = '18px Arial, sans-serif'; g.fillText('Sample document made for this prototype. Not a real certificate.', 60, 1150);
  return new Promise(res => c.toBlob(b => res(b), 'image/png'));
}
