/**
 * home.js — Aamaal Home Screen (Today's Task)
 * QUR'AN WORLD VIEW · Aamaal
 *
 * STATUS: Placeholder — full implementation in Milestone 2 (Step 6)
 */

import { t } from '../core/i18n.js';

export async function render(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:60vh;flex-direction:column;gap:16px;text-align:center;padding:24px;">
      <div style="font-size:2rem;">📿</div>
      <h2 style="font-family:var(--font-display);color:var(--gold);letter-spacing:0.08em;">Aamaal</h2>
      <p style="color:var(--text-muted);font-size:0.9rem;">${t('app_tagline')}</p>
      <p style="color:var(--text-muted);font-size:0.8rem;margin-top:8px;">Home screen — coming in Milestone 2</p>
    </div>
  `;
}
