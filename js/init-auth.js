// init-auth.js — 페이지별 전용 JS 없이 헤더 인증 상태만 초기화
import { initAuth } from './auth.js?v=6';
import { initLang }  from './i18n.js';

initLang();
initAuth();
