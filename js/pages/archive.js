/**
 * archive.js — Past Months Archive Screen
 * QUR'AN WORLD VIEW · Aamaal
 *
 * STATUS: Placeholder — full implementation in Milestone 3 (Step 8)
 */

import { t } from '../core/i18n.js';

export async function render(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:60vh;flex-direction:column;gap:16px;text-align:center;padding:24px;">
      <div style="font-size:2rem;">📚</div>
      <h2 style="font-family:var(--font-display);color:var(--gold);letter-spacing:0.08em;">${t('archive_title')}</h2>
      <p style="color:var(--text-muted);font-size:0.8rem;">Archive screen — coming in Milestone 3</p>
    </div>
  `;
}
