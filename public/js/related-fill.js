/* Deterministic cross-field reuse for clearly equivalent fields; the model handles semantic matches. */
(() => {
  const groups = [
    ['property_address','address','home_address','postal_address'],
    ['full_name','guest_name','name','contact_name'],
    ['email','email_address'],
    ['phone','phone_number','mobile']
  ];
  const groupFor = key => groups.find(group => group.includes(key));
  let dismissTimer;
  function announce(sourceLabel, value, targets) {
    document.querySelectorAll('.derived-flash').forEach(node => node.remove());
    targets.forEach(target => target.closest('.q-card')?.classList.add('derived-pulse'));
    const card = document.createElement('aside');
    card.className = 'derived-flash';
    card.setAttribute('role','status');
    const safe = text => String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    card.innerHTML = `<div class="derived-flash-head"><span class="derived-check">✓</span><div><b>İlişkili alanlar dolduruldu</b><small>Kaynak soru: ${safe(sourceLabel)}</small></div><button type="button" aria-label="Bildirimi kapat">×</button></div><div class="derived-flash-value">${safe(value)}</div><small>${targets.length} alan aynı yanıttan dolduruldu</small>`;
    document.body.append(card);
    card.querySelector('button').onclick = () => card.remove();
    clearTimeout(dismissTimer);
    dismissTimer = setTimeout(() => {card.remove();document.querySelectorAll('.derived-pulse').forEach(node=>node.classList.remove('derived-pulse'))},7000);
  }
  function propagate(key, rawValue) {
    if (!key || !rawValue) return;
    const group = groupFor(key);
    if (!group) return;
    const source = document.getElementById(`field-${key}`);
    const sourceCard = source?.closest('.q-card');
    const sourceLabel = sourceCard?.querySelector('.q-label')?.innerText?.replace('*','').trim() || key.replaceAll('_',' ');
    const value = String(rawValue).trim();
    const targets = [];
    group.filter(alias => alias !== key).forEach(alias => {
      const target = document.getElementById(`field-${alias}`);
      if (!target || target.type === 'file' || String(target.value||'').trim()) return;
      const targetCard = target.closest('.q-card');
      target.value = value;
      target.dispatchEvent(new Event('input',{bubbles:true}));
      target.dataset.derivedFrom = key;
      target.title = `“${sourceLabel}” yanıtından dolduruldu: ${value}`;
      targets.push(target);
    });
    if (targets.length) announce(sourceLabel, value, targets);
  }
  document.addEventListener('change', event => {
    const el=event.target;
    if (!el?.id?.startsWith('field-') || el.type==='file') return;
    propagate(el.id.slice(6),el.value);
  }, true);
  document.addEventListener('click', event => {
    const button=event.target.closest('[data-option]');
    if (!button) return;
    const key=button.dataset.option,value=button.dataset.value;
    setTimeout(()=>propagate(key,value),0);
  }, true);
})();
