// lib-tub-pricing.js 三層定價＋運費 — 由 customize.html 抽出（行 1379-1448），逐字保留＋防禦性 guard。共用於 basic/medium/pro 三版本頁。
const PRICING = {
  tiers: { mtm:['Made-to-Measure',2490,4990], bespoke:['Bespoke',3990,6990], oneofone:['One-of-One',5490,9990] },
  color: 1290, backrest: 1690, basin: [990,1490], designFee: 399
};
const OPTS = { oneOfOne:false, backrest:false, basin:false };
const STD_COLOR = '#f5f5f0';   // Classic White＝標準色，其餘皆為客製色
function tierKey(){
  if(OPTS.oneOfOne) return 'oneofone';
  if(P.shape === 'custom' || extGroup || P.undercut) return 'bespoke';   // 倒扣＝左右合模，非常規 → Bespoke
  return 'mtm';
}
function priceParts(){
  const tk = tierKey(), mi = P.material === 'solid' ? 1 : 0;
  const parts = [[t(PRICING.tiers[tk][0]), PRICING.tiers[tk][1+mi]]];
  if((P.color || '').toLowerCase() !== STD_COLOR) parts.push([t('Custom colour'), PRICING.color]);
  if(OPTS.backrest) parts.push([t('Heated backrest'), PRICING.backrest]);
  if(OPTS.basin) parts.push([t('Matching basin'), PRICING.basin[mi]]);
  return { tk, parts, total: parts.reduce((a,p)=>a+p[1], 0) };
}
function fmtUSD(n){ return 'USD $' + n.toLocaleString('en-US'); }
function fromStr(n){
  if(LANG === 'zhS' || LANG === 'zhT') return fmtUSD(n) + ' 起';
  if(LANG === 'th') return 'เริ่มต้น ' + fmtUSD(n);
  return 'from ' + fmtUSD(n);
}
const TIER_DESC = { mtm:'From our mold library, resized to your millimetre.', bespoke:'Your shape — a new mold is made just for you.', oneofone:'Mold retired after your tub — certificate included, never reproduced.' };
function updatePrice(){
  const pp = priceParts(), mi = P.material === 'solid' ? 1 : 0;
  document.getElementById('tierName').textContent = t(PRICING.tiers[pp.tk][0]);
  document.getElementById('tierDesc').textContent = t(TIER_DESC[pp.tk]);
  document.getElementById('basinPriceLbl').textContent = '+$' + PRICING.basin[mi].toLocaleString('en-US');
  document.getElementById('priceRows').innerHTML = pp.parts.map((p,i)=>
    `<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:#66614f">${p[0]}</span><span>${i ? '+' : ''}$${p[1].toLocaleString('en-US')}</span></div>`).join('');
  document.getElementById('fromTotal').textContent = fromStr(pp.total);
  updateShipping();
}
(function initPriceOpts(){
  const map = { optOneOfOne:'oneOfOne', optBackrest:'backrest', optBasin:'basin' };
  Object.keys(map).forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('change', ()=>{ OPTS[map[id]] = el.checked; updatePrice(); });
  });
})();

// ===================== Est. shipping（分區固定價，見 shipping-rates.js） =====================
function shipRate(){
  const sel = document.getElementById('shipDest');
  if(!sel || !sel.value || !window.SITE_RATES) return null;
  const c = SITE_RATES.countries.find(x=>x[0]===sel.value);
  const z = c && SITE_RATES.zones[c[2]];
  return z ? z[P.material==='solid' ? 'solid' : 'acrylic'] : null;
}
function updateShipping(){
  const sel = document.getElementById('shipDest');
  if(!sel) return;
  if(sel.options.length && sel.options[0].value==='') sel.options[0].textContent = t('Select country / region…');
  const box = document.getElementById('shipEst');
  const r = shipRate();
  if(r == null){ box.style.display = 'none'; return; }
  box.style.display = 'block';
  document.getElementById('shipVal').textContent = 'USD $' + r;
  document.getElementById('totVal').textContent = fromStr(priceParts().total + r);
}
(function initShipping(){
  const sel = document.getElementById('shipDest');
  if(!sel || !window.SITE_RATES) return;
  sel.innerHTML = '<option value=""></option>' + SITE_RATES.countries.map(c=>`<option value="${c[0]}">${c[1]}</option>`).join('');
  sel.addEventListener('change', updateShipping);
  updateShipping();
})();
