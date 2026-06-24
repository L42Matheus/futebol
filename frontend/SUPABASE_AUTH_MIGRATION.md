# Supabase Auth + Google

O cliente está pronto em `src/services/supabase.ts`, mas não foi ativado na tela de login. O fluxo atual continua operando até a migração completa.

1. Defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env`.
2. Habilite Google no Supabase e cadastre no Google Cloud o callback `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Adicione `http://localhost:3000/login` nas Redirect URLs do Supabase.
4. Antes de ativar o botão, ajuste a API para validar JWTs do Supabase via JWKS e relacionar o claim `sub` ao usuário local.

Não use `service_role` ou `sb_secret` no frontend.
