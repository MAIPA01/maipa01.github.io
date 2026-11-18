/* 404 page — big pixel "404" made of blocks (they are platforms in play mode). */
import { bootPage, $, t } from './core.js';

const DIGITS = {
  4: ['1..1', '1..1', '1111', '...1', '...1'],
  0: ['1111', '1..1', '1..1', '1..1', '1111'],
};
$('.nf-digits').innerHTML = [4, 0, 4].map((d) => `<div class="nf-digit">${DIGITS[d].map((row) =>
  [...row].map((c) => `<i class="${c === '1' ? 'on' : ''}"></i>`).join('')).join('')}</div>`).join('');

bootPage({ page: 'notfound', render() { document.title = t('meta.notFoundTitle'); } });
