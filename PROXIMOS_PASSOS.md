# Próximos passos (ideias para reflexão)

Documento de **brainstorm** — não é compromisso de roadmap. Lista possíveis evoluções discutidas para o Habitus enquanto produto **local-first** (HTML/CSS/JS, `localStorage`).

Se implementares algo desta lista, atualiza também o `README.md` (fonte de verdade do produto).

---

## 1. PWA / instalação / offline

- `manifest.json`, service worker, comportamento offline razoável.
- Fluxo “instalar no telemóvel” / atalho no ecrã inicial.
- O README já menciona PWA como direção possível.

## 2. Notas longas / anexos

- **Já no cartão:** imagens via **Ctrl+V** (miniaturas em `meta.pasted_images`; ver `README`).
- Em aberto: descrição rica ou texto longo por tarefa; anexos de ficheiros genéricos.
- Aumenta o escopo (armazenamento, tamanho do `localStorage`, privacidade).

## 3. Sincronização / multi-dispositivo

- **Mudança de produto**: exige backend, conta ou protocolo de sync.
- Explicitamente fora do desenho atual (dados só no navegador).

---

## Notas

- **Prioridade com bom custo/benefício** (típico): PWA leve — alinha com o app atual sem exigir backend.
- **Maior impacto estrutural**: sync na nuvem.
- Manter o `README.md` alinhado com o que for decidido e implementado.
